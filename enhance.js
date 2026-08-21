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
