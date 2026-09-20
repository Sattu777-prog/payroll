/* ═══════════════════════════════════════════════════════════════════ */
/* ✦ PAYROLL NEXUS — CONSOLIDATED ENHANCE INTERACTIVITY ENGINE       */
/* Consolidated from enhance.js through enhance10.js                 */
/* ═══════════════════════════════════════════════════════════════════ */


/* ─── SECTION: enhance.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance.js
   Additive interactivity layer, loaded AFTER script.js. Uses only public DOM
   hooks (button IDs, tab buttons) so it never depends on script.js internals.
   Features: responsive card-table labels, command palette (⌘K), keyboard
   shortcuts, contextual mobile FAB, shortcut-help overlay, button ripples.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const toast = (msg, type) => { try { if (typeof showToast === 'function') showToast(msg, type); } catch (_) {} };
    const anim = () => !document.body.classList.contains('no-anim')
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Is the user currently typing / interacting with a control? */
    function inField(el) {
        el = el || document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }
    function anyModalOpen() { return !!$('.modal-backdrop.open'); }

    function clickIfPresent(id) {
        const el = document.getElementById(id);
        if (el) { el.click(); return true; }
        return false;
    }
    function goTab(name) {
        const btn = $(`.tab-btn[data-tab="${name}"]`);
        if (btn) btn.click();
    }
    function activeTab() {
        return $('.tab-btn.active')?.dataset.tab || 'dashboard';
    }

    /* ═══════════════════ 1. RESPONSIVE CARD-TABLE LABELS ═══════════════════
       Copies each column header onto its cells as data-label so the CSS
       card layout can show "Salary: $X" etc. on phones. Re-runs whenever a
       table body changes (rows are re-rendered by script.js). */
    const TABLE_IDS = ['employeesTable', 'leavesTable', 'payrollTable'];

    function labelTable(table) {
        if (!table) return;
        const heads = $$('thead th', table).map(th => th.textContent.trim());
        $$('tbody tr', table).forEach(tr => {
            const cells = Array.from(tr.children).filter(c => c.tagName === 'TD');
            // Skip empty-state rows (single spanning cell).
            if (cells.length === 1 && cells[0].hasAttribute('colspan')) return;
            cells.forEach((td, i) => {
                if (heads[i]) td.setAttribute('data-label', heads[i]);
            });
        });
    }

    function labelAllTables() {
        TABLE_IDS.forEach(id => labelTable(document.getElementById(id)));
    }

    function watchTables() {
        TABLE_IDS.forEach(id => {
            const table = document.getElementById(id);
            const body = table && table.querySelector('tbody');
            if (!body) return;
            labelTable(table);
            new MutationObserver(() => labelTable(table))
                .observe(body, { childList: true });
        });
    }

    /* ═══════════════════ 2. BUTTON RIPPLE ═══════════════════ */
    function initRipple() {
        document.addEventListener('pointerdown', (e) => {
            if (!anim()) return;
            const btn = e.target.closest('.btn');
            if (!btn) return;
            const r = btn.getBoundingClientRect();
            const size = Math.max(r.width, r.height);
            const span = document.createElement('span');
            span.className = 'ripple';
            span.style.width = span.style.height = size + 'px';
            span.style.left = (e.clientX - r.left - size / 2) + 'px';
            span.style.top = (e.clientY - r.top - size / 2) + 'px';
            btn.appendChild(span);
            span.addEventListener('animationend', () => span.remove());
        }, { passive: true });
    }

    /* ═══════════════════ 3. COMMAND REGISTRY ═══════════════════ */
    const COMMANDS = [
        { g: 'Navigate', ic: 'fa-chart-pie', t: 'Go to Dashboard', k: 'home overview', run: () => goTab('dashboard') },
        { g: 'Navigate', ic: 'fa-users', t: 'Go to Employees', k: 'staff directory people', run: () => goTab('employees') },
        { g: 'Navigate', ic: 'fa-calendar-check', t: 'Go to Attendance', k: 'present absent', run: () => goTab('attendance') },
        { g: 'Navigate', ic: 'fa-plane-departure', t: 'Go to Leaves', k: 'leave requests vacation', run: () => goTab('leaves') },
        { g: 'Navigate', ic: 'fa-wallet', t: 'Go to Payroll', k: 'salary pay', run: () => goTab('payroll') },
        { g: 'Navigate', ic: 'fa-chart-bar', t: 'Go to Reports', k: 'analytics charts', run: () => goTab('reports') },

        { g: 'Actions', ic: 'fa-user-plus', t: 'Add Employee', k: 'new create hire', run: () => { goTab('employees'); setTimeout(() => clickIfPresent('addEmpBtn'), 60); } },
        { g: 'Actions', ic: 'fa-calendar-plus', t: 'New Leave Request', k: 'apply leave', run: () => { goTab('leaves'); setTimeout(() => clickIfPresent('newLeaveBtn'), 60); } },
        { g: 'Actions', ic: 'fa-calculator', t: 'Process Payroll', k: 'run generate salary', run: () => { goTab('payroll'); setTimeout(() => clickIfPresent('runPayrollBtn'), 60); } },
        { g: 'Actions', ic: 'fa-history', t: 'Payroll History', k: 'past periods', run: () => { goTab('payroll'); setTimeout(() => clickIfPresent('payrollHistoryBtn'), 60); } },
        { g: 'Actions', ic: 'fa-bolt', t: 'Mark All Present', k: 'attendance', run: () => { goTab('attendance'); setTimeout(() => clickIfPresent('markAllPresentBtn'), 60); } },
        { g: 'Actions', ic: 'fa-file-csv', t: 'Export Attendance CSV', k: 'download', run: () => { goTab('attendance'); setTimeout(() => clickIfPresent('exportAttCSVBtn'), 60); } },
        { g: 'Actions', ic: 'fa-file-pdf', t: 'Export Report PDF', k: 'download print', run: () => { goTab('reports'); setTimeout(() => clickIfPresent('exportReportPdfBtn'), 60); } },
        { g: 'Actions', ic: 'fa-right-left', t: 'Currency Converter', k: 'exchange fx rates money', run: () => clickIfPresent('converterBtn') },
        { g: 'Actions', ic: 'fa-file-import', t: 'Import Backup (JSON)', k: 'restore upload', run: () => clickIfPresent('importFile') },

        { g: 'Preferences', ic: 'fa-moon', t: 'Toggle Dark Mode', k: 'theme light night', run: () => clickIfPresent('themeToggle') },
        { g: 'Preferences', ic: 'fa-magic-wand-sparkles', t: 'Toggle Animations', k: 'motion effects', run: () => clickIfPresent('animToggle') },
        { g: 'Help', ic: 'fa-keyboard', t: 'Keyboard Shortcuts', k: 'help keys cheatsheet', run: () => openHelp() },
    ];

    /* ═══════════════════ 4. COMMAND PALETTE ═══════════════════ */
    let cmdkEls = null;
    let cmdkFiltered = [];
    let cmdkActive = 0;

    function buildPalette() {
        if (cmdkEls) return cmdkEls;
        const back = document.createElement('div');
        back.className = 'cmdk-backdrop';
        back.setAttribute('role', 'dialog');
        back.setAttribute('aria-modal', 'true');
        back.setAttribute('aria-label', 'Command palette');
        back.innerHTML =
            '<div class="cmdk-panel">' +
            '<div class="cmdk-input-wrap"><i class="fas fa-magnifying-glass"></i>' +
            '<input class="cmdk-input" type="text" placeholder="Type a command or search…" ' +
            'aria-label="Command search" autocomplete="off" spellcheck="false">' +
            '<span class="cmdk-hint-kbd">esc</span></div>' +
            '<div class="cmdk-list" role="listbox"></div></div>';
        document.body.appendChild(back);
        const els = {
            back,
            input: $('.cmdk-input', back),
            list: $('.cmdk-list', back),
        };
        back.addEventListener('pointerdown', (e) => { if (e.target === back) closePalette(); });
        els.input.addEventListener('input', () => renderPalette(els.input.value));
        els.input.addEventListener('keydown', onPaletteKey);
        cmdkEls = els;
        return els;
    }

    function scoreMatch(cmd, q) {
        if (!q) return 1;
        const hay = (cmd.t + ' ' + cmd.g + ' ' + (cmd.k || '')).toLowerCase();
        return hay.includes(q) ? 1 : 0;
    }

    function renderPalette(query) {
        const q = (query || '').trim().toLowerCase();
        cmdkFiltered = COMMANDS.filter(c => scoreMatch(c, q));
        cmdkActive = 0;
        const list = cmdkEls.list;
        if (!cmdkFiltered.length) {
            list.innerHTML = '<div class="cmdk-empty">No matching commands</div>';
            return;
        }
        let html = '';
        let lastGroup = null;
        cmdkFiltered.forEach((c, i) => {
            if (c.g !== lastGroup) { html += `<div class="cmdk-group-label">${c.g}</div>`; lastGroup = c.g; }
            html += `<div class="cmdk-item${i === 0 ? ' active' : ''}" role="option" data-i="${i}">` +
                `<span class="cmdk-ic"><i class="fas ${c.ic}"></i></span><span>${c.t}</span></div>`;
        });
        list.innerHTML = html;
        $$('.cmdk-item', list).forEach(el => {
            el.addEventListener('pointermove', () => setActive(+el.dataset.i));
            el.addEventListener('click', () => runIndex(+el.dataset.i));
        });
    }

    function setActive(i) {
        cmdkActive = i;
        $$('.cmdk-item', cmdkEls.list).forEach(el => el.classList.toggle('active', +el.dataset.i === i));
    }

    function runIndex(i) {
        const cmd = cmdkFiltered[i];
        closePalette();
        if (cmd) setTimeout(() => { try { cmd.run(); } catch (err) { console.error('cmd failed', err); } }, 10);
    }

    function onPaletteKey(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(cmdkActive + 1, cmdkFiltered.length - 1)); scrollActive(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(cmdkActive - 1, 0)); scrollActive(); }
        else if (e.key === 'Enter') { e.preventDefault(); runIndex(cmdkActive); }
        else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    }
    function scrollActive() {
        $(`.cmdk-item[data-i="${cmdkActive}"]`, cmdkEls.list)?.scrollIntoView({ block: 'nearest' });
    }

    function openPalette() {
        const els = buildPalette();
        els.input.value = '';
        renderPalette('');
        els.back.classList.add('open');
        setTimeout(() => els.input.focus(), 20);
    }
    function closePalette() {
        cmdkEls?.back.classList.remove('open');
    }
    function paletteOpen() { return cmdkEls?.back.classList.contains('open'); }

    /* ═══════════════════ 5. SHORTCUT HELP OVERLAY ═══════════════════ */
    const SHORTCUTS = [
        { keys: [mod(), 'K'], label: 'Command palette' },
        { keys: ['?'], label: 'This help' },
        { keys: ['G', 'D'], label: 'Go to Dashboard' },
        { keys: ['G', 'E'], label: 'Go to Employees' },
        { keys: ['G', 'A'], label: 'Go to Attendance' },
        { keys: ['G', 'L'], label: 'Go to Leaves' },
        { keys: ['G', 'P'], label: 'Go to Payroll' },
        { keys: ['G', 'R'], label: 'Go to Reports' },
        { keys: ['N'], label: 'New item on current tab' },
        { keys: ['/'], label: 'Focus search' },
        { keys: ['T'], label: 'Toggle dark mode' },
        { keys: ['Esc'], label: 'Close dialogs' },
    ];
    function mod() { return isMac ? '⌘' : 'Ctrl'; }

    let helpEls = null;
    function buildHelp() {
        if (helpEls) return helpEls;
        const back = document.createElement('div');
        back.className = 'cmdk-backdrop';
        back.style.alignItems = 'center';
        back.style.paddingTop = '0';
        const rows = SHORTCUTS.map(s =>
            `<div class="kbd-row"><span>${s.label}</span><span class="kbd-keys">` +
            s.keys.map(k => `<span class="kbd">${k}</span>`).join('') + '</span></div>').join('');
        back.innerHTML =
            '<div class="cmdk-panel" style="max-height:80vh;">' +
            '<div class="cmdk-input-wrap" style="justify-content:space-between;">' +
            '<span style="font-weight:700;color:var(--text-primary);"><i class="fas fa-keyboard" style="margin-right:8px;color:var(--accent);"></i>Keyboard shortcuts</span>' +
            '<span class="cmdk-hint-kbd">esc</span></div>' +
            `<div class="cmdk-list" style="padding:18px;"><div class="kbd-help-grid">${rows}</div></div></div>`;
        document.body.appendChild(back);
        back.addEventListener('pointerdown', (e) => { if (e.target === back) closeHelp(); });
        helpEls = { back };
        return helpEls;
    }
    function openHelp() { buildHelp().back.classList.add('open'); }
    function closeHelp() { helpEls?.back.classList.remove('open'); }
    function helpOpen() { return helpEls?.back.classList.contains('open'); }

    /* ═══════════════════ 6. CONTEXTUAL MOBILE FAB ═══════════════════ */
    const FAB_MAP = {
        dashboard: { ic: 'fa-bolt', title: 'Quick actions', run: openPalette },
        employees: { ic: 'fa-user-plus', title: 'Add employee', run: () => clickIfPresent('addEmpBtn') },
        leaves: { ic: 'fa-calendar-plus', title: 'New leave', run: () => clickIfPresent('newLeaveBtn') },
        payroll: { ic: 'fa-calculator', title: 'Process payroll', run: () => clickIfPresent('runPayrollBtn') },
        attendance: { ic: 'fa-bolt', title: 'Mark all present', run: () => clickIfPresent('markAllPresentBtn') },
        reports: { ic: 'fa-file-pdf', title: 'Export PDF', run: () => clickIfPresent('exportReportPdfBtn') },
    };
    let fabEl = null;
    function initFab() {
        fabEl = document.createElement('button');
        fabEl.className = 'fab show';
        fabEl.setAttribute('aria-label', 'Quick action');
        fabEl.innerHTML = '<i class="fas fa-bolt"></i>';
        document.body.appendChild(fabEl);
        fabEl.addEventListener('click', () => {
            const cfg = FAB_MAP[activeTab()] || FAB_MAP.dashboard;
            cfg.run();
        });
        syncFab();
        // Re-sync when a tab is clicked.
        $$('.tab-btn').forEach(b => b.addEventListener('click', () => setTimeout(syncFab, 30)));
    }
    function syncFab() {
        if (!fabEl) return;
        const cfg = FAB_MAP[activeTab()] || FAB_MAP.dashboard;
        fabEl.querySelector('i').className = 'fas ' + cfg.ic;
        fabEl.title = cfg.title;
        fabEl.setAttribute('aria-label', cfg.title);
    }

    /* ═══════════════════ 7. GLOBAL KEYBOARD SHORTCUTS ═══════════════════ */
    const G_TABS = { d: 'dashboard', e: 'employees', a: 'attendance', l: 'leaves', p: 'payroll', r: 'reports' };
    let awaitingG = false;
    let gTimer = 0;

    function focusSearch() {
        const map = { employees: 'empSearch', leaves: 'leaveSearch', payroll: 'paySearch' };
        const id = map[activeTab()];
        if (id) { const el = document.getElementById(id); if (el) { el.focus(); return true; } }
        return false;
    }

    function onKey(e) {
        // ⌘K / Ctrl-K — always available (open or close the palette).
        if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            paletteOpen() ? closePalette() : openPalette();
            return;
        }
        // Escape closes our overlays (modals are handled by script.js).
        if (e.key === 'Escape') {
            if (paletteOpen()) { closePalette(); return; }
            if (helpOpen()) { closeHelp(); return; }
        }
        // Ignore letter shortcuts while typing, inside a modal, or with modifiers.
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (inField(e.target) || anyModalOpen() || paletteOpen() || helpOpen()) return;

        // "g" then a letter → jump to a tab.
        if (awaitingG) {
            const t = G_TABS[e.key.toLowerCase()];
            clearTimeout(gTimer); awaitingG = false;
            if (t) { e.preventDefault(); goTab(t); }
            return;
        }
        if (e.key === 'g' || e.key === 'G') { awaitingG = true; gTimer = setTimeout(() => awaitingG = false, 1200); return; }

        if (e.key === '?') { e.preventDefault(); openHelp(); return; }
        if (e.key === '/') { if (focusSearch()) e.preventDefault(); return; }
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); (FAB_MAP[activeTab()] || FAB_MAP.dashboard).run(); return; }
        if (e.key === 't' || e.key === 'T') { e.preventDefault(); clickIfPresent('themeToggle'); return; }
    }

    /* ═══════════════════ 8. BOOTSTRAP ═══════════════════ */
    function init() {
        watchTables();
        labelAllTables();
        initRipple();
        initFab();
        document.addEventListener('keydown', onKey);
        document.getElementById('cmdkBtn')?.addEventListener('click', openPalette);
        // Re-label after the app finishes its async FX re-render pass.
        setTimeout(labelAllTables, 400);
        setTimeout(labelAllTables, 1500);
        window.addEventListener('resize', syncFab);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();



/* ─── SECTION: enhance2.js ─── */
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



/* ─── SECTION: enhance3.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance3.js
   Third additive interactivity layer (loaded after enhance2.js). Makes the
   Dashboard & Reports sections interactive & dynamic — WITHOUT touching
   script.js internals. Everything reads localStorage (the source of truth
   script.js writes on every saveAll()) and re-renders on demand.

     1. "Payroll Pulse" — a self-drawn canvas trend chart with a 3M/6M/12M
        range switcher and a hover/touch crosshair tooltip.
     2. Floating value tooltips on the existing dashboard & report bars.
     3. Reports "Metric Explorer" — clickable metric chips that drive a big
        animated readout, a period-over-period delta, and a mini sparkline.
     4. A live ticking clock in the header.

   Degrades gracefully if any DOM hook is missing and honours body.no-anim.
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
    const moneyShort = (usd) => {
        const n = Math.abs(usd || 0);
        if (n >= 1e6) return '$' + (usd / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return '$' + Math.round(usd / 1e3) + 'k';
        return '$' + Math.round(usd || 0);
    };
    const cssVar = (name, fb) => {
        const v = getComputedStyle(document.body).getPropertyValue(name).trim();
        return v || fb;
    };
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    /* ═══════════ DATA ═══════════ */
    function monthKeys(n) {
        const out = [], d = new Date();
        for (let i = n - 1; i >= 0; i--) {
            const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
            out.push({ m: dt.getMonth() + 1, y: dt.getFullYear(), label: dt.toLocaleString('default', { month: 'short' }) });
        }
        return out;
    }
    /* PLACEHOLDER_DATA */
    function payrollSeries(n) {
        const pays = load('nexus_payroll');
        return monthKeys(n).map(k => {
            const set = pays.filter(p => p.month === k.m && p.year === k.y);
            const total = set.reduce((s, p) => s + (+p.netSalary || 0), 0);
            const heads = new Set(set.map(p => p.employeeId)).size;
            const avg = heads ? total / heads : 0;
            return { label: k.label, total, heads, avg };
        });
    }
    function attendanceSeries(n) {
        const att = load('nexus_attendance');
        return monthKeys(n).map(k => {
            const pref = k.y + '-' + String(k.m).padStart(2, '0');
            const set = att.filter(a => String(a.date || '').startsWith(pref));
            const present = set.filter(a => a.status === 'present' || a.status === 'late').length;
            return { label: k.label, rate: set.length ? (present / set.length) * 100 : 0, total: set.length };
        });
    }
    function leaveSeries(n) {
        const lv = load('nexus_leaves');
        return monthKeys(n).map(k => {
            const pref = k.y + '-' + String(k.m).padStart(2, '0');
            const count = lv.filter(l => String(l.startDate || '').startsWith(pref)).length;
            return { label: k.label, count };
        });
    }
    function deltaPct(cur, prev) {
        if (!prev) return cur ? 100 : 0;
        return ((cur - prev) / Math.abs(prev)) * 100;
    }

    /* Build the four Metric Explorer metrics from live data. */
    function buildMetrics() {
        const emps = load('nexus_employees');
        const ps = payrollSeries(6), as = attendanceSeries(6), ls = leaveSeries(6);
        const lastPay = ps[ps.length - 1] || { total: 0, heads: 0, avg: 0 };
        const prevPay = ps[ps.length - 2] || { total: 0, heads: 0, avg: 0 };
        const lastAtt = as[as.length - 1] || { rate: 0 };
        const prevAtt = as[as.length - 2] || { rate: 0 };
        const pendingLeaves = load('nexus_leaves').filter(l => l.status === 'pending').length;
        return {
            headcount: {
                icon: 'fa-users', title: 'Headcount', value: emps.length,
                fmt: (v) => Math.round(v).toLocaleString(),
                series: ps.map(p => p.heads), labels: ps.map(p => p.label),
                delta: deltaPct(lastPay.heads, prevPay.heads),
                desc: 'Active employees on record. Sparkline tracks the number of staff paid each of the last 6 months.'
            },
            avgpay: {
                icon: 'fa-coins', title: 'Avg Net Pay', value: lastPay.avg,
                fmt: (v) => money(v),
                series: ps.map(p => p.avg), labels: ps.map(p => p.label),
                delta: deltaPct(lastPay.avg, prevPay.avg),
                desc: 'Average net salary paid this period. Sparkline shows how the monthly average has moved.'
            },
            attendance: {
                icon: 'fa-user-check', title: 'Attendance', value: lastAtt.rate,
                fmt: (v) => v.toFixed(1) + '%',
                series: as.map(a => a.rate), labels: as.map(a => a.label),
                delta: deltaPct(lastAtt.rate, prevAtt.rate),
                desc: 'Present-or-late share of all attendance marks this month, trended over 6 months.'
            },
            leaveload: {
                icon: 'fa-plane-departure', title: 'Leave Load', value: pendingLeaves,
                fmt: (v) => Math.round(v).toLocaleString() + ' pending',
                series: ls.map(l => l.count), labels: ls.map(l => l.label),
                delta: deltaPct(ls[ls.length - 1].count, ls[ls.length - 2] ? ls[ls.length - 2].count : 0),
                desc: 'Leave requests still awaiting a decision. Sparkline counts requests starting each month.'
            }
        };
    }
    /* PLACEHOLDER_CANVAS */
    /* Size a canvas for its CSS box at device pixel ratio; returns {w,h} in CSS px. */
    function fitCanvas(cv) {
        const dpr = window.devicePixelRatio || 1;
        const r = cv.getBoundingClientRect();
        const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        cv.width = w * dpr; cv.height = h * dpr;
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, w, h };
    }

    /* ═══════════ 1. PAYROLL PULSE CHART ═══════════ */
    const Pulse = {
        range: 6, hover: -1, raf: 0, data: [],
        el: {},
        draw(progress) {
            const cv = this.el.canvas; if (!cv) return;
            const { ctx, w, h } = fitCanvas(cv);
            ctx.clearRect(0, 0, w, h);
            const data = this.data; if (!data.length) return;
            const padL = 46, padR = 14, padT = 14, padB = 26;
            const plotW = w - padL - padR, plotH = h - padT - padB;
            const vals = data.map(d => d.total);
            const max = Math.max(1, ...vals) * 1.12, min = 0;
            const X = i => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
            const Y = v => padT + plotH - ((v - min) / (max - min)) * plotH;
            const muted = cssVar('--text-muted', '#8b95a6');
            const border = cssVar('--bg-card-border', 'rgba(127,127,127,0.2)');
            // gridlines + y labels
            ctx.font = '10px JetBrains Mono, monospace'; ctx.fillStyle = muted;
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            for (let g = 0; g <= 4; g++) {
                const v = min + (max - min) * (g / 4), y = Y(v);
                ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
                ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
                ctx.globalAlpha = 1; ctx.fillText(moneyShort(v), padL - 8, y);
            }
            // x labels
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            data.forEach((d, i) => ctx.fillText(d.label, X(i), h - padB + 7));
            // animated line + area up to progress
            const p = Math.max(0, Math.min(1, progress));
            const shown = 1 + (data.length - 1) * p;
            const line = [];
            for (let i = 0; i < data.length; i++) {
                if (i > shown) break;
                let vx = X(i), vy = Y(data[i].total);
                if (i > shown - 1 && i > 0) {
                    const frac = shown - Math.floor(shown);
                    vx = X(i - 1) + (X(i) - X(i - 1)) * frac;
                    vy = Y(data[i - 1].total) + (Y(data[i].total) - Y(data[i - 1].total)) * frac;
                    line.push([vx, vy]); break;
                }
                line.push([vx, vy]);
            }
            if (line.length) {
                const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
                grad.addColorStop(0, 'rgba(59,130,246,0.34)');
                grad.addColorStop(1, 'rgba(59,130,246,0.02)');
                ctx.beginPath(); ctx.moveTo(line[0][0], padT + plotH);
                line.forEach(pt => ctx.lineTo(pt[0], pt[1]));
                ctx.lineTo(line[line.length - 1][0], padT + plotH); ctx.closePath();
                ctx.fillStyle = grad; ctx.fill();
                ctx.beginPath(); line.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
                data.forEach((d, i) => {
                    if (i > shown - 0.999) return;
                    const isH = i === this.hover;
                    ctx.beginPath(); ctx.arc(X(i), Y(d.total), isH ? 5 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = isH ? '#3b82f6' : cssVar('--bg-card', '#fff');
                    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
                });
            }
            // hover crosshair
            if (this.hover >= 0 && p >= 1) {
                const hx = X(this.hover);
                ctx.strokeStyle = '#3b82f6'; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]); ctx.beginPath();
                ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + plotH); ctx.stroke();
                ctx.setLineDash([]); ctx.globalAlpha = 1;
            }
        }
    };
    /* PLACEHOLDER_PULSE2 */
    Pulse.animate = function () {
        cancelAnimationFrame(this.raf);
        if (!anim()) { this.draw(1); return; }
        const start = performance.now(), dur = 720, self = this;
        (function step(now) {
            const t = Math.min(1, (now - start) / dur);
            self.draw(easeOut(t));
            if (t < 1) self.raf = requestAnimationFrame(step);
        })(start);
    };
    Pulse.refresh = function () {
        this.data = payrollSeries(this.range);
        this.updateMetrics();
        this.animate();
    };
    Pulse.updateMetrics = function () {
        const d = this.data; if (!d.length || !this.el.metrics) return;
        const last = d[d.length - 1], prev = d[d.length - 2] || { total: 0 };
        const totalAll = d.reduce((s, x) => s + x.total, 0);
        const avg = d.length ? totalAll / d.length : 0;
        const dp = deltaPct(last.total, prev.total);
        const cls = dp > 0.5 ? 'px-up' : dp < -0.5 ? 'px-down' : '';
        this.el.metrics.innerHTML =
            '<div class="px-metric"><span class="lbl">This period</span><span class="val">' + money(last.total) + '</span></div>' +
            '<div class="px-metric"><span class="lbl">vs last month</span><span class="val ' + cls + '">' +
                (dp >= 0 ? '+' : '') + dp.toFixed(1) + '%</span></div>' +
            '<div class="px-metric"><span class="lbl">' + this.range + '-mo average</span><span class="val">' + money(avg) + '</span></div>' +
            '<div class="px-metric"><span class="lbl">' + this.range + '-mo total</span><span class="val">' + money(totalAll) + '</span></div>';
    };
    Pulse.onMove = function (clientX) {
        const cv = this.el.canvas; if (!cv || !this.data.length) return;
        const r = cv.getBoundingClientRect();
        const padL = 46, padR = 14, plotW = r.width - padL - padR;
        const rel = clientX - r.left;
        let idx = Math.round(((rel - padL) / plotW) * (this.data.length - 1));
        idx = Math.max(0, Math.min(this.data.length - 1, idx));
        if (idx === this.hover) return;
        this.hover = idx; this.draw(1);
        const tip = this.el.tip, d = this.data[idx];
        const X = padL + (this.data.length === 1 ? plotW / 2 : (idx / (this.data.length - 1)) * plotW);
        tip.innerHTML = '<span class="t-month">' + d.label + '</span>' + money(d.total);
        tip.style.left = X + 'px';
        tip.style.top = '20px';
        tip.classList.add('show');
    };
    Pulse.onLeave = function () {
        if (this.hover < 0) return;
        this.hover = -1; this.draw(1);
        if (this.el.tip) this.el.tip.classList.remove('show');
    };

    function initPulse() {
        const grid = $('#dashGrid'); if (!grid || $('#pxPanel')) return;
        const panel = document.createElement('div');
        panel.className = 'px-panel glass'; panel.id = 'pxPanel';
        panel.innerHTML =
            '<div class="px-head">' +
              '<div class="px-title"><i class="fas fa-wave-square"></i> Payroll Pulse ' +
                '<span class="px-live"><span class="dot"></span> live</span></div>' +
              '<div class="px-range" role="group" aria-label="Chart range">' +
                '<button class="px-seg" data-range="3">3M</button>' +
                '<button class="px-seg active" data-range="6">6M</button>' +
                '<button class="px-seg" data-range="12">12M</button>' +
              '</div>' +
            '</div>' +
            '<div class="px-metricbar" id="pxMetrics"></div>' +
            '<div class="px-canvas-wrap"><canvas id="pxCanvas" role="img" ' +
              'aria-label="Net payroll trend over the selected number of months"></canvas>' +
              '<div class="px-tooltip" id="pxTip"></div></div>';
        grid.parentNode.insertBefore(panel, grid);
        Pulse.el = { canvas: $('#pxCanvas', panel), tip: $('#pxTip', panel), metrics: $('#pxMetrics', panel) };
        panel.querySelectorAll('.px-seg').forEach(seg => seg.addEventListener('click', () => {
            panel.querySelectorAll('.px-seg').forEach(s => s.classList.remove('active'));
            seg.classList.add('active');
            Pulse.range = +seg.dataset.range; Pulse.hover = -1;
            if (Pulse.el.tip) Pulse.el.tip.classList.remove('show');
            Pulse.refresh();
        }));
        const cv = Pulse.el.canvas;
        cv.addEventListener('mousemove', e => Pulse.onMove(e.clientX));
        cv.addEventListener('mouseleave', () => Pulse.onLeave());
        cv.addEventListener('touchstart', e => { if (e.touches[0]) Pulse.onMove(e.touches[0].clientX); }, { passive: true });
        cv.addEventListener('touchmove', e => { if (e.touches[0]) Pulse.onMove(e.touches[0].clientX); }, { passive: true });
        if (window.ResizeObserver) {
            let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => Pulse.draw(1), 80); }).observe(cv);
        }
        Pulse.refresh();
    }
    /* PLACEHOLDER_TIPS */
    /* ═══════════ 2. FLOATING VALUE TOOLTIPS ON EXISTING BARS ═══════════ */
    function initBarTips() {
        let tip = $('#vizTip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'viz-tip'; tip.id = 'vizTip';
            document.body.appendChild(tip);
        }
        const containers = ['#trend-bars', '#dept-list', '#reportDeptBars'];
        function show(target, cx, cy) {
            // Prefer an explicit title/aria-label/data value, else the element's own text.
            let main = target.getAttribute('data-value') || target.getAttribute('title') ||
                       target.getAttribute('aria-label') || '';
            let sub = target.getAttribute('data-label') || '';
            if (!main) {
                const txt = (target.textContent || '').trim().replace(/\s+/g, ' ');
                if (!txt) return;
                // Split "Engineering $6,120" style labels into label + value when possible.
                const mm = txt.match(/^(.*?)(\$[\d.,]+[kKmM]?%?|\d+%|\d[\d.,]*)\s*$/);
                if (mm) { sub = mm[1].trim(); main = mm[2].trim(); } else { main = txt; }
            }
            tip.innerHTML = main + (sub ? '<span class="vt-sub">' + sub + '</span>' : '');
            tip.style.left = cx + 'px'; tip.style.top = cy + 'px';
            tip.classList.add('show');
        }
        containers.forEach(sel => {
            const box = $(sel); if (!box || box.dataset.tipWired) return;
            box.dataset.tipWired = '1';
            box.addEventListener('mousemove', e => {
                const direct = [...box.children].find(c => c === e.target || c.contains(e.target));
                if (direct) show(direct, e.clientX, e.clientY);
                else tip.classList.remove('show');
            });
            box.addEventListener('mouseleave', () => tip.classList.remove('show'));
        });
    }
    /* PLACEHOLDER_MX */
    /* ═══════════ 3. REPORTS — METRIC EXPLORER ═══════════ */
    const MX = { key: 'headcount', metrics: {}, raf: 0, el: {} };

    function drawSpark(cv, series, color) {
        const { ctx, w, h } = fitCanvas(cv);
        ctx.clearRect(0, 0, w, h);
        if (!series || !series.length) return;
        const padX = 6, padY = 14;
        const max = Math.max(...series), min = Math.min(...series, 0);
        const span = (max - min) || 1;
        const X = i => padX + (series.length === 1 ? (w - padX * 2) / 2 : (i / (series.length - 1)) * (w - padX * 2));
        const Y = v => padY + (h - padY * 2) - ((v - min) / span) * (h - padY * 2);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + '55'); grad.addColorStop(1, color + '05');
        ctx.beginPath(); ctx.moveTo(X(0), h);
        series.forEach((v, i) => ctx.lineTo(X(i), Y(v)));
        ctx.lineTo(X(series.length - 1), h); ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); series.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
        series.forEach((v, i) => {
            ctx.beginPath(); ctx.arc(X(i), Y(v), i === series.length - 1 ? 3.5 : 2.5, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
        });
    }
    const MX_COLORS = { headcount: '#3b82f6', avgpay: '#8b5cf6', attendance: '#10b981', leaveload: '#f59e0b' };

    function renderMX() {
        const m = MX.metrics[MX.key]; if (!m || !MX.el.big) return;
        MX.el.label.textContent = m.title;
        MX.el.desc.textContent = m.desc;
        // animated count-up on the big readout
        cancelAnimationFrame(MX.raf);
        const target = m.value, dur = 620, start = performance.now();
        if (!anim()) { MX.el.big.textContent = m.fmt(target); }
        else {
            (function step(now) {
                const t = Math.min(1, (now - start) / dur), v = target * easeOut(t);
                MX.el.big.textContent = m.fmt(v);
                if (t < 1) MX.raf = requestAnimationFrame(step);
            })(start);
        }
        const dp = m.delta;
        const dcls = dp > 0.5 ? 'up' : dp < -0.5 ? 'down' : 'flat';
        const icon = dp > 0.5 ? 'fa-arrow-trend-up' : dp < -0.5 ? 'fa-arrow-trend-down' : 'fa-minus';
        MX.el.delta.className = 'mx-delta ' + dcls;
        MX.el.delta.innerHTML = '<i class="fas ' + icon + '"></i>' +
            (dp >= 0 ? '+' : '') + dp.toFixed(1) + '% vs prior month';
        drawSpark(MX.el.spark, m.series, MX_COLORS[MX.key]);
    }

    function initMetricExplorer() {
        const section = $('#reportsSection'); if (!section || $('#mxWrap')) return;
        const anchor = $('#reportKpis', section) || $('.report-ticker-wrap', section);
        const wrap = document.createElement('div');
        wrap.className = 'mx-wrap'; wrap.id = 'mxWrap';
        const chip = (k, ic, t) => '<button class="mx-chip" data-metric="' + k + '"><i class="fas ' + ic + '"></i>' + t + '</button>';
        wrap.innerHTML =
            '<div class="mx-chips">' +
                chip('headcount', 'fa-users', 'Headcount') +
                chip('avgpay', 'fa-coins', 'Avg Net Pay') +
                chip('attendance', 'fa-user-check', 'Attendance') +
                chip('leaveload', 'fa-plane-departure', 'Leave Load') +
            '</div>' +
            '<div class="mx-stage">' +
              '<div class="mx-readout">' +
                '<div class="mx-label"></div>' +
                '<div class="mx-big">—</div>' +
                '<div class="mx-delta flat"></div>' +
                '<div class="mx-desc"></div>' +
              '</div>' +
              '<div class="mx-spark-wrap"><canvas id="mxSpark" role="img" aria-label="Selected metric trend"></canvas></div>' +
            '</div>';
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
        else section.insertBefore(wrap, section.firstChild);
        MX.el = {
            label: $('.mx-label', wrap), big: $('.mx-big', wrap),
            delta: $('.mx-delta', wrap), desc: $('.mx-desc', wrap), spark: $('#mxSpark', wrap)
        };
        wrap.querySelectorAll('.mx-chip').forEach(c => c.addEventListener('click', () => {
            wrap.querySelectorAll('.mx-chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            MX.key = c.dataset.metric; renderMX();
        }));
        const first = wrap.querySelector('.mx-chip'); if (first) first.classList.add('active');
        if (window.ResizeObserver) {
            let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => {
                if (MX.metrics[MX.key]) drawSpark(MX.el.spark, MX.metrics[MX.key].series, MX_COLORS[MX.key]);
            }, 80); }).observe(MX.el.spark);
        }
        MX.refresh();
    }
    MX.refresh = function () { this.metrics = buildMetrics(); renderMX(); };
    /* PLACEHOLDER_CLOCK */
    /* ═══════════ 4. HEADER LIVE CLOCK ═══════════ */
    function initClock() {
        const bar = $('.header-actions'); if (!bar || $('#liveClock')) return;
        const el = document.createElement('div');
        el.className = 'live-clock'; el.id = 'liveClock';
        el.innerHTML = '<i class="fas fa-clock"></i><span class="lc-time"></span>';
        bar.insertBefore(el, bar.firstChild);
        const time = el.querySelector('.lc-time');
        const tick = () => {
            const n = new Date();
            time.textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        tick(); setInterval(tick, 1000);
    }

    /* ═══════════ REFRESH WIRING ═══════════ */
    function refreshData() {
        try { if (Pulse.el.canvas) Pulse.refresh(); } catch (_) {}
        try { if (MX.el.big) MX.refresh(); } catch (_) {}
    }
    let _refreshT = 0;
    function scheduleRefresh() { clearTimeout(_refreshT); _refreshT = setTimeout(refreshData, 240); }

    function init() {
        initClock();
        initPulse();
        initMetricExplorer();
        initBarTips();

        // Re-render when the user switches to the dashboard/reports tab (sizes the
        // canvases correctly once their section is visible) and after data edits.
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tab-btn')) setTimeout(refreshData, 60);
            // any button that likely mutates data → refresh shortly after
            if (e.target.closest('button[type="submit"], [data-action], #qaRefresh')) scheduleRefresh();
        }, true);
        window.addEventListener('storage', scheduleRefresh);
        window.addEventListener('resize', () => { if (Pulse.el.canvas) Pulse.draw(1); });

        // Gentle "live" heartbeat only when page is visible and dashboard is active
        setInterval(() => {
            if (document.hidden) return;
            const dash = $('#dashboardSection');
            if (dash && !dash.classList.contains('hidden')) refreshData();
        }, 30000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();



/* ─── SECTION: enhance4.js ─── */
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

        const rank = { crit: 0, warn: 1, info: 2, ok: 3 };
        out.forEach(a => { a.key = a.ic; a.sig = a.sev + '|' + a.title; });
        out.sort((a, b) => (rank[a.sev] - rank[b.sev]));
        return out;
    }
    function dismissedSet() {
        try { const a = JSON.parse(localStorage.getItem('nexus_noti_dismissed')); return new Set(Array.isArray(a) ? a : []); }
        catch (_) { return new Set(); }
    }
    function saveDismissed(set) { try { localStorage.setItem('nexus_noti_dismissed', JSON.stringify([...set])); } catch (_) {} }

    const Noti = { el: {}, filter: 'all', items: [], dismissedCount: 0 };
    function renderNoti() {
        const body = Noti.el.body; if (!body) return;
        const items = Noti.items;
        const counts = { all: items.length, crit: 0, warn: 0, info: 0 };
        items.forEach(i => { counts[i.sev] = (counts[i.sev] || 0) + 1; });
        const shown = Noti.filter === 'all' ? items : items.filter(i => i.sev === Noti.filter);
        const label = { all: 'All', crit: 'Urgent', warn: 'Action', info: 'Info' };
        const chips = ['all', 'crit', 'warn', 'info'].map(f =>
            '<button class="' + (Noti.filter === f ? 'active' : '') + '" data-f="' + f + '">' +
            label[f] + (counts[f] ? ' <span class="cnt">' + counts[f] + '</span>' : '') + '</button>').join('');
        // ── hero banner: turns the plain list into a live status surface ──
        let html = '';
        const restoreLink = Noti.dismissedCount
            ? ' · <button class="noti-restore" type="button">restore ' + Noti.dismissedCount + '</button>'
            : '';
        if (items.length) {
            const topSev = items[0].sev;
            const parts = [];
            if (counts.crit) parts.push('<b>' + counts.crit + '</b> urgent');
            if (counts.warn) parts.push('<b>' + counts.warn + '</b> action');
            if (counts.info) parts.push('<b>' + counts.info + '</b> info');
            html += '<div class="noti-hero ' + topSev + (topSev === 'crit' ? ' pulse' : '') + '">' +
                '<div class="noti-hero-ring">' + items.length + '</div>' +
                '<div class="noti-hero-txt">' +
                '<div class="noti-hero-title">' + items.length + (items.length > 1 ? ' items need' : ' item needs') + ' attention</div>' +
                '<div class="noti-hero-sub">' + parts.join('&nbsp;·&nbsp;') + restoreLink + '</div>' +
                '</div></div>';
        } else {
            html += '<div class="noti-hero ok">' +
                '<div class="noti-hero-ring"><i class="fas fa-check"></i></div>' +
                '<div class="noti-hero-txt">' +
                '<div class="noti-hero-title">All clear</div>' +
                '<div class="noti-hero-sub">Everything looks up to date' + restoreLink + '</div>' +
                '</div></div>';
        }
        html += '<div class="hx-filter">' + chips + '</div>';
        if (!shown.length) {
            html += '<div class="hx-empty"><i class="fas fa-circle-check"></i>' +
                (items.length ? 'Nothing in this filter.' : 'You\'re all caught up — nothing needs attention.') +
                '</div>';
        } else {
            shown.forEach((it, i) => {
                html += '<div class="noti dismissable sev-' + it.sev + ' ' + (anim() ? 'noti-enter' : '') + '" data-i="' + i + '" style="animation-delay:' + Math.min(i * 45, 400) + 'ms">' +
                    '<div class="noti-ic ' + it.sev + '"><i class="fas ' + it.ic + '"></i></div>' +
                    '<div class="noti-main"><div class="noti-title">' + esc(it.title) + '</div>' +
                    '<div class="noti-sub">' + it.sub + '</div>' +
                    (it.act ? '<button class="noti-act" data-i="' + i + '">' + esc(it.act) + '</button>' : '') +
                    '</div>' +
                    '<button class="noti-dismiss" data-i="' + i + '" title="Dismiss" aria-label="Dismiss alert"><i class="fas fa-xmark"></i></button>' +
                    '</div>';
            });
        }
        body.innerHTML = html;
        $$('.hx-filter button', body).forEach(b => b.addEventListener('click', () => { Noti.filter = b.dataset.f; renderNoti(); }));
        $$('.noti-act', body).forEach(b => b.addEventListener('click', () => {
            const it = shown[+b.dataset.i]; Noti.el.api.close(); if (it && it.run) setTimeout(it.run, 60);
        }));
        $$('.noti-dismiss', body).forEach(b => b.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const it = shown[+b.dataset.i]; if (!it) return;
            const d = dismissedSet(); d.add(it.sig); saveDismissed(d);
            refreshNotiBadge();
        }));
        $$('.noti-restore', body).forEach(r => r.addEventListener('click', () => {
            try { localStorage.removeItem('nexus_noti_dismissed'); } catch (_) {}
            refreshNotiBadge();
        }));
    }
    function refreshNotiBadge() {
        const all = computeAlerts();
        const d = dismissedSet();
        Noti.items = all.filter(a => !d.has(a.sig));
        Noti.dismissedCount = all.length - Noti.items.length;
        const badge = Noti.el.badge; if (!badge) return;
        const n = Noti.items.length;
        badge.textContent = n > 9 ? '9+' : String(n);
        badge.classList.remove('sev-crit', 'sev-warn', 'sev-info');
        if (n > 0) badge.classList.add('sev-' + Noti.items[0].sev);
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
        body.innerHTML =
            '<div class="set-group"><div class="set-group-h">Appearance</div>' +
              row('fa-moon', 'Dark mode', 'Switch between light and dark themes', switchCtl('set-theme', isDark)) +
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
        // animate the meter after paint, colour by usage
        setTimeout(() => {
            const f = $('.storage-fill', body); if (!f) return;
            f.style.width = pct.toFixed(1) + '%';
            if (pct > 85) f.style.background = 'linear-gradient(90deg,#f59e0b,#ef4444)';
            else if (pct > 60) f.style.background = 'linear-gradient(90deg,#10b981,#f59e0b)';
        }, anim() ? 40 : 0);
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
    function switchCtl(id, checked) {
        return '<label class="set-switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '>' +
            '<span class="track"></span><span class="thumb"></span></label>';
    }

    function mountCurrencyMirror(mount) {
        if (!mount) return;
        const real = $('#settingsCurrencySelect') || $('#currencySelect'); if (!real) { mount.textContent = '—'; return; }
        const sel = document.createElement('select');
        sel.className = 'set-currency-sel';
        sel.setAttribute('aria-label', 'Display currency');
        // compact labels: keep the currency code (before an em/en dash) so the
        // control fits the settings row instead of overflowing it.
        Array.from(real.options).forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.value;
            const code = (o.text || o.value).split(/[—–-]/)[0].trim();
            opt.textContent = code || o.value;
            sel.appendChild(opt);
        });
        sel.value = real.value;
        sel.addEventListener('change', () => {
            real.value = sel.value;
            real.dispatchEvent(new Event('change', { bubbles: true }));
        });
        mount.innerHTML = ''; mount.appendChild(sel);
    }
    function wireSettings(body) {
        const proxy = (id, targetId) => { const b = $('#' + id, body); if (b) b.addEventListener('click', () => { const t = document.getElementById(targetId); if (t) t.click(); }); };
        const toggle = (id, targetId) => { const el = $('#' + id, body); if (el) el.addEventListener('change', () => { const t = document.getElementById(targetId); if (t) t.click(); }); };
        toggle('set-theme', 'themeToggle');
        proxy('set-export', 'exportExcelBtn');
        proxy('set-backup', 'backupBtn');
        proxy('set-restore', 'importFile');
        const reset = $('#set-reset', body);
        if (reset) reset.addEventListener('click', () => {
            if (!confirm('Reset ALL data?\n\nThis permanently deletes every employee, attendance, leave and payroll record stored in this browser. This cannot be undone.')) return;
            if (!confirm('Are you absolutely sure? Consider taking a Backup first.')) return;
            try {
                ['nexus_employees', 'nexus_attendance', 'nexus_leaves', 'nexus_payroll', 'nexus_noti_dismissed'].forEach(k => localStorage.removeItem(k));
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
        const theme = $('#themeToggle');
        const refTheme = (theme && theme.parentNode === bar) ? theme : null;
        bar.insertBefore(btnEl, refTheme);
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



/* ─── SECTION: enhance5.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance5.js
   Motion & Interaction layer. Additive, dependency-free, honours body.no-anim
   and prefers-reduced-motion. Degrades gracefully if any hook is missing.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var $ = function (s, r) { return (r || document).querySelector(s); };

    function reduceMotion() {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }
    function anim() {
        return !document.body.classList.contains('no-anim') && !reduceMotion();
    }
    function cssVar(name, fb) {
        try {
            var v = getComputedStyle(document.body).getPropertyValue(name);
            return (v && v.trim()) || fb;
        } catch (e) { return fb; }
    }
    function goTab(name) {
        var b = document.querySelector('.tab-btn[data-tab="' + name + '"]');
        if (b) b.click();
    }

    /* ═══════════ 1. SCROLL PROGRESS BAR ═══════════ */
    function initProgress() {
        var bar = document.createElement('div');
        bar.className = 'mx5-progress';
        document.body.appendChild(bar);
        var ticking = false;
        function update() {
            var doc = document.documentElement;
            var max = (doc.scrollHeight - doc.clientHeight) || 1;
            var pct = Math.min(100, Math.max(0, (doc.scrollTop || window.pageYOffset) / max * 100));
            bar.style.width = pct + '%';
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }
    /* ═══════════ 2. RIPPLE ═══════════ */
    function initRipple() {
        var SEL = 'button, .btn, .tab-btn, .mx-chip, .fab5-btn, .fab5-main';
        document.addEventListener('pointerdown', function (e) {
            if (!anim()) return;
            var t = e.target;
            if (!t || typeof t.closest !== 'function') return;
            var host = t.closest(SEL);
            if (!host || host.disabled) return;
            if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
            host.classList.add('mx5-ripple-host');
            var rect = host.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height) * 1.1;
            var rip = document.createElement('span');
            rip.className = 'mx5-ripple';
            rip.style.width = rip.style.height = size + 'px';
            rip.style.left = (e.clientX - rect.left - size / 2) + 'px';
            rip.style.top = (e.clientY - rect.top - size / 2) + 'px';
            host.appendChild(rip);
            setTimeout(function () { rip.remove(); }, 620);
        }, { passive: true });
    }

    /* ═══════════ 3. SECTION-ENTER STAGGER ═══════════ */
    function playEnter(section) {
        if (!section || !anim()) return;
        requestAnimationFrame(function () {
            section.classList.add('mx5-enter');
            setTimeout(function () {
                section.classList.remove('mx5-enter');
            }, 650);
        });
    }
    function initSectionTransitions() {
        var sections = document.querySelectorAll('.tab-content');
        sections.forEach(function (sec) {
            var obs = new MutationObserver(function (muts) {
                muts.forEach(function (m) {
                    if (m.attributeName === 'class' && !sec.classList.contains('hidden')) {
                        playEnter(sec);
                    }
                });
            });
            obs.observe(sec, { attributes: true, attributeFilter: ['class'] });
        });
    }
    /* ═══════════ 4. FAB SPEED-DIAL ═══════════ */
    var FAB_ACTIONS = [
        { icon: 'fa-user-plus', label: 'Add Employee', run: function () { goTab('employees'); setTimeout(function () { var b = $('#addEmpBtn'); if (b) b.click(); }, 60); } },
        { icon: 'fa-calendar-check', label: 'Mark Attendance', run: function () { goTab('attendance'); } },
        { icon: 'fa-plane-departure', label: 'New Leave', run: function () { goTab('leaves'); setTimeout(function () { var b = $('#newLeaveBtn'); if (b) b.click(); }, 60); } },
        { icon: 'fa-wallet', label: 'Payroll', run: function () { goTab('payroll'); } },
        { icon: 'fa-flask', label: 'What-If', run: function () { var b = $('#whatIfBtn'); if (b) b.click(); } }
    ];
    function initFab() {
        // Floating action button removed per user specification
        return;
    }
    /* ═══════════ 5. THEME-REVEAL FLOURISH ═══════════ */
    var lastPt = { x: window.innerWidth - 40, y: 40 };
    var pendingOldBg = null;
    function isDark() {
        var b = document.body;
        return b.classList.contains('dark-mode') || b.classList.contains('dark') ||
            document.documentElement.classList.contains('dark');
    }
    function initThemeFlourish() {
        document.addEventListener('pointerdown', function (e) {
            lastPt = { x: e.clientX, y: e.clientY };
            try { pendingOldBg = getComputedStyle(document.body).backgroundColor; } catch (err) { pendingOldBg = null; }
        }, true);
        var wasDark = isDark();
        var obs = new MutationObserver(function () {
            var now = isDark();
            if (now !== wasDark) { wasDark = now; flourish(); }
        });
        obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    function flourish() {
        if (!anim() || !pendingOldBg) return;
        var x = lastPt.x, y = lastPt.y;
        var veil = document.createElement('div');
        veil.className = 'mx5-theme-veil';
        veil.style.background = pendingOldBg;
        var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 4;
        veil.style.clipPath = 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)';
        veil.style.transition = 'clip-path 0.5s ease-in';
        document.body.appendChild(veil);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                veil.style.clipPath = 'circle(0px at ' + x + 'px ' + y + 'px)';
            });
        });
        setTimeout(function () { veil.remove(); }, 580);
    }

    /* ═══════════ 6. CONFETTI ═══════════ */
    function confettiBurst() {
        if (!anim()) return;
        var cv = document.createElement('canvas');
        cv.className = 'mx5-confetti';
        document.body.appendChild(cv);
        var dpr = window.devicePixelRatio || 1;
        var W = window.innerWidth, H = window.innerHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
        var colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
        var N = 140, parts = [];
        for (var i = 0; i < N; i++) {
            parts.push({
                x: W / 2 + (Math.random() - 0.5) * 120, y: H * 0.32,
                vx: (Math.random() - 0.5) * 11, vy: Math.random() * -13 - 4,
                g: 0.32 + Math.random() * 0.16, s: 5 + Math.random() * 6,
                rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.35,
                c: colors[i % colors.length], life: 0
            });
        }
        var start = performance.now();
        function frame(now) {
            var t = now - start;
            ctx.clearRect(0, 0, W, H);
            var alive = false;
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life = t;
                var a = Math.max(0, 1 - t / 1800);
                if (a <= 0 || p.y > H + 40) continue;
                alive = true;
                ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
                ctx.restore();
            }
            if (alive && t < 2000) requestAnimationFrame(frame);
            else cv.remove();
        }
        requestAnimationFrame(frame);
    }
    function initConfettiHook() {
        window.nexusConfetti = confettiBurst;
        var orig = window.showToast;
        if (typeof orig === 'function') {
            window.showToast = function () {
                try {
                    var msg = String(arguments[0] || '').toLowerCase();
                    if (/payroll/.test(msg) && /(process|generat|complet|success|run|done)/.test(msg)) {
                        setTimeout(confettiBurst, 60);
                    }
                } catch (e) {}
                return orig.apply(this, arguments);
            };
        }
    }
    /* ═══════════ INIT ═══════════ */
    function init() {
        try { initProgress(); } catch (e) {}
        try { initRipple(); } catch (e) {}
        try { initSectionTransitions(); } catch (e) {}
        try { initFab(); } catch (e) {}
        try { initThemeFlourish(); } catch (e) {}
        try { initConfettiHook(); } catch (e) {}
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();



/* ─── SECTION: enhance6.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance6.js
   Relocates the header live-clock out of the dead-center of the header and into
   the right-hand action cluster, then tags it (.lc6) so enhance6.css can restyle
   it as a horizontal pill. Additive, dependency-free, degrades gracefully.
   The base clock-updating logic in script.js is left untouched.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function relocate() {
        var clock = document.getElementById('liveClock');
        var bar = document.querySelector('.header-actions');
        if (!clock || !bar) return;
        clock.classList.add('lc6');
        // move the clock to the front of the action cluster (idempotent)
        if (clock.parentNode !== bar || bar.firstChild !== clock) {
            bar.insertBefore(clock, bar.firstChild);
        }
        // add a hairline divider right after the clock, once
        if (!document.getElementById('lc6-div')) {
            var div = document.createElement('span');
            div.id = 'lc6-div';
            div.className = 'lc6-divider';
            div.setAttribute('aria-hidden', 'true');
            if (clock.nextSibling) bar.insertBefore(div, clock.nextSibling);
            else bar.appendChild(div);
        }
    }

    function init() {
        // run after the other enhance layers have injected their header buttons
        try { relocate(); } catch (e) {}
        // one more pass on the next frame in case enhance4 injects buttons later
        try { requestAnimationFrame(relocate); } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();



/* ─── SECTION: enhance7.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance7.js
   Seventh additive layer: interactive / dynamic surfaces.
   Additive only: reads localStorage, uses public window.* hooks, never touches
   script.js internals. Honours body.no-anim / prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function ls(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
  function money(v) {
    try { if (typeof window.fmtCurrency === 'function') return window.fmtCurrency(+v || 0); } catch (e) {}
    return String(v);
  }
  function empName(emp) {
    if (!emp) return 'Unknown';
    var n = ((emp.firstName || '') + ' ' + (emp.lastName || '')).trim();
    return n || emp.name || emp.employeeId || 'Employee';
  }
  function findEmp(emps, ref) {
    for (var i = 0; i < emps.length; i++) {
      if (emps[i].id === ref || String(emps[i].id) === String(ref) || emps[i].employeeId === ref) return emps[i];
    }
    return null;
  }
  function daysBetween(a, b) {
    var d1 = new Date(a), d2 = new Date(b);
    if (isNaN(d1) || isNaN(d2)) return 1;
    return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  }

  /* ─────────────── 3. Live activity feed (log store) ─────────────── */
  var LOGKEY = 'nexus_activity_log';
  function readLog() { return ls(LOGKEY); }
  function writeLog(a) { try { localStorage.setItem(LOGKEY, JSON.stringify(a.slice(0, 30))); } catch (e) {} }
  function logActivity(icon, color, text) {
    var a = readLog();
    a.unshift({ t: Date.now(), icon: icon, color: color, text: text });
    writeLog(a);
    renderFeed(true);
  }
  function relTime(t) {
    var s = (Date.now() - t) / 1000;
    if (s < 10) return 'just now';
    if (s < 60) return Math.floor(s) + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  var _feedTop = 0;
  function renderFeed(markNew) {
    var anchor = $('#activity-feed');
    if (!anchor || !anchor.parentElement) return;
    var box = $('#lc7-activity');
    if (!box) {
      box = document.createElement('div');
      box.id = 'lc7-activity';
      anchor.parentElement.insertBefore(box, anchor);
    }
    var log = readLog();
    var head = '<div class="lc7-feed-head"><span class="live-status-dot"></span>Live activity</div>';
    if (!log.length) {
      box.innerHTML = head + '<div class="lc7-feed-empty">No actions yet — approve a leave or edit an employee to see it here.</div>';
      return;
    }
    var newTop = log[0] ? log[0].t : 0;
    var isNew = markNew && newTop !== _feedTop;
    _feedTop = newTop;
    var items = log.slice(0, 8).map(function (it, i) {
      var cls = (isNew && i === 0) ? 'lc7-feed-item new' : 'lc7-feed-item';
      return '<div class="' + cls + '">'
        + '<div class="lc7-feed-ic" style="background:' + it.color + '"><i class="fa-solid ' + it.icon + '"></i></div>'
        + '<div class="lc7-feed-b"><div class="lc7-feed-t"></div><div class="lc7-feed-time" data-t="' + it.t + '"></div></div>'
        + '</div>';
    }).join('');
    box.innerHTML = head + items;
    // set text safely (avoid HTML injection from names/departments)
    var bodies = $$('.lc7-feed-item .lc7-feed-t', box);
    log.slice(0, 8).forEach(function (it, i) { if (bodies[i]) bodies[i].textContent = it.text; });
    tickTimes();
  }
  function tickTimes() {
    $$('#lc7-activity .lc7-feed-time').forEach(function (el) {
      el.textContent = relTime(+el.getAttribute('data-t'));
    });
  }
  setInterval(tickTimes, 30000);

  /* ─────────────── 1. Kanban leave board ─────────────── */
  var COLS = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' }
  ];
  var VIEWKEY = 'nexus_leave_view';
  function curView() { return localStorage.getItem(VIEWKEY) || 'board'; }
  function setView(v) { localStorage.setItem(VIEWKEY, v); applyView(); }

  function buildBoard() {
    var table = $('#leavesTable');
    if (!table) return;
    var wrap = $('#lc7-board-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'lc7-board-wrap';
      wrap.innerHTML = '<div class="lc7-viewtoggle" id="lc7-toggle">'
        + '<button data-v="board" class="active"><i class="fa-solid fa-table-columns"></i> Board</button>'
        + '<button data-v="list"><i class="fa-solid fa-list"></i> List</button></div>'
        + '<div class="lc7-board" id="lc7-board"></div>';
      table.parentElement.insertBefore(wrap, table);
      $('#lc7-toggle').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return; setView(b.getAttribute('data-v'));
      });
      $('#lc7-board').addEventListener('click', function (e) {
        var b = e.target.closest('[data-move]'); if (!b) return;
        e.stopPropagation();
        moveLeave(b.getAttribute('data-id'), b.getAttribute('data-move'));
      });
    }
    renderBoard();
    applyView();
  }
  function renderBoard() {
    var board = $('#lc7-board'); if (!board) return;
    var leaves = ls('nexus_leaves'), emps = ls('nexus_employees');
    board.innerHTML = COLS.map(function (c) {
      return '<div class="lc7-col ' + c.key + '" data-status="' + c.key + '">'
        + '<div class="lc7-col-h"><span class="dot"></span>' + c.label
        + '<span class="cnt" data-cnt="' + c.key + '">0</span></div>'
        + '<div class="lc7-col-body" data-body="' + c.key + '"></div></div>';
    }).join('');
    var counts = { pending: 0, approved: 0, rejected: 0 };
    leaves.forEach(function (lv) {
      var st = (lv.status || 'pending').toLowerCase();
      if (!counts.hasOwnProperty(st)) st = 'pending';
      counts[st]++;
      var body = board.querySelector('[data-body="' + st + '"]');
      if (!body) return;
      var emp = findEmp(emps, lv.employeeId);
      var card = document.createElement('div');
      card.className = 'lc7-card ' + st;
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', lv.id);
      var nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = empName(emp);
      var meta = document.createElement('div'); meta.className = 'meta';
      meta.textContent = (lv.startDate || '?') + ' → ' + (lv.endDate || '?') + ' · ' + daysBetween(lv.startDate, lv.endDate) + 'd';
      var type = document.createElement('span'); type.className = 'type'; type.textContent = lv.leaveType || 'Leave';
      card.appendChild(nm); card.appendChild(meta); card.appendChild(type);
      // details (replaces the old approve/reject/reopen buttons — drag between
      // columns to change status instead)
      var deptTxt = emp ? [emp.department, emp.position].filter(Boolean).join(' · ') : '';
      if (deptTxt) {
        var dept = document.createElement('div'); dept.className = 'lc7-det';
        var di = document.createElement('i'); di.className = 'fa-solid fa-building';
        dept.appendChild(di); dept.appendChild(document.createTextNode(' ' + deptTxt));
        card.appendChild(dept);
      }
      if (lv.reason) {
        var rsn = document.createElement('div'); rsn.className = 'lc7-det lc7-det-reason';
        var ri = document.createElement('i'); ri.className = 'fa-solid fa-quote-left';
        rsn.appendChild(ri); rsn.appendChild(document.createTextNode(' ' + lv.reason));
        rsn.title = lv.reason;
        card.appendChild(rsn);
      }
      body.appendChild(card);
    });
    COLS.forEach(function (c) {
      var b = board.querySelector('[data-body="' + c.key + '"]');
      var cntEl = board.querySelector('[data-cnt="' + c.key + '"]');
      if (cntEl) cntEl.textContent = counts[c.key];
      if (b && !b.children.length) b.innerHTML = '<div class="lc7-col-empty">Nothing here</div>';
    });
    wireDnD();
  }

  var _drag = null;
  function wireDnD() {
    $$('#lc7-board .lc7-card').forEach(function (card) {
      card.addEventListener('dragstart', function () { _drag = card.getAttribute('data-id'); card.classList.add('dragging'); });
      card.addEventListener('dragend', function () { card.classList.remove('dragging'); _drag = null; });
    });
    $$('#lc7-board .lc7-col').forEach(function (col) {
      col.addEventListener('dragover', function (e) { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', function () { col.classList.remove('drag-over'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault(); col.classList.remove('drag-over');
        var id = _drag; if (id == null) return;
        var target = col.getAttribute('data-status');
        moveLeave(id, target);
      });
    });
  }
  function moveLeave(id, target) {
    var leaves = ls('nexus_leaves');
    var lv = null;
    for (var i = 0; i < leaves.length; i++) { if (String(leaves[i].id) === String(id)) { lv = leaves[i]; break; } }
    if (!lv || (lv.status || '').toLowerCase() === target) return;
    if (typeof window.updateLeaveStatus === 'function') window.updateLeaveStatus(lv.id, target);
  }
  function applyView() {
    var v = curView();
    var table = $('#leavesTable'); var board = $('#lc7-board');
    if (!table) return;
    if (board) board.style.display = (v === 'board') ? 'grid' : 'none';
    table.style.display = (v === 'list') ? '' : 'none';
    $$('#lc7-toggle button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-v') === v); });
  }

  /* ─────────────── activity: wrap public mutators ─────────────── */
  var _submitBound = false, _curBound = false;
  function wrapGlobals() {
    if (typeof window.updateLeaveStatus === 'function' && !window.updateLeaveStatus.__lc7) {
      var orig = window.updateLeaveStatus;
      var w = function (id, status) {
        var leaves = ls('nexus_leaves'), emps = ls('nexus_employees'), lv = null;
        for (var i = 0; i < leaves.length; i++) { if (String(leaves[i].id) === String(id)) { lv = leaves[i]; break; } }
        var emp = lv ? findEmp(emps, lv.employeeId) : null;
        if (status === 'pending') {
          var t = window.showToast; window.showToast = function () {};
          try { orig(id, status); } finally { window.showToast = t; }
          if (typeof window.showToast === 'function') window.showToast('↩︎ Moved to pending: ' + empName(emp), 'info');
        } else { orig(id, status); }
        var icon = status === 'approved' ? 'fa-check' : status === 'rejected' ? 'fa-xmark' : 'fa-rotate-left';
        var color = status === 'approved' ? '#10b981' : status === 'rejected' ? '#ef4444' : '#f59e0b';
        var verb = status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Reopened';
        logActivity(icon, color, verb + ' leave · ' + empName(emp));
      };
      w.__lc7 = 1; window.updateLeaveStatus = w;
    }
    if (typeof window.deleteEmployee === 'function' && !window.deleteEmployee.__lc7) {
      var od = window.deleteEmployee;
      var wd = function (id) {
        var emps = ls('nexus_employees'), e = findEmp(emps, id), nm = empName(e);
        var before = emps.length, r = od.apply(this, arguments);
        if (ls('nexus_employees').length < before) logActivity('fa-user-minus', '#ef4444', 'Removed employee · ' + nm);
        return r;
      };
      wd.__lc7 = 1; window.deleteEmployee = wd;
    }
    if (typeof window.downloadPayslip === 'function' && !window.downloadPayslip.__lc7) {
      var op = window.downloadPayslip;
      var wp = function () { var r = op.apply(this, arguments); logActivity('fa-file-arrow-down', '#3b82f6', 'Downloaded payslip'); return r; };
      wp.__lc7 = 1; window.downloadPayslip = wp;
    }
    if (!_submitBound) {
      _submitBound = true;
      document.addEventListener('submit', function (e) {
        var f = e.target; if (!f || f.id !== 'empForm') return;
        var isEdit = !!(($('#empId') || {}).value);
        var nm = ((($('#empFirstName') || {}).value || '') + ' ' + (($('#empLastName') || {}).value || '')).trim() || 'employee';
        setTimeout(function () {
          logActivity(isEdit ? 'fa-user-pen' : 'fa-user-plus', isEdit ? '#3b82f6' : '#10b981', (isEdit ? 'Updated ' : 'Added ') + 'employee · ' + nm);
        }, 30);
      }, true);
    }
    if (!_curBound) {
      var cs = $('#settingsCurrencySelect') || $('#currencySelect');
      if (cs) { _curBound = true; cs.addEventListener('change', function () { logActivity('fa-coins', '#f59e0b', 'Currency set to ' + cs.value); }); }
    }
  }
  /* ─────────────── 2. Inline-edit table cells ─────────────── */
  var EDIT_MAP = { 2: 'department', 3: 'position', 4: 'basicSalary' };
  function rowEmpId(tr) {
    var btn = tr.querySelector('[data-action="edit-emp"]');
    return btn ? btn.getAttribute('data-id') : null;
  }
  function empField(id, prop) {
    var e = findEmp(ls('nexus_employees'), id); return e ? e[prop] : '';
  }
  function tagCells() {
    $$('#employeesTbody tr').forEach(function (tr) {
      [2, 3, 4].forEach(function (i) {
        var c = tr.children[i];
        if (c && !c.classList.contains('lc7-editable')) { c.classList.add('lc7-editable'); c.title = 'Double-click to edit'; }
      });
    });
  }
  function initInlineEdit() {
    var tb = $('#employeesTbody'); if (!tb || tb.__lc7edit) return; tb.__lc7edit = 1;
    tb.addEventListener('dblclick', function (e) {
      var td = e.target.closest('td'); if (!td) return;
      var tr = td.parentElement; var idx = Array.prototype.indexOf.call(tr.children, td);
      var field = EDIT_MAP[idx]; if (!field) return;
      if (td.querySelector('.lc7-cell-input')) return;
      var id = rowEmpId(tr); if (id == null) return;
      startEdit(td, id, field);
    });
  }
  function startEdit(td, id, field) {
    var orig = td.textContent.trim();
    var initVal = (field === 'basicSalary') ? String(empField(id, 'basicSalary') || '') : orig;
    var input = document.createElement('input');
    input.className = 'lc7-cell-input';
    input.type = (field === 'basicSalary') ? 'number' : 'text';
    input.value = initVal;
    td.textContent = ''; td.appendChild(input); input.focus(); input.select();
    var done = false;
    function commit() {
      if (done) return; done = true;
      var val = input.value.trim();
      if (val === '' || val === String(initVal)) { td.textContent = orig; tagCells(); return; }
      saveField(id, field, val);
    }
    function cancel() { if (done) return; done = true; td.textContent = orig; tagCells(); }
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', commit);
  }
  function saveField(id, field, val) {
    if (typeof window.openEditEmpModal !== 'function') return;
    document.body.classList.add('lc7-suppressmodal');
    window.openEditEmpModal(id);
    var sel = field === 'department' ? '#empDepartment' : field === 'position' ? '#empPosition' : '#empBasicSalary';
    var inp = $(sel); if (inp) inp.value = val;
    var form = $('#empForm');
    try {
      if (form && form.requestSubmit) form.requestSubmit();
      else if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    } catch (e) {}
    setTimeout(function () { document.body.classList.remove('lc7-suppressmodal'); flashCell(field, id); }, 40);
  }
  function flashCell(field, id) {
    var idx = field === 'department' ? 2 : field === 'position' ? 3 : 4;
    var rows = $$('#employeesTbody tr');
    for (var i = 0; i < rows.length; i++) {
      var btn = rows[i].querySelector('[data-action="edit-emp"]');
      if (btn && String(btn.getAttribute('data-id')) === String(id)) {
        var c = rows[i].children[idx];
        if (c) { c.classList.add('lc7-flash'); (function (cc) { setTimeout(function () { cc.classList.remove('lc7-flash'); }, 1000); })(c); }
        break;
      }
    }
    tagCells();
  }
  /* ─────────────── 4. Reactive filter counts ─────────────── */
  function initFilters() {
    setupCount('#empSearch', '#employeesTbody', 'emp');
    setupCount('#leaveSearch', '#leavesTbody', 'lv');
  }
  function setupCount(inputSel, tbodySel, key) {
    var input = $(inputSel), tb = $(tbodySel);
    if (!input || !tb || input.__lc7cnt) return; input.__lc7cnt = 1;
    var chip = document.createElement('span');
    chip.className = 'lc7-count'; chip.id = 'lc7-cnt-' + key;
    chip.innerHTML = '<b>0</b>&nbsp;of&nbsp;<span>0</span>';
    input.insertAdjacentElement('afterend', chip);
    function upd() {
      var rows = $$(tbodySel + ' tr');
      var vis = rows.filter(function (r) { return r.style.display !== 'none'; });
      chip.querySelector('b').textContent = vis.length;
      chip.querySelector('span').textContent = rows.length;
      chip.classList.toggle('filtering', !!input.value.trim());
    }
    input.addEventListener('input', function () { setTimeout(upd, 0); });
    new MutationObserver(upd).observe(tb, { childList: true });
    upd();
  }

  /* ─────────────── 5. Interactive chart callouts ─────────────── */
  var MONEY_CHARTS = { payrollBreakdownChart: 1 };
  var CHART_IDS = ['deptBarChart', 'payrollBreakdownChart', 'attendanceTrendChart', 'leaveDistChart'];
  var pop = null;
  function fmtVal(v, isMoney) {
    if (isMoney) return money(v);
    return (typeof v === 'number' && isFinite(v)) ? v.toLocaleString() : String(v);
  }
  function bindCharts() {
    if (!window.Chart) return;
    CHART_IDS.forEach(function (id) {
      var cv = document.getElementById(id);
      if (!cv || cv.__lc7) return; cv.__lc7 = 1;
      cv.addEventListener('click', function (e) { onChartClick(e, cv, id); });
    });
  }
  function onChartClick(e, cv, id) {
    if (!window.Chart) return;
    var ch = Chart.getChart(cv); if (!ch) return;
    var pts = ch.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
    if (!pts.length) { hidePop(); return; }
    var p = pts[0], ds = ch.data.datasets[p.datasetIndex], val = +ds.data[p.index];
    var label = (ch.data.labels && ch.data.labels[p.index] != null) ? ch.data.labels[p.index] : (ds.label || '');
    var total = 0; for (var k = 0; k < ds.data.length; k++) total += (+ds.data[k] || 0);
    var pct = total ? (val / total * 100) : 0;
    showPop(e.clientX, e.clientY, String(label), fmtVal(val, MONEY_CHARTS[id]), pct);
  }
  function showPop(x, y, label, valStr, pct) {
    if (!pop) { pop = document.createElement('div'); pop.className = 'lc7-chart-pop'; document.body.appendChild(pop); }
    pop.innerHTML = '<div class="lbl"></div><div class="val"></div><div class="pct"></div>';
    pop.querySelector('.lbl').textContent = label;
    pop.querySelector('.val').textContent = valStr;
    pop.querySelector('.pct').textContent = pct.toFixed(1) + '% of total';
    pop.style.left = Math.min(x + 14, window.innerWidth - 180) + 'px';
    pop.style.top = Math.max(12, y - 20) + 'px';
    requestAnimationFrame(function () { pop.classList.add('show'); });
  }
  function hidePop() { if (pop) pop.classList.remove('show'); }
  /* ─────────────── boot / init ─────────────── */
  var _once = false;
  function init() {
    renderFeed(false);
    buildBoard();
    initInlineEdit(); tagCells();
    initFilters();
    bindCharts();
    wrapGlobals();
    var tb = $('#leavesTbody');
    if (tb && !tb.__lc7obs) { tb.__lc7obs = 1; new MutationObserver(function () { if ($('#lc7-board')) renderBoard(); }).observe(tb, { childList: true }); }
    var etb = $('#employeesTbody');
    if (etb && !etb.__lc7obs) { etb.__lc7obs = 1; new MutationObserver(tagCells).observe(etb, { childList: true }); }
    if (!_once) {
      _once = true;
      document.addEventListener('mousedown', function (e) { if (pop && !e.target.closest('canvas')) hidePop(); });
      document.addEventListener('click', function () { setTimeout(function () { bindCharts(); if ($('#lc7-board')) applyView(); }, 120); });
    }
  }
  function boot() { init(); requestAnimationFrame(init); setTimeout(init, 400); setTimeout(init, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();



/* ─── SECTION: enhance8.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance8.js
   Eighth additive layer: the "Insights hub". Merges the three flat dashboard
   panels (Live activity / Top earners / Exchange rates) into ONE full-width card
   with an animated segmented control and three swappable panels:
     • Activity  — reuses the enhance7 real-time log (dedupes the double header)
     • Leaders   — the top-earners board + a Top 3 / Top 5 toggle
     • Currency  — a live multi-currency converter: pick any base currency and
                   see live market rates fetched from CORS-enabled CDN endpoints
                   (graceful approximate fallback when fully offline)
   Purely additive: reads public DOM/globals only; honours body.no-anim.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var TABKEY = 'nexus_insights_tab';
  var BASEKEY = 'nexus_ins8_base';
  var TABS = [
    { key: 'activity', label: 'Activity', icon: 'fa-wave-square' },
    { key: 'leaders', label: 'Leaders', icon: 'fa-trophy' },
    { key: 'currency', label: 'Currency', icon: 'fa-right-left' }
  ];
  // Full currency set (mirrors the base app's CURRENCIES in script.js).
  var CUR = [
    { code: 'USD', sym: '$' }, { code: 'EUR', sym: '€' }, { code: 'GBP', sym: '£' },
    { code: 'INR', sym: '₹' }, { code: 'NPR', sym: 'Rs' }, { code: 'JPY', sym: '¥' },
    { code: 'CNY', sym: '¥' }, { code: 'AUD', sym: 'A$' }, { code: 'CAD', sym: 'C$' },
    { code: 'SGD', sym: 'S$' }, { code: 'CHF', sym: 'Fr' }, { code: 'AED', sym: 'د.إ' }
  ];
  // USD-based approximate rates — only used to derive cross-rates when every
  // online endpoint is unreachable (e.g. fully offline), so the converter still
  // produces sensible numbers instead of dashes.
  var FALLBACK_FX = {
    USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.12, NPR: 133.0, JPY: 151.50,
    CNY: 7.24, AUD: 1.52, CAD: 1.36, SGD: 1.35, CHF: 0.89, AED: 3.67
  };
  var FX_CACHE_MS = 60 * 60 * 1000; // 1h
  // live FX state: rates are relative to _forBase (i.e. 1 base = rates[code] code)
  var fx = { base: 'USD', rates: null, live: false, time: null, loading: false, _forBase: null };

  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function cardOf(sel) { var el = q(sel); return el ? el.closest('.chart-card') : null; }
  function curTab() { var t = localStorage.getItem(TABKEY); return TABS.some(function (x) { return x.key === t; }) ? t : 'activity'; }

  /* ---------- build the merged card ---------- */
  function build() {
    var grid = document.getElementById('dashGrid');
    if (!grid || document.getElementById('ins8-card')) return true;
    var actCard = cardOf('#activity-feed');
    var earnCard = cardOf('#top-earners-list');
    var fxCard = cardOf('#fx-snapshot-list');
    if (!actCard || !earnCard || !fxCard) return false;

    var card = document.createElement('div');
    card.className = 'glass chart-card reveal-card ins8-card';
    card.id = 'ins8-card';
    var seg = TABS.map(function (t) {
      return '<button class="ins8-tab" data-panel="' + t.key + '" role="tab">'
        + '<i class="fas ' + t.icon + '"></i>' + t.label + '</button>';
    }).join('');
    card.innerHTML =
      '<div class="ins8-head">'
      + '<div class="chart-title"><i class="fas fa-layer-group" style="color:#6366f1;"></i> Insights'
      + ' <span class="live-badge"><span class="live-dot"></span> live</span></div>'
      + '<div class="ins8-seg" role="tablist"><span class="ins8-seg-ind"></span>' + seg + '</div>'
      + '</div>'
      + '<div class="ins8-body">'
      + '<div class="ins8-panel" data-panel="activity"></div>'
      + '<div class="ins8-panel" data-panel="leaders"></div>'
      + '<div class="ins8-panel" data-panel="currency"></div>'
      + '</div>';
    if (actCard.parentElement === grid) grid.insertBefore(card, actCard);
    else grid.appendChild(card);

    var pAct = q('.ins8-panel[data-panel="activity"]', card);
    var pLead = q('.ins8-panel[data-panel="leaders"]', card);
    var pCur = q('.ins8-panel[data-panel="currency"]', card);

    // activity: move enhance7 live feed + base feed anchor into the panel
    var lc7 = document.getElementById('lc7-activity');
    if (lc7) pAct.appendChild(lc7);
    var af = document.getElementById('activity-feed');
    if (af) pAct.appendChild(af); // enhance7 re-anchors #lc7-activity before this

    // leaders: tools bar + move the earners list (as a 2-col grid)
    pLead.innerHTML =
      '<div class="ins8-tools">'
      + '<div class="ins8-minitoggle" id="ins8-leadtoggle">'
      + '<button data-top="5" class="active">Top 5</button>'
      + '<button data-top="3">Top 3</button></div>'
      + '<span class="ins8-hint">Best paid this period</span></div>';
    var tel = document.getElementById('top-earners-list');
    if (tel) { tel.classList.add('ins8-grid'); pLead.appendChild(tel); }

    // currency: base-picker + amount, then a live grid of all other currencies
    var savedBase = (function () { try { var b = localStorage.getItem(BASEKEY); return /^[A-Z]{3}$/.test(b) ? b : 'USD'; } catch (e) { return 'USD'; } })();
    var fromOpts = CUR.map(function (c) {
      return '<option value="' + c.code + '"' + (c.code === savedBase ? ' selected' : '') + '>' + c.code + '</option>';
    }).join('');
    pCur.innerHTML =
      '<div class="ins8-conv-bar">'
      + '<div class="ins8-conv-field">'
      + '<input id="ins8-amt" type="number" min="0" step="1" value="100" inputmode="decimal" aria-label="Amount to convert">'
      + '<select id="ins8-from" class="ins8-cur-sel" aria-label="Base currency">' + fromOpts + '</select>'
      + '</div>'
      + '<span class="ins8-conv-eq">converts to</span>'
      + '<button id="ins8-fxrefresh" class="ins8-fxrefresh" type="button" title="Refresh live rates" aria-label="Refresh live rates"><i class="fas fa-rotate"></i></button>'
      + '</div>'
      + '<div class="ins8-fxgrid" id="ins8-fxgrid"></div>'
      + '<div class="ins8-conv-note" id="ins8-fxnote"></div>';
    var fxl = document.getElementById('fx-snapshot-list');
    if (fxl) pCur.appendChild(fxl);
    var fxm = document.getElementById('fx-snapshot-meta');
    if (fxm) pCur.appendChild(fxm);

    // hide the now-empty original source cards
    [actCard, earnCard, fxCard].forEach(function (c) { c.classList.add('ins8-merged-src'); });

    wire(card);
    switchTab(curTab(), true);
    ensureRates(getBase());
    return true;
  }

  function getBase() {
    var s = document.getElementById('ins8-from');
    var v = s ? s.value : 'USD';
    return /^[A-Z]{3}$/.test(v) ? v : 'USD';
  }

  function wire(card) {
    qa('.ins8-tab', card).forEach(function (b) {
      b.addEventListener('click', function () { switchTab(b.dataset.panel); });
    });
    var lt = document.getElementById('ins8-leadtoggle');
    if (lt) lt.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-top]') : null;
      if (!b) return;
      qa('button', lt).forEach(function (x) { x.classList.toggle('active', x === b); });
      var tel = document.getElementById('top-earners-list');
      if (tel) tel.classList.toggle('ins8-top3', b.dataset.top === '3');
    });
    var amt = document.getElementById('ins8-amt');
    if (amt) amt.addEventListener('input', renderConv);
    var from = document.getElementById('ins8-from');
    if (from) from.addEventListener('change', function () {
      try { localStorage.setItem(BASEKEY, from.value); } catch (e) {}
      ensureRates(from.value);
    });
    var rf = document.getElementById('ins8-fxrefresh');
    if (rf) rf.addEventListener('click', function () { ensureRates(getBase(), true); });
    window.addEventListener('resize', positionInd);
  }
  function switchTab(name, silent) {
    var card = document.getElementById('ins8-card'); if (!card) return;
    qa('.ins8-tab', card).forEach(function (b) { b.classList.toggle('active', b.dataset.panel === name); });
    qa('.ins8-panel', card).forEach(function (p) { p.classList.toggle('active', p.dataset.panel === name); });
    if (!silent) { try { localStorage.setItem(TABKEY, name); } catch (e) {} }
    positionInd();
    if (name === 'currency') ensureRates(getBase());
  }

  function positionInd() {
    var card = document.getElementById('ins8-card'); if (!card) return;
    var ind = q('.ins8-seg-ind', card);
    var act = q('.ins8-tab.active', card);
    if (!ind || !act || !act.offsetWidth) return;
    ind.style.width = act.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + act.offsetLeft + 'px)';
  }

  function fmtNum(n) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 4 : 2 });
  }

  /* ---------- live FX: fetch → cache → render ---------- */
  function cacheKey(base) { return 'nexus_ins8_fx_' + base; }
  function readCache(base) {
    try {
      var raw = localStorage.getItem(cacheKey(base)); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.rates || !o.time) return null;
      if (Date.now() - o.time > FX_CACHE_MS) return null;
      return o;
    } catch (e) { return null; }
  }
  function writeCache(base, rates) {
    try { localStorage.setItem(cacheKey(base), JSON.stringify({ rates: rates, time: Date.now() })); } catch (e) {}
  }
  // cross-rates derived from the USD-based fallback table (base=1)
  function fallbackRates(base) {
    var out = {}, b = FALLBACK_FX[base] || 1;
    CUR.forEach(function (c) { if (FALLBACK_FX[c.code] != null) out[c.code] = FALLBACK_FX[c.code] / b; });
    out[base] = 1;
    return out;
  }
  function normCurrencyApi(base, json) {
    var lb = base.toLowerCase(), m = json && json[lb];
    if (!m || typeof m !== 'object') return null;
    var out = {}; out[base] = 1;
    CUR.forEach(function (c) { var v = m[c.code.toLowerCase()]; if (typeof v === 'number' && isFinite(v)) out[c.code] = v; });
    return Object.keys(out).length > 1 ? out : null;
  }
  function normErApi(base, json) {
    var r = json && json.rates; if (!r) return null;
    var out = {}; out[base] = 1;
    CUR.forEach(function (c) { var v = r[c.code]; if (typeof v === 'number' && isFinite(v)) out[c.code] = v; });
    return Object.keys(out).length > 1 ? out : null;
  }
  function tryFetch(url) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 7000) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (res) {
      if (t) clearTimeout(t);
      return res.ok ? res.json() : null;
    }).catch(function () { if (t) clearTimeout(t); return null; });
  }
  // free, key-less, CORS-enabled endpoints (jsDelivr CDN + Pages mirror, then er-api)
  function fetchOnline(base) {
    var lb = base.toLowerCase();
    var urls = [
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/' + lb + '.min.json',
      'https://latest.currency-api.pages.dev/v1/currencies/' + lb + '.min.json',
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/' + lb + '.json'
    ];
    var i = 0;
    function nextCa() {
      if (i >= urls.length) {
        return tryFetch('https://open.er-api.com/v6/latest/' + base).then(function (j) {
          return j && normErApi(base, j);
        });
      }
      var u = urls[i++];
      return tryFetch(u).then(function (j) {
        var n = j && normCurrencyApi(base, j);
        return n ? n : nextCa();
      });
    }
    return nextCa();
  }
  function ensureRates(base, force) {
    base = /^[A-Z]{3}$/.test(base) ? base : 'USD';
    if (fx.loading && fx.base === base && !force) return;
    // fresh cache → use immediately, no network
    if (!force) {
      var c = readCache(base);
      if (c) { fx = { base: base, rates: c.rates, live: true, time: c.time, loading: false, _forBase: base }; renderConv(); return; }
    }
    // show something now (previous rates or fallback) while we fetch
    fx.base = base; fx.loading = true;
    if (!fx.rates || fx._forBase !== base) { fx.rates = fallbackRates(base); fx.live = false; fx._forBase = base; }
    renderConv();
    fetchOnline(base).then(function (rates) {
      if (rates) { writeCache(base, rates); fx = { base: base, rates: rates, live: true, time: Date.now(), loading: false, _forBase: base }; }
      else { fx = { base: base, rates: fallbackRates(base), live: false, time: null, loading: false, _forBase: base }; }
      renderConv();
    });
  }

  function renderConv() {
    var grid = document.getElementById('ins8-fxgrid');
    if (!grid) return;
    var base = getBase();
    var amtEl = document.getElementById('ins8-amt');
    var amt = amtEl ? parseFloat(amtEl.value) : 100;
    if (!isFinite(amt)) amt = 0;
    var haveState = fx._forBase === base && fx.rates;
    var rates = haveState ? fx.rates : fallbackRates(base);
    var live = haveState ? fx.live : false;

    var targets = CUR.filter(function (c) { return c.code !== base; });
    grid.innerHTML = targets.map(function (c) {
      var rate = rates[c.code];
      var conv = isFinite(rate) ? amt * rate : NaN;
      var isEst = !live;
      var rateLine = !isFinite(rate) ? 'rate unavailable'
        : (isEst ? '≈ ' + fmtNum(rate) + ' ' + c.code + ' · est.'
                 : '1 ' + base + ' = ' + fmtNum(rate) + ' ' + c.code);
      return '<div class="ins8-fx-card' + (isEst ? ' ins8-fx-est' : '') + '">'
        + '<div class="ins8-fx-pair"><span class="dot"></span>' + base + ' → ' + c.code + '</div>'
        + '<div class="ins8-fx-conv">' + (isFinite(conv)
          ? fmtNum(conv) + ' <span style="font-size:.7rem;color:var(--text-muted)">' + c.code + '</span>' : '—') + '</div>'
        + '<div class="ins8-fx-rate">' + rateLine + '</div>'
        + '</div>';
    }).join('');

    var note = document.getElementById('ins8-fxnote');
    if (note) {
      if (fx.loading && fx.base === base) {
        note.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching live rates…';
        note.className = 'ins8-conv-note';
      } else if (live) {
        var stamp = fx.time ? ' · updated ' + new Date(fx.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
        note.innerHTML = '<i class="fas fa-circle-check"></i> Live market rates' + stamp;
        note.className = 'ins8-conv-note live';
      } else {
        note.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Live rates unavailable — showing approximate estimates';
        note.className = 'ins8-conv-note est';
      }
    }
  }
  function observe() {
    // rebuild if the dashboard grid gets re-rendered without our card
    var grid = document.getElementById('dashGrid');
    if (grid && !grid.__ins8obs) {
      grid.__ins8obs = 1;
      new MutationObserver(function () {
        if (!document.getElementById('ins8-card')) build();
      }).observe(grid, { childList: true });
    }
  }

  function init() { if (build()) { observe(); positionInd(); } }

  function boot() {
    init();
    requestAnimationFrame(function () { requestAnimationFrame(function () { init(); positionInd(); }); });
    setTimeout(function () { init(); positionInd(); }, 400);
    setTimeout(function () { init(); positionInd(); }, 1200);
    // the card is only measurable once the dashboard tab is visible
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-tab="dashboard"]') : null;
      if (t) setTimeout(function () { init(); positionInd(); renderConv(); }, 120);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();




})();



