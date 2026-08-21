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
    toast('✓ ' + empName(emp) + ' · ' + colOf(status).label);
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
