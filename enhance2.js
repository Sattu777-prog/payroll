/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance2.js
   Second additive interactivity layer, loaded after enhance.js. Adds:
     1. Skip-to-content link
     2. Fully accessible tablist (roving tabindex + arrow-key navigation)
     3. Chart canvas text alternatives (role=img + aria-label)
     4. Modal focus-trap + focus restoration
     5. Scroll-to-top control
     6. Real-time inline form validation (Add/Edit Employee, Leave request)
     7. Employee profile quick-view drawer (click a directory row)
   Uses only public DOM hooks + localStorage, so it never touches script.js
   internals and degrades gracefully if any hook is missing.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const anim = () => !document.body.classList.contains('no-anim')
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Read a persisted collection; localStorage is the source of truth that
       script.js writes on every saveAll(). Falls back to an empty array. */
    function load(key) {
        try {
            const p = JSON.parse(localStorage.getItem(key));
            return Array.isArray(p) ? p : [];
        } catch (_) { return []; }
    }
    const money = (usd) => {
        try { if (typeof window.fmtCurrency === 'function') return window.fmtCurrency(usd || 0); } catch (_) {}
        return '$' + (Math.round((usd || 0) * 100) / 100).toLocaleString();
    };
    const escHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const initials = (f, l) => ((f || '?')[0] + (l || '')[0] || '?').toUpperCase();

    const TABS = ['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'reports'];

    /* ═══════════ 1. SKIP LINK ═══════════ */
    function initSkipLink() {
        const wrap = $('.page-wrap');
        if (!wrap) return;
        if (!wrap.id) wrap.id = 'mainContent';
        wrap.setAttribute('tabindex', '-1');
        const a = document.createElement('a');
        a.className = 'skip-link';
        a.href = '#' + wrap.id;
        a.textContent = 'Skip to content';
        a.addEventListener('click', (e) => {
            e.preventDefault();
            wrap.focus();
            wrap.scrollIntoView({ behavior: anim() ? 'smooth' : 'auto' });
        });
        document.body.insertBefore(a, document.body.firstChild);
    }

    /* ═══════════ 2. ACCESSIBLE TABLIST ═══════════ */
    function tabButtons() { return $$('.tab-btn[data-tab]'); }

    function syncTabState() {
        tabButtons().forEach(btn => {
            const on = btn.classList.contains('active');
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
            btn.setAttribute('tabindex', on ? '0' : '-1');
        });
    }

    function initTablist() {
        const btns = tabButtons();
        if (!btns.length) return;
        btns.forEach(btn => {
            const name = btn.dataset.tab;
            btn.id = btn.id || ('tab-' + name);
            const panel = document.getElementById(name + 'Section');
            if (panel) {
                btn.setAttribute('aria-controls', panel.id);
                panel.setAttribute('aria-labelledby', btn.id);
                if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
            }
            // keep ARIA in sync after script.js flips the .active class
            btn.addEventListener('click', () => setTimeout(syncTabState, 0));
        });
        // roving arrow-key navigation across the tab bar
        const bar = $('.tab-bar');
        if (bar) {
            bar.addEventListener('keydown', (e) => {
                const list = tabButtons();
                const cur = list.findIndex(b => b === document.activeElement);
                if (cur < 0) return;
                let next = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % list.length;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + list.length) % list.length;
                else if (e.key === 'Home') next = 0;
                else if (e.key === 'End') next = list.length - 1;
                else return;
                e.preventDefault();
                list[next].focus();
                list[next].click();
            });
        }
        syncTabState();
    }

    /* ═══════════ 3. CHART TEXT ALTERNATIVES ═══════════ */
    function initChartA11y() {
        const labels = {
            deptBarChart: 'Bar chart: total salary by department',
            payrollBreakdownChart: 'Chart: payroll cost breakdown for the current period',
            attendanceTrendChart: 'Line chart: attendance trend over the last six months',
            leaveDistChart: 'Chart: distribution of leave requests by type',
        };
        Object.keys(labels).forEach(id => {
            const c = document.getElementById(id);
            if (c) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', labels[id]); }
        });
    }

    /* ═══════════ 4. FOCUS TRAP + RESTORE (modals & drawer) ═══════════ */
    function focusables(root) {
        return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
            .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
    }
    function makeTrap(root) {
        return function (e) {
            if (e.key !== 'Tab') return;
            const f = focusables(root);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
    }
    function initModalTraps() {
        $$('.modal-backdrop').forEach(m => {
            let lastFocused = null, handler = null;
            new MutationObserver(() => {
                const open = m.classList.contains('open');
                if (open && !handler) {
                    lastFocused = document.activeElement;
                    handler = makeTrap(m);
                    m.addEventListener('keydown', handler);
                } else if (!open && handler) {
                    m.removeEventListener('keydown', handler);
                    handler = null;
                    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
                    lastFocused = null;
                }
            }).observe(m, { attributes: true, attributeFilter: ['class'] });
        });
    }

    /* ═══════════ 5. SCROLL-TO-TOP ═══════════ */
    function initScrollTop() {
        const btn = document.createElement('button');
        btn.className = 'scroll-top-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Scroll to top');
        btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
        document.body.appendChild(btn);
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: anim() ? 'smooth' : 'auto' }));
        let ticking = false;
        const upd = () => { btn.classList.toggle('show', window.scrollY > 400); ticking = false; };
        window.addEventListener('scroll', () => {
            if (!ticking) { ticking = true; requestAnimationFrame(upd); }
        }, { passive: true });
        upd();
    }

    /* ═══════════ 6. INLINE FORM VALIDATION ═══════════ */
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const VALIDATORS = {
        empEmployeeId: v => v.trim() ? '' : 'Employee ID is required',
        empFirstName: v => v.trim() ? '' : 'First name is required',
        empLastName: v => v.trim() ? '' : 'Last name is required',
        empEmail: v => (!v.trim() || EMAIL_RE.test(v.trim())) ? '' : 'Enter a valid email address',
        empBasicSalary: v => { const n = parseFloat(v); return (v.trim() !== '' && !isNaN(n) && n >= 0) ? '' : 'Enter a salary of 0 or more'; },
        leaveEmpId: v => v ? '' : 'Please select an employee',
        leaveStart: v => v ? '' : 'Start date is required',
        leaveEnd: v => {
            if (!v) return 'End date is required';
            const s = ($('#leaveStart') || {}).value;
            return (s && v < s) ? 'End date must be on or after the start date' : '';
        },
    };

    function errNode(input) {
        let n = document.getElementById(input.id + '-err');
        if (!n) {
            n = document.createElement('div');
            n.className = 'field-error';
            n.id = input.id + '-err';
            n.innerHTML = '<i class="fas fa-circle-exclamation" aria-hidden="true"></i><span></span>';
            (input.closest('.field') || input.parentNode).appendChild(n);
        }
        return n;
    }
    function validateField(id) {
        const input = document.getElementById(id);
        const fn = VALIDATORS[id];
        if (!input || !fn) return true;
        const msg = fn(input.value);
        const n = errNode(input);
        if (msg) {
            input.classList.add('field-invalid'); input.classList.remove('field-valid');
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', n.id);
            n.querySelector('span').textContent = msg;
            n.classList.add('show');
            return false;
        }
        input.classList.remove('field-invalid');
        if (input.value.trim()) input.classList.add('field-valid');
        input.removeAttribute('aria-invalid');
        n.classList.remove('show');
        return true;
    }
    function wireForm(formId, fieldIds) {
        const form = document.getElementById(formId);
        if (!form) return;
        fieldIds.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('blur', () => validateField(id));
            input.addEventListener('input', () => { if (input.classList.contains('field-invalid')) validateField(id); });
        });
        // start-date change re-checks the dependent end-date
        const start = document.getElementById('leaveStart');
        if (start && fieldIds.indexOf('leaveEnd') > -1) {
            start.addEventListener('change', () => { if (document.getElementById('leaveEnd').value) validateField('leaveEnd'); });
        }
        // surface any errors on a submit attempt (without blocking script.js)
        form.addEventListener('submit', () => fieldIds.forEach(validateField), true);
    }
    function initForms() {
        wireForm('empForm', ['empEmployeeId', 'empFirstName', 'empLastName', 'empEmail', 'empBasicSalary']);
        wireForm('leaveForm', ['leaveEmpId', 'leaveStart', 'leaveEnd']);
    }

    /* ═══════════ 7. EMPLOYEE PROFILE DRAWER ═══════════ */
    const ATT_META = {
        present: { c: '#10b981', label: 'Present' },
        late: { c: '#f59e0b', label: 'Late' },
        half: { c: '#8b5cf6', label: 'Half day' },
        absent: { c: '#ef4444', label: 'Absent' },
    };
    let drawerEls = null, drawerLastFocus = null, drawerTrap = null;

    function buildDrawer() {
        if (drawerEls) return drawerEls;
        const back = document.createElement('div');
        back.className = 'drawer-backdrop';
        back.setAttribute('role', 'dialog');
        back.setAttribute('aria-modal', 'true');
        back.setAttribute('aria-label', 'Employee profile');
        back.innerHTML =
            '<div class="drawer-panel">' +
            '<div class="drawer-head">' +
            '<div class="dash-hero-avatar" id="drawerAvatar" style="width:46px;height:46px;font-size:0.95rem;flex-shrink:0;"></div>' +
            '<div><div class="drawer-name" id="drawerName"></div><div class="drawer-role" id="drawerRole"></div></div>' +
            '<button class="drawer-close" id="drawerClose" aria-label="Close profile"><i class="fas fa-xmark"></i></button>' +
            '</div><div class="drawer-body" id="drawerBody"></div></div>';
        document.body.appendChild(back);
        back.addEventListener('pointerdown', (e) => { if (e.target === back) closeDrawer(); });
        $('#drawerClose', back).addEventListener('click', closeDrawer);
        back.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
        drawerEls = { back, avatar: $('#drawerAvatar', back), name: $('#drawerName', back), role: $('#drawerRole', back), body: $('#drawerBody', back) };
        return drawerEls;
    }

    function monthPrefix() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }

    function computeProfile(emp) {
        const pref = monthPrefix();
        const att = load('nexus_attendance').filter(a => a.employeeId === emp.id && String(a.date || '').startsWith(pref));
        const counts = {}; att.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
        const total = att.length;
        const presentRate = total ? Math.round((counts.present || 0) / total * 100) : 0;

        const leaves = load('nexus_leaves').filter(l => l.employeeId === emp.id);
        const pending = leaves.filter(l => l.status === 'pending').length;
        const approved = leaves.filter(l => l.status === 'approved');
        const approvedDays = approved.reduce((s, l) => {
            const d = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / 86400000) + 1;
            return s + (isFinite(d) && d > 0 ? d : 0);
        }, 0);

        const pays = load('nexus_payroll').filter(p => p.employeeId === emp.id)
            .sort((a, b) => (b.year - a.year) || (b.month - a.month));
        const latestNet = pays.length ? pays[0].netSalary : null;

        return { counts, total, presentRate, pending, approvedCount: approved.length, approvedDays, latestNet };
    }

    function donutSvg(counts, total, rate) {
        const C = 2 * Math.PI * 27;
        let off = 0, arcs = '';
        if (total) {
            Object.keys(ATT_META).forEach(k => {
                const n = counts[k] || 0;
                if (!n) return;
                const len = n / total * C;
                arcs += `<circle cx="36" cy="36" r="27" fill="none" stroke="${ATT_META[k].c}" stroke-width="9" ` +
                    `stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"></circle>`;
                off += len;
            });
        }
        const track = `<circle cx="36" cy="36" r="27" fill="none" stroke="rgba(127,127,127,.15)" stroke-width="9"></circle>`;
        return `<div style="position:relative;width:78px;height:78px;flex-shrink:0;">` +
            `<svg width="78" height="78" viewBox="0 0 72 72" style="transform:rotate(-90deg);">${track}${arcs}</svg>` +
            `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">` +
            `<span style="font-size:15px;font-weight:800;color:var(--text-primary);line-height:1;">${rate}%</span>` +
            `<span style="font-size:8px;color:var(--text-muted);">present</span></div></div>`;
    }

    function renderDrawer(emp, s) {
        const els = drawerEls;
        els.avatar.textContent = initials(emp.firstName, emp.lastName);
        els.name.textContent = (emp.firstName || '') + ' ' + (emp.lastName || '');
        els.role.textContent = [emp.position, emp.department].filter(Boolean).join(' · ') || 'Staff';

        const legendKeys = Object.keys(ATT_META).filter(k => (s.counts[k] || 0) > 0);
        const legend = s.total
            ? legendKeys.map(k => `<div><span class="dot" style="background:${ATT_META[k].c}"></span>${ATT_META[k].label}<span class="val">${s.counts[k]}</span></div>`).join('')
            : '<div style="color:var(--text-muted)">No attendance recorded this month.</div>';

        els.body.innerHTML =
            `<div><div class="drawer-section-title">Attendance — this month</div>` +
            `<div class="drawer-att">${donutSvg(s.counts, s.total, s.presentRate)}<div class="drawer-att-legend">${legend}</div></div></div>` +
            `<div class="drawer-stat-grid">` +
            `<div class="drawer-stat"><div class="drawer-stat-label">Latest net pay</div><div class="drawer-stat-val">${s.latestNet != null ? escHtml(money(s.latestNet)) : '—'}</div></div>` +
            `<div class="drawer-stat"><div class="drawer-stat-label">Days recorded</div><div class="drawer-stat-val">${s.total}</div></div>` +
            `<div class="drawer-stat"><div class="drawer-stat-label">Pending leaves</div><div class="drawer-stat-val">${s.pending}</div></div>` +
            `<div class="drawer-stat"><div class="drawer-stat-label">Approved leave days</div><div class="drawer-stat-val">${s.approvedDays}</div></div>` +
            `</div>` +
            `<div><div class="drawer-section-title">Details</div>` +
            `<div class="drawer-info-row"><i class="fas fa-id-badge"></i><span class="lbl">ID</span><span class="val">${escHtml(emp.employeeId || '—')}</span></div>` +
            `<div class="drawer-info-row"><i class="fas fa-envelope"></i><span class="lbl">Email</span><span class="val">${escHtml(emp.email || '—')}</span></div>` +
            `<div class="drawer-info-row"><i class="fas fa-phone"></i><span class="lbl">Phone</span><span class="val">${escHtml(emp.phone || '—')}</span></div>` +
            `<div class="drawer-info-row"><i class="fas fa-building"></i><span class="lbl">Dept</span><span class="val">${escHtml(emp.department || '—')}</span></div>` +
            `<div class="drawer-info-row"><i class="fas fa-sack-dollar"></i><span class="lbl">Base pay</span><span class="val">${escHtml(money(emp.basicSalary || 0))}</span></div></div>` +
            `<div class="drawer-actions"><button class="btn btn-primary" id="drawerEditBtn"><i class="fas fa-pen-to-square"></i> Edit record</button></div>`;

        const editBtn = $('#drawerEditBtn', els.back);
        if (editBtn) editBtn.addEventListener('click', () => {
            closeDrawer();
            if (typeof window.openEditEmpModal === 'function') setTimeout(() => window.openEditEmpModal(emp.id), 60);
        });
    }

    function openDrawer(empId) {
        const emp = load('nexus_employees').find(e => e.id === empId);
        if (!emp) return;
        const els = buildDrawer();
        renderDrawer(emp, computeProfile(emp));
        drawerLastFocus = document.activeElement;
        els.back.classList.add('open');
        drawerTrap = makeTrap(els.back);
        els.back.addEventListener('keydown', drawerTrap);
        setTimeout(() => $('#drawerClose', els.back).focus(), 40);
    }
    function closeDrawer() {
        if (!drawerEls) return;
        drawerEls.back.classList.remove('open');
        if (drawerTrap) { drawerEls.back.removeEventListener('keydown', drawerTrap); drawerTrap = null; }
        if (drawerLastFocus && typeof drawerLastFocus.focus === 'function') drawerLastFocus.focus();
        drawerLastFocus = null;
    }

    /* Make each directory row a keyboard-operable "open profile" control, and
       open the drawer on click/Enter/Space (but never when an action button,
       link, or the row's own controls were the target). */
    function empIdFromRow(tr) {
        const b = tr.querySelector('[data-action="edit-emp"][data-id]');
        return b ? b.getAttribute('data-id') : null;
    }
    function enhanceRows() {
        $$('#employeesTbody tr').forEach(tr => {
            if (tr.dataset.pvReady || !empIdFromRow(tr)) return;
            tr.dataset.pvReady = '1';
            tr.setAttribute('role', 'button');
            tr.setAttribute('tabindex', '0');
            const nameCell = tr.querySelector('.td-name-stack span') || tr.children[1];
            tr.setAttribute('aria-label', 'View profile for ' + (nameCell ? nameCell.textContent.trim() : 'employee'));
        });
    }
    function initRows() {
        const tbody = document.getElementById('employeesTbody');
        if (!tbody) return;
        enhanceRows();
        new MutationObserver(enhanceRows).observe(tbody, { childList: true });
        tbody.addEventListener('click', (e) => {
            if (e.target.closest('button, a, [data-action]')) return;
            const tr = e.target.closest('tr'); if (!tr) return;
            const id = empIdFromRow(tr); if (id) openDrawer(id);
        });
        tbody.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const tr = e.target.closest('tr[role="button"]'); if (!tr) return;
            if (e.target !== tr) return; // let inner controls handle their own keys
            e.preventDefault();
            const id = empIdFromRow(tr); if (id) openDrawer(id);
        });
    }

    /* ═══════════ 8. BOOTSTRAP ═══════════ */
    function init() {
        initSkipLink();
        initTablist();
        initChartA11y();
        initModalTraps();
        initScrollTop();
        initForms();
        initRows();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
