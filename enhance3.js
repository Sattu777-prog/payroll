/* ═══════════════════════════════════════════════════════════════════════════
   ✦ PAYROLL NEXUS — enhance3.js
   Third additive interactivity layer (loaded after enhance2.js). Makes the
   Dashboard & Reports sections interactive & dynamic — WITHOUT touching
   script.js internals. Everything reads localStorage (the source of truth
   script.js writes on every saveAll()) and re-renders on demand.

     1. "Payroll Pulse" — a self-drawn canvas trend chart with a 3M/6M/12M
        range switcher and a hover/touch crosshair tooltip.
     2. Floating value tooltips on the existing dashboard & report bars.
     3. Reports "Metric Explorer" — clickable metric chips that drive a big
        animated readout, a period-over-period delta, and a mini sparkline.
     4. A live ticking clock in the header.

   Degrades gracefully if any DOM hook is missing and honours body.no-anim.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const anim = () => !document.body.classList.contains('no-anim')
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function load(key) {
        try { const p = JSON.parse(localStorage.getItem(key)); return Array.isArray(p) ? p : []; }
        catch (_) { return []; }
    }
    const money = (usd) => {
        try { if (typeof window.fmtCurrency === 'function') return window.fmtCurrency(usd || 0); } catch (_) {}
        return '$' + Math.round(usd || 0).toLocaleString();
    };
    const moneyShort = (usd) => {
        const n = Math.abs(usd || 0);
        if (n >= 1e6) return '$' + (usd / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return '$' + Math.round(usd / 1e3) + 'k';
        return '$' + Math.round(usd || 0);
    };
    const cssVar = (name, fb) => {
        const v = getComputedStyle(document.body).getPropertyValue(name).trim();
        return v || fb;
    };
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    /* ═══════════ DATA ═══════════ */
    function monthKeys(n) {
        const out = [], d = new Date();
        for (let i = n - 1; i >= 0; i--) {
            const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
            out.push({ m: dt.getMonth() + 1, y: dt.getFullYear(), label: dt.toLocaleString('default', { month: 'short' }) });
        }
        return out;
    }
    /* PLACEHOLDER_DATA */
    function payrollSeries(n) {
        const pays = load('nexus_payroll');
        return monthKeys(n).map(k => {
            const set = pays.filter(p => p.month === k.m && p.year === k.y);
            const total = set.reduce((s, p) => s + (+p.netSalary || 0), 0);
            const heads = new Set(set.map(p => p.employeeId)).size;
            const avg = heads ? total / heads : 0;
            return { label: k.label, total, heads, avg };
        });
    }
    function attendanceSeries(n) {
        const att = load('nexus_attendance');
        return monthKeys(n).map(k => {
            const pref = k.y + '-' + String(k.m).padStart(2, '0');
            const set = att.filter(a => String(a.date || '').startsWith(pref));
            const present = set.filter(a => a.status === 'present' || a.status === 'late').length;
            return { label: k.label, rate: set.length ? (present / set.length) * 100 : 0, total: set.length };
        });
    }
    function leaveSeries(n) {
        const lv = load('nexus_leaves');
        return monthKeys(n).map(k => {
            const pref = k.y + '-' + String(k.m).padStart(2, '0');
            const count = lv.filter(l => String(l.startDate || '').startsWith(pref)).length;
            return { label: k.label, count };
        });
    }
    function deltaPct(cur, prev) {
        if (!prev) return cur ? 100 : 0;
        return ((cur - prev) / Math.abs(prev)) * 100;
    }

    /* Build the four Metric Explorer metrics from live data. */
    function buildMetrics() {
        const emps = load('nexus_employees');
        const ps = payrollSeries(6), as = attendanceSeries(6), ls = leaveSeries(6);
        const lastPay = ps[ps.length - 1] || { total: 0, heads: 0, avg: 0 };
        const prevPay = ps[ps.length - 2] || { total: 0, heads: 0, avg: 0 };
        const lastAtt = as[as.length - 1] || { rate: 0 };
        const prevAtt = as[as.length - 2] || { rate: 0 };
        const pendingLeaves = load('nexus_leaves').filter(l => l.status === 'pending').length;
        return {
            headcount: {
                icon: 'fa-users', title: 'Headcount', value: emps.length,
                fmt: (v) => Math.round(v).toLocaleString(),
                series: ps.map(p => p.heads), labels: ps.map(p => p.label),
                delta: deltaPct(lastPay.heads, prevPay.heads),
                desc: 'Active employees on record. Sparkline tracks the number of staff paid each of the last 6 months.'
            },
            avgpay: {
                icon: 'fa-coins', title: 'Avg Net Pay', value: lastPay.avg,
                fmt: (v) => money(v),
                series: ps.map(p => p.avg), labels: ps.map(p => p.label),
                delta: deltaPct(lastPay.avg, prevPay.avg),
                desc: 'Average net salary paid this period. Sparkline shows how the monthly average has moved.'
            },
            attendance: {
                icon: 'fa-user-check', title: 'Attendance', value: lastAtt.rate,
                fmt: (v) => v.toFixed(1) + '%',
                series: as.map(a => a.rate), labels: as.map(a => a.label),
                delta: deltaPct(lastAtt.rate, prevAtt.rate),
                desc: 'Present-or-late share of all attendance marks this month, trended over 6 months.'
            },
            leaveload: {
                icon: 'fa-plane-departure', title: 'Leave Load', value: pendingLeaves,
                fmt: (v) => Math.round(v).toLocaleString() + ' pending',
                series: ls.map(l => l.count), labels: ls.map(l => l.label),
                delta: deltaPct(ls[ls.length - 1].count, ls[ls.length - 2] ? ls[ls.length - 2].count : 0),
                desc: 'Leave requests still awaiting a decision. Sparkline counts requests starting each month.'
            }
        };
    }
    /* PLACEHOLDER_CANVAS */
    /* Size a canvas for its CSS box at device pixel ratio; returns {w,h} in CSS px. */
    function fitCanvas(cv) {
        const dpr = window.devicePixelRatio || 1;
        const r = cv.getBoundingClientRect();
        const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        cv.width = w * dpr; cv.height = h * dpr;
        const ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, w, h };
    }

    /* ═══════════ 1. PAYROLL PULSE CHART ═══════════ */
    const Pulse = {
        range: 6, hover: -1, raf: 0, data: [],
        el: {},
        draw(progress) {
            const cv = this.el.canvas; if (!cv) return;
            const { ctx, w, h } = fitCanvas(cv);
            ctx.clearRect(0, 0, w, h);
            const data = this.data; if (!data.length) return;
            const padL = 46, padR = 14, padT = 14, padB = 26;
            const plotW = w - padL - padR, plotH = h - padT - padB;
            const vals = data.map(d => d.total);
            const max = Math.max(1, ...vals) * 1.12, min = 0;
            const X = i => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
            const Y = v => padT + plotH - ((v - min) / (max - min)) * plotH;
            const muted = cssVar('--text-muted', '#8b95a6');
            const border = cssVar('--bg-card-border', 'rgba(127,127,127,0.2)');
            // gridlines + y labels
            ctx.font = '10px JetBrains Mono, monospace'; ctx.fillStyle = muted;
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            for (let g = 0; g <= 4; g++) {
                const v = min + (max - min) * (g / 4), y = Y(v);
                ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
                ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
                ctx.globalAlpha = 1; ctx.fillText(moneyShort(v), padL - 8, y);
            }
            // x labels
            ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            data.forEach((d, i) => ctx.fillText(d.label, X(i), h - padB + 7));
            // animated line + area up to progress
            const p = Math.max(0, Math.min(1, progress));
            const shown = 1 + (data.length - 1) * p;
            const line = [];
            for (let i = 0; i < data.length; i++) {
                if (i > shown) break;
                let vx = X(i), vy = Y(data[i].total);
                if (i > shown - 1 && i > 0) {
                    const frac = shown - Math.floor(shown);
                    vx = X(i - 1) + (X(i) - X(i - 1)) * frac;
                    vy = Y(data[i - 1].total) + (Y(data[i].total) - Y(data[i - 1].total)) * frac;
                    line.push([vx, vy]); break;
                }
                line.push([vx, vy]);
            }
            if (line.length) {
                const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
                grad.addColorStop(0, 'rgba(59,130,246,0.34)');
                grad.addColorStop(1, 'rgba(59,130,246,0.02)');
                ctx.beginPath(); ctx.moveTo(line[0][0], padT + plotH);
                line.forEach(pt => ctx.lineTo(pt[0], pt[1]));
                ctx.lineTo(line[line.length - 1][0], padT + plotH); ctx.closePath();
                ctx.fillStyle = grad; ctx.fill();
                ctx.beginPath(); line.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
                data.forEach((d, i) => {
                    if (i > shown - 0.999) return;
                    const isH = i === this.hover;
                    ctx.beginPath(); ctx.arc(X(i), Y(d.total), isH ? 5 : 3, 0, Math.PI * 2);
                    ctx.fillStyle = isH ? '#3b82f6' : cssVar('--bg-card', '#fff');
                    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
                });
            }
            // hover crosshair
            if (this.hover >= 0 && p >= 1) {
                const hx = X(this.hover);
                ctx.strokeStyle = '#3b82f6'; ctx.globalAlpha = 0.4; ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]); ctx.beginPath();
                ctx.moveTo(hx, padT); ctx.lineTo(hx, padT + plotH); ctx.stroke();
                ctx.setLineDash([]); ctx.globalAlpha = 1;
            }
        }
    };
    /* PLACEHOLDER_PULSE2 */
    Pulse.animate = function () {
        cancelAnimationFrame(this.raf);
        if (!anim()) { this.draw(1); return; }
        const start = performance.now(), dur = 720, self = this;
        (function step(now) {
            const t = Math.min(1, (now - start) / dur);
            self.draw(easeOut(t));
            if (t < 1) self.raf = requestAnimationFrame(step);
        })(start);
    };
    Pulse.refresh = function () {
        this.data = payrollSeries(this.range);
        this.updateMetrics();
        this.animate();
    };
    Pulse.updateMetrics = function () {
        const d = this.data; if (!d.length || !this.el.metrics) return;
        const last = d[d.length - 1], prev = d[d.length - 2] || { total: 0 };
        const totalAll = d.reduce((s, x) => s + x.total, 0);
        const avg = d.length ? totalAll / d.length : 0;
        const dp = deltaPct(last.total, prev.total);
        const cls = dp > 0.5 ? 'px-up' : dp < -0.5 ? 'px-down' : '';
        this.el.metrics.innerHTML =
            '<div class="px-metric"><span class="lbl">This period</span><span class="val">' + money(last.total) + '</span></div>' +
            '<div class="px-metric"><span class="lbl">vs last month</span><span class="val ' + cls + '">' +
                (dp >= 0 ? '+' : '') + dp.toFixed(1) + '%</span></div>' +
            '<div class="px-metric"><span class="lbl">' + this.range + '-mo average</span><span class="val">' + money(avg) + '</span></div>' +
            '<div class="px-metric"><span class="lbl">' + this.range + '-mo total</span><span class="val">' + money(totalAll) + '</span></div>';
    };
    Pulse.onMove = function (clientX) {
        const cv = this.el.canvas; if (!cv || !this.data.length) return;
        const r = cv.getBoundingClientRect();
        const padL = 46, padR = 14, plotW = r.width - padL - padR;
        const rel = clientX - r.left;
        let idx = Math.round(((rel - padL) / plotW) * (this.data.length - 1));
        idx = Math.max(0, Math.min(this.data.length - 1, idx));
        if (idx === this.hover) return;
        this.hover = idx; this.draw(1);
        const tip = this.el.tip, d = this.data[idx];
        const X = padL + (this.data.length === 1 ? plotW / 2 : (idx / (this.data.length - 1)) * plotW);
        tip.innerHTML = '<span class="t-month">' + d.label + '</span>' + money(d.total);
        tip.style.left = X + 'px';
        tip.style.top = '20px';
        tip.classList.add('show');
    };
    Pulse.onLeave = function () {
        if (this.hover < 0) return;
        this.hover = -1; this.draw(1);
        if (this.el.tip) this.el.tip.classList.remove('show');
    };

    function initPulse() {
        const grid = $('#dashGrid'); if (!grid || $('#pxPanel')) return;
        const panel = document.createElement('div');
        panel.className = 'px-panel glass'; panel.id = 'pxPanel';
        panel.innerHTML =
            '<div class="px-head">' +
              '<div class="px-title"><i class="fas fa-wave-square"></i> Payroll Pulse ' +
                '<span class="px-live"><span class="dot"></span> live</span></div>' +
              '<div class="px-range" role="group" aria-label="Chart range">' +
                '<button class="px-seg" data-range="3">3M</button>' +
                '<button class="px-seg active" data-range="6">6M</button>' +
                '<button class="px-seg" data-range="12">12M</button>' +
              '</div>' +
            '</div>' +
            '<div class="px-metricbar" id="pxMetrics"></div>' +
            '<div class="px-canvas-wrap"><canvas id="pxCanvas" role="img" ' +
              'aria-label="Net payroll trend over the selected number of months"></canvas>' +
              '<div class="px-tooltip" id="pxTip"></div></div>';
        grid.parentNode.insertBefore(panel, grid);
        Pulse.el = { canvas: $('#pxCanvas', panel), tip: $('#pxTip', panel), metrics: $('#pxMetrics', panel) };
        panel.querySelectorAll('.px-seg').forEach(seg => seg.addEventListener('click', () => {
            panel.querySelectorAll('.px-seg').forEach(s => s.classList.remove('active'));
            seg.classList.add('active');
            Pulse.range = +seg.dataset.range; Pulse.hover = -1;
            if (Pulse.el.tip) Pulse.el.tip.classList.remove('show');
            Pulse.refresh();
        }));
        const cv = Pulse.el.canvas;
        cv.addEventListener('mousemove', e => Pulse.onMove(e.clientX));
        cv.addEventListener('mouseleave', () => Pulse.onLeave());
        cv.addEventListener('touchstart', e => { if (e.touches[0]) Pulse.onMove(e.touches[0].clientX); }, { passive: true });
        cv.addEventListener('touchmove', e => { if (e.touches[0]) Pulse.onMove(e.touches[0].clientX); }, { passive: true });
        if (window.ResizeObserver) {
            let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => Pulse.draw(1), 80); }).observe(cv);
        }
        Pulse.refresh();
    }
    /* PLACEHOLDER_TIPS */
    /* ═══════════ 2. FLOATING VALUE TOOLTIPS ON EXISTING BARS ═══════════ */
    function initBarTips() {
        let tip = $('#vizTip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'viz-tip'; tip.id = 'vizTip';
            document.body.appendChild(tip);
        }
        const containers = ['#trend-bars', '#dept-list', '#reportDeptBars'];
        function show(target, cx, cy) {
            // Prefer an explicit title/aria-label/data value, else the element's own text.
            let main = target.getAttribute('data-value') || target.getAttribute('title') ||
                       target.getAttribute('aria-label') || '';
            let sub = target.getAttribute('data-label') || '';
            if (!main) {
                const txt = (target.textContent || '').trim().replace(/\s+/g, ' ');
                if (!txt) return;
                // Split "Engineering $6,120" style labels into label + value when possible.
                const mm = txt.match(/^(.*?)(\$[\d.,]+[kKmM]?%?|\d+%|\d[\d.,]*)\s*$/);
                if (mm) { sub = mm[1].trim(); main = mm[2].trim(); } else { main = txt; }
            }
            tip.innerHTML = main + (sub ? '<span class="vt-sub">' + sub + '</span>' : '');
            tip.style.left = cx + 'px'; tip.style.top = cy + 'px';
            tip.classList.add('show');
        }
        containers.forEach(sel => {
            const box = $(sel); if (!box || box.dataset.tipWired) return;
            box.dataset.tipWired = '1';
            box.addEventListener('mousemove', e => {
                const direct = [...box.children].find(c => c === e.target || c.contains(e.target));
                if (direct) show(direct, e.clientX, e.clientY);
                else tip.classList.remove('show');
            });
            box.addEventListener('mouseleave', () => tip.classList.remove('show'));
        });
    }
    /* PLACEHOLDER_MX */
    /* ═══════════ 3. REPORTS — METRIC EXPLORER ═══════════ */
    const MX = { key: 'headcount', metrics: {}, raf: 0, el: {} };

    function drawSpark(cv, series, color) {
        const { ctx, w, h } = fitCanvas(cv);
        ctx.clearRect(0, 0, w, h);
        if (!series || !series.length) return;
        const padX = 6, padY = 14;
        const max = Math.max(...series), min = Math.min(...series, 0);
        const span = (max - min) || 1;
        const X = i => padX + (series.length === 1 ? (w - padX * 2) / 2 : (i / (series.length - 1)) * (w - padX * 2));
        const Y = v => padY + (h - padY * 2) - ((v - min) / span) * (h - padY * 2);
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + '55'); grad.addColorStop(1, color + '05');
        ctx.beginPath(); ctx.moveTo(X(0), h);
        series.forEach((v, i) => ctx.lineTo(X(i), Y(v)));
        ctx.lineTo(X(series.length - 1), h); ctx.closePath();
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); series.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
        series.forEach((v, i) => {
            ctx.beginPath(); ctx.arc(X(i), Y(v), i === series.length - 1 ? 3.5 : 2.5, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
        });
    }
    const MX_COLORS = { headcount: '#3b82f6', avgpay: '#8b5cf6', attendance: '#10b981', leaveload: '#f59e0b' };

    function renderMX() {
        const m = MX.metrics[MX.key]; if (!m || !MX.el.big) return;
        MX.el.label.textContent = m.title;
        MX.el.desc.textContent = m.desc;
        // animated count-up on the big readout
        cancelAnimationFrame(MX.raf);
        const target = m.value, dur = 620, start = performance.now();
        if (!anim()) { MX.el.big.textContent = m.fmt(target); }
        else {
            (function step(now) {
                const t = Math.min(1, (now - start) / dur), v = target * easeOut(t);
                MX.el.big.textContent = m.fmt(v);
                if (t < 1) MX.raf = requestAnimationFrame(step);
            })(start);
        }
        const dp = m.delta;
        const dcls = dp > 0.5 ? 'up' : dp < -0.5 ? 'down' : 'flat';
        const icon = dp > 0.5 ? 'fa-arrow-trend-up' : dp < -0.5 ? 'fa-arrow-trend-down' : 'fa-minus';
        MX.el.delta.className = 'mx-delta ' + dcls;
        MX.el.delta.innerHTML = '<i class="fas ' + icon + '"></i>' +
            (dp >= 0 ? '+' : '') + dp.toFixed(1) + '% vs prior month';
        drawSpark(MX.el.spark, m.series, MX_COLORS[MX.key]);
    }

    function initMetricExplorer() {
        const section = $('#reportsSection'); if (!section || $('#mxWrap')) return;
        const anchor = $('#reportKpis', section) || $('.report-ticker-wrap', section);
        const wrap = document.createElement('div');
        wrap.className = 'mx-wrap'; wrap.id = 'mxWrap';
        const chip = (k, ic, t) => '<button class="mx-chip" data-metric="' + k + '"><i class="fas ' + ic + '"></i>' + t + '</button>';
        wrap.innerHTML =
            '<div class="mx-chips">' +
                chip('headcount', 'fa-users', 'Headcount') +
                chip('avgpay', 'fa-coins', 'Avg Net Pay') +
                chip('attendance', 'fa-user-check', 'Attendance') +
                chip('leaveload', 'fa-plane-departure', 'Leave Load') +
            '</div>' +
            '<div class="mx-stage">' +
              '<div class="mx-readout">' +
                '<div class="mx-label"></div>' +
                '<div class="mx-big">—</div>' +
                '<div class="mx-delta flat"></div>' +
                '<div class="mx-desc"></div>' +
              '</div>' +
              '<div class="mx-spark-wrap"><canvas id="mxSpark" role="img" aria-label="Selected metric trend"></canvas></div>' +
            '</div>';
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
        else section.insertBefore(wrap, section.firstChild);
        MX.el = {
            label: $('.mx-label', wrap), big: $('.mx-big', wrap),
            delta: $('.mx-delta', wrap), desc: $('.mx-desc', wrap), spark: $('#mxSpark', wrap)
        };
        wrap.querySelectorAll('.mx-chip').forEach(c => c.addEventListener('click', () => {
            wrap.querySelectorAll('.mx-chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            MX.key = c.dataset.metric; renderMX();
        }));
        const first = wrap.querySelector('.mx-chip'); if (first) first.classList.add('active');
        if (window.ResizeObserver) {
            let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => {
                if (MX.metrics[MX.key]) drawSpark(MX.el.spark, MX.metrics[MX.key].series, MX_COLORS[MX.key]);
            }, 80); }).observe(MX.el.spark);
        }
        MX.refresh();
    }
    MX.refresh = function () { this.metrics = buildMetrics(); renderMX(); };
    /* PLACEHOLDER_CLOCK */
    /* ═══════════ 4. HEADER LIVE CLOCK ═══════════ */
    function initClock() {
        const bar = $('.header-actions'); if (!bar || $('#liveClock')) return;
        const el = document.createElement('div');
        el.className = 'live-clock'; el.id = 'liveClock';
        el.innerHTML = '<i class="fas fa-clock"></i><span class="lc-time"></span>';
        bar.insertBefore(el, bar.firstChild);
        const time = el.querySelector('.lc-time');
        const tick = () => {
            const n = new Date();
            time.textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        tick(); setInterval(tick, 1000);
    }

    /* ═══════════ REFRESH WIRING ═══════════ */
    function refreshData() {
        try { if (Pulse.el.canvas) Pulse.refresh(); } catch (_) {}
        try { if (MX.el.big) MX.refresh(); } catch (_) {}
    }
    let _refreshT = 0;
    function scheduleRefresh() { clearTimeout(_refreshT); _refreshT = setTimeout(refreshData, 240); }

    function init() {
        initClock();
        initPulse();
        initMetricExplorer();
        initBarTips();

        // Re-render when the user switches to the dashboard/reports tab (sizes the
        // canvases correctly once their section is visible) and after data edits.
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tab-btn')) setTimeout(refreshData, 60);
            // any button that likely mutates data → refresh shortly after
            if (e.target.closest('button[type="submit"], [data-action], #qaRefresh')) scheduleRefresh();
        }, true);
        window.addEventListener('storage', scheduleRefresh);
        window.addEventListener('resize', () => { if (Pulse.el.canvas) Pulse.draw(1); });

        // Gentle "live" heartbeat so the panels reflect edits made elsewhere.
        setInterval(refreshData, 20000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();






