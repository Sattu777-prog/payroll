'use strict';

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"'`]/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;'
    }[m]));
}

const AVATAR_RAMPS = [
    ['#3b82f6', '#8b5cf6'], ['#10b981', '#0ea5a3'], ['#f59e0b', '#ef4444'],
    ['#8b5cf6', '#ec4899'], ['#14b8a6', '#3b82f6'], ['#f43f5e', '#f59e0b'],
    ['#6366f1', '#3b82f6'], ['#06b6d4', '#10b981']
];
function avatarChip(firstName, lastName) {
    const initials = ((firstName || '?')[0] || '') + ((lastName || '')[0] || '');
    const seed = (firstName || '') + (lastName || '');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const [c1, c2] = AVATAR_RAMPS[hash % AVATAR_RAMPS.length];
    return `<span class="avatar-chip" style="--av1:${c1};--av2:${c2};">${esc(initials.toUpperCase())}</span>`;
}

function safeParse(str) {
    try { return JSON.parse(str); }
    catch { return null; }
}

function sanitizeText(str, maxLen = 200) {
    if (!str) return '';
    return String(str).trim().slice(0, maxLen);
}
function validateEmail(email) {
    if (!email) return true;
    return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email);
}
function validateSalary(val) {
    const n = parseFloat(val);
    return !isNaN(n) && n >= 0 && n <= 10_000_000;
}

/* Only allow attachment data-URLs whose MIME type matches the upload
   allow-list. Blocks javascript:, data:text/html, data:image/svg+xml and
   any other scheme a crafted JSON import might smuggle into an href. */
const SAFE_ATTACHMENT_RE = /^data:(application\/pdf|image\/(png|jpeg|jpg|gif|webp)|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/octet-stream);base64,[a-z0-9+/=\r\n]+$/i;
function safeAttachmentHref(url) {
    if (typeof url !== 'string') return '';
    return SAFE_ATTACHMENT_RE.test(url.trim()) ? url.trim() : '';
}

/* Import sanitizer — drops prototype-pollution keys and coerces the
   security-relevant fields so a hand-crafted backup file can't inject
   objects, functions, or hostile attachment URLs into app state. */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
function sanitizeImported(rec, coercions) {
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return null;
    const out = {};
    for (const [k, v] of Object.entries(rec)) {
        if (DANGEROUS_KEYS.has(k)) continue;   // block prototype pollution
        out[k] = v;
    }
    for (const [k, kind] of Object.entries(coercions)) {
        if (!(k in out)) continue;
        if (kind === 'str') out[k] = sanitizeText(out[k], 500);
        else if (kind === 'num') { const n = Number(out[k]); out[k] = Number.isFinite(n) ? n : 0; }
        else if (kind === 'attachment') { out[k] = safeAttachmentHref(out[k]); if (!out[k]) delete out[k]; }
    }
    return out;
}
const IMPORT_SPECS = {
    employees: { id: 'str', employeeId: 'str', firstName: 'str', lastName: 'str', email: 'str', department: 'str', position: 'str', phone: 'str', basicSalary: 'num' },
    attendances: { id: 'str', employeeId: 'str', date: 'str', status: 'str' },
    leaveReqs: { id: 'str', employeeId: 'str', leaveType: 'str', startDate: 'str', endDate: 'str', status: 'str', reason: 'str', attachmentName: 'str', attachmentType: 'str', attachmentSize: 'num', attachmentData: 'attachment' },
    payrolls: { id: 'str', employeeId: 'str', month: 'num', year: 'num', basic: 'num', allowances: 'num', tax: 'num', netSalary: 'num' },
};
function sanitizeImportedArray(arr, spec) {
    if (!Array.isArray(arr)) return null;
    return arr.map(r => sanitizeImported(r, spec)).filter(Boolean);
}

/* ════════════════════════ CURRENCY SYSTEM ════════════════════════
   All amounts are stored internally in USD (basicSalary, payroll figures).
   appCurrency controls how figures are *displayed* across the app.
   Live rates are fetched from the free, key-less Frankfurter API
   (European Central Bank reference rates) and cached in localStorage. */
const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar', timezone: 'America/New_York', country: 'US' },
    { code: 'EUR', symbol: '€', name: 'Euro', timezone: 'Europe/Paris', country: 'EU' },
    { code: 'GBP', symbol: '£', name: 'British Pound', timezone: 'Europe/London', country: 'UK' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', timezone: 'Asia/Kolkata', country: 'IN' },
    { code: 'NPR', symbol: 'Rs', name: 'Nepali Rupee', timezone: 'Asia/Kathmandu', country: 'NP' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', timezone: 'Asia/Tokyo', country: 'JP' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', timezone: 'Asia/Shanghai', country: 'CN' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', timezone: 'Australia/Sydney', country: 'AU' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', timezone: 'America/Toronto', country: 'CA' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', timezone: 'Asia/Singapore', country: 'SG' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', timezone: 'Europe/Zurich', country: 'CH' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', timezone: 'Asia/Dubai', country: 'AE' }
];

function getCurrencyTimezone(code) {
    const info = CURRENCIES.find(c => c.code === code);
    return info?.timezone || 'UTC';
}

function getCurrencyCountry(code) {
    const info = CURRENCIES.find(c => c.code === code);
    return info?.country || code;
}

function getCurrencyFullName(code) {
    const info = CURRENCIES.find(c => c.code === code);
    return info?.name || code;
}

function fmtTime(timestamp, options = {}) {
    const tz = getCurrencyTimezone(appCurrency);
    const defaultOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: options.includeSeconds ? '2-digit' : undefined,
        hour12: false,
        timeZone: tz
    };
    try {
        return new Date(timestamp).toLocaleTimeString(tz, { ...defaultOptions, ...options });
    } catch {
        return new Date(timestamp).toLocaleTimeString(undefined, defaultOptions);
    }
}

function fmtDate(timestamp, options = {}) {
    const tz = getCurrencyTimezone(appCurrency);
    const defaultOptions = {
        weekday: options.weekday ? 'short' : undefined,
        month: options.month ? 'short' : undefined,
        day: '2-digit',
        year: options.year ? 'numeric' : undefined,
        timeZone: tz
    };
    try {
        return new Date(timestamp).toLocaleDateString(tz, { ...defaultOptions, ...options });
    } catch {
        return new Date(timestamp).toLocaleDateString(undefined, defaultOptions);
    }
}

function fmtDateTime(timestamp) {
    const tz = getCurrencyTimezone(appCurrency);
    try {
        return new Date(timestamp).toLocaleString(tz, {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz
        });
    } catch {
        return new Date(timestamp).toLocaleString(undefined, {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Frankfurter API supported currencies (subset of our list)
// We'll use fallback approximate rates for unsupported ones
const FALLBACK_RATES = {
    'USD': 1,
    'EUR': 0.92,
    'GBP': 0.79,
    'INR': 83.12,
    'NPR': 133.0,  // Approx 1 USD = 133 NPR (pegged to INR)
    'JPY': 151.50,
    'CNY': 7.24,
    'AUD': 1.52,
    'CAD': 1.36,
    'SGD': 1.35,
    'CHF': 0.89,
    'AED': 3.67
};

const FX_CACHE_MS = 60 * 60 * 1000; // 1 hour
let appCurrency = localStorage.getItem('nexus_currency') || 'USD';
if (!CURRENCIES.some(c => c.code === appCurrency)) appCurrency = 'USD';
let fxRates = safeParse(localStorage.getItem('nexus_fx_rates')) || { USD: 1 };
if (!fxRates || typeof fxRates !== 'object' || !fxRates.USD) fxRates = { USD: 1 };
let fxTimestamp = localStorage.getItem('nexus_fx_timestamp') || null;
let fxFetching = false;
let fxStatus = 'unknown'; // 'live' | 'stale' | 'offline' | 'loading'

function currencyInfo(code) {
    return CURRENCIES.find(c => c.code === code) || { code, symbol: code + ' ', name: code };
}
function currencySymbol(code) {
    return currencyInfo(code).symbol;
}

// Get rate for a currency, with fallback to hardcoded approximate rates
function getFxRate(code) {
    if (code === 'USD') return 1;
    if (fxRates[code] !== undefined) return fxRates[code];
    if (FALLBACK_RATES[code] !== undefined) return FALLBACK_RATES[code];
    return null;
}

// Convert a USD amount into the app's selected display currency
function toDisplayCurrency(usdAmount, targetCode = appCurrency) {
    const rate = getFxRate(targetCode);
    if (rate === null) return usdAmount || 0;
    return (usdAmount || 0) * rate;
}

// Convert an arbitrary amount between two currencies, bridging through USD
function convertBetween(amount, fromCode, toCode) {
    const amt = parseFloat(amount) || 0;
    const fromRate = getFxRate(fromCode);
    const toRate = getFxRate(toCode);
    if (fromRate === null || toRate === null) return null;
    const usd = amt / fromRate;
    return usd * toRate;
}
function fmtCurrency(usdAmount, decimals) {
    const val = toDisplayCurrency(usdAmount);
    const d = decimals !== undefined ? decimals : (appCurrency === 'JPY' ? 0 : 2);
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: appCurrency, minimumFractionDigits: d, maximumFractionDigits: d }).format(val);
    } catch {
        return currencySymbol(appCurrency) + val.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
    }
}
function fmtCurrencyCompact(usdAmount) {
    const val = Math.round(toDisplayCurrency(usdAmount));
    return currencySymbol(appCurrency) + val.toLocaleString();
}
// ASCII-safe "CODE amount" format for jsPDF / Excel exports where currency
// glyphs (₹, Fr, etc.) may not render reliably in the embedded fonts.
function fmtCurrencyCode(usdAmount, code = appCurrency) {
    const val = toDisplayCurrency(usdAmount, code);
    return `${code} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchFxRates(force = false) {
    const age = fxTimestamp ? (Date.now() - new Date(fxTimestamp).getTime()) : Infinity;
    if (!force && age < FX_CACHE_MS && Object.keys(fxRates).length > 1) {
        fxStatus = 'live';
        updateFxStatusUI();
        return fxRates;
    }
    if (fxFetching) return fxRates;
    fxFetching = true;
    fxStatus = 'loading';
    updateFxStatusUI();
    try {
        const symbols = CURRENCIES.filter(c => c.code !== 'USD').map(c => c.code).join(',');
        const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${symbols}`);
        if (!res.ok) throw new Error('FX request failed: ' + res.status);
        const data = await res.json();
        if (!data || typeof data.rates !== 'object') throw new Error('Malformed FX response');
        fxRates = { USD: 1, ...data.rates };
        fxTimestamp = new Date().toISOString();
        localStorage.setItem('nexus_fx_rates', JSON.stringify(fxRates));
        localStorage.setItem('nexus_fx_timestamp', fxTimestamp);
        fxStatus = 'live';
    } catch (err) {
        console.error('FX rate fetch failed:', err);
        fxStatus = Object.keys(fxRates).length > 1 ? 'stale' : 'offline';
    } finally {
        fxFetching = false;
        updateFxStatusUI();
    }
    return fxRates;
}

function updateFxStatusUI() {
    const metaEls = [document.getElementById('fx-snapshot-meta'), document.getElementById('convTableMeta')];
    let label = '';
    let cls = '';
    const stamp = fxTimestamp ? fmtTime(fxTimestamp, { hour12: false }) : '';
    const tz = getCurrencyTimezone(appCurrency);
    if (fxStatus === 'loading') { label = '<i class="fas fa-spinner fa-spin"></i> Updating rates…'; cls = ''; }
    else if (fxStatus === 'live') { label = `<i class="fas fa-circle-check"></i> ${stamp} ${tz}`; cls = ''; }
    else if (fxStatus === 'stale') { label = `<i class="fas fa-triangle-exclamation"></i> Offline — ${stamp} ${tz}`; cls = 'stale'; }
    else { label = '<i class="fas fa-triangle-exclamation"></i> Rates unavailable offline'; cls = 'offline'; }
    metaEls.forEach(el => { if (el) { el.innerHTML = label; el.className = 'fx-meta ' + cls; } });
}

let employees = [], attendances = [], leaveReqs = [], payrolls = [];
let runtimeTargetDeletionId = null;
let trendChart = null, pieChart = null, deptChart = null, payrollBreakdownChart = null, attendanceTrendChart = null, leaveDistChart = null;
let attendanceDate = new Date().toISOString().slice(0, 10);
let tableSortState = {};

const MAX_STORAGE_BYTES = 4 * 1024 * 1024;

