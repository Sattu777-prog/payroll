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
      var cs = $('#currencySelect');
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
