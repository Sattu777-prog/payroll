/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance4.js
   Fourth additive layer (after enhance3.js). Ties the app's scattered features
   into four managed surfaces, using only public DOM hooks + localStorage:
     1. Notification & Insights Center  — header bell → what needs attention
     2. Payroll What-If Simulator       — live sliders → projected-cost impact
     3. Settings & Data Hub             — one place for prefs, data, storage
     4. Spotlight augmentation          — employee search + math inside ⌘K
   Never touches script.js internals; degrades gracefully if a hook is missing.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const anim = () => !document.body.classList.contains('no-anim')
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function load(key) {
        try { const p = JSON.parse(localStorage.getItem(key)); return Array.isArray(p) ? p : []; }
        catch (_) { return []; }
    }
    const money = (usd) => {
        try { if (typeof window.fmtCurrency === 'function') return window.fmtCurrency(usd || 0); } catch (_) {}
        return '$' + Math.round(usd || 0).toLocaleString();
    };
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const cssVar = (n, fb) => (getComputedStyle(document.body).getPropertyValue(n).trim() || fb);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const toast = (m, t) => { try { if (typeof window.showToast === 'function') window.showToast(m, t); } catch (_) {} };
    const goTab = (name) => { const b = $('.tab-btn[data-tab="' + name + '"]'); if (b) b.click(); };

    function todayStr() { return new Date().toISOString().slice(0, 10); }
    function monthPrefix(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

    /* latest net salary per employee id (falls back to basic*0.85 estimate) */
    function latestNet() {
        const pays = load('nexus_payroll'), m = {};
        pays.forEach(p => { const c = m[p.employeeId]; if (!c || (p.year * 12 + p.month) > (c.year * 12 + c.month)) m[p.employeeId] = p; });
        const out = {}; Object.keys(m).forEach(k => out[k] = +m[k].netSalary || 0); return out;
    }
    function projectedPayroll() {
        const emps = load('nexus_employees'), net = latestNet();
        return emps.reduce((s, e) => s + (net[e.id] != null ? net[e.id] : (+e.basicSalary || 0) * 0.85), 0);
    }
    /* PLACEHOLDER_HELPERS */
    /* Generic right-side slide-over. Returns {over, body, open, close}. */
    function makeOver(id, title, icon) {
        let over = document.getElementById(id);
        if (over) return over._api;
        over = document.createElement('div');
        over.className = 'hx-over'; over.id = id;
        over.setAttribute('role', 'dialog'); over.setAttribute('aria-modal', 'true');
        over.setAttribute('aria-label', title);
        over.innerHTML =
            '<div class="hx-panel">' +
              '<div class="hx-head"><h3><i class="fas ' + icon + '"></i> ' + esc(title) + '</h3>' +
                '<button class="hx-close" aria-label="Close">&times;</button></div>' +
              '<div class="hx-body"></div>' +
            '</div>';
        document.body.appendChild(over);
        let lastFocus = null;
        const close = () => { over.classList.remove('open'); if (lastFocus) try { lastFocus.focus(); } catch (_) {} };
        const open = () => { lastFocus = document.activeElement; over.classList.add('open'); setTimeout(() => { const c = $('.hx-close', over); if (c) c.focus(); }, 30); };
        over.addEventListener('pointerdown', e => { if (e.target === over) close(); });
        $('.hx-close', over).addEventListener('click', close);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && over.classList.contains('open')) close(); });
        const api = { over, body: $('.hx-body', over), open, close };
        over._api = api; return api;
    }

    /* HiDPI canvas fit */
    function fitCanvas(cv) {
        const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
        const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        cv.width = w * dpr; cv.height = h * dpr;
        const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, w, h };
    }
    /* PLACEHOLDER_NOTI */
    /* ═══════════ 1. NOTIFICATION & INSIGHTS CENTER ═══════════ */
    function computeAlerts() {
        const emps = load('nexus_employees');
        const att = load('nexus_attendance');
        const leaves = load('nexus_leaves');
        const pays = load('nexus_payroll');
        const out = [];
        const today = todayStr(), mp = monthPrefix();

        // Pending leave approvals
        const pending = leaves.filter(l => l.status === 'pending');
        if (pending.length) out.push({
            sev: 'warn', ic: 'fa-hourglass-half', title: pending.length + ' leave request' + (pending.length > 1 ? 's' : '') + ' awaiting approval',
            sub: 'Review and approve or reject to keep the calendar accurate.',
            act: 'Review leaves', run: () => goTab('leaves')
        });

        // Attendance not yet marked today
        const markedToday = new Set(att.filter(a => a.date === today).map(a => a.employeeId));
        const unmarked = emps.filter(e => !markedToday.has(e.id));
        if (emps.length && unmarked.length) out.push({
            sev: unmarked.length === emps.length ? 'crit' : 'info', ic: 'fa-user-clock',
            title: unmarked.length + ' of ' + emps.length + ' not marked today',
            sub: 'Attendance for ' + esc(unmarked.slice(0, 3).map(e => e.firstName).join(', ')) + (unmarked.length > 3 ? '…' : '') + ' is still open.',
            act: 'Take attendance', run: () => goTab('attendance')
        });

        // Employees with no payroll record this month
        const paidThisMonth = new Set(pays.filter(p => (p.year + '-' + String(p.month).padStart(2, '0')) === mp).map(p => p.employeeId));
        const unpaid = emps.filter(e => !paidThisMonth.has(e.id));
        if (emps.length && unpaid.length) out.push({
            sev: 'warn', ic: 'fa-money-check-dollar',
            title: unpaid.length + ' employee' + (unpaid.length > 1 ? 's' : '') + ' without payroll this month',
            sub: 'Run the payroll engine so every active employee is covered.',
            act: 'Go to payroll', run: () => goTab('payroll')
        });

        // Upcoming leave starts within 7 days
        const now = new Date(); const in7 = new Date(now.getTime() + 7 * 864e5);
        const soon = leaves.filter(l => { const s = new Date(l.startDate); return l.status !== 'rejected' && s >= now && s <= in7; });
        if (soon.length) out.push({
            sev: 'info', ic: 'fa-plane-departure', title: soon.length + ' leave' + (soon.length > 1 ? 's' : '') + ' starting within 7 days',
            sub: 'Plan coverage — the next one begins ' + esc(soon.map(l => l.startDate).sort()[0]) + '.',
            act: 'View leaves', run: () => goTab('leaves')
        });

        // Data quality: missing email or salary
        const incomplete = emps.filter(e => !e.email || !(+e.basicSalary > 0));
        if (incomplete.length) out.push({
            sev: 'info', ic: 'fa-id-badge', title: incomplete.length + ' profile' + (incomplete.length > 1 ? 's' : '') + ' missing key details',
            sub: 'Some records have no email or salary set — completeness helps reporting.',
            act: 'Open directory', run: () => goTab('employees')
        });

        return out;
    }

    const Noti = { el: {}, filter: 'all', items: [] };
    function renderNoti() {
        const body = Noti.el.body; if (!body) return;
        const items = Noti.items;
        const shown = Noti.filter === 'all' ? items : items.filter(i => i.sev === Noti.filter);
        const chips = ['all', 'crit', 'warn', 'info'].map(f =>
            '<button class="' + (Noti.filter === f ? 'active' : '') + '" data-f="' + f + '">' +
            (f === 'all' ? 'All' : f === 'crit' ? 'Urgent' : f === 'warn' ? 'Action' : 'Info') + '</button>').join('');
        let html = '<div class="hx-filter">' + chips + '</div>';
        if (!shown.length) {
            html += '<div class="hx-empty"><i class="fas fa-circle-check"></i>You\'re all caught up — nothing needs attention.</div>';
        } else {
            shown.forEach((it, i) => {
                html += '<div class="noti" data-i="' + i + '">' +
                    '<div class="noti-ic ' + it.sev + '"><i class="fas ' + it.ic + '"></i></div>' +
                    '<div class="noti-main"><div class="noti-title">' + esc(it.title) + '</div>' +
                    '<div class="noti-sub">' + it.sub + '</div>' +
                    (it.act ? '<button class="noti-act" data-i="' + i + '">' + esc(it.act) + '</button>' : '') +
                    '</div></div>';
            });
        }
        body.innerHTML = html;
        $$('.hx-filter button', body).forEach(b => b.addEventListener('click', () => { Noti.filter = b.dataset.f; renderNoti(); }));
        $$('.noti-act', body).forEach(b => b.addEventListener('click', () => {
            const it = shown[+b.dataset.i]; Noti.el.api.close(); if (it && it.run) setTimeout(it.run, 60);
        }));
    }
    function refreshNotiBadge() {
        Noti.items = computeAlerts();
        const badge = Noti.el.badge; if (!badge) return;
        const n = Noti.items.length;
        badge.textContent = n > 9 ? '9+' : String(n);
        badge.classList.toggle('show', n > 0);
        if (Noti.el.api && Noti.el.api.over.classList.contains('open')) renderNoti();
    }
    function initNoti() {
        const bar = $('.header-actions'); if (!bar || $('#notiBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'notiBtn'; btn.className = 'btn btn-neutral hx-iconbtn';
        btn.setAttribute('aria-label', 'Notifications & insights');
        btn.title = 'Notifications & insights';
        btn.innerHTML = '<i class="fas fa-bell"></i><span class="hx-badge" id="notiBadge">0</span>';
        bar.insertBefore(btn, bar.firstChild);
        const api = makeOver('notiOver', 'Insights & Alerts', 'fa-bell');
        Noti.el = { btn, badge: $('#notiBadge', btn), body: api.body, api };
        btn.addEventListener('click', () => { refreshNotiBadge(); renderNoti(); api.open(); });
        refreshNotiBadge();
    }
    /* PLACEHOLDER_SETTINGS */
    /* ═══════════ 2. SETTINGS & DATA HUB ═══════════ */
    const Settings = { el: {} };
    function storageBytes() {
        let n = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.indexOf('nexus') === 0) n += (localStorage.getItem(k) || '').length + k.length;
            }
        } catch (_) {}
        return n; // approx chars ≈ bytes
    }
    function dataCounts() {
        return {
            emps: load('nexus_employees').length,
            att: load('nexus_attendance').length,
            leaves: load('nexus_leaves').length,
            pays: load('nexus_payroll').length
        };
    }
    function renderSettings() {
        const body = Settings.el.body; if (!body) return;
        const c = dataCounts();
        const bytes = storageBytes(), budget = 4.8 * 1024 * 1024; // ~5MB typical cap
        const pct = Math.min(100, (bytes / budget) * 100);
        const kb = (bytes / 1024).toFixed(bytes > 1024 * 100 ? 0 : 1);
        const isDark = document.body.classList.contains('dark-mode');
        const animOn = !document.body.classList.contains('no-anim');
        body.innerHTML =
            '<div class="set-group"><div class="set-group-h">Appearance</div>' +
              row('fa-moon', 'Dark mode', 'Switch between light and dark themes', btn('set-theme', isDark ? 'On' : 'Off')) +
              row('fa-wand-magic-sparkles', 'Animations', 'Motion, tilt & count-up effects', btn('set-anim', animOn ? 'On' : 'Off')) +
              row('fa-coins', 'Display currency', 'Applies across the whole app', '<span class="sc" id="setCurrencyMount"></span>') +
            '</div>' +
            '<div class="set-group"><div class="set-group-h">Data</div>' +
              row('fa-file-excel', 'Export to Excel', c.emps + ' employees · ' + c.pays + ' payroll rows', btn('set-export', 'Export')) +
              row('fa-download', 'Backup (JSON)', 'Save a full snapshot to your device', btn('set-backup', 'Backup')) +
              row('fa-upload', 'Restore', 'Load data from a backup file', btn('set-restore', 'Restore')) +
              '<div class="set-row"><div class="si"><i class="fas fa-database"></i></div>' +
                '<div class="st"><div class="t">Local storage used</div>' +
                '<div class="d">' + kb + ' KB of this browser\'s app data · ' +
                (c.emps + c.att + c.leaves + c.pays) + ' records</div>' +
                '<div class="storage-meter"><div class="storage-fill" style="width:0%"></div></div></div></div>' +
            '</div>' +
            '<div class="set-group"><div class="set-group-h">Danger zone</div>' +
              row('fa-triangle-exclamation', 'Reset all data', 'Permanently clears every record in this browser', btn('set-reset', 'Reset', 'danger')) +
            '</div>';
        // animate the meter after paint
        setTimeout(() => { const f = $('.storage-fill', body); if (f) f.style.width = pct.toFixed(1) + '%'; }, anim() ? 40 : 0);
        // mount a mirror of the real currency <select>
        mountCurrencyMirror($('#setCurrencyMount', body));
        wireSettings(body);
    }
    function row(ic, t, d, control) {
        return '<div class="set-row"><div class="si"><i class="fas ' + ic + '"></i></div>' +
            '<div class="st"><div class="t">' + esc(t) + '</div><div class="d">' + esc(d) + '</div></div>' +
            (control && control.indexOf('class="sc"') === -1 ? '<span class="sc">' + control + '</span>' : (control || '')) + '</div>';
    }
    function btn(id, label, extra) { return '<button class="set-btn ' + (extra || '') + '" id="' + id + '">' + esc(label) + '</button>'; }

    function mountCurrencyMirror(mount) {
        if (!mount) return;
        const real = $('#currencySelect'); if (!real) { mount.textContent = '—'; return; }
        const sel = document.createElement('select');
        sel.className = 'set-btn'; sel.style.padding = '7px 10px';
        sel.innerHTML = real.innerHTML; sel.value = real.value;
        sel.addEventListener('change', () => {
            real.value = sel.value;
            real.dispatchEvent(new Event('change', { bubbles: true }));
        });
        mount.innerHTML = ''; mount.appendChild(sel);
    }
    function wireSettings(body) {
        const proxy = (id, targetId) => { const b = $('#' + id, body); if (b) b.addEventListener('click', () => { const t = document.getElementById(targetId); if (t) t.click(); }); };
        proxy('set-theme', 'themeToggle');
        proxy('set-anim', 'animToggle');
        proxy('set-export', 'exportExcelBtn');
        proxy('set-backup', 'backupBtn');
        proxy('set-restore', 'importFile');
        // re-render labels shortly after appearance toggles
        ['set-theme', 'set-anim'].forEach(id => { const b = $('#' + id, body); if (b) b.addEventListener('click', () => setTimeout(renderSettings, 60)); });
        const reset = $('#set-reset', body);
        if (reset) reset.addEventListener('click', () => {
            if (!confirm('Reset ALL data?\n\nThis permanently deletes every employee, attendance, leave and payroll record stored in this browser. This cannot be undone.')) return;
            if (!confirm('Are you absolutely sure? Consider taking a Backup first.')) return;
            try {
                ['nexus_employees', 'nexus_attendance', 'nexus_leaves', 'nexus_payroll'].forEach(k => localStorage.removeItem(k));
                toast('All data has been reset.', 'info');
                setTimeout(() => location.reload(), 400);
            } catch (_) { toast('Could not reset data.', 'error'); }
        });
    }
    function initSettings() {
        const bar = $('.header-actions'); if (!bar || $('#setBtn')) return;
        const btnEl = document.createElement('button');
        btnEl.id = 'setBtn'; btnEl.className = 'btn btn-neutral';
        btnEl.setAttribute('aria-label', 'Settings & data hub'); btnEl.title = 'Settings & data';
        btnEl.innerHTML = '<i class="fas fa-sliders"></i>';
        // place just before theme toggle if present
        const theme = $('#themeToggle'); bar.insertBefore(btnEl, theme || null);
        const api = makeOver('setOver', 'Settings & Data', 'fa-sliders');
        Settings.el = { body: api.body, api };
        btnEl.addEventListener('click', () => { renderSettings(); api.open(); });
    }
    /* PLACEHOLDER_WHATIF */
    /* ═══════════ 3. PAYROLL WHAT-IF SIMULATOR ═══════════ */
    const WF = { el: {}, base: 0, raf: 0 };
    const WF_TAX_DEFAULT = 15;

    function wfCompute(raise, tax, hires, hireSalary) {
        const emps = load('nexus_employees');
        const baseline = emps.reduce((s, e) => s + (+e.basicSalary || 0) * (1 - WF_TAX_DEFAULT / 100), 0);
        const existing = emps.reduce((s, e) => s + (+e.basicSalary || 0) * (1 + raise / 100) * (1 - tax / 100), 0);
        const added = hires * (+hireSalary || 0) * (1 - tax / 100);
        return { baseline, simulated: existing + added, headcount: emps.length + hires };
    }
    function wfDrawChart(baseline, simulated) {
        const cv = WF.el.canvas; if (!cv) return;
        const { ctx, w, h } = fitCanvas(cv);
        ctx.clearRect(0, 0, w, h);
        const max = Math.max(baseline, simulated, 1) * 1.15;
        const padT = 26, padB = 22, plotH = h - padT - padB;
        const bars = [{ l: 'Current', v: baseline, c: '#64748b' }, { l: 'Simulated', v: simulated, c: simulated > baseline ? '#ef4444' : '#10b981' }];
        const bw = 96, gap = 60, totalW = bars.length * bw + gap, startX = (w - totalW) / 2 + gap / 2;
        ctx.textAlign = 'center';
        bars.forEach((b, i) => {
            const x = startX + i * (bw + gap * 0.6);
            const bh = ((b.v) / max) * plotH, y = padT + plotH - bh;
            const g = ctx.createLinearGradient(0, y, 0, y + bh);
            g.addColorStop(0, b.c); g.addColorStop(1, b.c + '99');
            ctx.fillStyle = g;
            const r = 8; ctx.beginPath();
            ctx.moveTo(x, y + bh); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
            ctx.lineTo(x + bw - r, y); ctx.arcTo(x + bw, y, x + bw, y + r, r);
            ctx.lineTo(x + bw, y + bh); ctx.closePath(); ctx.fill();
            ctx.fillStyle = cssVar('--text-primary', '#111'); ctx.font = '700 12px JetBrains Mono, monospace';
            ctx.fillText(money(b.v), x + bw / 2, y - 8);
            ctx.fillStyle = cssVar('--text-muted', '#888'); ctx.font = '600 11px system-ui';
            ctx.fillText(b.l, x + bw / 2, h - 6);
        });
    }
    function wfRender() {
        const e = WF.el; if (!e.canvas) return;
        const raise = +e.raise.value, tax = +e.tax.value, hires = +e.hires.value, hs = +e.hsal.value || 0;
        e.raiseV.textContent = (raise >= 0 ? '+' : '') + raise + '%';
        e.taxV.textContent = tax + '%';
        e.hiresV.textContent = hires;
        const r = wfCompute(raise, tax, hires, hs);
        const annual = r.simulated * 12;
        const d = r.simulated - r.baseline, dp = r.baseline ? (d / r.baseline) * 100 : 0;
        e.mCur.textContent = money(r.baseline);
        e.mSim.textContent = money(r.simulated);
        e.mAnnual.textContent = money(annual);
        e.mHead.textContent = r.headcount;
        const cls = d > 1 ? 'up' : d < -1 ? 'down' : 'flat';
        const ic = d > 1 ? 'fa-arrow-up' : d < -1 ? 'fa-arrow-down' : 'fa-minus';
        e.delta.className = 'wf-delta ' + cls;
        e.delta.innerHTML = '<i class="fas ' + ic + '"></i>' + (d >= 0 ? '+' : '−') + money(Math.abs(d)) +
            ' / month (' + (dp >= 0 ? '+' : '') + dp.toFixed(1) + '%)';
        wfDrawChart(r.baseline, r.simulated);
    }
    function wfReset() {
        const e = WF.el;
        e.raise.value = 0; e.tax.value = WF_TAX_DEFAULT; e.hires.value = 0;
        const emps = load('nexus_employees');
        const avg = emps.length ? Math.round(emps.reduce((s, x) => s + (+x.basicSalary || 0), 0) / emps.length) : 5000;
        e.hsal.value = avg;
        wfRender();
    }
    function buildWF() {
        if (WF.el.canvas) return;
        const api = makeOver('wfOver', 'Payroll What-If Simulator', 'fa-flask');
        api.over.classList.add('center');
        // add a reset link into the header
        const head = $('.hx-head', api.over);
        const reset = document.createElement('button'); reset.className = 'wf-reset'; reset.textContent = 'Reset';
        head.insertBefore(reset, $('.hx-close', head));
        api.body.innerHTML =
            '<p style="font-size:.8rem;color:var(--text-muted);margin:-2px 0 4px;line-height:1.5;">' +
              'Drag the sliders to model raises, tax changes and new hires. Everything recomputes live from your current roster.</p>' +
            '<div class="wf-grid"><div class="wf-inputs">' +
              wfSlider('wfRaise', 'Across-the-board raise', -10, 30, 0) +
              wfSlider('wfTax', 'Effective tax rate', 0, 40, WF_TAX_DEFAULT) +
              wfSlider('wfHires', 'New hires', 0, 20, 0) +
              '<div class="wf-control"><label>Avg salary per new hire</label>' +
                '<input type="number" id="wfHsal" min="0" step="100" value="5000"></div>' +
            '</div><div class="wf-out">' +
              '<div class="wf-big-row">' +
                '<div class="wf-big"><div class="l">Current / month</div><div class="v" id="wfCur">—</div></div>' +
                '<div class="wf-big"><div class="l">Simulated / month</div><div class="v" id="wfSim">—</div></div>' +
              '</div>' +
              '<div class="wf-delta flat" id="wfDelta"></div>' +
              '<div class="wf-canvas-wrap"><canvas id="wfCanvas" role="img" aria-label="Current vs simulated payroll cost"></canvas></div>' +
              '<div class="wf-big-row">' +
                '<div class="wf-big"><div class="l">Projected annual</div><div class="v" id="wfAnnual">—</div></div>' +
                '<div class="wf-big"><div class="l">Headcount</div><div class="v" id="wfHead">—</div></div>' +
              '</div>' +
            '</div></div>';
        WF.el = {
            api, canvas: $('#wfCanvas', api.over),
            raise: $('#wfRaise', api.over), tax: $('#wfTax', api.over), hires: $('#wfHires', api.over), hsal: $('#wfHsal', api.over),
            raiseV: $('#wfRaise', api.over).parentNode.querySelector('.wf-v'),
            taxV: $('#wfTax', api.over).parentNode.querySelector('.wf-v'),
            hiresV: $('#wfHires', api.over).parentNode.querySelector('.wf-v'),
            mCur: $('#wfCur', api.over), mSim: $('#wfSim', api.over), mAnnual: $('#wfAnnual', api.over),
            mHead: $('#wfHead', api.over), delta: $('#wfDelta', api.over)
        };
        ['input', 'change'].forEach(ev => {
            [WF.el.raise, WF.el.tax, WF.el.hires, WF.el.hsal].forEach(inp => inp.addEventListener(ev, wfRender));
        });
        reset.addEventListener('click', wfReset);
        if (window.ResizeObserver) { let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(wfRender, 60); }).observe(WF.el.canvas); }
    }
    function wfSlider(id, label, min, max, val) {
        return '<div class="wf-control"><label>' + esc(label) + '<span class="wf-v"></span></label>' +
            '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="1" value="' + val + '"></div>';
    }
    function openWhatIf() { buildWF(); wfReset(); WF.el.api.open(); setTimeout(wfRender, 60); }
    /* PLACEHOLDER_SPOTLIGHT */
    /* ═══════════ 4. SPOTLIGHT AUGMENTATION (⌘K) ═══════════ */
    function safeMath(expr) {
        const s = expr.trim();
        if (!/[+\-*/]/.test(s)) return null;              // needs an operator
        if (!/^[\d\s.+\-*/()]+$/.test(s)) return null;    // whitelist only
        const toks = s.match(/\d+\.?\d*|[+\-*/()]/g);
        if (!toks) return null;
        // CSP-safe recursive-descent evaluator (no eval / Function).
        let i = 0;
        const peek = () => toks[i], eat = () => toks[i++];
        function parseExpr() {
            let v = parseTerm();
            while (peek() === '+' || peek() === '-') { const op = eat(); const r = parseTerm(); v = op === '+' ? v + r : v - r; }
            return v;
        }
        function parseTerm() {
            let v = parseFactor();
            while (peek() === '*' || peek() === '/') { const op = eat(); const r = parseFactor(); v = op === '*' ? v * r : v / r; }
            return v;
        }
        function parseFactor() {
            const t = peek();
            if (t === '(') { eat(); const v = parseExpr(); if (peek() === ')') eat(); return v; }
            if (t === '-') { eat(); return -parseFactor(); }
            if (t === '+') { eat(); return parseFactor(); }
            const n = parseFloat(eat()); return isNaN(n) ? 0 : n;
        }
        try {
            const v = parseExpr();
            if (i < toks.length) return null;             // trailing garbage → invalid
            return (typeof v === 'number' && isFinite(v)) ? v : null;
        } catch (_) { return null; }
    }
    function augmentPalette(input) {
        const list = input.closest('.cmdk-panel') && input.closest('.cmdk-panel').querySelector('.cmdk-list');
        if (!list) return;
        // remove our previous augment block
        list.querySelectorAll('[data-aug="1"]').forEach(n => n.remove());
        const q = input.value.trim();
        if (!q) return;
        const frag = document.createDocumentFragment();
        // 1) inline math
        const m = safeMath(q);
        if (m != null) {
            const lbl = document.createElement('div'); lbl.className = 'cmdk-aug-label'; lbl.dataset.aug = '1'; lbl.textContent = 'Calculator';
            const row = document.createElement('div'); row.className = 'cmdk-math'; row.dataset.aug = '1';
            const rounded = Math.round(m * 100) / 100;
            row.innerHTML = '<span class="eq">' + esc(q) + ' =</span> <span class="res">' + rounded.toLocaleString() + '</span>' +
                '<span class="cmdk-sub">' + money(rounded) + '</span>';
            frag.appendChild(lbl); frag.appendChild(row);
        }
        // 2) employee search
        const ql = q.toLowerCase();
        const emps = load('nexus_employees').filter(e =>
            ((e.firstName || '') + ' ' + (e.lastName || '')).toLowerCase().includes(ql) ||
            (e.employeeId || '').toLowerCase().includes(ql) ||
            (e.department || '').toLowerCase().includes(ql)
        ).slice(0, 6);
        if (emps.length) {
            const lbl = document.createElement('div'); lbl.className = 'cmdk-aug-label'; lbl.dataset.aug = '1'; lbl.textContent = 'Employees';
            frag.appendChild(lbl);
            emps.forEach(e => {
                const it = document.createElement('div'); it.className = 'cmdk-item'; it.dataset.aug = '1'; it.setAttribute('role', 'option');
                it.innerHTML = '<span class="cmdk-ic"><i class="fas fa-user"></i></span>' +
                    '<span>' + esc((e.firstName || '') + ' ' + (e.lastName || '')) + '</span>' +
                    '<span class="cmdk-sub">' + esc(e.department || e.employeeId || '') + '</span>';
                it.addEventListener('click', () => {
                    const back = input.closest('.cmdk-backdrop'); if (back) back.classList.remove('open');
                    goTab('employees');
                    setTimeout(() => { const b = $('[data-action="edit-emp"][data-id="' + e.id + '"]'); if (b) b.click(); }, 180);
                });
                frag.appendChild(it);
            });
        }
        list.appendChild(frag);
    }
    function initSpotlight() {
        document.addEventListener('input', (e) => {
            const t = e.target;
            if (t && t.classList && t.classList.contains('cmdk-input')) {
                // run after enhance.js has rebuilt the list this tick
                setTimeout(() => augmentPalette(t), 0);
            }
        });
    }

    /* ═══════════ LAUNCHERS ═══════════ */
    function initWhatIfLaunch() {
        // Button in the Reports section toolbar
        const pdf = $('#exportReportPdfBtn');
        if (pdf && pdf.parentNode && !$('#whatIfBtn')) {
            const b = document.createElement('button');
            b.id = 'whatIfBtn'; b.className = 'btn btn-neutral';
            b.innerHTML = '<i class="fas fa-flask"></i> What-If';
            b.title = 'Open the payroll what-if simulator';
            pdf.parentNode.insertBefore(b, pdf);
            b.addEventListener('click', openWhatIf);
        }
        // Keyboard: Shift+S opens the simulator when not typing in a field
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
            if (e.key === 'S') { e.preventDefault(); openWhatIf(); }
        });
    }
    /* PLACEHOLDER_INIT */
    function init() {
        initNoti();
        initSettings();
        initWhatIfLaunch();
        initSpotlight();

        // Keep the notification badge fresh after data edits & on a light heartbeat.
        let t = 0;
        const sched = () => { clearTimeout(t); t = setTimeout(refreshNotiBadge, 300); };
        document.addEventListener('click', (e) => {
            if (e.target.closest('button[type="submit"], [data-action], #qaRefresh, .tab-btn')) sched();
        }, true);
        window.addEventListener('storage', sched);
        setInterval(refreshNotiBadge, 25000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();