function saveAll() {
    try {
        const data = { employees, attendances, leaveReqs, payrolls };
        const str = JSON.stringify(data);
        if (str.length > MAX_STORAGE_BYTES) {
            showToast('⚠️ Data too large to save. Consider exporting a backup.', 'error');
            return;
        }
        localStorage.setItem('nexus_employees', JSON.stringify(employees));
        localStorage.setItem('nexus_attendance', JSON.stringify(attendances));
        localStorage.setItem('nexus_leaves', JSON.stringify(leaveReqs));
        localStorage.setItem('nexus_payroll', JSON.stringify(payrolls));
    } catch (err) {
        console.error('Save error:', err);
        showToast('Storage error — data may not be saved.', 'error');
    }
}

function loadAll() {
    try {
        employees = safeParse(localStorage.getItem('nexus_employees')) || [];
        attendances = safeParse(localStorage.getItem('nexus_attendance')) || [];
        leaveReqs = safeParse(localStorage.getItem('nexus_leaves')) || [];
        payrolls = safeParse(localStorage.getItem('nexus_payroll')) || [];

        if (!Array.isArray(employees)) employees = [];
        if (!Array.isArray(attendances)) attendances = [];
        if (!Array.isArray(leaveReqs)) leaveReqs = [];
        if (!Array.isArray(payrolls)) payrolls = [];

        if (employees.length === 0) seedData();

        const now = new Date();
        const m = now.getMonth() + 1, y = now.getFullYear();
        if (!payrolls.some(p => p.month === m && p.year === y)) {
            runPayrollEngine(m, y, true);
        }
    } catch (err) {
        console.error('Load error:', err);
        employees = []; attendances = []; leaveReqs = []; payrolls = [];
        seedData();
    }
}

function seedData() {
    employees = [
        { id: 'emp_1001', employeeId: 'EMP1001', firstName: 'Aarav', lastName: 'Sharma', department: 'Engineering', position: 'Lead Dev', basicSalary: 7200, email: 'aarav@company.com', phone: '555-0101' },
        { id: 'emp_1002', employeeId: 'EMP1002', firstName: 'Bianca', lastName: 'Lopez', department: 'HR', position: 'Generalist', basicSalary: 5400, email: 'bianca@company.com', phone: '555-0102' },
        { id: 'emp_1003', employeeId: 'EMP1003', firstName: 'Chen', lastName: 'Wei', department: 'Sales', position: 'Manager', basicSalary: 6800, email: 'chen@company.com', phone: '555-0103' }
    ];
    const today = new Date().toISOString().slice(0, 10);
    attendances = employees.map(e => ({ id: 'att-' + e.id, employeeId: e.id, date: today, status: 'present' }));
    leaveReqs = [{ id: 'leave1', employeeId: 'emp_1002', leaveType: 'Annual Leave', startDate: '2026-08-15', endDate: '2026-08-20', reason: 'Family trip', status: 'pending' }];
    saveAll();
}

let _toastTimer = null;
function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { el.className = type; }, 3200);
}

function openModal(id) {
    const el = document.getElementById(id);
    el.classList.add('open');
    el.addEventListener('click', _backdropClose);
    setTimeout(() => {
        const first = el.querySelector('button,input,select,textarea');
        if (first) first.focus();
    }, 50);
}
function closeModal(id) {
    const el = document.getElementById(id);
    el.classList.remove('open');
    el.removeEventListener('click', _backdropClose);
}
function _backdropClose(e) {
    if (e.target === e.currentTarget) closeModal(e.currentTarget.id);
}
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        ['empModal', 'leaveModal', 'confirmModal', 'historyModal', 'currencyModal'].forEach(id => {
            if (document.getElementById(id)?.classList.contains('open')) closeModal(id);
        });
    }
});

function getDaysPresent(empId, month, year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return attendances.filter(a => a.employeeId === empId && a.date.startsWith(prefix) && a.status === 'present').length;
}
function getApprovedLeaveDays(empId, month, year) {
    let total = 0;
    leaveReqs.filter(l => l.employeeId === empId && l.status === 'approved').forEach(l => {
        let cur = new Date(l.startDate);
        const end = new Date(l.endDate);
        while (cur <= end) {
            if (cur.getMonth() + 1 === month && cur.getFullYear() === year) total++;
            cur.setDate(cur.getDate() + 1);
        }
    });
    return total;
}
function computeSalary(basic, days, totalWork = 22) {
    const factor = Math.min(1, days / totalWork);
    const earned = basic * factor;
    const allowances = earned * 0.20;
    const gross = earned + allowances;
    const tax = gross * 0.15;
    return { basic: earned, allowances, tax, net: gross - tax };
}
function runPayrollEngine(month, year, silent = false) {
    payrolls = payrolls.filter(p => !(p.month === month && p.year === year));
    employees.forEach(emp => {
        const days = getDaysPresent(emp.id, month, year) + getApprovedLeaveDays(emp.id, month, year);
        const c = computeSalary(emp.basicSalary, days);
        payrolls.push({ id: `pay-${emp.id}-${month}-${year}`, employeeId: emp.id, month, year, basic: c.basic, allowances: c.allowances, tax: c.tax, netSalary: c.net });
    });
    saveAll();
    if (!silent) showToast(`✅ Payroll for ${month}/${year} processed`, 'success');
}

// ★ FIX: chartTextColor returns darker text for light mode ★
function chartTextColor() {
    return document.body.classList.contains('dark-mode') ? '#94a3b8' : '#475569';
}
function chartGridColor() {
    return document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
}

function renderDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = attendances.filter(a => a.date === today);
    const presentCount = todayLogs.filter(a => a.status === 'present').length;
    const lateCount = todayLogs.filter(a => a.status === 'late').length;
    const absentCount = todayLogs.filter(a => a.status === 'absent').length;
    const presenceRate = employees.length > 0 ? Math.round(presentCount / employees.length * 100) : 0;
    const pending = leaveReqs.filter(l => l.status === 'pending').length;
    const projected = Math.round(employees.reduce((s, e) => s + (e.basicSalary || 0), 0) * 1.2);

    animateNumber('totalEmployees', employees.length);
    animateNumber('presentToday', presentCount);
    animateNumber('pendingLeaves', pending);
    animateDollar('projectedCost', projected);

    document.getElementById('ks-staff').textContent = employees.length === 1 ? '1 active employee' : `${employees.length} active employees`;
    document.getElementById('ks-present').textContent = `${absentCount} absent · ${lateCount} late`;
    const leavesPulse = document.getElementById('pendingLeaves');
    leavesPulse.classList.toggle('pending-pulse', pending > 0);
    document.getElementById('ks-leaves').textContent = pending > 0 ? 'Awaiting approval' : 'All requests resolved';
    document.getElementById('ks-payroll').textContent = `Gross est. ${fmtCurrencyCompact(projected * 1.176)}`;

    setTimeout(() => {
        const circ = 2 * Math.PI * 14;
        const arc = circ * (presenceRate / 100);
        const ringArcEl = document.getElementById('ring-arc');
        if (ringArcEl) ringArcEl.setAttribute('stroke-dasharray', `${arc} ${circ}`);
        const ringPctEl = document.getElementById('ring-pct');
        if (ringPctEl) ringPctEl.textContent = presenceRate + '%';
    }, 80);

    renderAbsenceFeed(today);

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [], trendData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1, y = d.getFullYear();
        labels.push(monthNames[d.getMonth()]);
        trendData.push(payrolls.filter(p => p.month === m && p.year === y).reduce((s, p) => s + p.netSalary, 0));
    }
    renderTrendBars(labels, trendData);
    renderSparklines(trendData, pending);

    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthAtt = attendances.filter(a => a.date.startsWith(monthStr));
    const counts = { present: 0, absent: 0, late: 0, 'half-day': 0 };
    monthAtt.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    renderAttendanceDonut(counts);
    renderDeptBars();
    renderActivityFeed(pending);
    renderInsightsRow(presentCount);
    renderTopEarners('top-earners-list', 5);
    renderFxSnapshot();
}

function renderInsightsRow(presentCount) {
    const row = document.getElementById('dashInsightsRow');
    if (!row) return;

    const now = new Date();
    const curM = now.getMonth() + 1, curY = now.getFullYear();
    const prev = new Date(curY, curM - 2, 1);
    const prevM = prev.getMonth() + 1, prevY = prev.getFullYear();
    const curTotal = payrolls.filter(p => p.month === curM && p.year === curY).reduce((s, p) => s + p.netSalary, 0);
    const prevTotal = payrolls.filter(p => p.month === prevM && p.year === prevY).reduce((s, p) => s + p.netSalary, 0);
    const avgNet = employees.length ? curTotal / employees.length : 0;
    let momPct = 0, momDir = 'flat';
    if (prevTotal > 0) {
        momPct = ((curTotal - prevTotal) / prevTotal) * 100;
        momDir = momPct > 0.5 ? 'up' : momPct < -0.5 ? 'down' : 'flat';
    } else if (curTotal > 0) { momDir = 'up'; momPct = 100; }
    const deptCount = new Set(employees.map(e => e.department || 'General')).size;
    const momIcon = momDir === 'up' ? 'fa-arrow-trend-up' : momDir === 'down' ? 'fa-arrow-trend-down' : 'fa-minus';
    const momSign = momPct > 0 ? '+' : '';

    const cards = [
        { icon: 'fa-scale-balanced', color: '#3b82f6', bg: 'rgba(59,130,246,.12)', label: 'Avg. Net Salary', val: fmtCurrencyCompact(avgNet) },
        {
            icon: momIcon, color: momDir === 'down' ? '#ef4444' : momDir === 'up' ? '#10b981' : '#94a3b8', bg: momDir === 'down' ? 'rgba(239,68,68,.12)' : momDir === 'up' ? 'rgba(16,185,129,.12)' : 'rgba(148,163,184,.12)',
            label: 'Payroll vs Last Month', val: `${momSign}${momPct.toFixed(1)}%`
        },
        { icon: 'fa-sitemap', color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', label: 'Departments', val: String(deptCount) },
        { icon: 'fa-user-clock', color: '#f59e0b', bg: 'rgba(245,158,11,.12)', label: 'Present Right Now', val: `${presentCount}/${employees.length || 0}` }
    ];
    row.innerHTML = cards.map(c => `
        <div class="glass att-summary-card">
            <div class="att-summary-icon" style="background:${c.bg};color:${c.color};"><i class="fas ${c.icon}"></i></div>
            <div><div class="att-summary-num" style="font-size:1.05rem;">${esc(c.val)}</div><div class="att-summary-lbl">${esc(c.label)}</div></div>
        </div>
    `).join('');
}

function getLatestPayrollMap() {
    const map = {};
    employees.forEach(emp => {
        const latest = payrolls.filter(p => p.employeeId === emp.id).sort((a, b) => b.year - a.year || b.month - a.month)[0];
        if (latest) map[emp.id] = latest.netSalary;
    });
    return map;
}

function renderTopEarners(containerId, limit = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const payMap = getLatestPayrollMap();
    const ranked = employees
        .map(e => ({ emp: e, amt: payMap[e.id] ?? 0 }))
        .filter(r => r.amt > 0)
        .sort((a, b) => b.amt - a.amt)
        .slice(0, limit);

    if (ranked.length === 0) {
        container.innerHTML = `<div style="font-size:0.75rem;color:var(--text-secondary);">No payroll runs yet — process payroll to see top earners.</div>`;
        return;
    }
    container.innerHTML = ranked.map((r, i) => `
        <div class="earner-row">
            <div class="earner-rank ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : ''}">${i + 1}</div>
            ${avatarChip(r.emp.firstName, r.emp.lastName)}
            <span class="earner-name">${esc(r.emp.firstName)} ${esc(r.emp.lastName)}</span>
            <span class="earner-dept">${esc(r.emp.department || 'General')}</span>
            <span class="earner-amt">${fmtCurrency(r.amt)}</span>
        </div>
    `).join('');
}

function renderFxSnapshot() {
    const list = document.getElementById('fx-snapshot-list');
    if (!list) return;
    const featured = CURRENCIES.filter(c => c.code !== 'USD').slice(0, 5);
    list.innerHTML = featured.map(c => {
        const rate = fxRates[c.code];
        const valTxt = rate ? rate.toLocaleString(undefined, { maximumFractionDigits: rate < 10 ? 4 : 2 }) : '—';
        return `<div class="fx-row">
            <div class="fx-pair"><span class="fx-flag-dot"></span>USD → ${esc(c.code)}</div>
            <div class="fx-val">${valTxt}</div>
        </div>`;
    }).join('');
    updateFxStatusUI();
}

function renderSparklines(trendData, pending) {
    sparkline('sp-payroll', trendData.length ? trendData : [1, 1, 1, 1, 1, 1], '#8b5cf6');
    const staffHist = Array.from({ length: 6 }, () => employees.length || 1);
    sparkline('sp-staff', staffHist, '#3b82f6');
    const leaveHist = Array.from({ length: 5 }, () => Math.round(Math.random() * Math.max(pending, 1))).concat([pending]);
    sparkline('sp-leaves', leaveHist, '#f59e0b');
}

function sparkline(svgId, vals, color) {
    const svg = document.getElementById(svgId);
    if (!svg || !vals.length) return;
    const W = 120, H = 28, pad = 2;
    const mx = Math.max(...vals) || 1;
    const mn = Math.min(...vals);
    const range = (mx - mn) || 1;
    const pts = vals.map((v, i) => {
        const x = pad + (i / (vals.length - 1 || 1)) * (W - 2 * pad);
        const y = H - pad - (v - mn) / range * (H - 2 * pad);
        return `${x},${y}`;
    });
    svg.innerHTML = `
        <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <polygon points="${pts.join(' ')} ${W - pad},${H} ${pad},${H}" fill="${color}" fill-opacity=".12"/>
    `;
}

function renderTrendBars(labels, vals) {
    const container = document.getElementById('trend-bars');
    if (!container) return;
    const mx = Math.max(...vals) || 1;
    const barColors = ['#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#8b5cf6'];
    container.innerHTML = labels.map((lbl, i) => `
        <div class="bar-col">
            <div class="bar-track">
                <div class="bar-fill" data-h="${Math.round(vals[i] / mx * 100)}" style="background:${barColors[i]};height:0%"></div>
            </div>
            <div class="bar-lbl">${esc(lbl)}</div>
        </div>
    `).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        container.querySelectorAll('.bar-fill').forEach(b => { b.style.height = b.dataset.h + '%'; });
    }));
}