/* ─── SECTION: enhance9.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance9.js
   Ninth additive layer: the Attendance "roster board". A drag-and-drop board
   (like the enhance7 Leaves Kanban, but with 4 states) for the selected date:
     • Drag an employee card between Present / Late / Half-day / Absent columns
     • Tap fallback: each card has quick "move to" buttons for touch devices
     • Board / List view toggle (persisted); live per-column counts + rate meter
     • "All present" shortcut
   Every move persists INSTANTLY through the base save path (setAttendanceStatus
   → silent #saveAttendanceBtn), so it survives reload — just like the leave
   board. Purely additive: reads public DOM/globals + localStorage; honours
   body.no-anim. Rebuilds itself if the base re-renders #attendanceList.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VIEWKEY = 'nexus_att_view';
  var COLS = [
    { key: 'present',  label: 'Present',  icon: 'fa-circle-check',       color: '#10b981' },
    { key: 'late',     label: 'Late',     icon: 'fa-clock',              color: '#f59e0b' },
    { key: 'half-day', label: 'Half-day', icon: 'fa-circle-half-stroke', color: '#8b5cf6' },
    { key: 'absent',   label: 'Absent',   icon: 'fa-circle-xmark',       color: '#ef4444' }
  ];
  function colOf(k) { for (var i = 0; i < COLS.length; i++) if (COLS[i].key === k) return COLS[i]; return COLS[0]; }

  var _drag = null; // employeeId currently being dragged

  /* ---------- small helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function ls(key) { try { var v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : (v || []); } catch (e) { return []; } }
  function esc(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\\]\[#.:>+~*^$=|()]/g, '\\$&');
  }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function empName(e) {
    if (!e) return 'Employee';
    var n = e.name || [e.firstName, e.lastName].filter(Boolean).join(' ') || e.fullName;
    return n || ('#' + (e.employeeId || e.id || ''));
  }
  function findEmp(list, ref) {
    for (var i = 0; i < list.length; i++) { var e = list[i]; if (String(e.id) === String(ref) || String(e.employeeId) === String(ref)) return e; }
    return null;
  }
  function initials(e) {
    var n = empName(e).trim().split(/\s+/);
    return ((n[0] || '')[0] || '') + ((n[1] || '')[0] || (n[0] || '')[1] || '');
  }
  function hue(str) { var h = 0; str = String(str); for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }

  /* ---------- current status for an employee (reflects unsaved pill state) ---------- */
  function statusOf(empId) {
    var pill = $('.att-pill.active[data-emp="' + esc(empId) + '"]');
    if (pill && pill.dataset.status) return pill.dataset.status;
    // fall back to stored attendance for the selected date
    var dp = $('#attDatePicker');
    var date = dp ? dp.value : null;
    var recs = ls('nexus_attendance');
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (String(r.employeeId) === String(empId) && (!date || r.date === date)) return r.status || 'present';
    }
    return 'present';
  }

  /* ---------- mutate + persist (instant, like the leave board) ---------- */
  function setStatus(empId, status) {
    if (statusOf(empId) === status) return;
    if (typeof window.setAttendanceStatus === 'function') {
      window.setAttendanceStatus(empId, status); // toggles pill + updates summary (no persist)
    }
    persist();
    var emp = findEmp(ls('nexus_employees'), empId);
    toast(empName(emp) + ' · ' + colOf(status).label);
    renderBoard();
  }
  // trigger the base Save button but swallow its generic toast
  function persist() {
    var btn = $('#saveAttendanceBtn');
    if (!btn) return;
    var orig = window.showToast;
    try { window.showToast = function () {}; btn.click(); }
    finally { window.showToast = orig; }
  }
  function toast(msg) { try { if (typeof window.showToast === 'function') window.showToast(msg, 'success'); } catch (e) {} }

  /* ---------- build the board scaffold (once) ---------- */
  function build() {
    var list = $('#attendanceList'); if (!list) return false;
    var glass = list.closest('.glass'); if (!glass) return false;
    glass.classList.add('att9-listwrap');
    if ($('#att9-wrap')) { renderBoard(); applyView(); return true; }

    var wrap = document.createElement('div');
    wrap.id = 'att9-wrap';
    wrap.innerHTML =
      '<div class="att9-tools">'
      + '<div class="att9-viewtoggle" id="att9-toggle">'
      + '<button data-v="board"><i class="fas fa-table-columns"></i> Board</button>'
      + '<button data-v="list"><i class="fas fa-list"></i> List</button></div>'
      + '<div class="att9-rate" title="Present + half-day counted as attendance">'
      + '<span>Attendance</span><div class="att9-rate-bar"><span id="att9-rate-fill"></span></div>'
      + '<b class="att9-rate-pct" id="att9-rate-pct">—</b></div>'
      + '<label class="att9-filter"><i class="fas fa-magnifying-glass"></i>'
      + '<input type="text" id="att9-filter" placeholder="Find employee…" aria-label="Filter employees"></label>'
      + '<button class="att9-allpresent" id="att9-allpresent"><i class="fas fa-bolt"></i> All present</button>'
      + '</div>'
      + '<div class="att9-board" id="att9-board"></div>';
    glass.parentElement.insertBefore(wrap, glass);

    // view toggle
    $('#att9-toggle').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-v]') : null;
      if (!b) return;
      try { localStorage.setItem(VIEWKEY, b.dataset.v); } catch (x) {}
      applyView();
    });
    // "all present" shortcut → base button (silent) then persist
    $('#att9-allpresent').addEventListener('click', function () {
      var mab = $('#markAllPresentBtn');
      var orig = window.showToast;
      try { window.showToast = function () {}; if (mab) mab.click(); persist(); }
      finally { window.showToast = orig; }
      toast('All employees marked present');
      renderBoard();
    });
    // delegated quick-move (touch) buttons
    $('#att9-board').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-set]') : null;
      if (!b) return;
      var card = b.closest('.att9-card'); if (!card) return;
      setStatus(card.getAttribute('data-emp'), b.getAttribute('data-set'));
    });
    // scale: live filter across all columns
    var flt = $('#att9-filter');
    if (flt) flt.addEventListener('input', applyFilter);

    // keep board in sync if the base re-renders the list (date change / save)
    if (!list.__att9obs) {
      list.__att9obs = 1;
      new MutationObserver(function () { renderBoard(); }).observe(list, { childList: true });
    }
    renderBoard();
    applyView();
    return true;
  }

  /* ---------- render columns + cards from current state ---------- */
  function renderBoard() {
    var board = $('#att9-board'); if (!board) return;
    var emps = ls('nexus_employees');
    // bucket employees by their current status
    var buckets = {}; COLS.forEach(function (c) { buckets[c.key] = []; });
    emps.forEach(function (e) {
      var id = e.id != null ? e.id : e.employeeId;
      var st = statusOf(id);
      (buckets[st] || buckets.present).push(e);
    });

    board.innerHTML = COLS.map(function (c) {
      var cards = buckets[c.key].map(function (e) { return cardHtml(e, c); }).join('');
      if (!cards) cards = '<div class="att9-col-empty">Drop here</div>';
      return '<div class="att9-col" data-status="' + c.key + '" style="--c:' + c.color + '">'
        + '<div class="att9-col-h"><span class="dot"></span>' + c.label
        + '<span class="cnt">' + buckets[c.key].length + '</span></div>'
        + '<div class="att9-col-body">' + cards + '</div></div>';
    }).join('');

    wireDnD();
    updateRate(emps.length, buckets);
    applyFilter();
  }

  /* ---------- scale: filter cards across all columns ---------- */
  function applyFilter() {
    var board = $('#att9-board'); if (!board) return;
    var input = $('#att9-filter');
    var qy = (input ? input.value : '').trim().toLowerCase();
    $$('.att9-col', board).forEach(function (col) {
      var body = col.querySelector('.att9-col-body');
      var cards = $$('.att9-card', col), shown = 0;
      cards.forEach(function (c) {
        var hit = !qy || (c.getAttribute('data-search') || '').indexOf(qy) !== -1;
        c.classList.toggle('att9-hidden', !hit);
        if (hit) shown++;
      });
      if (body) body.classList.toggle('att9-nomatch', qy && cards.length > 0 && shown === 0);
    });
  }

  function cardHtml(e, col) {
    var id = e.id != null ? e.id : e.employeeId;
    var h = hue(empName(e) + id);
    var others = COLS.filter(function (c) { return c.key !== col.key; });
    var quick = others.map(function (c) {
      return '<button type="button" data-set="' + c.key + '" title="Move to ' + c.label + '" '
        + 'aria-label="Move ' + escHtml(empName(e)) + ' to ' + c.label + '" style="--qc:' + c.color + '">'
        + '<i class="fas ' + c.icon + '"></i></button>';
    }).join('');
    return '<div class="att9-card enter" draggable="true" data-emp="' + escHtml(String(id)) + '" '
      + 'data-search="' + escHtml((empName(e) + ' ' + (e.employeeId || '') + ' ' + (e.department || '')).toLowerCase()) + '" '
      + 'style="--c:' + col.color + '">'
      + '<div class="att9-ava" style="background:hsl(' + h + ',58%,45%)">' + escHtml(initials(e).toUpperCase()) + '</div>'
      + '<div class="att9-b"><div class="att9-nm">' + escHtml(empName(e)) + '</div>'
      + '<div class="att9-id">' + escHtml(e.employeeId || ('#' + id)) + '</div></div>'
      + '<div class="att9-quick">' + quick + '</div></div>';
  }

  function updateRate(total, buckets) {
    var fill = $('#att9-rate-fill'), pct = $('#att9-rate-pct');
    if (!fill || !pct) return;
    var present = (buckets.present.length + buckets['half-day'].length * 0.5);
    var v = total ? Math.round((present / total) * 100) : 0;
    fill.style.width = v + '%';
    pct.textContent = total ? v + '%' : '—';
  }

  /* ---------- HTML5 drag-and-drop between columns ---------- */
  function wireDnD() {
    var board = $('#att9-board'); if (!board) return;
    $$('.att9-card', board).forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        _drag = card.getAttribute('data-emp');
        card.classList.add('dragging');
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', _drag); } catch (x) {} }
      });
      card.addEventListener('dragend', function () {
        _drag = null;
        card.classList.remove('dragging');
        $$('.att9-col.drag-over', board).forEach(function (c) { c.classList.remove('drag-over'); });
      });
    });
    $$('.att9-col', board).forEach(function (col) {
      col.addEventListener('dragover', function (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; col.classList.add('drag-over'); });
      col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drag-over');
        var id = _drag || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        if (id) setStatus(id, col.getAttribute('data-status'));
      });
    });
  }

  /* ---------- board / list view toggle ---------- */
  function curView() { var v = localStorage.getItem(VIEWKEY); return v === 'list' ? 'list' : 'board'; }
  function applyView() {
    var v = curView();
    document.body.classList.toggle('att9-board-view', v === 'board');
    var wrap = $('#att9-board'); if (wrap) wrap.style.display = v === 'board' ? '' : 'none';
    $$('#att9-toggle button').forEach(function (b) { b.classList.toggle('active', b.dataset.v === v); });
  }

  /* ---------- boot ---------- */
  function init() { build(); }
  function boot() {
    init();
    requestAnimationFrame(function () { requestAnimationFrame(init); });
    setTimeout(init, 400);
    setTimeout(init, 1200);
    // (re)build when the Attendance tab is opened
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-tab="attendance"]') : null;
      if (t) setTimeout(function () { init(); renderBoard(); }, 120);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();



