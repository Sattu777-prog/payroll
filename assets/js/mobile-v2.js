/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — mobile-v2.js  (mobile experience layer, loads last)
   Adds two things phones were missing and cleans up the floating-control mess:
     1. SWIPE NAVIGATION — swipe left/right anywhere on the page to move through
        the tab dock (Dashboard → Employees → … → Reports), with an edge-glow
        cue and a subtle haptic tick. Heavily guarded so it never fights inputs,
        tables, drag-drop boards, modals, or the open speed-dial.
     2. Safety net that keeps the retired "boost" FAB gone even if a later
        script re-injects it.
   Dependency-free. Honours body.no-anim / prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var TAB_ORDER = ['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'reports'];

  function isPhone() { return window.matchMedia('(max-width: 640px)').matches; }
  function animOn() {
    try { return !document.body.classList.contains('no-anim') &&
                 !window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return true; }
  }
  function activeTab() {
    var b = document.querySelector('.tab-btn.active');
    return b ? b.getAttribute('data-tab') : 'dashboard';
  }
  function goTab(name) {
    var b = document.querySelector('.tab-btn[data-tab="' + name + '"]');
    if (b) b.click();
  }
  function haptic() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }

  /* ── edge-glow cue ── */
  var edgeL, edgeR;
  function ensureEdges() {
    if (edgeL) return;
    edgeL = document.createElement('div'); edgeL.className = 'swipe-edge left';
    edgeR = document.createElement('div'); edgeR.className = 'swipe-edge right';
    document.body.appendChild(edgeL); document.body.appendChild(edgeR);
  }
  function flashEdge(dir) {
    if (!animOn()) return;
    ensureEdges();
    var el = dir === 'next' ? edgeR : edgeL;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  /* ── decide whether a gesture that started on `el` is allowed to swipe ── */
  var BLOCK = 'input, textarea, select, button, a, [contenteditable], ' +
              '.modal-card, .cmdk-panel, .fab5, [draggable="true"], .att-card-grid, ' +
              '.kanban, .trend-bars, canvas, .conv-quick-table, table';
  function blocked(el) {
    if (!el || typeof el.closest !== 'function') return true;
    // an open overlay owns the gesture
    if (document.querySelector('.modal-backdrop.open, .cmdk-backdrop.open, .fab5.open')) return true;
    if (el.closest(BLOCK)) return true;
    // anything horizontally scrollable keeps its own scroll
    var node = el;
    for (var i = 0; node && i < 6; i++, node = node.parentElement) {
      try {
        var cs = getComputedStyle(node);
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') &&
            node.scrollWidth > node.clientWidth + 4) return true;
      } catch (e) {}
    }
    return false;
  }

  function initSwipe() {
    var x0 = 0, y0 = 0, tracking = false, decided = false, ok = false;
    var THRESH = 62, RATIO = 1.5;

    window.addEventListener('touchstart', function (e) {
      if (!isPhone() || e.touches.length !== 1) { tracking = false; return; }
      var t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY;
      tracking = true; decided = false; ok = false;
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!tracking || e.touches.length !== 1) return;
      var t = e.touches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (!decided && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
        decided = true;
        ok = Math.abs(dx) > Math.abs(dy) * RATIO && !blocked(e.target);
      }
    }, { passive: true });

    window.addEventListener('touchend', function (e) {
      if (!tracking || !ok) { tracking = false; return; }
      tracking = false;
      var t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) return;
      var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < THRESH || Math.abs(dx) < Math.abs(dy) * RATIO) return;
      var idx = TAB_ORDER.indexOf(activeTab());
      if (idx < 0) return;
      if (dx < 0 && idx < TAB_ORDER.length - 1) { goTab(TAB_ORDER[idx + 1]); flashEdge('next'); haptic(); }
      else if (dx > 0 && idx > 0)               { goTab(TAB_ORDER[idx - 1]); flashEdge('prev'); haptic(); }
    }, { passive: true });
  }

  /* ── keep the retired boost FAB from ever reappearing ── */
  function killBoostFab() {
    document.querySelectorAll('.fab').forEach(function (f) {
      if (!f.classList.contains('fab5') && !f.classList.contains('fab5-main')) {
        f.style.display = 'none';
      }
    });
  }

  function boot() {
    initSwipe();
    killBoostFab();
    // late-injected FABs (other defer scripts) — sweep again shortly after load
    setTimeout(killBoostFab, 400);
    setTimeout(killBoostFab, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
