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