function renderAttendanceDonut(counts) {
    const total = counts.present + counts.absent + counts.late + counts['half-day'] || 1;
    const circ = 2 * Math.PI * 27;
    const presArc = circ * (counts.present / total);
    const lateArc = circ * (counts.late / total);
    const halfArc = circ * (counts['half-day'] / total);

    const pEl = document.getElementById('don-present');
    const lEl = document.getElementById('don-late');
    const hEl = document.getElementById('don-half');
    if (!pEl) return;

    pEl.setAttribute('stroke-dasharray', `${presArc} ${circ}`);
    pEl.setAttribute('stroke-dashoffset', '0');
    lEl.setAttribute('stroke-dasharray', `${lateArc} ${circ}`);
    lEl.setAttribute('stroke-dashoffset', String(-presArc));
    hEl.setAttribute('stroke-dasharray', `${halfArc} ${circ}`);
    hEl.setAttribute('stroke-dashoffset', String(-(presArc + lateArc)));

    document.getElementById('don-pct').textContent = Math.round(counts.present / total * 100) + '%';
    document.getElementById('att-legend').innerHTML = `
        <div class="legend-row"><div class="legend-dot" style="background:#10b981;"></div>Present<span class="legend-val">${counts.present}</span></div>
        <div class="legend-row"><div class="legend-dot" style="background:#f59e0b;"></div>Late<span class="legend-val">${counts.late}</span></div>
        <div class="legend-row"><div class="legend-dot" style="background:#8b5cf6;"></div>Half-day<span class="legend-val">${counts['half-day']}</span></div>
        <div class="legend-row"><div class="legend-dot" style="background:rgba(99,115,129,.3);"></div>Absent<span class="legend-val">${counts.absent}</span></div>
    `;
}

function renderDeptBars() {
    const container = document.getElementById('dept-list');
    if (!container) return;
    if (employees.length === 0) {
        container.innerHTML = `<div style="font-size:0.75rem;color:var(--text-secondary);">No departments yet.</div>`;
        return;
    }
    const dMap = {};
    employees.forEach(emp => {
        const dept = emp.department || 'General';
        const latest = payrolls.filter(p => p.employeeId === emp.id).sort((a, b) => b.year - a.year || b.month - a.month)[0];
        dMap[dept] = (dMap[dept] || 0) + (latest?.netSalary || (emp.basicSalary || 0) * 0.85);
    });
    const entries = Object.entries(dMap).sort((a, b) => b[1] - a[1]);
    const mx = entries[0]?.[1] || 1;
    const dColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];
    container.innerHTML = entries.map(([dept, amt], i) => `
        <div class="dept-row">
            <div class="dept-head"><span class="dept-name">${esc(dept)}</span><span class="dept-amt">${fmtCurrency(amt)}</span></div>
            <div class="dept-bar-track"><div class="dept-bar-fill" data-w="${Math.round(amt / mx * 100)}" style="background:${dColors[i % dColors.length]};width:0%"></div></div>
        </div>
    `).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        container.querySelectorAll('.dept-bar-fill').forEach(b => { b.style.width = b.dataset.w + '%'; });
    }));
}

function renderActivityFeed(pending) {
    const container = document.getElementById('activity-feed');
    if (!container) return;
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const recentPay = payrolls.filter(p => p.month === now.getMonth() + 1 && p.year === now.getFullYear());
    const items = [];
    if (recentPay.length > 0) items.push({ color: '#10b981', text: `Payroll processed for ${esc(monthName)}`, time: 'This month' });
    employees.slice(0, 4).forEach((e) => {
        const today = new Date().toISOString().slice(0, 10);
        const rec = attendances.find(a => a.employeeId === e.id && a.date === today);
        if (rec?.status === 'present') items.push({ color: '#3b82f6', text: `${esc(e.firstName)} ${esc(e.lastName)} checked in`, time: 'Today' });
    });
    if (pending > 0) items.push({ color: '#f59e0b', text: `${pending} leave request${pending !== 1 ? 's' : ''} pending approval`, time: 'Now' });
    items.push({ color: '#8b5cf6', text: `${employees.length} staff active this period`, time: 'Today' });

    if (items.length === 0) {
        container.innerHTML = `<div style="font-size:0.75rem;color:var(--text-secondary);">No recent activity.</div>`;
        return;
    }
    container.innerHTML = items.map(a => `
        <div class="feed-item">
            <div class="feed-dot" style="background:${a.color};"></div>
            <div class="feed-text">${a.text}</div>
            <div class="feed-time">${esc(a.time)}</div>
        </div>
    `).join('');
}

let _animFrames = {};
function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    if (document.body.classList.contains('no-anim')) { cancelAnimationFrame(_animFrames[id]); el.textContent = target; return; }
    const start = parseInt(el.textContent) || 0;
    const diff = target - start;
    const duration = 700;
    const startTime = performance.now();
    cancelAnimationFrame(_animFrames[id]);
    function step(now) {
        const pct = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - pct, 3);
        el.textContent = Math.round(start + diff * eased);
        if (pct < 1) _animFrames[id] = requestAnimationFrame(step);
    }
    _animFrames[id] = requestAnimationFrame(step);
}

function animateDollar(id, usdTarget) {
    const el = document.getElementById(id);
    if (!el) return;
    const target = toDisplayCurrency(usdTarget);
    const symbol = currencySymbol(appCurrency);
    const decimals = appCurrency === 'JPY' ? 0 : 0; // whole numbers for the big KPI figure
    if (document.body.classList.contains('no-anim')) {
        cancelAnimationFrame(_animFrames[id]);
        el.textContent = symbol + Math.round(target).toLocaleString(undefined, { maximumFractionDigits: decimals });
        return;
    }
    const startTime = performance.now();
    const duration = 800;
    cancelAnimationFrame(_animFrames[id]);
    function step(now) {
        const pct = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - pct, 3);
        el.textContent = symbol + Math.round(target * eased).toLocaleString(undefined, { maximumFractionDigits: decimals });
        if (pct < 1) _animFrames[id] = requestAnimationFrame(step);
    }
    _animFrames[id] = requestAnimationFrame(step);
}

function renderAbsenceFeed(today) {
    const el = document.getElementById('dashboardAlertFeed');
    if (!el) return;
    const active = leaveReqs.filter(r => r.status === 'approved' && today >= r.startDate && today <= r.endDate);
    if (active.length === 0) {
        el.innerHTML = `<div class="alert-feed alert-ok"><i class="fas fa-check-circle" style="margin-right:0.5rem;"></i>All staff accounted for today.</div>`;
        return;
    }
    let html = `<div style="margin-bottom:0.875rem;"><div class="alert-feed-title">Absent Staff Today</div>`;
    active.forEach(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        if (!emp) return;
        html += `<div class="absent-entry">
            <span><strong>${esc(emp.firstName)} ${esc(emp.lastName)}</strong><span style="color:var(--text-secondary);margin:0 0.5rem;">·</span><span style="color:var(--text-secondary);font-size:0.75rem;">${esc(emp.department || '')}</span></span>
            <span class="badge badge-rose">${esc(r.leaveType)}</span>
        </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
}

// ★ FIX: updated table row text classes for better contrast ★
function renderEmployees() {
    const tbody = document.getElementById('employeesTbody');
    if (!tbody) return;
    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-sm text-slate-600 dark:text-slate-400"><div class="empty-state"><i class="fas fa-users-slash"></i>No employees yet. Click <strong>Add Employee</strong> to get started.</div></td></tr>`;
        return;
    }
    tbody.innerHTML = employees.map(e => `
        <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
            <td class="py-3 px-4 text-sm font-mono font-semibold text-slate-600 dark:text-slate-400">${esc(e.employeeId || 'N/A')}</td>
            <td class="py-3 px-4 text-sm"><div class="td-name">${avatarChip(e.firstName, e.lastName)}<div class="td-name-stack"><span class="font-semibold text-slate-900 dark:text-white">${esc(e.firstName)} ${esc(e.lastName)}</span><span class="td-sub text-slate-500 dark:text-slate-400">${esc(e.email || '')}</span></div></div></td>
            <td class="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">${esc(e.department || 'General')}</td>
            <td class="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">${esc(e.position || 'Staff')}</td>
            <td class="py-3 px-4 text-sm font-mono font-semibold text-slate-900 dark:text-white">${fmtCurrency(e.basicSalary || 0)}</td>
            <td class="py-3 px-4 text-sm text-right whitespace-nowrap">
                <button class="action-link blue" data-action="edit-emp" data-id="${esc(e.id)}" style="margin-right:0.75rem;"><i class="fas fa-pen-to-square"></i> Edit</button>
                <button class="action-link red"  data-action="del-emp" data-id="${esc(e.id)}"><i class="fas fa-trash-can"></i> Delete</button>
            </td>
        </tr>`).join('');

    const term = document.getElementById('empSearch')?.value?.toLowerCase() || '';
    if (term) filterEmployeeRows(term);
}

function filterEmployeeRows(term) {
    document.querySelectorAll('#employeesTbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
}

window.openEditEmpModal = function (id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) { showToast('Employee not found', 'error'); return; }
    document.getElementById('empId').value = emp.id;
    document.getElementById('empEmployeeId').value = emp.employeeId || '';
    document.getElementById('empFirstName').value = emp.firstName || '';
    document.getElementById('empLastName').value = emp.lastName || '';
    document.getElementById('empDepartment').value = emp.department || '';
    document.getElementById('empPosition').value = emp.position || '';
    document.getElementById('empBasicSalary').value = emp.basicSalary || 0;
    document.getElementById('empEmail').value = emp.email || '';
    document.getElementById('empPhone').value = emp.phone || '';
    document.getElementById('empModalTitle').textContent = 'Edit Employee';
    openModal('empModal');
};

window.deleteEmployee = function (id) {
    runtimeTargetDeletionId = id;
    openModal('confirmModal');
};

