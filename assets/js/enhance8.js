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
    grid.insertBefore(card, actCard);

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
