/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — perf.js
   First-impression performance layer. Loaded (deferred) AFTER the chart/pdf
   libraries but BEFORE script.js, so its Chart.js defaults apply to the very
   first dashboard render. Purely additive: touches only Chart.js animation
   defaults; changes nothing about the app's data, layout, or DOM.

   Why: the base init() paints many animated Chart.js instances on load (all
   six sections render, then re-render after the FX fetch). The library's long
   default animation turns that into visible jank on the landing screen. We keep
   charts feeling alive with a short, cheap reveal — and drop animation entirely
   when the user prefers reduced motion or has animations switched off.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    if (!window.Chart || !Chart.defaults) return;

    function reduced() {
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches
                || document.body.classList.contains('no-anim');
        } catch (e) { return false; }
    }

    if (reduced()) {
        // No motion at all — instant, cheapest possible render.
        Chart.defaults.animation = false;
    } else {
        // Short, GPU-friendly reveal instead of the library's long default.
        Chart.defaults.animation = { duration: 240, easing: 'easeOutQuad' };
    }
})();