function renderAttendance() {
    const today = attendanceDate;
    document.getElementById('attDate').textContent = `— ${today}`;
    const picker = document.getElementById('attDatePicker');
    if (picker) picker.value = today;
    if (employees.length === 0) {
        document.getElementById('attendanceList').innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i>No employees to track.</div>';
        document.getElementById('attSummaryRow').innerHTML = '';
        return;
    }

    const statusDefs = [
        { key: 'present', icon: 'fa-check', label: 'Present' },
        { key: 'absent', icon: 'fa-xmark', label: 'Absent' },
        { key: 'late', icon: 'fa-clock', label: 'Late' },
        { key: 'half-day', icon: 'fa-circle-half-stroke', label: 'Half' }
    ];

    document.getElementById('attendanceList').innerHTML = employees.map(emp => {
        const rec = attendances.find(a => a.employeeId === emp.id && a.date === today);
        const s = rec?.status || 'present';
        const pills = statusDefs.map(d => `
            <div class="att-pill ${d.key} ${s === d.key ? 'active' : ''}" data-emp="${esc(emp.id)}" data-status="${d.key}" role="button" tabindex="0">
                <i class="fas ${d.icon}"></i><span>${d.label}</span>
            </div>`).join('');
        return `<div class="att-card">
            <div class="att-card-top">
                ${avatarChip(emp.firstName, emp.lastName)}
                <div>
                    <div class="att-card-name">${esc(emp.firstName)} ${esc(emp.lastName)}</div>
                    <div class="att-card-id">${esc(emp.employeeId)}</div>
                </div>
            </div>
            <div class="att-pills">${pills}</div>
        </div>`;
    }).join('');

    renderAttSummary(today);
}

function renderAttSummary(today) {
    const todayLogs = employees.map(emp => {
        const rec = attendances.find(a => a.employeeId === emp.id && a.date === today);
        return rec?.status || 'present';
    });
    const counts = { present: 0, absent: 0, late: 0, 'half-day': 0 };
    todayLogs.forEach(s => { if (counts[s] !== undefined) counts[s]++; });

    const cards = [
        { key: 'present', icon: 'fa-check', color: '#10b981', bg: 'rgba(16,185,129,.12)', label: 'Present' },
        { key: 'absent', icon: 'fa-xmark', color: '#ef4444', bg: 'rgba(239,68,68,.12)', label: 'Absent' },
        { key: 'late', icon: 'fa-clock', color: '#f59e0b', bg: 'rgba(245,158,11,.12)', label: 'Late' },
        { key: 'half-day', icon: 'fa-circle-half-stroke', color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', label: 'Half-day' }
    ];
    document.getElementById('attSummaryRow').innerHTML = cards.map(c => `
        <div class="glass att-summary-card">
            <div class="att-summary-icon" style="background:${c.bg};color:${c.color};"><i class="fas ${c.icon}"></i></div>
            <div><div class="att-summary-num">${counts[c.key]}</div><div class="att-summary-lbl">${c.label}</div></div>
        </div>
    `).join('');
}

window.setAttendanceStatus = function (empId, status) {
    const safeId = (window.CSS && CSS.escape) ? CSS.escape(empId) : empId.replace(/[^a-zA-Z0-9_-]/g, '');
    document.querySelectorAll(`.att-pill[data-emp="${safeId}"]`).forEach(p => {
        p.classList.toggle('active', p.dataset.status === status);
    });
    renderAttSummary(attendanceDate);
};

function renderLeaves() {
    const tbody = document.getElementById('leavesTbody');
    if (!tbody) return;

    if (leaveReqs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-sm text-slate-600 dark:text-slate-400"><div class="empty-state"><i class="fas fa-inbox"></i>No leave requests on file.</div></td></tr>`;
    } else {
        tbody.innerHTML = leaveReqs.map(lv => {
            const emp = employees.find(e => e.id === lv.employeeId) || { firstName: 'Unknown', lastName: 'Employee' };
            const days = Math.ceil((new Date(lv.endDate) - new Date(lv.startDate)) / 86400000) + 1;
            const statusBadge = lv.status === 'approved' ? 'badge-emerald' : lv.status === 'rejected' ? 'badge-rose' : 'badge-amber badge-pulse';
            const typeBadge = lv.leaveType === 'Annual Leave' ? 'badge-blue' : lv.leaveType === 'Sick Leave' ? 'badge-rose' : 'badge-gray';
            const actions = lv.status === 'pending'
                ? `<button class="action-link green" data-action="leave-status" data-id="${esc(lv.id)}" data-status="approved"><i class="fas fa-check"></i> Approve</button>
                   <button class="action-link red" data-action="leave-status" data-id="${esc(lv.id)}" data-status="rejected" style="margin-left:0.875rem;"><i class="fas fa-xmark"></i> Reject</button>`
                : `<span style="font-size:0.72rem;color:var(--text-secondary);">Processed</span>`;
            const safeHref = safeAttachmentHref(lv.attachmentData);
            const attachmentLink = safeHref
                ? `<a href="${esc(safeHref)}" download="${esc(lv.attachmentName || 'attachment')}" rel="noopener noreferrer" class="attachment-link" title="Download ${esc(lv.attachmentName || 'attachment')} (${formatFileSize(lv.attachmentSize || 0)})"><i class="fas fa-paperclip"></i> File</a>`
                : '';
            return `<tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                <td class="py-3 px-4 text-sm"><div class="td-name">${avatarChip(emp.firstName, emp.lastName)}<span class="font-semibold text-slate-900 dark:text-white">${esc(emp.firstName)} ${esc(emp.lastName)}</span></div></td>
                <td class="py-3 px-4 text-sm"><span class="badge ${typeBadge}">${esc(lv.leaveType)}</span>${attachmentLink}</td>
                <td class="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">${esc(lv.startDate)} → ${esc(lv.endDate)}</td>
                <td class="py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">${days}</td>
                <td class="py-3 px-4 text-sm"><span class="badge ${statusBadge}">${esc(lv.status)}</span></td>
                <td class="py-3 px-4 text-sm text-right">${actions}</td>
            </tr>`;
        }).join('');
    }

    const total = leaveReqs.length, pend = leaveReqs.filter(l => l.status === 'pending').length, appr = leaveReqs.filter(l => l.status === 'approved').length, rej = leaveReqs.filter(l => l.status === 'rejected').length;
    document.getElementById('leaveSummaryBar').innerHTML =
        `<span class="badge badge-gray">Total: ${total}</span>
         <span class="badge badge-amber">Pending: ${pend}</span>
         <span class="badge badge-emerald">Approved: ${appr}</span>
         <span class="badge badge-rose">Rejected: ${rej}</span>`;
}

window.updateLeaveStatus = function (id, status) {
    const lv = leaveReqs.find(l => l.id === id);
    if (!lv) return;
    lv.status = status;
    saveAll(); renderLeaves(); renderDashboard(); renderPayroll();
    showToast(status === 'approved' ? '✅ Leave approved' : '❌ Leave rejected', 'success');
};

function renderPayroll() {
    const month = parseInt(document.getElementById('payMonth').value);
    const year = parseInt(document.getElementById('payYear').value);
    const filtered = payrolls.filter(p => p.month === month && p.year === year);
    const tbody = document.getElementById('payrollTbody');

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const periodTag = document.querySelector('#payPeriodTag span');
    if (periodTag) periodTag.textContent = `${monthNames[(month - 1 + 12) % 12] || ''} ${year}`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-sm text-slate-600 dark:text-slate-400"><div class="empty-state"><i class="fas fa-calculator"></i>No payroll for ${month}/${year}. Click <strong>Process Payroll</strong> to generate.</div></td></tr>`;
        renderPaySummary(0, 0, 0, 0, 0);
        return;
    }

    let total = 0, totalBasic = 0, totalAllow = 0, totalTax = 0;
    let rows = filtered.map(p => {
        const emp = employees.find(e => e.id === p.employeeId);
        if (!emp) return '';
        total += p.netSalary; totalBasic += p.basic; totalAllow += p.allowances; totalTax += p.tax;
        const lvDays = getApprovedLeaveDays(emp.id, month, year);
        const presDays = getDaysPresent(emp.id, month, year);
        const leaveTag = lvDays > 0 ? `<span class="badge badge-emerald" style="margin-left:0.375rem;">+${lvDays}d leave</span>` : '';
        return `<tr class="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
            <td class="py-3 px-4 text-sm">
                <div class="td-name">${avatarChip(emp.firstName, emp.lastName)}<div class="td-name-stack"><span class="font-semibold text-slate-900 dark:text-white">${esc(emp.firstName)} ${esc(emp.lastName)}</span><span class="td-sub text-slate-500 dark:text-slate-400">${presDays}d present ${leaveTag}</span></div></div>
            </td>
            <td class="py-3 px-4 text-sm font-mono text-slate-700 dark:text-slate-300">${fmtCurrency(p.basic)}</td>
            <td class="py-3 px-4 text-sm font-mono text-blue-600 dark:text-blue-400">${fmtCurrency(p.allowances)}</td>
            <td class="py-3 px-4 text-sm font-mono text-rose-500 dark:text-rose-400">−${fmtCurrency(p.tax)}</td>
            <td class="py-3 px-4 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">${fmtCurrency(p.netSalary)}</td>
            <td class="py-3 px-4 text-sm text-right whitespace-nowrap"><button class="action-link blue" data-action="payslip" data-id="${esc(p.id)}"><i class="fas fa-download"></i> PDF</button></td>
        </tr>`;
    }).join('');

    rows += `<tr class="total-row">
        <td class="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Total</td>
        <td class="py-3 px-4"></td>
        <td class="py-3 px-4"></td>
        <td class="py-3 px-4"></td>
        <td class="py-3 px-4 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">${fmtCurrency(total)}</td>
        <td class="py-3 px-4"></td>
    </tr>`;

    tbody.innerHTML = rows;
    renderPaySummary(total, totalBasic, totalAllow, totalTax, filtered.length);
}

function renderPaySummary(net, basic, allow, tax, headcount) {
    const cards = [
        { key: 'net', icon: 'fa-sack-dollar', cls: 'pay-icon-net', color: '#10b981', bg: 'rgba(16,185,129,.12)', label: 'Net Payout', val: fmtCurrencyCompact(net) },
        { key: 'allow', icon: 'fa-gift', cls: 'pay-icon-allow', color: '#3b82f6', bg: 'rgba(59,130,246,.12)', label: 'Allowances', val: fmtCurrencyCompact(allow) },
        { key: 'tax', icon: 'fa-landmark', cls: 'pay-icon-tax', color: '#ef4444', bg: 'rgba(239,68,68,.12)', label: 'Tax Withheld', val: fmtCurrencyCompact(tax) },
        { key: 'headcount', icon: 'fa-user-group', cls: 'pay-icon-headcount', color: '#8b5cf6', bg: 'rgba(139,92,246,.12)', label: 'Employees Paid', val: String(headcount) }
    ];
    document.getElementById('paySummaryRow').innerHTML = cards.map(c => `
        <div class="glass pay-summary-card ${c.cls}">
            <div class="pay-summary-top">
                <span class="pay-summary-lbl">${c.label}</span>
                <div class="pay-summary-icon" style="background:${c.bg};color:${c.color};"><i class="fas ${c.icon}"></i></div>
            </div>
            <div class="pay-summary-val">${c.val}</div>
        </div>
    `).join('');
}

window.downloadPayslip = async function (payId) {
    const pay = payrolls.find(p => p.id === payId);
    if (!pay) { showToast('Payslip not found', 'error'); return; }
    const emp = employees.find(e => e.id === pay.employeeId);
    if (!emp) { showToast('Employee not found', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22); doc.setFont(undefined, 'bold');
    doc.text('PAYROLL NEXUS', 20, 20);
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text('Official Pay Statement', 20, 30);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    doc.text('Employee Details', 20, 58);
    doc.setFontSize(11); doc.setFont(undefined, 'normal');
    doc.text(`Name: ${emp.firstName} ${emp.lastName}`, 20, 70);
    doc.text(`Employee ID: ${emp.employeeId}`, 20, 80);
    doc.text(`Department: ${emp.department || '—'}`, 20, 90);
    doc.text(`Pay Period: ${pay.month}/${pay.year}`, 20, 100);

    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    doc.text('Compensation Breakdown', 20, 120);
    doc.setFontSize(11); doc.setFont(undefined, 'normal');
    doc.text(`Basic Salary:   ${fmtCurrencyCode(pay.basic)}`, 20, 132);
    doc.text(`Allowances:     ${fmtCurrencyCode(pay.allowances)}`, 20, 142);
    doc.text(`Tax Deducted:  -${fmtCurrencyCode(pay.tax)}`, 20, 152);

    doc.setFillColor(240, 247, 255);
    doc.rect(15, 162, 180, 20, 'F');
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`NET PAY: ${fmtCurrencyCode(pay.netSalary)}`, 20, 176);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 270);

    doc.save(`payslip_${esc(emp.employeeId)}_${pay.month}_${pay.year}.pdf`);
    showToast('Payslip downloaded', 'success');
};

