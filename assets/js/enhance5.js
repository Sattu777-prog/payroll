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
        var kids = section.children;
        for (var i = 0; i < kids.length; i++) {
            kids[i].style.animationDelay = Math.min(i * 45, 500) + 'ms';
        }
        section.classList.remove('mx5-enter');
        void section.offsetWidth; /* reflow to restart */
        section.classList.add('mx5-enter');
        setTimeout(function () {
            section.classList.remove('mx5-enter');
            for (var j = 0; j < kids.length; j++) kids[j].style.animationDelay = '';
        }, 1100);
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
        if ($('#fab5')) return;
        var wrap = document.createElement('div');
        wrap.className = 'fab5';
        wrap.id = 'fab5';
        var backdrop = document.createElement('div');
        backdrop.className = 'fab5-backdrop';
        var actions = document.createElement('div');
        actions.className = 'fab5-actions';
        FAB_ACTIONS.forEach(function (a) {
            var item = document.createElement('div');
            item.className = 'fab5-item';
            item.innerHTML = '<span class="lbl">' + a.label + '</span>' +
                '<button class="fab5-btn" type="button" aria-label="' + a.label + '"><i class="fas ' + a.icon + '"></i></button>';
            item.querySelector('.fab5-btn').addEventListener('click', function () { close(); a.run(); });
            actions.appendChild(item);
        });
        var main = document.createElement('button');
        main.className = 'fab5-main';
        main.type = 'button';
        main.setAttribute('aria-label', 'Quick actions');
        main.setAttribute('aria-expanded', 'false');
        main.innerHTML = '<i class="fas fa-plus"></i>';
        wrap.appendChild(actions);
        wrap.appendChild(main);
        document.body.appendChild(backdrop);
        document.body.appendChild(wrap);

        var open = false;
        function setDelays(opening) {
            var items = actions.querySelectorAll('.fab5-item');
            items.forEach(function (it, i) {
                var idx = opening ? (items.length - 1 - i) : i;
                it.style.transitionDelay = (anim() ? idx * 40 : 0) + 'ms';
            });
        }
        function openFn() { open = true; setDelays(true); wrap.classList.add('open'); backdrop.classList.add('show'); main.setAttribute('aria-expanded', 'true'); }
        function close() { open = false; setDelays(false); wrap.classList.remove('open'); backdrop.classList.remove('show'); main.setAttribute('aria-expanded', 'false'); }
        main.addEventListener('click', function () { open ? close() : openFn(); });
        backdrop.addEventListener('click', close);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) close(); });
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
