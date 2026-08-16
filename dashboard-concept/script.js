/* 
   Nexus Metrics — Toggleable Financial Dashboard
   Self-contained, zero-dependency prototype
*/

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // DETERMINISTIC MOCK DATA (mulberry32 PRNG)
    // ═══════════════════════════════════════════════════════════
    function mulberry32(a) {
        return function () {
            var t = (a += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const rng = mulberry32(0xCAFEBABE);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

    // Departments
    const DEPTS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'HR', 'Operations', 'Product', 'Design'];
    const POSITIONS = {
        Engineering: ['Staff Engineer', 'Senior Engineer', 'Engineer', 'Junior Engineer', 'Engineering Lead'],
        Sales: ['Account Executive', 'Sales Manager', 'SDR', 'Sales Director', 'VP Sales'],
        Marketing: ['Marketing Manager', 'Content Lead', 'Growth Marketer', 'Brand Designer', 'CMO'],
        Finance: ['Financial Analyst', 'Controller', 'FP&A Lead', 'Accountant', 'CFO'],
        HR: ['HR Business Partner', 'Recruiter', 'People Ops', 'HR Director', 'CHRO'],
        Operations: ['Ops Manager', 'Program Manager', 'Analyst', 'COO', 'Ops Lead'],
        Product: ['Product Manager', 'Senior PM', 'Group PM', 'CPO', 'PM Lead'],
        Design: ['Product Designer', 'UX Lead', 'Design Director', 'Design System Lead', 'CDO']
    };

    // Generate employees
    const EMPLOYEES = range(120, (i) => {
        const dept = pick(DEPTS);
        const pos = pick(POSITIONS[dept]);
        const base = 45000 + Math.floor(rng() * 110000);
        const allow = Math.floor(base * (0.05 + rng() * 0.25));
        const bonus = Math.floor(base * (0.02 + rng() * 0.15));
        const gross = base + allow + bonus;
        const tax = Math.floor(gross * (0.18 + rng() * 0.12));
        const net = gross - tax;
        return {
            id: `EMP${String(1000 + i).padStart(4, '0')}`,
            name: `Employee ${i + 1}`,
            dept,
            position: pos,
            base,
            allowances: allow,
            bonus,
            gross,
            tax,
            net,
            avatar: `Avatar ${i + 1}`
        };
    });

    // Payroll history (12 months)
    const PAYROLL_HISTORY = range(12, (m) => {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - (11 - m));
        const gross = EMPLOYEES.reduce((s, e) => s + e.gross * (0.9 + rng() * 0.2), 0);
        const net = gross * (0.72 + rng() * 0.06);
        const tax = gross - net;
        return {
            label: monthDate.toLocaleString('default', { month: 'short', year: '2-digit' }),
            date: monthDate,
            gross: Math.round(gross),
            net: Math.round(net),
            tax: Math.round(tax)
        };
    });

    // Attendance data (last 6 months, 30 days each)
    const STATUS_COLORS = {
        present: '#10b981',
        late: '#f59e0b',
        half: '#8b5cf6',
        absent: '#ef4444'
    };
    const ATTENDANCE = range(6, (mi) => {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - (5 - mi));
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const days = range(daysInMonth, (di) => {
            const present = Math.floor(EMPLOYEES.length * (0.78 + rng() * 0.15));
            const late = Math.floor((EMPLOYEES.length - present) * (0.3 + rng() * 0.4));
            const half = Math.floor((EMPLOYEES.length - present - late) * (0.2 + rng() * 0.3));
            const absent = EMPLOYEES.length - present - late - half;
            return { day: di + 1, present, late, half, absent };
        });
        return { month: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }), date: monthDate, days };
    });

    // Activity feed events
    const EVENT_TYPES = ['payroll', 'attendance', 'leave', 'system'];
    const EVENT_TEMPLATES = {
        payroll: [
            'Payroll processed for {dept} department',
            'Salary adjustment approved for {name}',
            'Bonus payout scheduled for {dept}',
            'Tax filing completed for {period}'
        ],
        attendance: [
            'Attendance synced from {device}',
            'Late arrival alert for {count} employees',
            'Absence report generated for {dept}',
            'Shift schedule updated for {period}'
        ],
        leave: [
            'Leave request approved for {name}',
            'Sick leave submitted by {name}',
            'Annual leave balance updated',
            'Leave policy updated for {dept}'
        ],
        system: [
            'System backup completed successfully',
            'Security patch deployed to production',
            'API rate limit threshold reached',
            'Database maintenance scheduled'
        ]
    };
    const ACTORS = ['System', 'HR Bot', 'Payroll Engine', 'Attendance Sync', 'Leave Manager', 'Finance Bot'];

    // FX rates (base USD)
    const FX_CURRENCIES = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'NPR', 'SGD', 'HKD', 'KRW'];
    const FX_BASE_RATES = {
        EUR: 0.92, GBP: 0.79, JPY: 151.5, CHF: 0.89, CAD: 1.36,
        AUD: 1.53, CNY: 7.24, INR: 83.1, NPR: 132.9, SGD: 1.34, HKD: 7.81, KRW: 1342
    };
    let fxRates = {};
    FX_CURRENCIES.forEach(c => { fxRates[c] = { rate: FX_BASE_RATES[c], history: [] }; });
    // seed 24h history
    FX_CURRENCIES.forEach(c => {
        let v = FX_BASE_RATES[c];
        for (let h = 23; h >= 0; h--) {
            v *= 1 + (rng() - 0.5) * 0.006;
            fxRates[c].history.push({ t: h, rate: v });
        }
        fxRates[c].rate = v;
    });

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════
    const fmt = (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    const fmtFull = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
    const fmtPct = (n) => (n * 100).toFixed(1) + '%';
    const nowStr = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const todayStr = () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    function el(html, parent) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        const node = t.content.firstElementChild;
        if (parent) parent.appendChild(node);
        return node;
    }

    function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // ═══════════════════════════════════════════════════════════
    // SVG CHART HELPERS
    // ═══════════════════════════════════════════════════════════
    const NS = 'http://www.w3.org/2000/svg';

    function svg(tag, attrs = {}, children = []) {
        const e = document.createElementNS(NS, tag);
        Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        children.forEach(c => e.appendChild(c));
        return e;
    }

    function tooltipShow(tooltipEl, x, y, rows) {
        tooltipEl.innerHTML = rows.map(r => `<div class="tt-row"><span class="tt-label">${r[0]}</span><span class="tt-value">${r[1]}</span></div>`).join('');
        tooltipEl.style.left = x + 'px';
        tooltipEl.style.top = (y - 10) + 'px';
        tooltipEl.classList.add('show');
    }

    function tooltipHide(tooltipEl) { tooltipEl.classList.remove('show'); }

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════
    const state = {
        view: 'overview',
        payroll: { range: 6, metric: 'gross' },
        attendance: { monthIndex: 5, visibleStatus: { present: true, late: true, half: true, absent: true } },
        salary: { deptFilter: 'all', sort: 'total' },
        activity: { paused: false, typeFilter: { all: true, payroll: true, attendance: true, leave: true, system: true }, search: '' },
        earners: { period: 'month' },
        fx: { base: 'USD' }
    };

    // ═══════════════════════════════════════════════════════════
    // TOGGLE BAR & VIEW SWITCHING
    // ═══════════════════════════════════════════════════════════
    const toggleBar = document.getElementById('toggleBar');
    const togglePill = document.getElementById('togglePill');
    const tabs = Array.from(document.querySelectorAll('.toggle-btn'));
    const views = Array.from(document.querySelectorAll('.view'));
    const tooltip = document.getElementById('tooltip');

    function positionPill(activeBtn) {
        const rect = activeBtn.getBoundingClientRect();
        const barRect = toggleBar.getBoundingClientRect();
        togglePill.style.width = rect.width + 'px';
        togglePill.style.transform = `translateX(${rect.left - barRect.left}px)`;
    }

    function switchView(viewName, pushHash = true) {
        const btn = tabs.find(b => b.dataset.view === viewName);
        if (!btn) return;

        tabs.forEach(b => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-selected', b === btn);
        });
        views.forEach(v => {
            v.classList.toggle('active', v.id === 'view-' + viewName);
        });

        state.view = viewName;
        positionPill(btn);

        if (pushHash) {
            history.replaceState(null, '', '#' + viewName);
        }

        initView(viewName);
    }

    function initView(name) {
        switch (name) {
            case 'overview': renderOverview(); break;
            case 'payroll': renderPayroll(); break;
            case 'attendance': renderAttendance(); break;
            case 'salary': renderSalary(); break;
            case 'activity': renderActivity(); break;
            case 'earners': renderEarners(); break;
            case 'fx': renderFX(); break;
        }
    }

    tabs.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const idx = tabs.indexOf(btn);
                const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
                next.focus();
                switchView(next.dataset.view);
            }
        });
    });

    // Overview widget clicks
    document.getElementById('ovGrid').addEventListener('click', (e) => {
        const card = e.target.closest('.ov-card');
        if (card && card.dataset.view) {
            switchView(card.dataset.view);
        }
    });

    // Deep linking
    window.addEventListener('hashchange', () => {
        const hash = location.hash.slice(1);
        if (hash) switchView(hash, false);
    });

    // Restore last view
    const saved = localStorage.getItem('nm-view') || location.hash.slice(1) || 'overview';
    setTimeout(() => switchView(saved, false), 0);

    // Save view on change
    const origSwitch = switchView;
    switchView = function (name, push) {
        localStorage.setItem('nm-view', name);
        return origSwitch(name, push);
    };

    // Position pill on resize
    window.addEventListener('resize', () => {
        const active = document.querySelector('.toggle-btn.active');
        if (active) positionPill(active);
    });

    // ═══════════════════════════════════════════════════════════
    // OVERVIEW RENDER
    // ═══════════════════════════════════════════════════════════
    function renderOverview() {
        const grid = document.getElementById('ovGrid');
        clear(grid);

        // 1. Payroll Trends
        const lastPayroll = PAYROLL_HISTORY[PAYROLL_HISTORY.length - 1];
        const payrollTotal = lastPayroll.gross;
        const payrollAvg = PAYROLL_HISTORY.slice(-6).reduce((s, p) => s + p.gross, 0) / 6;
        const payrollSpark = PAYROLL_HISTORY.slice(-6).map(p => p.gross);

        // 2. Attendance (current month)
        const currAtt = ATTENDANCE[ATTENDANCE.length - 1];
        const today = new Date().getDate() - 1;
        const todayAtt = currAtt.days[Math.min(today, currAtt.days.length - 1)];
        const attendPct = todayAtt ? (todayAtt.present / EMPLOYEES.length) : 0;

        // 3. Salary by Dept
        const deptTotals = {};
        EMPLOYEES.forEach(e => { deptTotals[e.dept] = (deptTotals[e.dept] || 0) + e.gross; });
        const topDept = Object.entries(deptTotals).sort((a, b) => b[1] - a[1])[0];

        // 4. Live Activity count
        const activityCount = 12;

        // 5. Top Earner
        const topEarner = [...EMPLOYEES].sort((a, b) => b.gross - a.gross)[0];

        // 6. FX rate (EUR/USD)
        const eurRate = fxRates.EUR.rate;

        const widgets = [
            { key: 'payroll', view: 'payroll', cls: 'ov-blue', ico: '▥', label: 'Payroll Trend', value: fmtFull(payrollTotal), sub: `6-mo avg ${fmtFull(payrollAvg)}`, spark: payrollSpark },
            { key: 'attendance', view: 'attendance', cls: 'ov-green', ico: '▤', label: 'Attendance Today', value: fmtPct(attendPct), sub: `${todayAtt?.present || 0} / ${EMPLOYEES.length} present`, spark: currAtt.days.slice(-7).map(d => d.present / EMPLOYEES.length) },
            { key: 'salary', view: 'salary', cls: 'ov-purple', ico: '▦', label: 'Salary by Dept', value: fmtFull(topDept[1]), sub: `Top: ${topDept[0]}`, spark: Object.values(deptTotals).sort((a, b) => b - a).slice(0, 8) },
            { key: 'activity', view: 'activity', cls: 'ov-red', ico: '⚡', label: 'Live Activity', value: activityCount + '+', sub: 'Events in feed', spark: range(8, () => rng()) },
            { key: 'earners', view: 'earners', cls: 'ov-amber', ico: '♛', label: 'Top Earner', value: fmtFull(topEarner.gross), sub: `${topEarner.name} (${topEarner.dept})`, spark: range(8, () => rng()) },
            { key: 'fx', view: 'fx', cls: 'ov-teal', ico: '⇄', label: 'EUR / USD Rate', value: eurRate.toFixed(4), sub: 'Live from Frankfurter', spark: fxRates.EUR.history.slice(-8).map(h => h.rate) }
        ];

        widgets.forEach(w => {
            const card = el(`
                <div class="ov-card ${w.cls}" data-view="${w.view}">
                    <div class="ov-head">
                        <div class="ov-ico">${w.ico}</div>
                        <div class="ov-info">
                            <div class="ov-label">${w.label}</div>
                            <div class="ov-value">${w.value}</div>
                        </div>
                    </div>
                    <svg class="ov-spark" viewBox="0 0 100 40" preserveAspectRatio="none"></svg>
                    <div class="ov-hint"><span>↗</span> Click for focus mode</div>
                </div>
            `, grid);
            drawSparkline(card.querySelector('.ov-spark'), w.spark, w.cls.replace('ov-', ''));
        });
    }

    function drawSparkline(svgEl, data, color) {
        if (!data.length) return;
        const min = Math.min(...data), max = Math.max(...data);
        const range = max - min || 1;
        const w = 100, h = 40, pad = 2;
        const points = data.map((v, i) => {
            const x = pad + (i / (data.length - 1 || 1)) * (w - 2 * pad);
            const y = h - pad - ((v - min) / range) * (h - 2 * pad);
            return `${x},${y}`;
        }).join(' ');
        const lineColor = color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'purple' ? '#8b5cf6' : color === 'red' ? '#ef4444' : color === 'amber' ? '#f59e0b' : '#14b8a6';
        svgEl.innerHTML = `<polyline fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points}" opacity="0.9"/>`;
    }

    // ═══════════════════════════════════════════════════════════
    // PAYROLL TRENDS
    // ═══════════════════════════════════════════════════════════
    function renderPayroll() {
        const { range, metric } = state.payroll;
        const data = PAYROLL_HISTORY.slice(-range);
        const chartEl = document.getElementById('pr-chart');
        const statsEl = document.getElementById('pr-stats');
        const drillEl = document.getElementById('pr-drill');
        clear(chartEl);
        clear(statsEl);
        clear(drillEl);
        drillEl.classList.remove('open');

        // Stats
        const total = data.reduce((s, d) => s + d[metric], 0);
        const avg = total / data.length;
        const peak = data.reduce((p, d) => d[metric] > p[metric] ? d : p, data[0]);
        const delta = data.length > 1 ? ((data[data.length - 1][metric] - data[0][metric]) / data[0][metric]) : 0;
        statsEl.innerHTML = `
            <div class="stat-item"><div class="stat-label">Total</div><div class="stat-value accent">${fmtFull(total)}</div></div>
            <div class="stat-item"><div class="stat-label">Monthly Avg</div><div class="stat-value">${fmtFull(avg)}</div></div>
            <div class="stat-item"><div class="stat-label">Peak Month</div><div class="stat-value">${peak.label} ${fmtFull(peak[metric])}</div></div>
            <div class="stat-item"><div class="stat-label">Period Δ</div><div class="stat-value ${delta >= 0 ? 'positive' : 'danger'}">${delta >= 0 ? '+' : ''}${fmtPct(delta)}</div></div>
        `;

        // Chart
        const maxVal = Math.max(...data.map(d => d[metric]));
        const minVal = Math.min(...data.map(d => d[metric]));
        const valRange = maxVal - minVal || 1;
        const svgW = chartEl.clientWidth || 800;
        const svgH = 320;
        const pad = 50;
        const chartW = svgW - 2 * pad;
        const chartH = svgH - 2 * pad;
        const barW = chartW / data.length * 0.65;

        const svgRoot = svg('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: '100%', height: '100%' });
        const g = svg('g', { transform: `translate(${pad},${pad})` });

        // Y grid lines
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * chartH;
            g.appendChild(svg('line', { x1: 0, y1: y, x2: chartW, y2: y, stroke: 'rgba(148,163,184,0.08)', 'stroke-width': 1 }));
            const val = maxVal - (i / 4) * valRange;
            g.appendChild(svg('text', { x: -10, y: y + 4, 'font-size': 11, fill: 'var(--text-muted)', 'text-anchor': 'end', 'font-family': 'var(--font-mono)' }, [document.createTextNode(fmt(val))]));
        }

        // Bars with spring animation
        data.forEach((d, i) => {
            const x = (i + 0.175) / data.length * chartW;
            const h = ((d[metric] - minVal) / valRange) * chartH;
            const y = chartH - h;
            const barColor = metric === 'gross' ? '#3b82f6' : metric === 'net' ? '#10b981' : '#ef4444';
            const group = svg('g', { class: 'bar-group', 'data-index': i });
            const rect = svg('rect', {
                class: 'bar-rect', x, y, width: barW, height: h,
                fill: barColor, rx: 4, ry: 4,
                style: 'transform:scaleY(0);transform-origin:bottom;transition:transform 600ms cubic-bezier(0.34,1.56,0.64,1) ' + (i * 60) + 'ms;'
            });
            group.appendChild(rect);
            // Label
            group.appendChild(svg('text', { class: 'bar-label', x: x + barW / 2, y: chartH + 18 }, [document.createTextNode(d.label)]));
            // Value on top
            group.appendChild(svg('text', { class: 'bar-value', x: x + barW / 2, y: y - 6 }, [document.createTextNode(fmtFull(d[metric]))]));
            g.appendChild(group);
            // Trigger animation
            requestAnimationFrame(() => { rect.style.transform = 'scaleY(1)'; });
        });

        svgRoot.appendChild(g);
        chartEl.appendChild(svgRoot);

        // Tooltip interaction
        const chartTooltip = document.createElement('div');
        chartTooltip.className = 'chart-tooltip';
        chartEl.appendChild(chartTooltip);

        chartEl.addEventListener('mousemove', (e) => {
            const rect = chartEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.floor((x - pad) / chartW * data.length);
            if (idx >= 0 && idx < data.length) {
                const d = data[idx];
                const prev = data[idx - 1];
                const delta = prev ? ((d[metric] - prev[metric]) / prev[metric]) : 0;
                tooltipShow(chartTooltip, e.clientX, e.clientY, [
                    ['Month', d.label],
                    [metric.charAt(0).toUpperCase() + metric.slice(1), fmtFull(d[metric])],
                    ['Vs Prev', (delta >= 0 ? '+' : '') + fmtPct(delta)]
                ]);
            } else tooltipHide(chartTooltip);
        });
        chartEl.addEventListener('mouseleave', () => tooltipHide(chartTooltip));

        // Click → drill down
        chartEl.addEventListener('click', (e) => {
            const rect = chartEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.floor((x - pad) / chartW * data.length);
            if (idx >= 0 && idx < data.length) openPayrollDrill(idx);
        });

        // Range chips
        document.getElementById('pr-range-chips').addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            document.querySelectorAll('#pr-range-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.payroll.range = parseInt(chip.dataset.range, 10);
            renderPayroll();
        });
        document.getElementById('pr-metric').addEventListener('change', (e) => {
            state.payroll.metric = e.target.value;
            renderPayroll();
        });

        function openPayrollDrill(monthIdx) {
            const d = data[monthIdx];
            const deptData = DEPTS.map(dept => {
                const emps = EMPLOYEES.filter(e => e.dept === dept);
                const total = emps.reduce((s, e) => s + e[metric], 0);
                return { dept, total, count: emps.length };
            }).sort((a, b) => b.total - a.total);

            drillEl.innerHTML = `
                <div class="drill-head">
                    <div class="drill-title">${d.label} — ${metric.charAt(0).toUpperCase() + metric.slice(1)} Breakdown</div>
                    <button class="drill-close">Close</button>
                </div>
                <div class="drill-table-wrap">
                    <table class="drill-table">
                        <thead><tr><th>Department</th><th class="mono">${metric}</th><th>Headcount</th><th class="mono">Avg per Person</th></tr></thead>
                        <tbody>
                            ${deptData.map(r => `<tr><td>${r.dept}</td><td class="mono">${fmtFull(r.total)}</td><td>${r.count}</td><td class="mono">${fmtFull(r.total / r.count)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            drillEl.classList.add('open');
            drillEl.querySelector('.drill-close').onclick = () => { drillEl.classList.remove('open'); };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MONTHLY ATTENDANCE
    // ═══════════════════════════════════════════════════════════
    function renderAttendance() {
        const { monthIndex, visibleStatus } = state.attendance;
        const monthData = ATTENDANCE[monthIndex];
        const chartEl = document.getElementById('att-chart');
        const statsEl = document.getElementById('att-stats');
        const drillEl = document.getElementById('att-drill');
        clear(chartEl);
        clear(statsEl);
        clear(drillEl);
        drillEl.classList.remove('open');

        document.getElementById('att-month-label').textContent = monthData.month;

        // Stats
        const totalDays = monthData.days.length;
        const totals = monthData.days.reduce((acc, d) => {
            acc.present += d.present; acc.late += d.late; acc.half += d.half; acc.absent += d.absent; return acc;
        }, { present: 0, late: 0, half: 0, absent: 0 });
        const totalEmp = EMPLOYEES.length * totalDays;
        const attendPct = totals.present / totalEmp;
        const avgLate = totals.late / totalDays;
        statsEl.innerHTML = `
            <div class="stat-item"><div class="stat-label">Attendance %</div><div class="stat-value positive">${fmtPct(attendPct)}</div></div>
            <div class="stat-item"><div class="stat-label">Avg Late/Day</div><div class="stat-value warning">${avgLate.toFixed(1)}</div></div>
            <div class="stat-item"><div class="stat-label">Total Absences</div><div class="stat-value danger">${totals.absent}</div></div>
            <div class="stat-item"><div class="stat-label">Tracked Days</div><div class="stat-value">${totalDays}</div></div>
        `;

        // Stacked bar chart
        const maxEmp = EMPLOYEES.length;
        const svgW = chartEl.clientWidth || 800;
        const svgH = 320;
        const pad = 50;
        const chartW = svgW - 2 * pad;
        const chartH = svgH - 2 * pad;
        const barW = chartW / totalDays * 0.7;

        const svgRoot = svg('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: '100%', height: '100%' });
        const g = svg('g', { transform: `translate(${pad},${pad})` });

        // Y grid
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * chartH;
            g.appendChild(svg('line', { x1: 0, y1: y, x2: chartW, y2: y, stroke: 'rgba(148,163,184,0.08)', 'stroke-width': 1 }));
            g.appendChild(svg('text', { x: -10, y: y + 4, 'font-size': 11, fill: 'var(--text-muted)', 'text-anchor': 'end', 'font-family': 'var(--font-mono)' }, [document.createTextNode(Math.round(maxEmp * (1 - i / 4)))]));
        }

        monthData.days.forEach((d, i) => {
            const x = (i + 0.15) / totalDays * chartW;
            let yCursor = chartH;
            const order = ['present', 'late', 'half', 'absent'];
            order.forEach(status => {
                if (!visibleStatus[status]) return;
                const h = (d[status] / maxEmp) * chartH;
                if (h <= 0) return;
                yCursor -= h;
                const rect = svg('rect', {
                    class: 'stack-segment', x, y: yCursor, width: barW, height: h,
                    fill: STATUS_COLORS[status], 'data-status': status, 'data-day': d.day
                });
                g.appendChild(rect);
            });
            // Day label every 3 days
            if ((d.day - 1) % 3 === 0 || d.day === totalDays) {
                g.appendChild(svg('text', { class: 'bar-label', x: x + barW / 2, y: chartH + 18, 'font-size': 9 }, [document.createTextNode(d.day)]));
            }
        });

        // Legend
        const legend = svg('g', { transform: `translate(${pad}, ${svgH - 30})` });
        order.forEach((status, idx) => {
            const lx = idx * 130;
            legend.appendChild(svg('rect', { x: lx, y: 0, width: 12, height: 12, fill: STATUS_COLORS[status], rx: 2, class: `stack-segment legend-${status}` + (!visibleStatus[status] ? ' hidden' : ''), 'data-status': status }));
            legend.appendChild(svg('text', { x: lx + 18, y: 9, 'font-size': 11, fill: 'var(--text-secondary)' }, [document.createTextNode(status.charAt(0).toUpperCase() + status.slice(1))]));
        });
        svgRoot.appendChild(g);
        svgRoot.appendChild(legend);
        chartEl.appendChild(svgRoot);

        // Tooltip
        const chartTooltip = document.createElement('div');
        chartTooltip.className = 'chart-tooltip';
        chartEl.appendChild(chartTooltip);

        chartEl.addEventListener('mousemove', (e) => {
            const rect = chartEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.floor((x - pad) / chartW * totalDays);
            if (idx >= 0 && idx < totalDays) {
                const d = monthData.days[idx];
                const total = d.present + d.late + d.half + d.absent;
                tooltipShow(chartTooltip, e.clientX, e.clientY, [
                    ['Day', d.day],
                    ['Present', d.present + ' (' + fmtPct(d.present / total) + ')'],
                    ['Late', d.late + ' (' + fmtPct(d.late / total) + ')'],
                    ['Half-day', d.half + ' (' + fmtPct(d.half / total) + ')'],
                    ['Absent', d.absent + ' (' + fmtPct(d.absent / total) + ')']
                ]);
            } else tooltipHide(chartTooltip);
        });
        chartEl.addEventListener('mouseleave', () => tooltipHide(chartTooltip));

        // Click day → drill
        chartEl.addEventListener('click', (e) => {
            const rect = chartEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const idx = Math.floor((x - pad) / chartW * totalDays);
            if (idx >= 0 && idx < totalDays) openAttendanceDrill(idx);
        });

        // Status filter chips
        document.getElementById('att-status-chips').addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip || chip.id) return;
            chip.classList.toggle('active');
            state.attendance.visibleStatus[chip.dataset.status] = chip.classList.contains('active');
            renderAttendance();
        });

        // Month nav
        document.getElementById('att-prev').onclick = () => { state.attendance.monthIndex = (state.attendance.monthIndex - 1 + ATTENDANCE.length) % ATTENDANCE.length; renderAttendance(); };
        document.getElementById('att-next').onclick = () => { state.attendance.monthIndex = (state.attendance.monthIndex + 1) % ATTENDANCE.length; renderAttendance(); };

        function openAttendanceDrill(dayIdx) {
            const d = monthData.days[dayIdx];
            // Generate mock employee list for that day
            const emps = EMPLOYEES.slice(0, 30).map((emp, i) => {
                const statuses = ['present', 'late', 'half', 'absent'];
                const weights = [0.78, 0.12, 0.05, 0.05];
                let r = rng(), cum = 0, status = 'present';
                for (let s = 0; s < statuses.length; s++) { cum += weights[s]; if (r < cum) { status = statuses[s]; break; } }
                return { ...emp, status };
            });

            drillEl.innerHTML = `
                <div class="drill-head">
                    <div class="drill-title">${monthData.month} — Day ${d.day} Staff Detail</div>
                    <button class="drill-close">Close</button>
                </div>
                <div class="drill-table-wrap">
                    <table class="drill-table">
                        <thead><tr><th>Employee</th><th>Dept</th><th>Status</th></tr></thead>
                        <tbody>
                            ${emps.map(e => `<tr><td class="name">${e.name}</td><td class="dept">${e.dept}</td><td><span class="badge badge-${e.status}">${e.status}</span></td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            drillEl.classList.add('open');
            drillEl.querySelector('.drill-close').onclick = () => { drillEl.classList.remove('open'); };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SALARY BY DEPARTMENT
    // ═══════════════════════════════════════════════════════════
    function renderSalary() {
        const { deptFilter, sort } = state.salary;
        const chartEl = document.getElementById('sal-chart');
        const statsEl = document.getElementById('sal-stats');
        const drillEl = document.getElementById('sal-drill');
        clear(chartEl);
        clear(statsEl);
        clear(drillEl);
        drillEl.classList.remove('open');

        // Aggregate by dept
        const deptData = DEPTS.map(dept => {
            const emps = EMPLOYEES.filter(e => e.dept === dept);
            const total = emps.reduce((s, e) => s + e.gross, 0);
            const avg = total / emps.length;
            return { dept, total, count: emps.length, avg, emps };
        });

        // Sort
        if (sort === 'total') deptData.sort((a, b) => b.total - a.total);
        else if (sort === 'headcount') deptData.sort((a, b) => b.count - a.count);
        else deptData.sort((a, b) => b.avg - a.avg);

        // Filter
        const displayData = deptFilter === 'all' ? deptData : deptData.filter(d => d.dept === deptFilter);

        // Stats
        const grandTotal = deptData.reduce((s, d) => s + d.total, 0);
        const grandAvg = grandTotal / EMPLOYEES.length;
        const largest = deptData[0];
        statsEl.innerHTML = `
            <div class="stat-item"><div class="stat-label">Total Payroll</div><div class="stat-value accent">${fmtFull(grandTotal)}</div></div>
            <div class="stat-item"><div class="stat-label">Avg Salary</div><div class="stat-value">${fmtFull(grandAvg)}</div></div>
            <div class="stat-item"><div class="stat-label">Largest Dept</div><div class="stat-value">${largest.dept} (${largest.count})</div></div>
            <div class="stat-item"><div class="stat-label">Headcount</div><div class="stat-value">${EMPLOYEES.length}</div></div>
        `;

        // Dept filter chips
        const chipContainer = document.getElementById('sal-dept-chips');
        clear(chipContainer);
        const allChip = el(`<button class="chip ${deptFilter === 'all' ? 'active' : ''}" data-dept="all">All</button>`, chipContainer);
        DEPTS.forEach(dept => {
            el(`<button class="chip ${deptFilter === dept ? 'active' : ''}" data-dept="${dept}">${dept}</button>`, chipContainer);
        });
        chipContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            chipContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.salary.deptFilter = chip.dataset.dept;
            renderSalary();
        });

        // Sort chips
        document.getElementById('sal-sort-chips').addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            document.querySelectorAll('#sal-sort-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.salary.sort = chip.dataset.sort;
            renderSalary();
        });

        // Horizontal bar chart
        const maxTotal = Math.max(...displayData.map(d => d.total));
        const svgW = chartEl.clientWidth || 800;
        const rowH = 48;
        const svgH = Math.max(320, displayData.length * rowH + 40);
        const padL = 180, padR = 40, padT = 20, padB = 20;
        const chartW = svgW - padL - padR;

        const svgRoot = svg('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: '100%', height: '100%' });
        const g = svg('g', { transform: `translate(${padL},${padT})` });

        displayData.forEach((d, i) => {
            const y = i * rowH;
            const barW = (d.total / maxTotal) * chartW;
            const pct = (d.total / grandTotal) * 100;

            // Track
            g.appendChild(svg('rect', { class: 'hbar-track', x: 0, y: y + 8, width: chartW, height: 12, rx: 6, fill: 'rgba(59,130,246,0.06)' }));
            // Fill (animated)
            const fill = svg('rect', { class: 'hbar-fill', x: 0, y: y + 8, width: 0, height: 12, rx: 6, fill: 'url(#salGrad)' });
            g.appendChild(fill);
            requestAnimationFrame(() => { fill.setAttribute('width', barW); });

            // Dept name
            g.appendChild(svg('text', { class: 'hbar-label', x: -16, y: y + 14, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--text-secondary)' }, [document.createTextNode(d.dept)]));
            // Total value
            g.appendChild(svg('text', { class: 'hbar-value', x: barW + 8, y: y + 14, 'font-size': 11, fill: 'var(--text-primary)' }, [document.createTextNode(fmtFull(d.total))]));
            // Percentage
            g.appendChild(svg('text', { class: 'hbar-pct', x: chartW + 8, y: y + 14, 'font-size': 10, fill: 'var(--text-muted)' }, [document.createTextNode(pct.toFixed(1) + '%')]));

            // Click handler on row
            const hit = svg('rect', { class: 'hbar-row', x: -padL, y: y, width: svgW, height: rowH, fill: 'transparent', 'data-dept': d.dept, style: 'cursor:pointer' });
            g.appendChild(hit);
        });

        // Gradient def
        const defs = svg('defs', {}, [
            svg('linearGradient', { id: 'salGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, [
                svg('stop', { offset: '0%', 'stop-color': '#3b82f6' }),
                svg('stop', { offset: '100%', 'stop-color': '#8b5cf6' })
            ])
        ]);
        svgRoot.insertBefore(defs, svgRoot.firstChild);

        svgRoot.appendChild(g);
        chartEl.appendChild(svgRoot);

        // Click → drill
        chartEl.addEventListener('click', (e) => {
            const row = e.target.closest('.hbar-row');
            if (row) openSalaryDrill(row.dataset.dept);
        });

        function openSalaryDrill(dept) {
            const d = deptData.find(x => x.dept === dept);
            if (!d) return;
            const sortedEmps = [...d.emps].sort((a, b) => b.gross - a.gross);

            drillEl.innerHTML = `
                <div class="drill-head">
                    <div class="drill-title">${dept} — ${d.count} Employees</div>
                    <button class="drill-close">Close</button>
                </div>
                <div class="drill-table-wrap">
                    <table class="drill-table">
                        <thead><tr><th>Rank</th><th>Employee</th><th>Position</th><th class="mono">Gross Salary</th><th>Share of Dept</th></tr></thead>
                        <tbody>
                            ${sortedEmps.map((e, i) => {
                const share = (e.gross / d.total) * 100;
                return `<tr><td class="mono rank">${i + 1}</td><td class="name">${e.name}</td><td class="dept">${e.position}</td><td class="mono">${fmtFull(e.gross)}</td><td><div class="progress-cell"><div class="progress-track"><div class="progress-fill" style="width:${share}%"></div></div></div></td></tr>`;
            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            drillEl.classList.add('open');
            drillEl.querySelector('.drill-close').onclick = () => { drillEl.classList.remove('open'); };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // LIVE ACTIVITY FEED
    // ═══════════════════════════════════════════════════════════
    let activityEvents = [];
    let activityTimer = null;

    function generateEvent() {
        const type = pick(EVENT_TYPES);
        const template = pick(EVENT_TEMPLATES[type]);
        const actor = pick(ACTORS);
        const dept = pick(DEPTS);
        const name = pick(EMPLOYEES).name;
        const devices = ['Biometric Scanner', 'Mobile App', 'Web Portal', 'Slack Integration'];
        const device = pick(devices);
        const periods = ['Q1 2025', 'January 2025', 'Current Month', 'Last Week'];
        const period = pick(periods);

        const message = template
            .replace('{dept}', dept)
            .replace('{name}', name)
            .replace('{device}', device)
            .replace('{count}', Math.floor(rng() * 10) + 1)
            .replace('{period}', period);

        return {
            id: Date.now() + rng(),
            type,
            actor,
            message,
            time: new Date(),
            meta: { dept, actor, type }
        };
    }

    function seedActivity() {
        activityEvents = range(20, () => generateEvent()).reverse(); // newest first
    }

    function renderActivity() {
        const feedEl = document.getElementById('act-feed');
        clear(feedEl);

        const { typeFilter, search } = state.activity;
        const filtered = activityEvents.filter(e => {
            if (!typeFilter[e.type] && !typeFilter.all) return false;
            if (search && !e.message.toLowerCase().includes(search.toLowerCase()) && !e.actor.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });

        filtered.forEach((e, idx) => {
            const item = el(`
                <div class="feed-item" data-id="${e.id}">
                    <div class="feed-ico" style="background:${typeColor(e.type)}">${typeIcon(e.type)}</div>
                    <div class="feed-content">
                        <div class="feed-head">
                            <span class="feed-type badge badge-${e.type}">${e.type}</span>
                            <span class="feed-time">${e.time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div class="feed-message">${e.message}</div>
                        <div class="feed-details">
                            <div class="feed-detail-row"><span class="feed-detail-label">Actor</span><span class="feed-detail-value">${e.actor}</span></div>
                            <div class="feed-detail-row"><span class="feed-detail-label">Department</span><span class="feed-detail-value">${e.meta.dept}</span></div>
                            <div class="feed-detail-row"><span class="feed-detail-label">Timestamp</span><span class="feed-detail-value">${e.time.toISOString()}</span></div>
                            <div class="feed-detail-row"><span class="feed-detail-label">Event ID</span><span class="feed-detail-value">${e.id}</span></div>
                        </div>
                    </div>
                </div>
            `, feedEl);
            // Stagger animation
            item.style.animationDelay = (idx * 30) + 'ms';
            item.addEventListener('click', () => {
                item.classList.toggle('expanded');
            });
        });

        // Type chips
        document.getElementById('act-type-chips').addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip || chip.id === 'act-pause') return;
            chip.classList.toggle('active');
            const type = chip.dataset.type;
            if (type === 'all') {
                const allActive = chip.classList.contains('active');
                document.querySelectorAll('#act-type-chips .chip').forEach(c => c.classList.toggle('active', allActive));
                Object.keys(state.activity.typeFilter).forEach(k => state.activity.typeFilter[k] = allActive);
            } else {
                state.activity.typeFilter[type] = chip.classList.contains('active');
                const allActive = ['payroll', 'attendance', 'leave', 'system'].every(t => state.activity.typeFilter[t]);
                state.activity.typeFilter.all = allActive;
                document.querySelector('#act-type-chips .chip[data-type="all"]').classList.toggle('active', allActive);
            }
            renderActivity();
        });

        // Pause/Resume
        document.getElementById('act-pause').addEventListener('click', (e) => {
            state.activity.paused = !state.activity.paused;
            e.currentTarget.textContent = state.activity.paused ? '▶ Resume' : '❚❚ Pause';
            e.currentTarget.classList.toggle('active', state.activity.paused);
            if (state.activity.paused) {
                clearInterval(activityTimer);
            } else {
                startActivityStream();
            }
        });

        // Search
        document.getElementById('act-search').addEventListener('input', (e) => {
            state.activity.search = e.target.value;
            renderActivity();
        });

        // Start stream if not paused
        if (!state.activity.paused) startActivityStream();
        else if (activityTimer) clearInterval(activityTimer);
    }

    function startActivityStream() {
        if (activityTimer) clearInterval(activityTimer);
        activityTimer = setInterval(() => {
            if (state.activity.paused) return;
            const newEvent = generateEvent();
            activityEvents.unshift(newEvent);
            if (activityEvents.length > 100) activityEvents.pop();
            // Only re-render if current view is activity
            if (state.view === 'activity') renderActivity();
        }, 2000);
    }

    function typeColor(type) {
        return type === 'payroll' ? '#3b82f6' : type === 'attendance' ? '#10b981' : type === 'leave' ? '#f59e0b' : '#64748b';
    }
    function typeIcon(type) {
        return type === 'payroll' ? '$' : type === 'attendance' ? '✓' : type === 'leave' ? '📝' : '⚙';
    }

    // ═══════════════════════════════════════════════════════════
    // TOP EARNERS
    // ═══════════════════════════════════════════════════════════
    function renderEarners() {
        const { period } = state.earners;
        const podiumEl = document.getElementById('ea-podium');
        const tableWrap = document.getElementById('ea-table-wrap');
        const statsEl = document.getElementById('ea-stats');
        const drillEl = document.getElementById('ea-drill');
        clear(podiumEl);
        clear(tableWrap);
        clear(statsEl);
        clear(drillEl);
        drillEl.classList.remove('open');

        // Sort by gross (simulate period by scaling)
        const multiplier = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
        const ranked = [...EMPLOYEES].sort((a, b) => b.gross * multiplier - a.gross * multiplier);
        const top3 = ranked.slice(0, 3);
        const rest = ranked.slice(3);

        // Stats
        const totalComp = ranked.reduce((s, e) => s + e.gross * multiplier, 0);
        statsEl.innerHTML = `
            <div class="stat-item"><div class="stat-label">Total Comp (${period})</div><div class="stat-value accent">${fmtFull(totalComp)}</div></div>
            <div class="stat-item"><div class="stat-label">Top 1%</div><div class="stat-value">${fmtFull(top3[0].gross * multiplier)}</div></div>
            <div class="stat-item"><div class="stat-label">Median</div><div class="stat-value">${fmtFull(ranked[Math.floor(ranked.length / 2)].gross * multiplier)}</div></div>
            <div class="stat-item"><div class="stat-label">Headcount</div><div class="stat-value">${ranked.length}</div></div>
        `;

        // Podium
        top3.forEach((e, i) => {
            const place = el(`
                <div class="podium-place podium-${i + 1}">
                    <div class="podium-rank">${i + 1}</div>
                    <div class="podium-avatar">${e.name.split(' ').map(w => w[0]).join('')}</div>
                    <div class="podium-name">${e.name}</div>
                    <div class="podium-dept">${e.dept}</div>
                    <div class="podium-comp">${fmtFull(e.gross * multiplier)}</div>
                </div>
            `, podiumEl);
            place.style.cursor = 'pointer';
            place.addEventListener('click', () => openEarnerDrill(e, multiplier));
        });

        // Table
        const table = el(`
            <table class="earners-table">
                <thead>
                    <tr>
                        <th data-sort="rank">#</th>
                        <th data-sort="name">Employee</th>
                        <th data-sort="dept">Department</th>
                        <th data-sort="base" class="mono">Base Salary</th>
                        <th data-sort="gross" class="mono">Total Comp</th>
                        <th>Share</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `, tableWrap);
        const tbody = table.querySelector('tbody');

        rest.forEach((e, idx) => {
            const rank = idx + 4;
            const share = (e.gross * multiplier / totalComp) * 100;
            const tr = el(`
                <tr data-emp-id="${e.id}">
                    <td class="mono rank">${rank}</td>
                    <td class="name">${e.name}</td>
                    <td class="dept">${e.dept}</td>
                    <td class="mono">${fmtFull(e.base * multiplier)}</td>
                    <td class="mono">${fmtFull(e.gross * multiplier)}</td>
                    <td><div class="share-bar"><div class="share-fill" style="width:0%"></div></div></td>
                </tr>
            `, tbody);
            requestAnimationFrame(() => { tr.querySelector('.share-fill').style.width = share + '%'; });
            tr.addEventListener('click', () => openEarnerDrill(e, multiplier));
        });

        // Sortable headers
        table.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                const asc = th.dataset.order !== 'asc';
                th.dataset.order = asc ? 'asc' : 'desc';
                table.querySelectorAll('th[data-sort]').forEach(h => { if (h !== th) delete h.dataset.order; });
                sortEarnersTable(tbody, key, asc);
            });
        });

        // Period chips
        document.getElementById('ea-period-chips').addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            document.querySelectorAll('#ea-period-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.earners.period = chip.dataset.period;
            renderEarners();
        });

        function sortEarnersTable(tbody, key, asc) {
            const rows = Array.from(tbody.querySelectorAll('tr'));
            rows.sort((a, b) => {
                const aid = a.dataset.empId, bid = b.dataset.empId;
                const ea = EMPLOYEES.find(x => x.id === aid), eb = EMPLOYEES.find(x => x.id === bid);
                if (!ea || !eb) return 0;
                let va, vb;
                if (key === 'rank') { va = parseInt(a.querySelector('.rank').textContent); vb = parseInt(b.querySelector('.rank').textContent); }
                else if (key === 'name') { va = ea.name; vb = eb.name; }
                else if (key === 'dept') { va = ea.dept; vb = eb.dept; }
                else if (key === 'base') { va = ea.base; vb = eb.base; }
                else { va = ea.gross; vb = eb.gross; }
                if (va < vb) return asc ? -1 : 1;
                if (va > vb) return asc ? 1 : -1;
                return 0;
            });
            rows.forEach((r, i) => {
                r.querySelector('.rank').textContent = i + 4;
                tbody.appendChild(r);
            });
        }

        function openEarnerDrill(emp, multiplier) {
            const basic = emp.base * multiplier;
            const allow = emp.allowances * multiplier;
            const bonus = emp.bonus * multiplier;
            const gross = emp.gross * multiplier;
            const tax = emp.tax * multiplier;
            const net = gross - tax;

            drillEl.innerHTML = `
                <div class="drill-head">
                    <div class="drill-title">${emp.name} — Compensation Breakdown (${period.charAt(0).toUpperCase() + period.slice(1)})</div>
                    <button class="drill-close">Close</button>
                </div>
                <div class="comp-breakdown">
                    <div class="comp-chart" id="comp-chart"></div>
                    <div class="comp-summary">
                        <div class="comp-row"><span class="comp-label">Basic Salary</span><span class="comp-value">${fmtFull(basic)}</span></div>
                        <div class="comp-row"><span class="comp-label">Allowances</span><span class="comp-value">${fmtFull(allow)}</span></div>
                        <div class="comp-row"><span class="comp-label">Bonus</span><span class="comp-value">${fmtFull(bonus)}</span></div>
                        <div class="comp-row"><span class="comp-label">Gross Total</span><span class="comp-value">${fmtFull(gross)}</span></div>
                        <div class="comp-row comp-tax"><span class="comp-label">Tax Deduction</span><span class="comp-value">-${fmtFull(tax)}</span></div>
                        <div class="comp-row comp-net"><span class="comp-label">Net Take-Home</span><span class="comp-value">${fmtFull(net)}</span></div>
                    </div>
                </div>
            `;
            drillEl.classList.add('open');
            drillEl.querySelector('.drill-close').onclick = () => { drillEl.classList.remove('open'); };

            // Stacked bar chart
            drawStackedBar(document.getElementById('comp-chart'), [
                { label: 'Basic', value: basic, color: '#3b82f6' },
                { label: 'Allowances', value: allow, color: '#8b5cf6' },
                { label: 'Bonus', value: bonus, color: '#10b981' },
                { label: 'Tax', value: tax, color: '#ef4444' }
            ], gross);
        }
    }

    function drawStackedBar(container, segments, total) {
        if (!container) return;
        clear(container);
        const svgW = container.clientWidth || 300;
        const svgH = 200;
        const pad = 20;
        const chartW = svgW - 2 * pad;
        const chartH = svgH - 2 * pad;

        const svgRoot = svg('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: '100%', height: '100%' });
        const g = svg('g', { transform: `translate(${pad},${pad})` });

        let xCursor = 0;
        segments.forEach((seg, i) => {
            const w = (seg.value / total) * chartW;
            if (w > 1) {
                g.appendChild(svg('rect', { x: xCursor, y: chartH / 2 - 20, width: w, height: 40, fill: seg.color, rx: i === 0 ? 4 : 0, ry: i === 0 ? 4 : 0 }));
                if (w > 50) {
                    g.appendChild(svg('text', { x: xCursor + w / 2, y: chartH / 2 + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11, 'font-weight': 600 }, [document.createTextNode(seg.label)]));
                }
                xCursor += w;
            }
        });

        // Total label
        g.appendChild(svg('text', { x: chartW / 2, y: chartH / 2 - 30, 'text-anchor': 'middle', fill: 'var(--text-primary)', 'font-family': 'var(--font-mono)', 'font-size': 14, 'font-weight': 700 }, [document.createTextNode(fmtFull(total))]));
        g.appendChild(svg('text', { x: chartW / 2, y: chartH / 2 - 16, 'text-anchor': 'middle', fill: 'var(--text-muted)', 'font-size': 10 }, [document.createTextNode('Gross Total')]));

        svgRoot.appendChild(g);
        container.appendChild(svgRoot);
    }

    // ═══════════════════════════════════════════════════════════
    // EXCHANGE RATES
    // ═══════════════════════════════════════════════════════════
    let fxCountdown = 2;
    let fxCountdownTimer = null;

    function renderFX() {
        const { base } = state.fx;
        const tableWrap = document.getElementById('fx-table');
        const discRow = document.getElementById('disc-row');
        clear(tableWrap);
        discRow.style.display = 'none';
        clear(document.getElementById('fx-discount'));

        // Re-normalize rates to selected base
        const baseRate = base === 'USD' ? 1 : fxRates[base].rate;
        const rates = FX_CURRENCIES.map(c => {
            const usdRate = fxRates[c].rate;
            const rate = base === 'USD' ? usdRate : usdRate / baseRate;
            const hist = fxRates[c].history.map(h => ({ t: h.t, rate: base === 'USD' ? h.rate : h.rate / baseRate }));
            const change = hist.length > 1 ? (hist[hist.length - 1].rate - hist[0].rate) / hist[0].rate : 0;
            return { code: c, rate, change, history: hist };
        });

        // Add base currency row
        rates.unshift({ code: base, rate: 1, change: 0, history: fxRates[base]?.history.map(h => ({ t: h.t, rate: 1 })) || [] });

        // Table
        const table = el(`
            <table class="fx-table">
                <thead>
                    <tr>
                        <th>Currency</th>
                        <th class="mono">Rate (1 ${base})</th>
                        <th>24h Change</th>
                        <th>Trend</th>
                        <th>Sparkline</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `, tableWrap);
        const tbody = table.querySelector('tbody');

        rates.forEach((r, idx) => {
            const isBase = r.code === base;
            const tr = el(`
                <tr data-code="${r.code}" ${isBase ? 'style="opacity:0.6"' : ''}>
                    <td class="fx-code">${r.code}${isBase ? ' (base)' : ''}</td>
                    <td class="mono fx-rate">${r.rate.toFixed(r.code === 'JPY' || r.code === 'KRW' ? 2 : 4)}</td>
                    <td><span class="fx-change ${r.change >= 0 ? 'up' : 'down'}">${r.change >= 0 ? '▲' : '▼'} ${fmtPct(Math.abs(r.change))}</span></td>
                    <td><span class="fx-trend ${r.change >= 0 ? 'up' : 'down'}">${r.change >= 0 ? '▲' : '▼'}</span></td>
                    <td><svg class="fx-sparkline" viewBox="0 0 80 24" preserveAspectRatio="none"></svg></td>
                </tr>
            `, tbody);
            drawMiniSparkline(tr.querySelector('.fx-sparkline'), r.history, r.change >= 0 ? '#10b981' : '#ef4444');

            // Detail row
            const detailTr = el(`<tr class="fx-detail-row"><td colspan="5" class="fx-detail-cell"></td></tr>`, tbody);
            tr.addEventListener('click', () => openFXDetail(r, detailTr, base));
        });

        // Populate converter dropdowns
        const fromSel = document.getElementById('conv-from');
        const toSel = document.getElementById('conv-to');
        clear(fromSel); clear(toSel);
        rates.forEach(r => {
            el(`<option value="${r.code}">${r.code} ${r.code === base ? '(base)' : ''}</option>`, fromSel);
            el(`<option value="${r.code}">${r.code} ${r.code === base ? '(base)' : ''}</option>`, toSel);
        });
        fromSel.value = base;
        toSel.value = rates[1]?.code || 'EUR';

        // Base selector
        document.getElementById('fx-base').value = base;
        document.getElementById('fx-base').addEventListener('change', (e) => {
            state.fx.base = e.target.value;
            renderFX();
        });

        // Refresh button
        document.getElementById('fx-refresh').onclick = () => {
            jitterRates();
            renderFX();
        };

        // Converter
        document.getElementById('conv-swap').onclick = () => {
            const tmp = fromSel.value;
            fromSel.value = toSel.value;
            toSel.value = tmp;
            updateConverter();
        });
        [document.getElementById('conv-amount'), fromSel, toSel].forEach(el => el.addEventListener('input', updateConverter));
        updateConverter();

        // Countdown
        startFXCountdown();
    }

    function drawMiniSparkline(svgEl, history, color) {
        if (!history.length) return;
        const vals = history.map(h => h.rate);
        const min = Math.min(...vals), max = Math.max(...vals);
        const range = max - min || 1;
        const w = 80, h = 24, pad = 2;
        const points = vals.map((v, i) => {
            const x = pad + (i / (vals.length - 1 || 1)) * (w - 2 * pad);
            const y = h - pad - ((v - min) / range) * (h - 2 * pad);
            return `${x},${y}`;
        }).join(' ');
        svgEl.innerHTML = `<polyline fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" opacity="0.8"/>`;
    }

    function openFXDetail(rate, detailTr, base) {
        const isOpen = detailTr.classList.contains('open');
        // Close all others
        document.querySelectorAll('.fx-detail-row').forEach(tr => tr.classList.remove('open'));
        document.querySelectorAll('.fx-table tbody tr[data-code]').forEach(tr => tr.classList.remove('expanded-row'));
        if (isOpen) return;

        const tr = detailTr.previousElementSibling;
        tr.classList.add('expanded-row');
        detailTr.classList.add('open');

        const cell = detailTr.querySelector('.fx-detail-cell');
        cell.innerHTML = `
            <div class="fx-detail-inner">
                <div class="fx-detail-chart" id="fx-detail-chart-${rate.code}"></div>
                <div>
                    <div class="fx-conv-title">${rate.code} / ${base} — 24h Detail</div>
                    <div class="fx-conv-row">
                        <input type="number" class="search-input" id="det-amount" value="1000" min="0" step="1" style="width:80px">
                        <select class="sel" id="det-from" style="width:90px"><option value="${base}">${base}</option><option value="${rate.code}" selected>${rate.code}</option></select>
                        <button class="chip icon" id="det-swap" title="Swap">⇄</button>
                        <select class="sel" id="det-to" style="width:90px"><option value="${base}" selected>${base}</option><option value="${rate.code}">${rate.code}</option></select>
                    </div>
                    <div class="conv-result" id="det-result">—</div>
                    <div style="margin-top:1rem;font-size:0.75rem;color:var(--text-muted)">
                        <div>Current Rate: <span class="mono">${rate.rate.toFixed(6)}</span></div>
                        <div>24h High: <span class="mono">${Math.max(...rate.history.map(h => h.rate)).toFixed(6)}</span></div>
                        <div>24h Low: <span class="mono">${Math.min(...rate.history.map(h => h.rate)).toFixed(6)}</span></div>
                    </div>
                </div>
            </div>
        `;

        // Detail chart
        drawLineChart(document.getElementById(`fx-detail-chart-${rate.code}`), rate.history, rate.change >= 0 ? '#10b981' : '#ef4444');

        // Detail converter
        const detAmount = document.getElementById('det-amount');
        const detFrom = document.getElementById('det-from');
        const detTo = document.getElementById('det-to');
        const detResult = document.getElementById('det-result');
        const detSwap = document.getElementById('det-swap');
        const updateDet = () => {
            const amt = parseFloat(detAmount.value) || 0;
            const from = detFrom.value, to = detTo.value;
            let result;
            if (from === base && to === rate.code) result = amt * rate.rate;
            else if (from === rate.code && to === base) result = amt / rate.rate;
            else result = amt;
            detResult.textContent = fmtFull(result).replace('$', '') + ' ' + to;
        };
        [detAmount, detFrom, detTo].forEach(el => el.addEventListener('input', updateDet));
        detSwap.onclick = () => { const t = detFrom.value; detFrom.value = detTo.value; detTo.value = t; updateDet(); };
        updateDet();
    }

    function drawLineChart(container, history, color) {
        if (!container || !history.length) return;
        clear(container);
        const vals = history.map(h => h.rate);
        const min = Math.min(...vals), max = Math.max(...vals);
        const range = max - min || 1;
        const svgW = container.clientWidth || 300;
        const svgH = 180;
        const pad = 30;
        const chartW = svgW - 2 * pad;
        const chartH = svgH - 2 * pad;

        const svgRoot = svg('svg', { viewBox: `0 0 ${svgW} ${svgH}`, width: '100%', height: '100%' });
        const g = svg('g', { transform: `translate(${pad},${pad})` });

        // Area
        const areaPoints = vals.map((v, i) => {
            const x = (i / (vals.length - 1 || 1)) * chartW;
            const y = chartH - ((v - min) / range) * chartH;
            return `${x},${y}`;
        }).join(' ');
        const areaPath = `M0,${chartH} L${areaPoints} L${chartW},${chartH} Z`;
        g.appendChild(svg('path', { d: areaPath, fill: color, 'fill-opacity': 0.15 }));

        // Line
        const linePoints = vals.map((v, i) => {
            const x = (i / (vals.length - 1 || 1)) * chartW;
            const y = chartH - ((v - min) / range) * chartH;
            return `${x},${y}`;
        }).join(' ');
        g.appendChild(svg('polyline', { class: 'line-path', points: linePoints, stroke: color }));

        // Dots
        vals.forEach((v, i) => {
            const x = (i / (vals.length - 1 || 1)) * chartW;
            const y = chartH - ((v - min) / range) * chartH;
            g.appendChild(svg('circle', { class: 'line-dot', cx: x, cy: y, r: 3, fill: color }));
        });

        // Y axis labels
        g.appendChild(svg('text', { x: -10, y: 0, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--text-muted)', 'font-family': 'var(--font-mono)' }, [document.createTextNode(max.toFixed(4))]));
        g.appendChild(svg('text', { x: -10, y: chartH, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--text-muted)', 'font-family': 'var(--font-mono)' }, [document.createTextNode(min.toFixed(4))]));

        svgRoot.appendChild(g);
        container.appendChild(svgRoot);
    }

    function updateConverter() {
        const amt = parseFloat(document.getElementById('conv-amount').value) || 0;
        const from = document.getElementById('conv-from').value;
        const to = document.getElementById('conv-to').value;
        const base = state.fx.base;
        const baseRate = base === 'USD' ? 1 : fxRates[base].rate;
        const fromRate = from === base ? 1 : fxRates[from].rate / baseRate;
        const toRate = to === base ? 1 : fxRates[to].rate / baseRate;
        const result = amt * (fromRate / toRate);
        document.getElementById('conv-result').textContent = fmtFull(result).replace('$', '') + ' ' + to;
    }

    function jitterRates() {
        FX_CURRENCIES.forEach(c => {
            const r = fxRates[c];
            r.rate *= 1 + (rng() - 0.5) * 0.004;
            r.history.shift();
            r.history.push({ t: 0, rate: r.rate });
            r.history.forEach((h, i) => h.t = i);
        });
    }

    function startFXCountdown() {
        if (fxCountdownTimer) clearInterval(fxCountdownTimer);
        fxCountdown = 2;
        updateCountdown();
        fxCountdownTimer = setInterval(() => {
            fxCountdown--;
            if (fxCountdown <= 0) {
                fxCountdown = 2;
                jitterRates();
                if (state.view === 'fx') renderFX();
            }
            updateCountdown();
        }, 1000);
    }

    function updateCountdown() {
        const el = document.getElementById('fx-countdown');
        if (el) el.textContent = fxCountdown;
    }

    // ═══════════════════════════════════════════════════════════
    // GLOBAL CLOCK
    // ═══════════════════════════════════════════════════════════
    function updateClock() {
        document.getElementById('globalClock').textContent = nowStr();
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ═══════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════
    seedActivity();
    renderOverview();
    positionPill(document.querySelector('.toggle-btn.active'));

})();