function renderReports() {
    renderReportKPIs();
    renderReportTicker();
    renderReportDeptBars();
    renderReportPodium();

    const deptMap = {};
    employees.forEach(emp => {
        const dept = emp.department || 'General';
        const latest = payrolls.filter(p => p.employeeId === emp.id).sort((a, b) => b.year - a.year || b.month - a.month)[0];
        deptMap[dept] = (deptMap[dept] || 0) + (latest?.netSalary || 0);
    });
    const chartType = document.getElementById('chartTypeSelector')?.value || 'bar';
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e'];
    if (deptChart) deptChart.destroy();

    const ctx = document.getElementById('deptBarChart');
    if (!ctx) return;

    deptChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: Object.keys(deptMap),
            datasets: [{
                label: `Net Salary by Department (${appCurrency})`,
                data: Object.values(deptMap),
                backgroundColor: (chartType === 'pie' || chartType === 'doughnut') ? colors : chartType === 'line' ? 'rgba(59,130,246,0.1)' : '#3b82f6',
                borderColor: chartType === 'line' ? '#3b82f6' : 'transparent',
                borderWidth: chartType === 'line' ? 2.5 : 0,
                fill: chartType === 'line',
                borderRadius: chartType === 'bar' ? 8 : 0,
                tension: chartType === 'line' ? 0.35 : 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: chartTextColor() } },
                tooltip: { callbacks: { label: c => `${c.label}: ${fmtCurrency(c.parsed.y ?? c.parsed)}` } }
            },
            scales: chartType === 'bar' || chartType === 'line' ? {
                x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
                y: { ticks: { color: chartTextColor(), callback: v => fmtCurrencyCompact(v) }, grid: { color: chartGridColor() } }
            } : {}
        }
    });

    renderPayrollBreakdownChart();
    renderAttendanceTrendChart();
    renderLeaveDistChart();
}

function renderReportKPIs() {
    const cont = document.getElementById('reportKpis');
    if (!cont) return;
    const now = new Date();
    const thisM = now.getMonth() + 1, thisY = now.getFullYear();
    const thisMonthPay = payrolls.filter(p => p.month === thisM && p.year === thisY);
    const totalPay = thisMonthPay.reduce((s, p) => s + p.netSalary, 0);
    const avgPay = thisMonthPay.length ? totalPay / thisMonthPay.length : 0;
    const totalEmp = employees.length;
    const pendingLeaves = leaveReqs.filter(l => l.status === 'pending').length;
    const todayAtt = attendances.filter(a => a.date === now.toISOString().split('T')[0]);
    const presentToday = todayAtt.filter(a => a.status === 'present').length;

    const kpis = [
        { icon: 'users', label: 'Total Employees', value: totalEmp, cls: 'k-blue', delta: '+2 this month', up: true },
        { icon: 'wallet', label: 'Total Payroll', value: fmtCurrency(totalPay), cls: 'k-green', delta: `${thisMonthPay.length} processed`, up: false },
        { icon: 'chart-line', label: 'Avg Salary', value: fmtCurrency(avgPay), cls: 'k-purple', delta: 'per employee', up: false },
        { icon: 'user-check', label: 'Present Today', value: presentToday, cls: 'k-blue', delta: `${totalEmp ? Math.round(presentToday / totalEmp * 100) : 0}% rate`, up: true },
        { icon: 'hourglass-half', label: 'Pending Leaves', value: pendingLeaves, cls: pendingLeaves > 5 ? 'k-red' : 'k-amber', delta: 'awaiting review', up: false }
    ];

    cont.innerHTML = kpis.map(k => `
        <div class="glass report-kpi ${k.cls}">
            <div class="report-kpi-icon"><i class="fas fa-${k.icon}"></i></div>
            <div class="report-kpi-label">${k.label}</div>
            <div class="report-kpi-value">${k.value}</div>
            <div class="report-kpi-delta ${k.up ? 'up' : ''}">${k.up ? '<i class="fas fa-arrow-up"></i>' : ''} ${k.delta}</div>
        </div>
    `).join('');
}

function renderReportTicker() {
    const cont = document.getElementById('reportTicker');
    if (!cont) return;
    const insights = [
        `<i class="fas fa-bolt"></i> ${employees.length} employees actively managed across ${[...new Set(employees.map(e => e.department))].length} departments`,
        `<i class="fas fa-chart-line"></i> ${payrolls.length} payroll records processed with ${fmtCurrency(payrolls.reduce((s, p) => s + p.netSalary, 0))} total disbursed`,
        `<i class="fas fa-calendar-check"></i> ${attendances.filter(a => a.status === 'present').length} attendance marks logged this period`
    ];
    cont.innerHTML = insights.map(txt => `<div class="report-ticker-item">${txt}</div>`).join('');
}

