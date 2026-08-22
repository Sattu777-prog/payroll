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
        if (hello) hi.appendChild(hello);
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
        if (grid.nextSibling) rep.insertBefore(wrap, grid.nextSibling);
        else rep.appendChild(wrap);
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