/* ─── SECTION: enhance10.js ─── */
/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance10.js
   Tenth additive layer. Two things:

   1. DASHBOARD GREETING BAND
      The base hero is restyled into a single gradient band at the top of the
      dashboard: greeting + live chips + the "View Reports" CTA. The hero's own
      nodes are MOVED in (not copied), so script.js keeps updating them by id.

   2. INSIGHTS MOVED INTO REPORTS
      The enhance8 Insights card (#ins8-card) is relocated out of the dashboard
      grid into a collapsible, persisted panel inside the Reports section, so
      the dashboard stays short and the report owns the analytics.

   Purely additive: reads public DOM hooks + localStorage. Honours body.no-anim.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var INSKEY = 'nexus_rep10_ins';   // 'open' | 'closed'

    function $(s, r) { return (r || document).querySelector(s); }

    /* ─────────────── dashboard greeting band ─────────────── */
    function build() {
        var sec = document.getElementById('dashboardSection');
        var hero = document.getElementById('dashGreeting');
        if (!sec || !hero) return false;
        if (document.getElementById('dc10-card')) return true;
        // If helios topbar exists or hero is not a direct child of sec (e.g. hidden compatibility container),
        // skip injecting dc10-card to avoid invalid insertBefore calls
        if (document.querySelector('.helios-topbar') || hero.parentElement !== sec) return true;

        var card = document.createElement('div');
        card.className = 'glass dc10-card';
        card.id = 'dc10-card';
        card.innerHTML =
            '<div class="dc10-band">'
            + '<div class="dc10-ava"><i class="fas fa-user-tie"></i></div>'
            + '<div class="dc10-hi"></div>'
            + '<div class="dc10-right"></div>'
            + '</div>';
        sec.insertBefore(card, hero);

        // Move the base hero's own nodes in — ids survive, so script.js keeps
        // updating the greeting and the chips with no duplication.
        var hi = $('.dc10-hi', card), right = $('.dc10-right', card);
        var hello = document.getElementById('dashHello');
        var sub = document.getElementById('dashSub');
        var chips = $('.hero-chips', hero);
        if (hello && !hello.closest('.helios-topbar')) hi.appendChild(hello);
        if (sub) hi.appendChild(sub);
        if (chips) right.appendChild(chips);
        // NOTE: #heroGoReports is deliberately left behind in the hidden hero —
        // the band shows the greeting + live chips only.
        hero.classList.add('dc10-off');
        return true;
    }

    /* ─────────────── move Insights into Reports ─────────────── */
    function moveInsights() {
        var card = document.getElementById('ins8-card');
        var rep = document.getElementById('reportsSection');
        var grid = document.getElementById('reportChartGrid');
        if (!card || !rep || !grid) return false;
        if (document.getElementById('rep10-ins')) return true;

        var wrap = document.createElement('div');
        wrap.id = 'rep10-ins';
        wrap.innerHTML =
            '<button type="button" class="rep10-head" id="rep10-toggle" aria-expanded="true">'
            + '<i class="fas fa-layer-group" style="color:#6366f1"></i> Insights'
            + '<i class="fas fa-chevron-down rep10-chev"></i></button>'
            + '<div class="rep10-body"></div>';
        // sits under the chart grid so the charts stay the lead of the report
        var parent = grid.parentNode || rep;
        if (grid.nextSibling && grid.nextSibling.parentNode === parent) parent.insertBefore(wrap, grid.nextSibling);
        else parent.appendChild(wrap);
        $('.rep10-body', wrap).appendChild(card);

        var closed = false;
        try { closed = localStorage.getItem(INSKEY) === 'closed'; } catch (e) {}
        wrap.classList.toggle('collapsed', closed);
        var btn = document.getElementById('rep10-toggle');
        btn.setAttribute('aria-expanded', String(!closed));
        btn.addEventListener('click', function () {
            var nowClosed = !wrap.classList.contains('collapsed');
            wrap.classList.toggle('collapsed', nowClosed);
            btn.setAttribute('aria-expanded', String(!nowClosed));
            try { localStorage.setItem(INSKEY, nowClosed ? 'closed' : 'open'); } catch (e) {}
        });
        return true;
    }

    /* ─────────────── boot ─────────────── */
    function tick() { build(); moveInsights(); }
    function boot() {
        tick();
        requestAnimationFrame(function () { requestAnimationFrame(tick); });
        [200, 600, 1400, 2500].forEach(function (t) { setTimeout(tick, t); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();