function renderReportDeptBars() {
    const cont = document.getElementById('reportDeptBars');
    if (!cont) return;
    const deptMap = {};
    employees.forEach(emp => {
        const dept = emp.department || 'General';
        const latest = payrolls.filter(p => p.employeeId === emp.id).sort((a, b) => b.year - a.year || b.month - a.month)[0];
        deptMap[dept] = (deptMap[dept] || 0) + (latest?.netSalary || 0);
    });
    const total = Object.values(deptMap).reduce((s, v) => s + v, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    const sorted = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);

    cont.innerHTML = sorted.map(([dept, amt], i) => {
        const pct = total ? Math.round(amt / total * 100) : 0;
        const color = colors[i % colors.length];
        return `
            <div class="dept-bar-row" data-dept="${esc(dept)}">
                <div class="dept-bar-name">${esc(dept)}</div>
                <div class="dept-bar-track">
                    <div class="dept-bar-fill" style="--barColor:${color};width:${pct}%"></div>
                </div>
                <div class="dept-bar-pct">${pct}%</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.dept-bar-row').forEach(row => {
        row.addEventListener('click', () => {
            document.querySelectorAll('.dept-bar-row').forEach(r => r.classList.remove('active'));
            row.classList.add('active');
        });
    });
}

function renderReportPodium() {
    const cont = document.getElementById('reportTopEarners');
    if (!cont) return;
    const empPay = employees.map(emp => {
        const latest = payrolls.filter(p => p.employeeId === emp.id).sort((a, b) => b.year - a.year || b.month - a.month)[0];
        return { emp, pay: latest?.netSalary || 0 };
    }).sort((a, b) => b.pay - a.pay).slice(0, 5);

    cont.innerHTML = empPay.map((item, i) => {
        const rankCls = i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
        return `
            <div class="podium-row">
                <div class="podium-rank ${rankCls}">${i + 1}</div>
                <div class="podium-emp">
                    ${avatarChip(item.emp.firstName, item.emp.lastName)}
                    <div>
                        <div class="podium-name">${esc(item.emp.firstName)} ${esc(item.emp.lastName)}</div>
                        <div class="podium-dept">${esc(item.emp.department || 'General')}</div>
                    </div>
                </div>
                <div class="podium-amt">${fmtCurrency(item.pay)}</div>
            </div>
        `;
    }).join('');
}

function getCurrentPeriodTotals() {
    const now = new Date();
    const m = now.getMonth() + 1, y = now.getFullYear();
    const set = payrolls.filter(p => p.month === m && p.year === y);
    return {
        basic: set.reduce((s, p) => s + p.basic, 0),
        allowances: set.reduce((s, p) => s + p.allowances, 0),
        tax: set.reduce((s, p) => s + p.tax, 0),
        net: set.reduce((s, p) => s + p.netSalary, 0)
    };
}

function renderPayrollBreakdownChart() {
    const ctx = document.getElementById('payrollBreakdownChart');
    if (!ctx) return;
    if (payrollBreakdownChart) payrollBreakdownChart.destroy();
    const t = getCurrentPeriodTotals();
    payrollBreakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Basic Pay', 'Allowances', 'Tax Withheld', 'Net Payout'],
            datasets: [{
                data: [t.basic, t.allowances, t.tax, t.net],
                backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => fmtCurrency(c.parsed.y) } }
            },
            scales: {
                x: { ticks: { color: chartTextColor() }, grid: { display: false } },
                y: { ticks: { color: chartTextColor(), callback: v => fmtCurrencyCompact(v) }, grid: { color: chartGridColor() } }
            }
        }
    });
}

function renderAttendanceTrendChart() {
    const ctx = document.getElementById('attendanceTrendChart');
    if (!ctx) return;
    if (attendanceTrendChart) attendanceTrendChart.destroy();
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [], rates = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLogs = attendances.filter(a => a.date.startsWith(prefix));
        const present = monthLogs.filter(a => a.status === 'present').length;
        const rate = monthLogs.length ? Math.round(present / monthLogs.length * 100) : 0;
        labels.push(monthNames[d.getMonth()]);
        rates.push(rate);
    }
    attendanceTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Attendance rate (%)',
                data: rates,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.12)',
                fill: true, tension: 0.35, borderWidth: 2.5,
                pointBackgroundColor: '#10b981', pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => `${c.parsed.y}% present` } }
            },
            scales: {
                x: { ticks: { color: chartTextColor() }, grid: { display: false } },
                y: { min: 0, max: 100, ticks: { color: chartTextColor(), callback: v => v + '%' }, grid: { color: chartGridColor() } }
            }
        }
    });
}

function renderLeaveDistChart() {
    const ctx = document.getElementById('leaveDistChart');
    if (!ctx) return;
    if (leaveDistChart) leaveDistChart.destroy();
    const types = ['Annual Leave', 'Sick Leave', 'Unpaid Leave'];
    const counts = types.map(t => leaveReqs.filter(l => l.leaveType === t).length);
    const hasData = counts.some(c => c > 0);
    leaveDistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: types,
            datasets: [{
                data: hasData ? counts : [1, 1, 1],
                backgroundColor: ['#3b82f6', '#ef4444', '#94a3b8'],
                borderColor: 'transparent',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: chartTextColor(), boxWidth: 10, font: { size: 10 } } },
                tooltip: { enabled: hasData, callbacks: { label: c => `${c.label}: ${c.parsed} request${c.parsed === 1 ? '' : 's'}` } }
            }
        }
    });
}

async function exportReportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20); doc.setFont(undefined, 'bold');
    doc.text('PAYROLL NEXUS', 15, 16);
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text(`Reports & Analytics - generated ${new Date().toLocaleString()}`, 15, 24);

    let y = 42;
    doc.setTextColor(15, 23, 42);

    const charts = [
        { chart: deptChart, title: 'Salary by Department' },
        { chart: payrollBreakdownChart, title: 'Payroll Cost Breakdown - Current Period' },
        { chart: attendanceTrendChart, title: 'Attendance Trend - 6 Months' },
        { chart: leaveDistChart, title: 'Leave Type Distribution' }
    ];

    charts.forEach(c => {
        if (!c.chart) return;
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text(c.title, 15, y);
        y += 5;
        try {
            const img = c.chart.toBase64Image();
            doc.addImage(img, 'PNG', 15, y, 180, 78);
        } catch (err) { console.error('Chart export failed:', err); }
        y += 88;
    });

    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Top Earners - Current Period', 15, y);
    y += 8;
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    const payMap = getLatestPayrollMap();
    const ranked = employees.map(e => ({ emp: e, amt: payMap[e.id] ?? 0 })).filter(r => r.amt > 0).sort((a, b) => b.amt - a.amt).slice(0, 5);
    if (ranked.length === 0) {
        doc.text('No payroll runs recorded yet.', 15, y);
        y += 7;
    } else {
        ranked.forEach((r, i) => {
            doc.text(`${i + 1}. ${r.emp.firstName} ${r.emp.lastName} (${r.emp.department || 'General'}) - ${fmtCurrencyCode(r.amt)}`, 15, y);
            y += 7;
        });
    }

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    const rateNote = fxTimestamp ? new Date(fxTimestamp).toLocaleString() : 'N/A';
    doc.text(`Figures shown in ${appCurrency} using exchange rates as of ${rateNote}.`, 15, 287);

    doc.save(`payroll_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('Report PDF downloaded', 'success');
}

function exportToExcel() {
    const ws = XLSX.utils.aoa_to_sheet([
        ['Employee ID', 'First Name', 'Last Name', 'Department', 'Position', 'Basic Salary (USD)', `Basic Salary (${appCurrency})`, 'Email'],
        ...employees.map(e => [e.employeeId, e.firstName, e.lastName, e.department, e.position, e.basicSalary, Math.round(toDisplayCurrency(e.basicSalary || 0) * 100) / 100, e.email])
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');

    if (payrolls.length) {
        const payRows = payrolls.slice().sort((a, b) => b.year - a.year || b.month - a.month).map(p => {
            const emp = employees.find(e => e.id === p.employeeId);
            return [emp ? emp.employeeId : 'N/A', emp ? `${emp.firstName} ${emp.lastName}` : 'Archived', p.month, p.year,
            Math.round(p.basic * 100) / 100, Math.round(p.allowances * 100) / 100, Math.round(p.tax * 100) / 100, Math.round(p.netSalary * 100) / 100];
        });
        const wsPay = XLSX.utils.aoa_to_sheet([
            ['Employee ID', 'Name', 'Month', 'Year', 'Basic (USD)', 'Allowances (USD)', 'Tax (USD)', 'Net Salary (USD)'],
            ...payRows
        ]);
        XLSX.utils.book_append_sheet(wb, wsPay, 'Payroll');
    }

    const fxRows = CURRENCIES.map(c => [c.code, c.name, c.code === 'USD' ? 1 : (fxRates[c.code] ?? 'n/a')]);
    const wsFx = XLSX.utils.aoa_to_sheet([['Currency Code', 'Name', 'Rate vs USD'], ...fxRows]);
    XLSX.utils.book_append_sheet(wb, wsFx, 'Exchange Rates');

    XLSX.writeFile(wb, `payroll_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Exported to Excel', 'success');
}

function setTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.body.classList.toggle('light-mode', theme === 'light');
    document.getElementById('themeIcon').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('nexus_theme', theme);
    try { renderDashboard(); } catch (err) { console.error('renderDashboard failed in setTheme', err); }
    try { renderReports(); } catch (err) { console.error('renderReports failed in setTheme', err); }
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
            document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
            btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
            const section = document.getElementById(tab + 'Section');
            if (section) section.classList.remove('hidden');
            updateTabIndicator();
            if (tab === 'dashboard') renderDashboard();
            if (tab === 'employees') renderEmployees();
            if (tab === 'attendance') renderAttendance();
            if (tab === 'leaves') renderLeaves();
            if (tab === 'payroll') renderPayroll();
            if (tab === 'reports') renderReports();
        });
    });
}

document.getElementById('themeToggle').addEventListener('click', () => {
    setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
});

document.getElementById('addEmpBtn').addEventListener('click', () => {
    document.getElementById('empForm').reset();
    document.getElementById('empId').value = '';
    document.getElementById('empModalTitle').textContent = 'Add New Employee';
    openModal('empModal');
});

document.getElementById('closeEmpModal').addEventListener('click', () => closeModal('empModal'));
document.getElementById('closeEmpModalBtn').addEventListener('click', () => closeModal('empModal'));

document.getElementById('empForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const targetId = document.getElementById('empId').value;
    const salary = parseFloat(document.getElementById('empBasicSalary').value);
    const email = document.getElementById('empEmail').value.trim();

    if (!validateSalary(salary)) { showToast('❌ Invalid salary value.', 'error'); return; }
    if (!validateEmail(email)) { showToast('❌ Invalid email format.', 'error'); return; }

    const data = {
        id: targetId || 'emp_' + Date.now(),
        employeeId: sanitizeText(document.getElementById('empEmployeeId').value, 50),
        firstName: sanitizeText(document.getElementById('empFirstName').value, 80),
        lastName: sanitizeText(document.getElementById('empLastName').value, 80),
        department: sanitizeText(document.getElementById('empDepartment').value, 100),
        position: sanitizeText(document.getElementById('empPosition').value, 100),
        basicSalary: salary,
        email: sanitizeText(email, 200),
        phone: sanitizeText(document.getElementById('empPhone').value, 50)
    };

    if (!data.employeeId || !data.firstName || !data.lastName) {
        showToast('❌ ID, first and last name are required.', 'error'); return;
    }

    if (targetId) {
        const idx = employees.findIndex(e => e.id === targetId);
        if (idx !== -1) { employees[idx] = data; showToast('Employee updated', 'success'); }
    } else {
        if (employees.some(e => e.employeeId === data.employeeId)) {
            showToast('❌ Employee ID already exists.', 'error'); return;
        }
        employees.push(data);
        showToast('Employee added', 'success');
    }
    saveAll(); closeModal('empModal');
    renderEmployees(); renderAttendance(); renderDashboard();
});

document.getElementById('closeLeaveModal').addEventListener('click', () => closeModal('leaveModal'));
document.getElementById('closeLeaveModalBtn').addEventListener('click', () => closeModal('leaveModal'));

const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
let pendingLeaveAttachment = null;

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resetLeaveAttachmentUI() {
    pendingLeaveAttachment = null;
    const input = document.getElementById('leaveAttachment');
    if (input) input.value = '';
    document.getElementById('leaveAttachDropzone')?.classList.remove('hidden');
    document.getElementById('leaveAttachChip')?.classList.add('hidden');
}

document.getElementById('leaveAttachment').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_ATTACHMENT_EXT.includes(ext)) {
        showToast('❌ Unsupported file type. Use PDF, JPG, PNG, DOC, or DOCX.', 'error');
        this.value = '';
        return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        showToast(`❌ File too large (max ${formatFileSize(MAX_ATTACHMENT_BYTES)}).`, 'error');
        this.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        pendingLeaveAttachment = {
            name: sanitizeText(file.name, 150),
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: reader.result
        };
        document.getElementById('leaveAttachChipName').textContent = pendingLeaveAttachment.name;
        document.getElementById('leaveAttachChipSize').textContent = formatFileSize(pendingLeaveAttachment.size);
        document.getElementById('leaveAttachDropzone').classList.add('hidden');
        document.getElementById('leaveAttachChip').classList.remove('hidden');
    };
    reader.onerror = () => showToast('❌ Could not read file.', 'error');
    reader.readAsDataURL(file);
});

document.getElementById('leaveAttachRemoveBtn').addEventListener('click', () => resetLeaveAttachmentUI());

document.getElementById('newLeaveBtn').addEventListener('click', () => {
    const sel = document.getElementById('leaveEmpId');
    sel.innerHTML = employees.map(e => `<option value="${esc(e.id)}">${esc(e.firstName)} ${esc(e.lastName)}</option>`).join('');
    resetLeaveAttachmentUI();
    openModal('leaveModal');
});

document.getElementById('leaveForm').addEventListener('submit', e => {
    e.preventDefault();
    const start = document.getElementById('leaveStart').value;
    const end = document.getElementById('leaveEnd').value;
    if (!start || !end) { showToast('❌ Both dates are required.', 'error'); return; }
    if (start > end) { showToast('❌ End date must be after start date.', 'error'); return; }
    const empId = document.getElementById('leaveEmpId').value;
    if (!employees.find(e => e.id === empId)) { showToast('❌ Invalid employee.', 'error'); return; }

    const leaveRecord = {
        id: 'leave' + Date.now(),
        employeeId: empId,
        leaveType: document.getElementById('leaveType').value,
        startDate: start,
        endDate: end,
        reason: sanitizeText(document.getElementById('leaveReason').value, 500),
        status: 'pending'
    };
    if (pendingLeaveAttachment) {
        leaveRecord.attachmentName = pendingLeaveAttachment.name;
        leaveRecord.attachmentType = pendingLeaveAttachment.type;
        leaveRecord.attachmentSize = pendingLeaveAttachment.size;
        leaveRecord.attachmentData = pendingLeaveAttachment.dataUrl;
    }
    leaveReqs.push(leaveRecord);

    resetLeaveAttachmentUI();
    saveAll(); closeModal('leaveModal');
    renderLeaves(); renderDashboard();
    showToast('Leave request submitted', 'success');
});


document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
    closeModal('confirmModal'); runtimeTargetDeletionId = null;
});
document.getElementById('executeConfirmBtn').addEventListener('click', () => {
    if (!runtimeTargetDeletionId) return;
    const id = runtimeTargetDeletionId;
    employees = employees.filter(e => e.id !== id);
    attendances = attendances.filter(a => a.employeeId !== id);
    leaveReqs = leaveReqs.filter(l => l.employeeId !== id);
    payrolls = payrolls.filter(p => p.employeeId !== id);
    saveAll();
    closeModal('confirmModal'); runtimeTargetDeletionId = null;
    renderEmployees(); renderAttendance(); renderLeaves(); renderPayroll(); renderDashboard(); renderReports();
    showToast('Employee permanently deleted', 'success');
});

document.getElementById('saveAttendanceBtn').addEventListener('click', () => {
    const today = attendanceDate;
    const allowed = ['present', 'absent', 'late', 'half-day'];
    employees.forEach(emp => {
        const safeId = (window.CSS && CSS.escape) ? CSS.escape(emp.id) : emp.id.replace(/[^a-zA-Z0-9_-]/g, '');
        const activePill = document.querySelector(`.att-pill.active[data-emp="${safeId}"]`);
        const val = (activePill && allowed.includes(activePill.dataset.status)) ? activePill.dataset.status : 'present';
        const existing = attendances.find(a => a.employeeId === emp.id && a.date === today);
        if (existing) existing.status = val;
        else attendances.push({ id: `att-${emp.id}-${today}`, employeeId: emp.id, date: today, status: val });
    });
    saveAll(); renderDashboard(); renderAttendance();
    showToast('Attendance saved', 'success');
});

document.getElementById('markAllPresentBtn').addEventListener('click', () => {
    document.querySelectorAll('.att-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.status === 'present');
    });
    renderAttSummary(attendanceDate);
    showToast('All marked present — click Save to confirm', 'info');
});

document.getElementById('runPayrollBtn').addEventListener('click', () => {
    const m = parseInt(document.getElementById('payMonth').value);
    const y = parseInt(document.getElementById('payYear').value);
    if (isNaN(m) || isNaN(y) || y < 1900 || y > 2200) { showToast('❌ Invalid month/year.', 'error'); return; }
    runPayrollEngine(m, y); renderPayroll(); renderDashboard();
});

document.getElementById('payrollHistoryBtn').addEventListener('click', () => {
    const container = document.getElementById('historyModalContent');
    if (payrolls.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i>No payroll records yet.</div>`;
    } else {
        container.innerHTML = payrolls.slice().sort((a, b) => b.year - a.year || b.month - a.month).map(p => {
            const emp = employees.find(e => e.id === p.employeeId);
            const name = emp ? `${esc(emp.firstName)} ${esc(emp.lastName)}` : 'Archived Profile';
            return `<div class="history-entry">
                <div>
                    <div style="font-weight:700;font-size:0.875rem;">${name}</div>
                    <div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px;">${String(p.month).padStart(2, '0')}/${p.year}</div>
                </div>
                <span class="td-mono text-emerald-600 dark:text-emerald-400 font-bold" style="font-size:0.875rem;">${fmtCurrency(parseFloat(p.netSalary))}</span>
            </div>`;
        }).join('');
    }
    openModal('historyModal');
});

document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
document.getElementById('chartTypeSelector').addEventListener('change', renderReports);
document.getElementById('exportReportPdfBtn').addEventListener('click', exportReportPDF);

// ── Chart expand functionality ──
document.querySelectorAll('.chart-expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chartId = btn.dataset.expandTarget;
        const chartCanvas = document.getElementById(chartId);
        if (!chartCanvas) return;

        const overlay = document.createElement('div');
        overlay.className = 'report-expand-overlay';
        overlay.innerHTML = `
            <div class="report-expand-card">
                <div class="report-expand-head">
                    <div class="report-expand-title">
                        <i class="fas fa-chart-area"></i> ${btn.closest('.chart-card').querySelector('.chart-title').childNodes[0].textContent.trim()}
                    </div>
                    <button class="report-expand-close"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="report-expand-body">
                    <canvas id="expand-${chartId}"></canvas>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.classList.add('report-expanded');

        const expandedCanvas = document.getElementById(`expand-${chartId}`);
        const originalChart = Chart.getChart(chartCanvas);
        if (originalChart && expandedCanvas) {
            new Chart(expandedCanvas, {
                type: originalChart.config.type,
                data: originalChart.config.data,
                options: { ...originalChart.config.options, maintainAspectRatio: false }
            });
        }

        const closeBtn = overlay.querySelector('.report-expand-close');
        closeBtn.addEventListener('click', () => {
            document.body.classList.remove('report-expanded');
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.classList.remove('report-expanded');
                overlay.remove();
            }
        });
    });
});

// ── Global animation toggle ──
let globalAnimsEnabled = localStorage.getItem('globalAnimsEnabled') !== 'false'; // default true
function applyGlobalAnimState() {
    document.body.classList.toggle('no-anim', !globalAnimsEnabled);
    // Clear any residual JS-driven transforms so cards don't stay stuck mid-tilt
    // when animations are switched off while the pointer is hovering them.
    if (!globalAnimsEnabled) {
        document.querySelectorAll('.tilt-card').forEach(c => {
            c.style.transform = '';
            c.classList.remove('tilting');
        });
    }
    const animBtn = document.getElementById('animToggle');
    const animIcon = document.getElementById('animIcon');
    if (animBtn) {
        animBtn.classList.toggle('active', globalAnimsEnabled);
        animBtn.setAttribute('aria-pressed', String(globalAnimsEnabled));
        animBtn.title = globalAnimsEnabled ? 'Disable all animations' : 'Enable all animations';
    }
    if (animIcon) {
        animIcon.className = globalAnimsEnabled ? 'fas fa-magic-wand-sparkles' : 'fas fa-magic';
    }
}
applyGlobalAnimState();

document.getElementById('animToggle')?.addEventListener('click', () => {
    globalAnimsEnabled = !globalAnimsEnabled;
    localStorage.setItem('globalAnimsEnabled', String(globalAnimsEnabled));
    applyGlobalAnimState();
    showToast(globalAnimsEnabled ? '✓ Animations enabled' : '✓ Animations disabled', 'info');
});

// ── Report year filter ──
const reportYearFilter = document.getElementById('reportYearFilter');
if (reportYearFilter) {
    const years = [...new Set(payrolls.map(p => p.year))].sort((a, b) => b - a);
    if (years.length) {
        reportYearFilter.innerHTML = '<option value="all">All periods</option>' +
            years.map(y => `<option value="${y}">${y}</option>`).join('');
    }
    reportYearFilter.addEventListener('change', () => {
        // Filter logic can be added here if needed
        showToast(`Viewing ${reportYearFilter.value === 'all' ? 'all periods' : reportYearFilter.value}`, 'info');
    });
}

document.getElementById('empSearch').addEventListener('input', function () {
    filterEmployeeRows(this.value.toLowerCase());
});

document.getElementById('backupBtn').addEventListener('click', () => {
    const data = JSON.stringify({ employees, attendances, leaveReqs, payrolls, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup downloaded', 'success');
});

document.getElementById('importFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('❌ File too large (max 5 MB).', 'error'); this.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
        const parsed = safeParse(ev.target.result);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { showToast('❌ Invalid backup file.', 'error'); return; }
        const sEmp = sanitizeImportedArray(parsed.employees, IMPORT_SPECS.employees);
        const sAtt = sanitizeImportedArray(parsed.attendances, IMPORT_SPECS.attendances);
        const sLv = sanitizeImportedArray(parsed.leaveReqs, IMPORT_SPECS.leaveReqs);
        const sPay = sanitizeImportedArray(parsed.payrolls, IMPORT_SPECS.payrolls);
        if (!sEmp && !sAtt && !sLv && !sPay) { showToast('❌ Backup contains no recognizable data.', 'error'); return; }
        if (sEmp) employees = sEmp;
        if (sAtt) attendances = sAtt;
        if (sLv) leaveReqs = sLv;
        if (sPay) payrolls = sPay;
        saveAll();
        renderDashboard(); renderEmployees(); renderAttendance(); renderLeaves(); renderPayroll(); renderReports();
        showToast('✅ Data restored successfully', 'success');
    };
    reader.readAsText(file);
    this.value = '';
});

/* ════════════════════════ DYNAMIC FEATURES ════════════════════════ */
let _clockInterval = null;

function tick() {
    const now = new Date();
    const dateEl = document.getElementById('liveClockDate');
    const timeEl = document.getElementById('liveClockTime');
    
    if (dateEl) {
        dateEl.textContent = fmtDate(now, { weekday: 'short', month: 'short' });
    }
    if (timeEl) {
        timeEl.textContent = fmtTime(now, { includeSeconds: true, hour12: true });
    }
}

function startLiveClock() {
    tick();
    if (_clockInterval) clearInterval(_clockInterval);
    _clockInterval = setInterval(tick, 1000);
}

function updateClockForCurrency() {
    const dateEl = document.getElementById('liveClockDate');
    const timeEl = document.getElementById('liveClockTime');
    const country = getCurrencyCountry(appCurrency);
    
    if (dateEl) {
        const existing = dateEl.querySelector('.tz-label');
        if (!existing) {
            const label = document.createElement('span');
            label.className = 'tz-label';
            label.style.cssText = 'font-size:0.5rem;margin-left:4px;color:var(--text-muted);font-weight:600;';
            dateEl.appendChild(label);
        }
        dateEl.querySelector('.tz-label').textContent = country;
    }
    if (timeEl) {
        timeEl.title = `${getCurrencyTimezone(appCurrency)} time`;
    }
    tick();
}

function updateAttendanceDate(newDate) {
    attendanceDate = newDate;
    renderAttendance();
}

document.getElementById('attPrevDay')?.addEventListener('click', () => {
    const d = new Date(attendanceDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    updateAttendanceDate(d.toISOString().slice(0, 10));
});
document.getElementById('attNextDay')?.addEventListener('click', () => {
    const d = new Date(attendanceDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    updateAttendanceDate(d.toISOString().slice(0, 10));
});
document.getElementById('attTodayBtn')?.addEventListener('click', () => {
    updateAttendanceDate(new Date().toISOString().slice(0, 10));
});
document.getElementById('attDatePicker')?.addEventListener('change', (e) => {
    if (e.target.value) updateAttendanceDate(e.target.value);
});

function exportAttendanceCSV() {
    const rows = [['Employee ID', 'First Name', 'Last Name', 'Department', 'Date', 'Status']];
    employees.forEach(emp => {
        const rec = attendances.find(a => a.employeeId === emp.id && a.date === attendanceDate);
        rows.push([emp.employeeId, emp.firstName, emp.lastName, emp.department || 'General', attendanceDate, rec?.status || 'present']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${attendanceDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Attendance CSV downloaded', 'success');
}
document.getElementById('exportAttCSVBtn')?.addEventListener('click', exportAttendanceCSV);

/* ── Sortable tables ── */
function initSortableTables() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const tableId = th.closest('table').id;
            const key = th.dataset.sort;
            const state = tableSortState[tableId] || { key: null, dir: 1 };
            if (state.key === key) state.dir *= -1;
            else { state.key = key; state.dir = 1; }
            tableSortState[tableId] = state;

            document.querySelectorAll(`#${tableId} th.sortable .sort-icon`).forEach(ic => {
                ic.className = 'fas fa-sort sort-icon';
            });
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = `fas fa-sort-${state.dir === 1 ? 'up' : 'down'} sort-icon`;

            let rows;
            let m = null, y = null;
            if (tableId === 'employeesTable') rows = employees.slice();
            else if (tableId === 'leavesTable') rows = leaveReqs.slice();
            else if (tableId === 'payrollTable') {
                m = parseInt(document.getElementById('payMonth').value);
                y = parseInt(document.getElementById('payYear').value);
                rows = payrolls.filter(p => p.month === m && p.year === y);
            } else return;

            const getVal = (row) => {
                if (tableId === 'employeesTable') {
                    if (key === 'name') return `${row.firstName} ${row.lastName}`;
                    if (key === 'salary') return row.basicSalary;
                    return row[key];
                }
                if (tableId === 'leavesTable') {
                    if (key === 'employee') return employees.find(e => e.id === row.employeeId)?.firstName || '';
                    if (key === 'type') return row.leaveType;
                    if (key === 'dates') return row.startDate;
                    if (key === 'days') return Math.ceil((new Date(row.endDate) - new Date(row.startDate)) / 86400000) + 1;
                    return row[key];
                }
                if (tableId === 'payrollTable') {
                    if (key === 'employee') return employees.find(e => e.id === row.employeeId)?.firstName || '';
                    if (key === 'net') return row.netSalary;
                    return row[key];
                }
            };
            rows.sort((a, b) => {
                let va = getVal(a), vb = getVal(b);
                if (typeof va === 'string') { va = va.toLowerCase(); vb = String(vb).toLowerCase(); }
                return (va > vb ? 1 : va < vb ? -1 : 0) * state.dir;
            });

            if (tableId === 'employeesTable') employees = rows;
            else if (tableId === 'leavesTable') leaveReqs = rows;
            else if (tableId === 'payrollTable') payrolls = [...payrolls.filter(p => !(p.month === m && p.year === y)), ...rows];

            renderEmployees(); renderLeaves(); renderPayroll();

            // Re-apply active filters after re-render
            const deptSel = document.getElementById('deptFilter');
            if (deptSel && deptSel.value) deptSel.dispatchEvent(new Event('change'));
            const empTerm = document.getElementById('empSearch')?.value || '';
            if (empTerm) filterEmployeeRows(empTerm.toLowerCase());
            const leaveTerm = document.getElementById('leaveSearch')?.value || '';
            if (leaveTerm) applyLeaveSearch(leaveTerm);
            const payTerm = document.getElementById('paySearch')?.value || '';
            if (payTerm) applyPaySearch(payTerm);
        });
    });
}

