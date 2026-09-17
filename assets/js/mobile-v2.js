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

  /* ── Sync active tab indicator across mobile dock and drawer ── */
  function syncTabUI(tabId) {
    var cur = tabId || activeTab();
    document.querySelectorAll('.pn-dock-btn[data-tab]').forEach(function (btn) {
      var match = btn.getAttribute('data-tab') === cur;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });
    document.querySelectorAll('.pn-drawer-nav-item[data-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === cur);
    });
  }

  /* ── Sync theme across mobile buttons and drawer pills ── */
  function syncThemeUI() {
    var isLight = document.body.classList.contains('light-mode');
    var icon = document.getElementById('mobileThemeIcon');
    if (icon) {
      icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
      icon.style.color = isLight ? '#f59e0b' : '';
    }
    var darkPill = document.getElementById('pnThemeDarkPill');
    var lightPill = document.getElementById('pnThemeLightPill');
    if (darkPill && lightPill) {
      darkPill.classList.toggle('active', !isLight);
      lightPill.classList.toggle('active', isLight);
    }
  }

  /* ── Slide-over drawer controls ── */
  function openDrawer() {
    var drawer = document.getElementById('pnMobileDrawer');
    var backdrop = document.getElementById('pnDrawerBackdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var drawer = document.getElementById('pnMobileDrawer');
    var backdrop = document.getElementById('pnDrawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function initMobileControls() {
    // Menu button & Drawer open/close
    var menuBtn = document.getElementById('mobileMenuBtn');
    if (menuBtn) menuBtn.addEventListener('click', openDrawer);

    var closeBtn = document.getElementById('pnDrawerCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    var backdrop = document.getElementById('pnDrawerBackdrop');
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Close drawer on Escape
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    // Mobile Header Theme Toggle
    var themeToggle = document.getElementById('mobileThemeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        if (typeof window.setTheme === 'function') {
          var nextTheme = document.body.classList.contains('light-mode') ? 'dark' : 'light';
          window.setTheme(nextTheme);
        } else {
          var btn = document.getElementById('heliosThemeToggleBtn') || document.getElementById('themeBtn');
          if (btn) btn.click();
        }
      });
    }

    // Drawer Theme Pills
    var darkPill = document.getElementById('pnThemeDarkPill');
    if (darkPill) {
      darkPill.addEventListener('click', function () {
        if (typeof window.setTheme === 'function') window.setTheme('dark');
      });
    }
    var lightPill = document.getElementById('pnThemeLightPill');
    if (lightPill) {
      lightPill.addEventListener('click', function () {
        if (typeof window.setTheme === 'function') window.setTheme('light');
      });
    }

    // Mobile Header Notifications button
    var notifBtn = document.getElementById('mobileNotifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', function () {
        if (typeof window.openModal === 'function') {
          window.openModal('heliosNotifModal');
        } else {
          var nb = document.getElementById('notifBtn');
          if (nb) nb.click();
        }
      });
    }

    // Drawer Profile card
    var profileCard = document.getElementById('pnDrawerProfileBtn');
    if (profileCard) {
      profileCard.addEventListener('click', function () {
        closeDrawer();
        if (typeof window.openModal === 'function') {
          window.openModal('heliosAuthModal');
        }
      });
    }

    // Drawer Navigation items click -> go to tab and close drawer
    document.querySelectorAll('.pn-drawer-nav-item[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = this.getAttribute('data-tab');
        if (t) {
          goTab(t);
          syncTabUI(t);
          closeDrawer();
        }
      });
    });

    // Dock buttons click
    document.querySelectorAll('.pn-dock-btn[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = this.getAttribute('data-tab');
        if (t) {
          goTab(t);
          syncTabUI(t);
        }
      });
    });

    // Drawer Quick Tools
    var fxBtn = document.getElementById('pnMobileFxBtn');
    if (fxBtn) {
      fxBtn.addEventListener('click', function () {
        closeDrawer();
        if (typeof window.openModal === 'function') window.openModal('currencyModal');
      });
    }

    var settingsBtn = document.getElementById('pnMobileSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        closeDrawer();
        if (typeof window.openModal === 'function') window.openModal('settingsModal');
      });
    }

    var supportBtn = document.getElementById('pnMobileSupportBtn');
    if (supportBtn) {
      supportBtn.addEventListener('click', function () {
        closeDrawer();
        if (typeof window.openModal === 'function') window.openModal('heliosSupportModal');
      });
    }

    // Watch for theme class changes on body
    var themeObserver = new MutationObserver(function () {
      syncThemeUI();
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Watch for tab switching across all tabs in the app
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = this.getAttribute('data-tab');
        if (t) syncTabUI(t);
      });
    });

    // Initial sync
    syncThemeUI();
    syncTabUI();
  }

  function boot() {
    initSwipe();
    killBoostFab();
    initMobileControls();
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