/* ── Department filter ── */
function populateDeptFilter() {
    const sel = document.getElementById('deptFilter');
    if (!sel) return;
    const depts = [...new Set(employees.map(e => e.department || 'General'))].sort();
    sel.innerHTML = '<option value="">All Departments</option>' +
        depts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
}
document.getElementById('deptFilter')?.addEventListener('change', function () {
    const val = this.value.toLowerCase();
    document.querySelectorAll('#employeesTbody tr').forEach(row => {
        row.style.display = (!val || row.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
    // Re-apply the employee search term if one is active
    const empTerm = document.getElementById('empSearch')?.value?.toLowerCase() || '';
    if (empTerm) filterEmployeeRows(empTerm);
});

/* ── Search leaves & payroll ── */
function applyLeaveSearch(term) {
    term = (term || '').toLowerCase();
    document.querySelectorAll('#leavesTbody tr').forEach(row => {
        row.style.display = !term || row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
}
function applyPaySearch(term) {
    term = (term || '').toLowerCase();
    document.querySelectorAll('#payrollTbody tr').forEach(row => {
        row.style.display = !term || row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
}
document.getElementById('leaveSearch')?.addEventListener('input', (e) => applyLeaveSearch(e.target.value));
document.getElementById('paySearch')?.addEventListener('input', (e) => applyPaySearch(e.target.value));

/* ── Drag & drop for leave attachment ── */
const attDropzone = document.getElementById('leaveAttachDropzone');
if (attDropzone) {
    ['dragenter', 'dragover'].forEach(evt => attDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        attDropzone.style.borderColor = 'var(--accent)';
        attDropzone.style.background = 'rgba(59,130,246,0.05)';
    }));
    ['dragleave', 'drop'].forEach(evt => attDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        attDropzone.style.borderColor = '';
        attDropzone.style.background = '';
    }));
    attDropzone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById('leaveAttachment').files = dt.files;
        document.getElementById('leaveAttachment').dispatchEvent(new Event('change'));
    });
}

/* ════════════════════════ CURRENCY UI WIRING ════════════════════════ */
function populateCurrencySelectors() {
    const headerSel = document.getElementById('currencySelect');
    if (headerSel) {
        headerSel.innerHTML = CURRENCIES.map(c => `<option value="${esc(c.code)}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
        headerSel.value = appCurrency;
    }
    const fromSel = document.getElementById('convFrom');
    const toSel = document.getElementById('convTo');
    if (fromSel && toSel) {
        const opts = CURRENCIES.map(c => `<option value="${esc(c.code)}">${esc(c.code)} — ${esc(c.name)}</option>`).join('');
        if (!fromSel.options.length) fromSel.innerHTML = opts;
        if (!toSel.options.length) toSel.innerHTML = opts;
        if (!fromSel.value) fromSel.value = 'USD';
        if (!toSel.value) toSel.value = appCurrency === 'USD' ? 'EUR' : appCurrency;
    }
}

function updateConversion() {
    const amountEl = document.getElementById('convAmount');
    const fromEl = document.getElementById('convFrom');
    const toEl = document.getElementById('convTo');
    const resultEl = document.getElementById('convResult');
    const rateLineEl = document.getElementById('convRateLine');
    const tableEl = document.getElementById('convQuickTable');
    if (!amountEl || !fromEl || !toEl || !resultEl) return;

    const amount = parseFloat(amountEl.value) || 0;
    const from = fromEl.value, to = toEl.value;
    const converted = convertBetween(amount, from, to);

    if (converted === null) {
        resultEl.textContent = 'Rates unavailable';
        if (rateLineEl) rateLineEl.textContent = 'Connect to the internet and refresh rates to convert.';
    } else {
        const fromInfo = currencyInfo(from), toInfo = currencyInfo(to);
        resultEl.textContent = `${fromInfo.symbol}${amount.toLocaleString()} = ${toInfo.symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
        if (rateLineEl) {
            const unitRate = convertBetween(1, from, to);
            rateLineEl.textContent = `1 ${from} = ${unitRate !== null ? unitRate.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'} ${to}`;
        }
    }

    if (tableEl) {
        const others = CURRENCIES.filter(c => c.code !== from).slice(0, 6);
        tableEl.innerHTML = others.map(c => {
            const v = convertBetween(1, from, c.code);
            return `<div class="conv-quick-item"><span class="conv-quick-code">${esc(c.code)}</span><span class="conv-quick-val">${v !== null ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}</span></div>`;
        }).join('');
    }
}

document.getElementById('currencySelect').addEventListener('change', function () {
    appCurrency = this.value;
    localStorage.setItem('nexus_currency', appCurrency);
    updateClockForCurrency();
    updateFxStatusUI();
    try { renderDashboard(); } catch (err) { console.error('renderDashboard failed on currency change', err); }
    try { renderEmployees(); } catch (err) { console.error('renderEmployees failed on currency change', err); }
    try { renderPayroll(); } catch (err) { console.error('renderPayroll failed on currency change', err); }
    try { renderReports(); } catch (err) { console.error('renderReports failed on currency change', err); }
    try { renderFxSnapshot(); } catch (err) { console.error('renderFxSnapshot failed on currency change', err); }
    showToast(`${getCurrencyFullName(appCurrency)} (${getCurrencyTimezone(appCurrency)})`, 'info');
});

document.getElementById('converterBtn').addEventListener('click', async () => {
    populateCurrencySelectors();
    openModal('currencyModal');
    updateConversion();
    if (fxStatus !== 'live') {
        await fetchFxRates();
        updateConversion();
        try { renderFxSnapshot(); } catch (err) { console.error('renderFxSnapshot error:', err); }
    }
});

const convAmountEl = document.getElementById('convAmount');
if (convAmountEl) {
    convAmountEl.addEventListener('input', updateConversion);
    convAmountEl.addEventListener('change', updateConversion);
}
const convFromEl = document.getElementById('convFrom');
if (convFromEl) {
    convFromEl.addEventListener('input', updateConversion);
    convFromEl.addEventListener('change', updateConversion);
}
const convToEl = document.getElementById('convTo');
if (convToEl) {
    convToEl.addEventListener('input', updateConversion);
    convToEl.addEventListener('change', updateConversion);
}

const convSwapBtnEl = document.getElementById('convSwapBtn');
if (convSwapBtnEl) {
    convSwapBtnEl.addEventListener('click', () => {
        const fromEl = document.getElementById('convFrom');
        const toEl = document.getElementById('convTo');
        if (fromEl && toEl) {
            const tmp = fromEl.value;
            fromEl.value = toEl.value;
            toEl.value = tmp;
            updateConversion();
        }
    });
}

const convRefreshBtnEl = document.getElementById('convRefreshBtn');
if (convRefreshBtnEl) {
    convRefreshBtnEl.addEventListener('click', async () => {
        await fetchFxRates(true);
        updateConversion();
        try { renderFxSnapshot(); } catch (err) { console.error('renderFxSnapshot error:', err); }
        showToast('Exchange rates refreshed', 'success');
    });
}

function populateMonths() {
    const sel = document.getElementById('payMonth');
    if (!sel) return;
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    names.forEach((n, i) => sel.innerHTML += `<option value="${i + 1}">${n}</option>`);
    const now = new Date();
    sel.value = now.getMonth() + 1;
    const payYearEl = document.getElementById('payYear');
    if (payYearEl) payYearEl.value = now.getFullYear();
}

(function init() {
    loadAll();
    populateMonths();
    initTabs();
    populateCurrencySelectors();
    populateDeptFilter();
    initSortableTables();
    startLiveClock();
    updateClockForCurrency();

    const savedTheme = localStorage.getItem('nexus_theme') || 'light';
    setTheme(savedTheme);
    requestAnimationFrame(updateTabIndicator);

    const renders = [renderDashboard, renderEmployees, renderAttendance, renderLeaves, renderPayroll, renderReports];
    renders.forEach(fn => {
        try { fn(); }
        catch (err) { console.error(`Init render failed: ${fn.name}`, err); }
    });

    // Fetch live FX rates in the background (or load from cache) and
    // re-render currency-aware views once they're available.
    fetchFxRates().then(() => {
        renders.forEach(fn => {
            try { fn(); }
            catch (err) { console.error(`FX re-render failed: ${fn.name}`, err); }
        });
    });
})();

/* ═══════════════════════════════════════════════════════════════════════════
   ✦ ACTION DELEGATION — replaces inline onclick handlers.
   Row action buttons now carry data-action/data-id attributes instead of
   inline JS, so a hostile id (e.g. from a crafted JSON import) can never break
   out of an attribute and execute. Listeners are attached once to persistent
   containers and survive innerHTML re-renders.
   ═══════════════════════════════════════════════════════════════════════════ */
(function initActionDelegation() {
    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        switch (btn.dataset.action) {
            case 'edit-emp': window.openEditEmpModal(id); break;
            case 'del-emp': window.deleteEmployee(id); break;
            case 'leave-status': window.updateLeaveStatus(id, btn.dataset.status); break;
            case 'payslip': window.downloadPayslip(id); break;
        }
    });

    // Attendance status pills (click + keyboard).
    const attList = document.getElementById('attendanceList');
    if (attList) {
        const trigger = (pill) => {
            if (pill) window.setAttendanceStatus(pill.dataset.emp, pill.dataset.status);
        };
        attList.addEventListener('click', (ev) => trigger(ev.target.closest('.att-pill')));
        attList.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            const pill = ev.target.closest('.att-pill');
            if (pill) { ev.preventDefault(); trigger(pill); }
        });
    }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   ✦ DASHBOARD V2 — Interactive layer (non-breaking enhancements)
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Helper: programmatically switch tabs ──
function switchToTab(name) {
    const btn = document.querySelector('.tab-btn[data-tab="' + name + '"]');
    if (btn) btn.click();
    else console.warn('switchToTab: no tab button for', name);
}

// ── Collapsible Data Management Group ──
document.querySelectorAll('.qa-collapsible').forEach(header => {
    header.addEventListener('click', function() {
        const toggleId = this.dataset.toggle;
        const content = document.getElementById(toggleId);
        if (!content) return;
        
        this.classList.toggle('collapsed');
        content.classList.toggle('expanded');
        
        localStorage.setItem('qa-' + toggleId, this.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    });
});

// Restore collapsed state from localStorage
document.querySelectorAll('.qa-collapsible').forEach(header => {
    const toggleId = header.dataset.toggle;
    const state = localStorage.getItem('qa-' + toggleId) || 'expanded';
    const content = document.getElementById(toggleId);
    if (content) {
        if (state === 'collapsed') {
            header.classList.add('collapsed');
            content.classList.remove('expanded');
        }
    }
});

// ── Quick actions cards (improved) ──
document.querySelectorAll('.qa-card[data-tab-target]').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tabTarget;
        switchToTab(target);
        // Open the matching modal for contextual quick actions
        if (target === 'employees' && document.getElementById('addEmpBtn')) {
            document.getElementById('addEmpBtn').click();
        }
        if (target === 'leaves' && document.getElementById('newLeaveBtn')) {
            setTimeout(() => document.getElementById('newLeaveBtn').click(), 80);
        }
    });
});

// ── Refresh button (improved with spinner) ──
const qaRefreshBtn = document.getElementById('qaRefresh');
if (qaRefreshBtn) {
    qaRefreshBtn.addEventListener('click', function() {
        if (this.classList.contains('refreshing')) return;
        
        this.classList.add('refreshing');
        this.style.opacity = '0.6';
        
        const fns = [renderDashboard, renderEmployees, renderAttendance, renderLeaves, renderPayroll, renderReports];
        Promise.all(fns.map(fn => {
            try { return fn(); } 
            catch (err) { console.error('QA refresh failed:', fn.name, err); }
        })).then(() => {
            this.classList.remove('refreshing');
            this.style.opacity = '1';
            showToast('✓ Dashboard refreshed', 'success');
        }).catch(err => {
            this.classList.remove('refreshing');
            this.style.opacity = '1';
            console.error('Refresh error:', err);
        });
    });
}

// ── Hero greeting + live chips ──
function dashGreeting(now) {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

function updateDashHero() {
    const elHello = document.getElementById('dashHello');
    const elSub = document.getElementById('dashSub');
    const cPresent = document.getElementById('chipPresentDash');
    const cPending = document.getElementById('chipPendingDash');
    const cStaff = document.getElementById('chipStaffDash');

    const totalEl = document.getElementById('totalEmployees');
    const presentEl = document.getElementById('presentToday');
    const pendingEl = document.getElementById('pendingLeaves');

    if (elHello) {
        const name = (Array.isArray(employees) && employees.length) ? employees[0].firstName : 'Admin';
        elHello.textContent = dashGreeting(new Date()) + ', ' + name;
    }
    if (elSub) {
        const staff = Array.isArray(employees) ? Math.max(1, employees.length) : 1;
        const pend = (Array.isArray(leaveReqs) ? leaveReqs : []).filter(l => l && l.status === 'pending').length;
        const periods = (Array.isArray(payrolls) ? payrolls : []).length;
        elSub.textContent = staff + ' employees · ' + pend + ' pending approvals · ' + periods + ' payroll periods on record';
    }
    if (cPresent && presentEl) cPresent.textContent = presentEl.textContent;
    if (cPending && pendingEl) cPending.textContent = pendingEl.textContent;
    if (cStaff && totalEl) cStaff.textContent = totalEl.textContent;
}

['totalEmployees', 'presentToday', 'pendingLeaves'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const mo = new MutationObserver(updateDashHero);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
});
// Cover changes not visible as DOM mutations (approvals count, payroll periods)
setInterval(updateDashHero, 15000);
updateDashHero();

// ── Hero CTA button ──
const heroReportsBtn = document.getElementById('heroGoReports');
if (heroReportsBtn) {
    heroReportsBtn.addEventListener('click', () => switchToTab('reports'));
}

// ── 3D tilt interaction on KPI cards ──
const _tiltReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
function tiltDisabled() {
    return document.body.classList.contains('no-anim') || _tiltReduce.matches;
}
document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        if (tiltDisabled()) { if (card.style.transform) card.style.transform = ''; return; }
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
            'perspective(800px) rotateX(' + (-py * 6).toFixed(2) + 'deg) rotateY(' + (px * 6).toFixed(2) +
            'deg) translateY(-3px)';
        card.classList.add('tilting');
    });
    card.addEventListener('mouseleave', () => {
        card.classList.remove('tilting');
        card.style.transform = '';
    });
});

function updateTabIndicator() {
    const bar = document.querySelector('.tab-bar');
    const indicator = document.getElementById('tabIndicator');
    const active = bar && bar.querySelector('.tab-btn.active');
    if (!bar || !indicator || !active) return;
    const barRect = bar.getBoundingClientRect();
    const btnRect = active.getBoundingClientRect();
    indicator.style.width = btnRect.width + 'px';
    indicator.style.height = btnRect.height + 'px';
    indicator.style.transform = 'translate(' + (btnRect.left - barRect.left) + 'px, ' + (btnRect.top - barRect.top) + 'px)';
}

(function initAtmosphere() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spotlight = document.getElementById('fxSpotlight');
    let spotRaf = 0;

    if (!reduce && spotlight) {
        document.addEventListener('pointermove', (e) => {
            if (document.body.classList.contains('no-anim')) return;
            if (spotRaf) return;
            const x = e.clientX;
            const y = e.clientY;
            spotRaf = requestAnimationFrame(() => {
                spotlight.style.setProperty('--spot-x', x + 'px');
                spotlight.style.setProperty('--spot-y', y + 'px');
                spotRaf = 0;
            });
        }, { passive: true });
    }

    updateTabIndicator();
    window.addEventListener('resize', updateTabIndicator);
    window.addEventListener('load', updateTabIndicator);
})();
