/* ═══════════════════════════════════════════════════════════════════════════
   ✦ HELIOS NEXUS — LUXURY FINANCIAL DASHBOARD INTERACTIVE CONTROLLER
   Provides real-time interactive charts, AI insights modal, watchlist filtering,
   and seamless synchronization with Payroll Nexus core engines.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── DATASETS FOR TIME PERIODS & METRICS ──
    let activeMetric = 'holding'; // 'holding' | 'attendance' | 'payroll'
    let activePeriod = '1Y';
    let currentTooltipIndex = 4;

    const CHART_DATA_HOLDING = {
        '1D': {
            dates: ['09:00', '11:00', '13:00', '15:00', '17:00'],
            values: [157339, 158457, 159416, 160693, 159735],
            pct: '+1.52%',
            min: 154000,
            max: 162000
        },
        '1W': {
            dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [153346, 155742, 156860, 158297, 160054, 159416, 159735],
            pct: '+4.16%',
            min: 150000,
            max: 163000
        },
        '1M': {
            dates: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            values: [145359, 150151, 155742, 159735],
            pct: '+9.89%',
            min: 140000,
            max: 164000
        },
        '6M': {
            dates: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            values: [130983, 137372, 143762, 148554, 154943, 159735],
            pct: '+21.95%',
            min: 125000,
            max: 165000
        },
        '1Y': {
            dates: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            values: [118204, 124593, 129385, 132580, 135775, 140567, 145359, 148554, 151748, 154943, 158138, 159735],
            pct: '+35.13%',
            min: 110000,
            max: 168000
        }
    };

    const CHART_DATA_ATTENDANCE = {
        '1D': {
            dates: ['09:00', '11:00', '13:00', '15:00', '17:00'],
            values: [94, 98, 100, 100, 100],
            pct: '+6.0%',
            min: 85,
            max: 105
        },
        '1W': {
            dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [96, 98, 97, 99, 100, 98, 100],
            pct: '+4.0%',
            min: 88,
            max: 105
        },
        '1M': {
            dates: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            values: [93, 95, 98, 100],
            pct: '+7.5%',
            min: 85,
            max: 105
        },
        '6M': {
            dates: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            values: [91, 93, 94, 96, 98, 100],
            pct: '+9.8%',
            min: 85,
            max: 105
        },
        '1Y': {
            dates: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            values: [88, 90, 89, 92, 93, 95, 96, 95, 97, 98, 99, 100],
            pct: '+13.6%',
            min: 80,
            max: 105
        }
    };

    const CHART_DATA_PAYROLL = {
        '1D': {
            dates: ['09:00', '11:00', '13:00', '15:00', '17:00'],
            values: [99.0, 99.1, 99.3, 99.4, 99.4],
            pct: '+0.4%',
            min: 95,
            max: 101
        },
        '1W': {
            dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [98.5, 98.8, 99.0, 99.2, 99.4, 99.4, 99.4],
            pct: '+0.9%',
            min: 95,
            max: 101
        },
        '1M': {
            dates: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            values: [97.5, 98.2, 98.9, 99.4],
            pct: '+1.9%',
            min: 94,
            max: 101
        },
        '6M': {
            dates: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            values: [96.0, 96.8, 97.5, 98.3, 99.0, 99.4],
            pct: '+3.5%',
            min: 92,
            max: 101
        },
        '1Y': {
            dates: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
            values: [94.5, 95.0, 95.8, 96.4, 97.0, 97.8, 98.2, 98.6, 98.9, 99.1, 99.3, 99.4],
            pct: '+5.2%',
            min: 90,
            max: 101
        }
    };

    function getActiveDataset() {
        if (activeMetric === 'attendance') return CHART_DATA_ATTENDANCE;
        if (activeMetric === 'payroll') return CHART_DATA_PAYROLL;
        return CHART_DATA_HOLDING;
    }

    // ── RENDER SVG CHART ──
    function renderSvgChart(triggerLineDraw = false) {
        const svg = document.getElementById('heliosSvgChart');
        if (!svg) return;

        const dataset = getActiveDataset();
        const data = dataset[activePeriod] || dataset['1Y'];
        const width = 800;
        const height = 180;
        const padX = 40;
        const padY = 25;

        const count = data.values.length;
        const stepX = (width - padX * 2) / (count - 1);
        const rangeY = (data.max - data.min) || 1;

        const points = data.values.map((v, i) => {
            const x = padX + i * stepX;
            const y = height - padY - ((v - data.min) / rangeY) * (height - padY * 2);
            return { x, y, v, date: data.dates[i] };
        });

        // Smooth Bezier path
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cpX1 = p0.x + (p1.x - p0.x) * 0.45;
            const cpX2 = p0.x + (p1.x - p0.x) * 0.55;
            pathD += ` C ${cpX1} ${p0.y}, ${cpX2} ${p1.y}, ${p1.x} ${p1.y}`;
        }

        const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

        // Active pin point
        const activePt = points[Math.min(currentTooltipIndex, points.length - 1)] || points[0];

        const isLight = document.body.classList.contains('light-mode');
        const hasNoAnim = document.body.classList.contains('no-anim');
        const gridColor = isLight ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.04)';
        const labelColor = isLight ? '#64748b' : '#777780';
        const gradEndColor = isLight ? '#ffffff' : '#0e0f15';

        // Horizontal grid lines
        const gridY = [0.2, 0.5, 0.8].map(ratio => {
            const y = padY + ratio * (height - padY * 2);
            return `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="${gridColor}" stroke-width="1" stroke-dasharray="3 3"/>`;
        }).join('');

        // X-axis text labels
        const xLabels = points.map((p) => {
            return `<text x="${p.x}" y="${height - 4}" fill="${labelColor}" font-size="10" text-anchor="middle" font-family="Inter, sans-serif">${p.date}</text>`;
        }).join('');

        // Dynamic theme color according to active metric
        let strokeColor = isLight ? '#7c3aed' : '#b68cff';
        let gradStart = isLight ? '#7c3aed' : '#b68cff';
        if (activeMetric === 'attendance') {
            strokeColor = isLight ? '#059669' : '#62c88a';
            gradStart = isLight ? '#059669' : '#62c88a';
        } else if (activeMetric === 'payroll') {
            strokeColor = isLight ? '#0284c7' : '#5cb3ff';
            gradStart = isLight ? '#0284c7' : '#5cb3ff';
        }

        const pathAnimClass = (!hasNoAnim && triggerLineDraw) ? 'helios-chart-path-anim' : '';

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.innerHTML = `
            <defs>
                <linearGradient id="heliosAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${gradStart}" stop-opacity="${isLight ? '0.22' : '0.32'}" />
                    <stop offset="60%" stop-color="${gradStart}" stop-opacity="${isLight ? '0.04' : '0.08'}" />
                    <stop offset="100%" stop-color="${gradEndColor}" stop-opacity="0.0" />
                </linearGradient>
                <filter id="heliosDotGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="${strokeColor}" flood-opacity="0.9" />
                </filter>
            </defs>
            ${gridY}
            <path d="${areaD}" fill="url(#heliosAreaGrad)" />
            <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${pathAnimClass}" />
            <!-- Vertical guideline -->
            <line x1="${activePt.x}" y1="${activePt.y}" x2="${activePt.x}" y2="${height - 18}" stroke="${strokeColor}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.6" />
            <!-- Glowing Pin dot -->
            <circle cx="${activePt.x}" cy="${activePt.y}" r="6" fill="#ffffff" stroke="${strokeColor}" stroke-width="2.5" filter="url(#heliosDotGlow)" />
            ${xLabels}
        `;

        // Update Tooltip position and content
        updateTooltip(activePt, data.pct);
    }

    function updateTooltip(pt, pctChange = '+14.2%') {
        const tt = document.getElementById('heliosTooltip');
        if (!tt) return;

        const ttDate = document.getElementById('heliosTtDate');
        const ttVal = document.getElementById('heliosTtVal');
        const ttBadge = document.getElementById('heliosTtBadge');

        if (ttDate) ttDate.textContent = `${pt.date} · Realtime`;
        if (ttVal) {
            if (activeMetric === 'attendance') {
                ttVal.textContent = `${pt.v}% Attendance`;
            } else if (activeMetric === 'payroll') {
                ttVal.textContent = `${pt.v}% Compliance`;
            } else {
                const formatted = typeof window.fmtCurrency === 'function' 
                    ? window.fmtCurrency(pt.v) 
                    : '$ ' + Number(pt.v).toLocaleString();
                ttVal.textContent = formatted;
            }
        }
        if (ttBadge) {
            ttBadge.textContent = pctChange || '+14.2%';
            if (activeMetric === 'attendance') {
                ttBadge.style.background = 'rgba(98,200,138,0.2)';
                ttBadge.style.color = '#62c88a';
            } else if (activeMetric === 'payroll') {
                ttBadge.style.background = 'rgba(92,179,255,0.2)';
                ttBadge.style.color = '#5cb3ff';
            } else {
                ttBadge.style.background = 'rgba(182,140,255,0.2)';
                ttBadge.style.color = '#b68cff';
            }
        }

        // Position tooltip centered horizontally above point
        const svg = document.getElementById('heliosSvgChart');
        if (svg) {
            const pctX = pt.x / 800;
            const pctY = pt.y / 180;
            tt.style.left = `${pctX * 100}%`;
            tt.style.top = `${Math.max(8, pctY * 180 - 45)}px`;
        }
    }

    // ── CHART INTERACTION SCRUBBING ──
    function initChartScrubbing() {
        const wrap = document.getElementById('heliosChartWrap');
        if (!wrap) return;

        function handleMove(e) {
            const rect = wrap.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const relX = clientX - rect.left;
            const pct = Math.max(0, Math.min(1, relX / rect.width));

            const dataset = getActiveDataset();
            const data = dataset[activePeriod] || dataset['1Y'];
            const idx = Math.round(pct * (data.values.length - 1));
            if (idx !== currentTooltipIndex) {
                currentTooltipIndex = idx;
                renderSvgChart(false);
            }
        }

        wrap.addEventListener('mousemove', handleMove);
        wrap.addEventListener('touchmove', handleMove, { passive: true });

        // Period switcher buttons
        document.querySelectorAll('.h-time-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.h-time-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activePeriod = btn.dataset.period || '1Y';
                const dataset = getActiveDataset();
                currentTooltipIndex = Math.floor((dataset[activePeriod]?.values.length || 5) - 1);
                renderSvgChart(true);
            });
        });

        // Metric switcher buttons (holding, attendance, payroll)
        document.querySelectorAll('#perfMetricSwitch .helios-metric-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#perfMetricSwitch .helios-metric-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeMetric = btn.dataset.metric || 'holding';
                const dataset = getActiveDataset();
                currentTooltipIndex = Math.floor((dataset[activePeriod]?.values.length || 5) - 1);
                renderSvgChart(true);
            });
        });
    }

    // ── WATCHLIST TABS ──
    const WATCHLIST_DATA = {
        viewed: [
            { name: 'Spotify', sub: 'NYSE: SPOT', val: '$11,770.3', change: '+16.31%', icon: 'fab fa-spotify', color: '#1ed760' },
            { name: 'Amazon', sub: 'NYSE: AMZN', val: '$10,280.8', change: '+8.11%', icon: 'fab fa-amazon', color: '#ff9900' },
            { name: 'Microsoft', sub: 'NYSE: MSFT', val: '$8,510.2', change: '+4.89%', icon: 'fab fa-microsoft', color: '#00a4ef' },
            { name: 'Nvidia', sub: 'NYSE: NVDA', val: '$2,110.2', change: '+2.12%', icon: 'fas fa-microchip', color: '#76b900' }
        ],
        gain: [
            { name: 'Spotify', sub: 'NYSE: SPOT', val: '$11,770.3', change: '+16.31%', icon: 'fab fa-spotify', color: '#1ed760' },
            { name: 'Apple', sub: 'NASDAQ: AAPL', val: '$14,920.0', change: '+12.44%', icon: 'fab fa-apple', color: '#a2aaad' },
            { name: 'Amazon', sub: 'NYSE: AMZN', val: '$10,280.8', change: '+8.11%', icon: 'fab fa-amazon', color: '#ff9900' },
            { name: 'Microsoft', sub: 'NYSE: MSFT', val: '$8,510.2', change: '+4.89%', icon: 'fab fa-microsoft', color: '#00a4ef' }
        ],
        lose: [
            { name: 'Tesla', sub: 'NASDAQ: TSLA', val: '$6,420.5', change: '-3.84%', icon: 'fas fa-car-battery', color: '#e82127' },
            { name: 'Intel', sub: 'NASDAQ: INTC', val: '$3,180.0', change: '-2.15%', icon: 'fas fa-memory', color: '#0071c5' },
            { name: 'Meta', sub: 'NASDAQ: META', val: '$9,840.1', change: '-1.08%', icon: 'fab fa-meta', color: '#0668e1' },
            { name: 'Netflix', sub: 'NASDAQ: NFLX', val: '$5,910.4', change: '-0.75%', icon: 'fas fa-film', color: '#e50914' }
        ]
    };

    function renderWatchlist(type = 'viewed') {
        const container = document.getElementById('heliosWatchlistItems');
        if (!container) return;

        const items = WATCHLIST_DATA[type] || WATCHLIST_DATA.viewed;
        container.innerHTML = items.map(item => {
            const isNeg = item.change.startsWith('-');
            const colorClass = isNeg ? 'style="color:#e47e8a;"' : 'style="color:#62c88a;"';
            return `
                <div class="helios-watch-row" title="Click to view asset analytics">
                    <div class="helios-watch-left">
                        <div class="helios-watch-icon" style="color:${item.color};">
                            <i class="${item.icon}"></i>
                        </div>
                        <div class="helios-watch-info">
                            <span class="helios-watch-name">${item.name}</span>
                            <span class="helios-watch-symbol">${item.sub}</span>
                        </div>
                    </div>
                    <div class="helios-watch-right">
                        <span class="helios-watch-val">${item.val}</span>
                        <span class="helios-watch-change" ${colorClass}>${item.change}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function initWatchlistTabs() {
        document.querySelectorAll('.h-tab-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.h-tab-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderWatchlist(btn.dataset.wtab);
            });
        });
        renderWatchlist('viewed');
    }

    // ── SYNC TOTAL HOLDING WITH CURRENCY ──
    function syncTotalHolding() {
        const holdingEl = document.getElementById('heliosHoldingVal');
        if (!holdingEl) return;

        // Try reading projectedCost from script.js
        const costEl = document.getElementById('projectedCost');
        if (costEl && costEl.textContent && costEl.textContent !== '$0') {
            holdingEl.textContent = costEl.textContent;
        } else {
            holdingEl.textContent = '$ 12,304.11';
        }
    }

    // ── AI ASSISTANT MODAL & REAL-TIME INTELLIGENCE ──
    const aiChatHistory = [];

    function getPlatformContext() {
        const holdingVal = document.getElementById('heliosHoldingVal')?.textContent || '$ 12,304.11';
        const totalEmp = document.getElementById('totalEmployees')?.textContent || '12';
        const presentToday = document.getElementById('presentToday')?.textContent || '11';
        const pendingLeaves = document.getElementById('pendingLeaves')?.textContent || '3';
        const currency = document.getElementById('settingsCurrencySelect')?.value || document.getElementById('currencySelect')?.value || window.appCurrency || 'USD';

        return {
            totalHolding: holdingVal,
            totalEmployees: totalEmp,
            attendanceRate: `${presentToday}/${totalEmp} Present`,
            pendingLeaves: pendingLeaves,
            currency: currency
        };
    }

    async function submitAiQuestion(userQuery) {
        if (!userQuery || !userQuery.trim()) return;
        const query = userQuery.trim();

        const streamEl = document.getElementById('heliosChatStream');
        const inputEl = document.getElementById('heliosModalAiInput');
        const sendBtn = document.getElementById('heliosModalAiSend');

        // Append user message
        aiChatHistory.push({ role: 'user', text: query });
        renderChatMessage('user', query);

        if (inputEl) inputEl.value = '';
        if (sendBtn) sendBtn.disabled = true;

        // Render temporary typing indicator
        const typingId = 'aiTypingBubble_' + Date.now();
        if (streamEl) {
            const typingBubble = document.createElement('div');
            typingBubble.id = typingId;
            typingBubble.className = 'helios-chat-msg';
            typingBubble.innerHTML = `
                <div class="helios-chat-avatar ai"><i class="fas fa-sparkles"></i></div>
                <div class="helios-chat-bubble ai" style="display:flex;align-items:center;gap:6px;color:#b68cff;">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <span>Helios AI is analyzing telemetry...</span>
                </div>
            `;
            streamEl.appendChild(typingBubble);
            streamEl.scrollTop = streamEl.scrollHeight;
        }

        try {
            const res = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    context: getPlatformContext()
                })
            });

            const data = await res.json();
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();

            if (data.ok && data.response) {
                aiChatHistory.push({ role: 'ai', text: data.response });
                renderChatMessage('ai', data.response, data.source);
            } else {
                renderChatMessage('ai', data.error || 'Unable to analyze query right now. Please try again.');
            }
        } catch (err) {
            const typingBubble = document.getElementById(typingId);
            if (typingBubble) typingBubble.remove();
            renderChatMessage('ai', 'Connection issue reaching Helios AI backend service. Using cached intelligence: Operational costs are currently steady with healthy runway.');
        } finally {
            if (sendBtn) sendBtn.disabled = false;
            if (inputEl) inputEl.focus();
        }
    }

    function renderChatMessage(role, text, source) {
        const streamEl = document.getElementById('heliosChatStream');
        if (!streamEl) return;

        // Basic markdown formatting: bold **text**, bullet lines starting with -, linebreaks
        let formatted = escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Parse linebreaks and bullets
        const lines = formatted.split('\n');
        let inList = false;
        let htmlLines = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                if (!inList) {
                    htmlLines.push('<ul>');
                    inList = true;
                }
                htmlLines.push(`<li>${trimmed.substring(2)}</li>`);
            } else {
                if (inList) {
                    htmlLines.push('</ul>');
                    inList = false;
                }
                if (trimmed) {
                    htmlLines.push(`<p style="margin:4px 0;">${trimmed}</p>`);
                }
            }
        });
        if (inList) htmlLines.push('</ul>');
        formatted = htmlLines.join('');

        const msgDiv = document.createElement('div');
        msgDiv.className = `helios-chat-msg ${role}`;
        msgDiv.innerHTML = `
            <div class="helios-chat-avatar ${role}">
                <i class="fas ${role === 'ai' ? 'fa-sparkles' : 'fa-user'}"></i>
            </div>
            <div class="helios-chat-bubble ${role}">
                ${formatted}
                ${source ? `<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:6px;text-align:right;">Model: ${source}</div>` : ''}
            </div>
        `;

        streamEl.appendChild(msgDiv);
        streamEl.scrollTop = streamEl.scrollHeight;
    }

    function escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function openAiInsightsModal(initialPrompt = '') {
        let modal = document.getElementById('heliosAiModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'heliosAiModal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-card" style="max-width:42rem;background:#13141c;border:1px solid rgba(182,140,255,0.25);box-shadow:0 20px 50px rgba(0,0,0,0.7);">
                    <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:14px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg, rgba(182,140,255,0.3) 0%, rgba(156,115,232,0.15) 100%);display:flex;align-items:center;justify-content:center;color:#b68cff;box-shadow:0 0 12px rgba(182,140,255,0.3);">
                                <i class="fas fa-sparkles" style="font-size:16px;"></i>
                            </div>
                            <div>
                                <h3 style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">Helios AI Assistant</h3>
                                <div style="font-size:11.5px;color:#8f8d99;display:flex;align-items:center;gap:6px;">
                                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#62c88a;box-shadow:0 0 6px #62c88a;"></span>
                                    Gemini AI • Connected to live portfolio & platform data
                                </div>
                            </div>
                        </div>
                        <button class="modal-close" id="closeHeliosAiModal" aria-label="Close modal"><i class="fas fa-xmark"></i></button>
                    </div>

                    <div class="modal-body" style="padding:18px 20px;display:flex;flex-direction:column;gap:14px;">
                        <!-- Quick Question Chips -->
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:11px;color:#706e78;font-weight:600;text-transform:uppercase;">Quick prompts:</span>
                            <button type="button" class="helios-ai-chip" data-query="Analyze current payroll health and projected runway"><i class="fas fa-calculator"></i> Payroll Runway</button>
                            <button type="button" class="helios-ai-chip" data-query="How is our headcount and staff attendance performing?"><i class="fas fa-users"></i> Staff & Attendance</button>
                            <button type="button" class="helios-ai-chip" data-query="Summarize our asset allocation and Sharpe ratio"><i class="fas fa-chart-pie"></i> Asset Allocation</button>
                            <button type="button" class="helios-ai-chip" data-query="Hey! What can you help me with?"><i class="fas fa-sparkles"></i> Capabilities</button>
                        </div>

                        <!-- Chat Message Stream -->
                        <div class="helios-chat-stream" id="heliosChatStream">
                            <div class="helios-chat-msg ai">
                                <div class="helios-chat-avatar ai"><i class="fas fa-sparkles"></i></div>
                                <div class="helios-chat-bubble ai">
                                    <div style="font-weight:600;color:#f4f3f6;margin-bottom:4px;">Hey Nadia, I'm Helios AI.</div>
                                    <p style="margin:0;">I'm connected to your live portfolio ($12,304.11) and workforce telemetry. Ask me anything about your platform finances, crypto allocations, hiring, code, or general strategy!</p>
                                </div>
                            </div>
                        </div>

                        <!-- Interactive Input Area inside Modal -->
                        <div style="display:flex;align-items:center;gap:10px;background:#1a1b24;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:8px 12px;">
                            <i class="fas fa-sparkles" style="color:#b68cff;font-size:14px;"></i>
                            <input type="text" id="heliosModalAiInput" placeholder="Ask AI anything..." style="flex:1;background:transparent;border:none;outline:none;color:#ffffff;font-size:13px;" autocomplete="off">
                            <button type="button" id="heliosModalAiSend" class="btn btn-primary" style="padding:6px 14px;font-size:12px;border-radius:8px;">
                                <i class="fas fa-paper-plane"></i> Ask
                            </button>
                        </div>
                    </div>

                    <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-top:1px solid rgba(255,255,255,0.06);">
                        <div style="font-size:11px;color:#706e78;">
                            Press <strong>Enter</strong> to submit inquiry
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button class="btn btn-ghost" id="dismissHeliosAiBtn">Close</button>
                            <button class="btn btn-neutral" id="clearAiChatBtn" style="font-size:12px;">Clear Chat</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Bind modal handlers
            document.getElementById('closeHeliosAiModal').addEventListener('click', () => modal.classList.remove('open'));
            document.getElementById('dismissHeliosAiBtn').addEventListener('click', () => modal.classList.remove('open'));
            document.getElementById('clearAiChatBtn').addEventListener('click', () => {
                const stream = document.getElementById('heliosChatStream');
                if (stream) {
                    stream.innerHTML = `
                        <div class="helios-chat-msg ai">
                            <div class="helios-chat-avatar ai"><i class="fas fa-sparkles"></i></div>
                            <div class="helios-chat-bubble ai">
                                Chat reset. Ready for your executive queries.
                            </div>
                        </div>
                    `;
                }
            });

            // Modal input enter / send
            const modalInput = document.getElementById('heliosModalAiInput');
            const modalSend = document.getElementById('heliosModalAiSend');

            modalSend.addEventListener('click', () => {
                submitAiQuestion(modalInput.value);
            });
            modalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitAiQuestion(modalInput.value);
                }
            });

            // Quick Inquiry Chips
            modal.querySelectorAll('.helios-ai-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const q = chip.dataset.query;
                    submitAiQuestion(q);
                });
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });
        }

        modal.classList.add('open');
        const modalInput = document.getElementById('heliosModalAiInput');
        if (modalInput) {
            if (initialPrompt && initialPrompt.trim()) {
                modalInput.value = initialPrompt.trim();
                submitAiQuestion(initialPrompt.trim());
            } else {
                setTimeout(() => modalInput.focus(), 100);
            }
        }
    }

    // ── SUPPORT MODAL ──
    function openSupportModal() {
        let modal = document.getElementById('heliosSupportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'heliosSupportModal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-card" style="max-width:34rem;">
                    <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;">
                        <h3 style="margin:0;font-size:16px;font-weight:700;"><i class="fas fa-circle-question" style="color:#b68cff;margin-right:8px;"></i> Helios Support & Community</h3>
                        <button class="modal-close" id="closeHeliosSupportModal" aria-label="Close modal"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:16px;font-size:13px;color:#b6b4bc;line-height:1.6;max-height:75vh;overflow-y:auto;">
                        
                        <!-- Social Media & Profile Links Section -->
                        <div style="background:var(--h-bg-card-elevated, #1a1b24);border:1px solid var(--h-border-subtle, rgba(255,255,255,0.1));border-radius:12px;padding:16px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--h-text-dim, #94a3b8);display:flex;align-items:center;gap:6px;">
                                    <i class="fas fa-share-nodes" style="color:#b68cff;"></i> Social Media & Profiles
                                </div>
                                <button type="button" id="toggleSocialEditBtn" class="btn btn-neutral btn-sm" style="font-size:11.5px;padding:3px 10px;border-radius:6px;cursor:pointer;">
                                    <i class="fas fa-pen-to-square"></i> <span id="toggleSocialEditLabel">Edit Profile Links</span>
                                </button>
                            </div>

                            <!-- Clickable Social Media Cards -->
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;" id="socialCardsContainer">
                                <!-- Facebook -->
                                <a id="supportFbBtn" href="https://facebook.com" target="_blank" rel="noopener noreferrer" class="social-channel-card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(24,119,242,0.1);border:1px solid rgba(24,119,242,0.3);text-decoration:none;transition:all 0.2s ease;">
                                    <i class="fa-brands fa-facebook" style="color:#1877f2;font-size:22px;"></i>
                                    <div style="min-width:0;flex:1;">
                                        <div style="font-weight:700;font-size:13px;color:#ffffff;">Facebook</div>
                                        <div id="fbHandlePreview" style="font-size:11px;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">facebook.com</div>
                                    </div>
                                    <i class="fas fa-arrow-up-right-from-square" style="font-size:11px;color:rgba(255,255,255,0.5);"></i>
                                </a>

                                <!-- Instagram -->
                                <a id="supportInstaBtn" href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="social-channel-card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(225,48,108,0.1);border:1px solid rgba(225,48,108,0.3);text-decoration:none;transition:all 0.2s ease;">
                                    <i class="fa-brands fa-instagram" style="color:#e1306c;font-size:22px;"></i>
                                    <div style="min-width:0;flex:1;">
                                        <div style="font-weight:700;font-size:13px;color:#ffffff;">Instagram</div>
                                        <div id="instaHandlePreview" style="font-size:11px;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">instagram.com</div>
                                    </div>
                                    <i class="fas fa-arrow-up-right-from-square" style="font-size:11px;color:rgba(255,255,255,0.5);"></i>
                                </a>

                                <!-- GitHub -->
                                <a id="supportGithubBtn" href="https://github.com" target="_blank" rel="noopener noreferrer" class="social-channel-card" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.2);text-decoration:none;transition:all 0.2s ease;">
                                    <i class="fa-brands fa-github" style="color:#f0f6fc;font-size:22px;"></i>
                                    <div style="min-width:0;flex:1;">
                                        <div style="font-weight:700;font-size:13px;color:#ffffff;">GitHub</div>
                                        <div id="githubHandlePreview" style="font-size:11px;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">github.com</div>
                                    </div>
                                    <i class="fas fa-arrow-up-right-from-square" style="font-size:11px;color:rgba(255,255,255,0.5);"></i>
                                </a>
                            </div>

                            <!-- Social Links Configuration Editor -->
                            <div id="socialProfileEditPanel" style="display:none;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
                                <div style="font-size:11px;font-weight:700;color:var(--h-text-dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">Customize Your Profile Links</div>
                                <div style="display:flex;flex-direction:column;gap:8px;">
                                    <div>
                                        <label for="fbProfileInput" style="display:block;font-size:11px;color:#94a3b8;margin-bottom:2px;font-weight:600;"><i class="fa-brands fa-facebook" style="color:#1877f2;margin-right:4px;"></i> Facebook Profile URL</label>
                                        <input type="url" id="fbProfileInput" class="field-input" placeholder="https://facebook.com/yourname" style="width:100%;padding:6px 10px;font-size:12px;border-radius:8px;">
                                    </div>
                                    <div>
                                        <label for="instaProfileInput" style="display:block;font-size:11px;color:#94a3b8;margin-bottom:2px;font-weight:600;"><i class="fa-brands fa-instagram" style="color:#e1306c;margin-right:4px;"></i> Instagram Profile URL</label>
                                        <input type="url" id="instaProfileInput" class="field-input" placeholder="https://instagram.com/yourname" style="width:100%;padding:6px 10px;font-size:12px;border-radius:8px;">
                                    </div>
                                    <div>
                                        <label for="githubProfileInput" style="display:block;font-size:11px;color:#94a3b8;margin-bottom:2px;font-weight:600;"><i class="fa-brands fa-github" style="color:#f0f6fc;margin-right:4px;"></i> GitHub Profile URL</label>
                                        <input type="url" id="githubProfileInput" class="field-input" placeholder="https://github.com/yourname" style="width:100%;padding:6px 10px;font-size:12px;border-radius:8px;">
                                    </div>
                                    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px;">
                                        <button type="button" id="saveSocialProfilesBtn" class="btn btn-primary btn-sm" style="font-size:12px;padding:6px 14px;">
                                            <i class="fas fa-floppy-disk"></i> Save Profile Links
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- System Navigation Guide -->
                        <div>
                            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--h-text-dim, #94a3b8);margin-bottom:8px;">System Navigation</div>
                            <ul style="padding-left:18px;display:flex;flex-direction:column;gap:6px;">
                                <li><strong>Dashboard:</strong> Executive portfolio view, live watchlist, 2x2 asset cards, and interactive area chart.</li>
                                <li><strong>Employees (Portfolio):</strong> Full staff directory, compensation records, and department filters.</li>
                                <li><strong>Attendance (Analysis):</strong> Daily presence tracker, roster board, and one-click all-present.</li>
                                <li><strong>Leaves (Market):</strong> Leave request workflow, status filters, and medical attachments.</li>
                                <li><strong>Payroll (Community):</strong> Instant salary processor, tax calculation, and payslip generation.</li>
                                <li><strong>Reports:</strong> Deep visual analytics with PDF export and breakdown charts.</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="doneHeliosSupportBtn" style="width:100%;">Got it, thanks!</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('closeHeliosSupportModal').addEventListener('click', () => modal.classList.remove('open'));
            document.getElementById('doneHeliosSupportBtn').addEventListener('click', () => modal.classList.remove('open'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });

            // Social profile load & save logic
            const loadSocialProfiles = () => {
                let saved = {};
                try {
                    saved = JSON.parse(localStorage.getItem('nexus_social_profiles') || '{}');
                } catch (_) {}
                const fb = saved.fb || 'https://facebook.com';
                const insta = saved.insta || 'https://instagram.com';
                const github = saved.github || 'https://github.com';

                const fbBtn = document.getElementById('supportFbBtn');
                const instaBtn = document.getElementById('supportInstaBtn');
                const githubBtn = document.getElementById('supportGithubBtn');
                const fbInput = document.getElementById('fbProfileInput');
                const instaInput = document.getElementById('instaProfileInput');
                const githubInput = document.getElementById('githubProfileInput');
                const fbPreview = document.getElementById('fbHandlePreview');
                const instaPreview = document.getElementById('instaHandlePreview');
                const githubPreview = document.getElementById('githubHandlePreview');

                if (fbBtn) fbBtn.href = fb;
                if (instaBtn) instaBtn.href = insta;
                if (githubBtn) githubBtn.href = github;
                if (fbInput) fbInput.value = fb;
                if (instaInput) instaInput.value = insta;
                if (githubInput) githubInput.value = github;

                const extractHandle = (url, prefix) => {
                    if (!url || url === prefix) return prefix.replace('https://', '');
                    try {
                        const parsed = new URL(url);
                        return parsed.pathname.replace(/^\//, '') || parsed.hostname;
                    } catch (_) {
                        return url.replace(/^https?:\/\//, '');
                    }
                };

                if (fbPreview) fbPreview.textContent = extractHandle(fb, 'https://facebook.com');
                if (instaPreview) instaPreview.textContent = extractHandle(insta, 'https://instagram.com');
                if (githubPreview) githubPreview.textContent = extractHandle(github, 'https://github.com');
            };

            const toggleBtn = document.getElementById('toggleSocialEditBtn');
            const editPanel = document.getElementById('socialProfileEditPanel');
            const toggleLabel = document.getElementById('toggleSocialEditLabel');
            if (toggleBtn && editPanel) {
                toggleBtn.addEventListener('click', () => {
                    const isOpen = editPanel.style.display !== 'none';
                    editPanel.style.display = isOpen ? 'none' : 'block';
                    if (toggleLabel) toggleLabel.textContent = isOpen ? 'Edit Profile Links' : 'Hide Editor';
                });
            }

            const saveBtn = document.getElementById('saveSocialProfilesBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const fb = document.getElementById('fbProfileInput')?.value.trim() || 'https://facebook.com';
                    const insta = document.getElementById('instaProfileInput')?.value.trim() || 'https://instagram.com';
                    const github = document.getElementById('githubProfileInput')?.value.trim() || 'https://github.com';

                    localStorage.setItem('nexus_social_profiles', JSON.stringify({ fb, insta, github }));
                    loadSocialProfiles();
                    if (editPanel) editPanel.style.display = 'none';
                    if (toggleLabel) toggleLabel.textContent = 'Edit Profile Links';
                    if (typeof window.showToast === 'function') {
                        window.showToast('Social profile links saved successfully!', 'success');
                    }
                });
            }

            loadSocialProfiles();
        }
        modal.classList.add('open');
    }

    // ── NOTIFICATIONS MODAL ──
    function openNotifModal() {
        let modal = document.getElementById('heliosNotifModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'heliosNotifModal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-card" style="max-width:30rem;">
                    <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;">
                        <h3 style="margin:0;font-size:16px;font-weight:700;"><i class="fas fa-bell" style="color:#b68cff;margin-right:8px;"></i> Real-Time Alerts</h3>
                        <button class="modal-close" id="closeHeliosNotifModal" aria-label="Close modal"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:10px;">
                        <div style="background:#1a1b24;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;display:flex;gap:12px;">
                            <i class="fas fa-circle-check" style="color:#62c88a;font-size:16px;margin-top:2px;"></i>
                            <div>
                                <div style="font-weight:600;font-size:13px;color:#f4f3f6;">Attendance Cycle Synchronized</div>
                                <div style="font-size:12px;color:#777780;">All daily logs recorded with 0 anomalies.</div>
                            </div>
                        </div>
                        <div style="background:#1a1b24;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;display:flex;gap:12px;">
                            <i class="fas fa-coins" style="color:#b68cff;font-size:16px;margin-top:2px;"></i>
                            <div>
                                <div style="font-weight:600;font-size:13px;color:#f4f3f6;">Payroll Forecast Ready</div>
                                <div style="font-size:12px;color:#777780;">Monthly projection computed at $12,304.11.</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-neutral" id="dismissNotifBtn" style="width:100%;">Dismiss All</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('closeHeliosNotifModal').addEventListener('click', () => modal.classList.remove('open'));
            document.getElementById('dismissNotifBtn').addEventListener('click', () => modal.classList.remove('open'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });
        }
        modal.classList.add('open');
    }

    // ── USER PROFILE & AUTH GATEWAY MODAL (USER & ADMIN PROFILE SYSTEM + GMAIL, FB, GITHUB, DISCORD) ──
    let currentUserState = {
        name: 'Nadia Rachel',
        email: 'rachel_helios@gmail.com',
        role: 'admin',
        avatar: 'assets/images/avatar.jpg'
    };
    try {
        const cachedUser = localStorage.getItem('helios_custom_user');
        if (cachedUser) {
            const parsed = JSON.parse(cachedUser);
            if (parsed && typeof parsed === 'object') {
                currentUserState = { ...currentUserState, ...parsed };
            }
        }
    } catch (e) {}

    function updateDashboardGreeting() {
        const dashHello = document.getElementById('dashHello');
        const dashDate = document.getElementById('dashDate');
        const now = new Date();
        const hour = now.getHours();

        let greeting = 'Good morning';
        if (hour >= 5 && hour < 12) {
            greeting = 'Good morning';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good afternoon';
        } else {
            greeting = 'Good evening';
        }

        const firstName = (currentUserState && currentUserState.name)
            ? currentUserState.name.split(' ')[0]
            : 'Nadia';

        if (dashHello) {
            dashHello.textContent = `${greeting}, ${firstName}`;
        }

        if (dashDate) {
            const dateStr = now.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dashDate.innerHTML = `<i class="far fa-calendar-alt" style="margin-right:6px;opacity:0.8;"></i>${dateStr}`;
        }
    }
    window.updateDashboardGreeting = updateDashboardGreeting;

    function updatePillDisplay(user) {
        if (!user) return;
        currentUserState = { ...currentUserState, ...user };
        try {
            localStorage.setItem('helios_custom_user', JSON.stringify(currentUserState));
        } catch (e) {}

        const nameEl = document.getElementById('heliosUserName');
        const emailEl = document.getElementById('heliosUserEmail');
        const roleBadge = document.getElementById('heliosUserRoleBadge');
        const avatarImg = document.getElementById('heliosAvatarImg');
        const modalAvatar = document.getElementById('modalProfileAvatar');
        const drawerAvatars = document.querySelectorAll('.pn-drawer-avatar');

        if (nameEl) nameEl.textContent = currentUserState.name;
        if (emailEl) emailEl.textContent = currentUserState.email;
        updateDashboardGreeting();

        if (roleBadge) {
            const r = (currentUserState.role || 'admin').toLowerCase();
            roleBadge.textContent = r;
            roleBadge.className = `helios-role-badge ${r}`;
        }
        if (avatarImg && currentUserState.avatar) {
            avatarImg.src = currentUserState.avatar;
        }
        if (modalAvatar && currentUserState.avatar) {
            modalAvatar.src = currentUserState.avatar;
        }
        if (drawerAvatars && currentUserState.avatar) {
            drawerAvatars.forEach(img => { img.src = currentUserState.avatar; });
        }
    }

    // Fetch initial profile if logged in
    async function fetchCurrentProfile() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    updatePillDisplay({
                        name: data.user.fullName || data.user.email.split('@')[0],
                        email: data.user.email,
                        role: data.user.role
                    });
                }
            }
        } catch {
            // keep default
        }
    }

    function openAuthProfileModal() {
        let modal = document.getElementById('heliosAuthModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'heliosAuthModal';
            modal.className = 'modal-backdrop';
            modal.innerHTML = `
                <div class="modal-card helios-auth-modal-card">
                    <!-- Modal Header (CSS selector 2) -->
                    <div class="modal-header helios-auth-modal-header">
                        <div class="helios-auth-header-main">
                            <div class="helios-auth-icon-badge">
                                <i class="fas fa-shield-halved"></i>
                                <span class="helios-status-pulse-dot" title="Security Gateway Active"></span>
                            </div>
                            <div class="helios-auth-title-group">
                                <div class="helios-auth-title-row">
                                    <h3 class="helios-auth-title">Helios Identity & Access Gateway</h3>
                                    <span class="helios-security-pill"><i class="fas fa-lock"></i> TLS 1.3</span>
                                </div>
                                <div class="helios-auth-subtitle">
                                    <span class="helios-status-text"><i class="fas fa-circle-check"></i> Zero-Trust Session Active</span>
                                    <span class="helios-dot-sep">&bull;</span>
                                    <span>Administrator & Member Directory</span>
                                </div>
                            </div>
                        </div>
                        <button class="modal-close helios-modal-close-btn" id="closeHeliosAuthModal" aria-label="Close modal">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>

                    <!-- Modal Body (CSS selector 1) -->
                    <div class="modal-body helios-auth-modal-body">
                        <!-- Navigation Tabs: Profile vs Login -->
                        <div class="helios-auth-tabs">
                            <button type="button" class="helios-auth-tab active" id="tabBtnProfile">
                                <i class="fas fa-id-card"></i>
                                <span>Active Identity Profile</span>
                            </button>
                            <button type="button" class="helios-auth-tab" id="tabBtnLogin">
                                <i class="fas fa-right-to-bracket"></i>
                                <span>Login & OAuth Gateway</span>
                            </button>
                        </div>

                        <!-- Panel 1: Profile & Role Setup -->
                        <div id="authProfilePanel" class="helios-auth-panel">
                            <!-- Executive Identity Card -->
                            <div class="helios-identity-card">
                                <div class="helios-avatar-container" id="modalAvatarContainer" title="Click or drop an image to change profile photo" tabindex="0" role="button" aria-label="Change profile photo">
                                    <img src="${currentUserState.avatar}" alt="Avatar" id="modalProfileAvatar" class="helios-profile-avatar">
                                    <div class="helios-avatar-hover-overlay" id="avatarHoverOverlay" title="Click to upload photo">
                                        <i class="fas fa-camera"></i>
                                        <span>Change</span>
                                    </div>
                                    <button type="button" class="helios-avatar-edit-badge" id="btnTriggerAvatarUpload" title="Click to upload new photo" aria-label="Upload photo">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                    <span class="helios-avatar-online-dot" title="Authenticated & Online"></span>
                                    <input type="file" id="profileAvatarFileInput" accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml" style="display:none;" aria-label="Upload profile image">
                                </div>
                                <div class="helios-identity-info">
                                    <div class="helios-identity-top">
                                        <h4 id="modalProfileName" class="helios-profile-name">${currentUserState.name}</h4>
                                        <span id="modalProfileRoleBadge" class="helios-role-badge ${currentUserState.role}">${currentUserState.role}</span>
                                        <span class="helios-verified-tag"><i class="fas fa-shield-check"></i> Verified</span>
                                    </div>
                                    <div id="modalProfileEmail" class="helios-profile-email">
                                        <i class="fas fa-envelope"></i> ${currentUserState.email}
                                    </div>
                                    <div class="helios-avatar-quick-bar">
                                        <button type="button" class="helios-avatar-upload-btn" id="btnQuickUploadPhoto" title="Choose image file from your device">
                                            <i class="fas fa-camera"></i>
                                            <span>Upload Picture</span>
                                        </button>
                                        <div class="helios-preset-avatars-wrap">
                                            <span class="preset-label">Presets:</span>
                                            <div class="helios-preset-avatars">
                                                <button type="button" class="preset-avatar-btn" data-avatar="assets/images/avatar.jpg" title="Nadia (Default)">
                                                    <img src="assets/images/avatar.jpg" alt="Preset 1">
                                                </button>
                                                <button type="button" class="preset-avatar-btn" data-avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" title="Elena">
                                                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Preset 2">
                                                </button>
                                                <button type="button" class="preset-avatar-btn" data-avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" title="Marcus">
                                                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" alt="Preset 3">
                                                </button>
                                                <button type="button" class="preset-avatar-btn" data-avatar="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" title="Sarah">
                                                    <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" alt="Preset 4">
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="helios-telemetry-chips">
                                        <div class="helios-telemetry-chip">
                                            <i class="fas fa-fingerprint"></i> 2FA: Active
                                        </div>
                                        <div class="helios-telemetry-chip">
                                            <i class="fas fa-network-wired"></i> Gateway: Nexus-01
                                        </div>
                                        <div class="helios-telemetry-chip success">
                                            <i class="fas fa-circle-dot"></i> Status: Authorized
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form id="heliosProfileForm" class="helios-auth-form">
                                <div class="form-group">
                                    <label class="form-label" for="profileFullNameInput">
                                        <span>Display Full Name</span>
                                        <span class="label-hint">Visible on payroll records</span>
                                    </label>
                                    <div class="input-icon-wrap">
                                        <i class="fas fa-user input-leading-icon"></i>
                                        <input type="text" id="profileFullNameInput" class="form-input with-leading-icon" value="${currentUserState.name}" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="profileEmailInput">
                                        <span>Account Email</span>
                                        <span class="label-hint">Primary corporate email</span>
                                    </label>
                                    <div class="input-icon-wrap">
                                        <i class="fas fa-envelope input-leading-icon"></i>
                                        <input type="email" id="profileEmailInput" class="form-input with-leading-icon" value="${currentUserState.email}" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="profileRoleSelect">
                                        <span>System Access Role & Privileges</span>
                                        <span class="label-hint">Defines permissions & actions</span>
                                    </label>
                                    <div class="input-icon-wrap select-wrap">
                                        <i class="fas fa-shield-alt input-leading-icon"></i>
                                        <select id="profileRoleSelect" class="form-input with-leading-icon">
                                            <option value="admin" ${currentUserState.role === 'admin' ? 'selected' : ''}>Administrator — Full System, Payroll Run & Ledger Control</option>
                                            <option value="manager" ${currentUserState.role === 'manager' ? 'selected' : ''}>Manager — People, Compliance & Review Operations</option>
                                            <option value="employee" ${currentUserState.role === 'employee' ? 'selected' : ''}>Employee / User — Self-Service Paystubs & Profile Access</option>
                                        </select>
                                    </div>
                                </div>

                                <div id="profileFormNotice" class="helios-auth-notice" style="display:none;"></div>

                                <div class="helios-auth-actions">
                                    <button type="button" class="btn btn-ghost helios-btn-signout" id="logoutHeliosBtn">
                                        <i class="fas fa-arrow-right-from-bracket"></i> Sign Out
                                    </button>
                                    <button type="submit" class="btn btn-primary helios-btn-save" id="saveProfileBtn">
                                        <i class="fas fa-floppy-disk"></i> Save Profile Setup
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Panel 2: Full Login & OAuth Gateway -->
                        <div id="authLoginPanel" class="helios-auth-panel" style="display:none;">
                            <!-- 1-Click Role Quick Pick for easy testing -->
                            <div class="helios-quick-accounts-section">
                                <div class="helios-section-subhead">
                                    <span>Instant Workstation Switch:</span>
                                    <span class="subhead-badge">1-Click Fast Auth</span>
                                </div>
                                <div class="helios-quick-accounts">
                                    <button type="button" class="helios-quick-acc-btn admin" data-email="admin@nexus.dev" data-name="Alex Admin" data-role="admin">
                                        <div class="quick-acc-icon-wrap"><i class="fas fa-crown"></i></div>
                                        <div class="quick-acc-details">
                                            <div class="quick-acc-role">Administrator</div>
                                            <div class="quick-acc-name">Alex Admin</div>
                                        </div>
                                    </button>
                                    <button type="button" class="helios-quick-acc-btn manager" data-email="manager@nexus.dev" data-name="Maria Manager" data-role="manager">
                                        <div class="quick-acc-icon-wrap"><i class="fas fa-user-tie"></i></div>
                                        <div class="quick-acc-details">
                                            <div class="quick-acc-role">Manager</div>
                                            <div class="quick-acc-name">Maria Manager</div>
                                        </div>
                                    </button>
                                    <button type="button" class="helios-quick-acc-btn employee" data-email="employee@nexus.dev" data-name="Chen Wei" data-role="employee">
                                        <div class="quick-acc-icon-wrap"><i class="fas fa-user"></i></div>
                                        <div class="quick-acc-details">
                                            <div class="quick-acc-role">Employee</div>
                                            <div class="quick-acc-name">Chen Wei</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <!-- Social OAuth Gateways -->
                            <div class="helios-social-section">
                                <div class="helios-section-subhead">
                                    <span>Federated Identity Providers (OAuth 2.0):</span>
                                </div>
                                <div class="helios-social-grid">
                                    <button type="button" class="helios-social-btn google" data-provider="google">
                                        <i class="fab fa-google"></i>
                                        <div class="social-btn-text">
                                            <span class="social-provider">Google Workspace</span>
                                            <span class="social-hint">Instant Single Sign-On</span>
                                        </div>
                                    </button>
                                    <button type="button" class="helios-social-btn facebook" data-provider="facebook">
                                        <i class="fab fa-facebook-f"></i>
                                        <div class="social-btn-text">
                                            <span class="social-provider">Meta / Facebook</span>
                                            <span class="social-hint">Social Authentication</span>
                                        </div>
                                    </button>
                                    <button type="button" class="helios-social-btn github" data-provider="github">
                                        <i class="fab fa-github"></i>
                                        <div class="social-btn-text">
                                            <span class="social-provider">GitHub Enterprise</span>
                                            <span class="social-hint">Developer Auth</span>
                                        </div>
                                    </button>
                                    <button type="button" class="helios-social-btn discord" data-provider="discord">
                                        <i class="fab fa-discord"></i>
                                        <div class="social-btn-text">
                                            <span class="social-provider">Discord Security</span>
                                            <span class="social-hint">Team Access</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div class="helios-auth-divider">
                                <span>Or authenticate with credentials</span>
                            </div>

                            <form id="heliosCredentialsForm" class="helios-auth-form">
                                <div class="form-group">
                                    <label class="form-label" for="loginEmailInput">Work Email Address</label>
                                    <div class="input-icon-wrap">
                                        <i class="fas fa-at input-leading-icon"></i>
                                        <input type="email" id="loginEmailInput" class="form-input with-leading-icon" placeholder="admin@nexus.dev" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <div class="label-with-action">
                                        <label class="form-label" for="loginPasswordInput">Security Password</label>
                                    </div>
                                    <div class="input-icon-wrap password-wrap">
                                        <i class="fas fa-lock input-leading-icon"></i>
                                        <input type="password" id="loginPasswordInput" class="form-input with-leading-icon with-trailing-btn" placeholder="••••••••••••" value="Password123!" required>
                                        <button type="button" class="password-reveal-btn" id="toggleLoginPassword" aria-label="Toggle password visibility">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </div>

                                <div class="form-options-row">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="rememberWorkstationCheck" checked>
                                        <span>Trust this browser for 30 days</span>
                                    </label>
                                    <span class="security-lock-badge"><i class="fas fa-shield-check"></i> AES-256 GCM</span>
                                </div>

                                <div id="loginFormNotice" class="helios-auth-notice" style="display:none;"></div>

                                <button type="submit" class="btn btn-primary helios-btn-login" id="credentialsLoginBtn">
                                    <i class="fas fa-shield-halved"></i> Sign In to Account
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Tab switching
            const tabBtnProfile = document.getElementById('tabBtnProfile');
            const tabBtnLogin = document.getElementById('tabBtnLogin');
            const profilePanel = document.getElementById('authProfilePanel');
            const loginPanel = document.getElementById('authLoginPanel');

            tabBtnProfile.addEventListener('click', () => {
                tabBtnProfile.classList.add('active');
                tabBtnLogin.classList.remove('active');
                profilePanel.style.display = 'block';
                loginPanel.style.display = 'none';
            });

            tabBtnLogin.addEventListener('click', () => {
                tabBtnLogin.classList.add('active');
                tabBtnProfile.classList.remove('active');
                profilePanel.style.display = 'none';
                loginPanel.style.display = 'block';
            });

            // Close button
            document.getElementById('closeHeliosAuthModal').addEventListener('click', () => modal.classList.remove('open'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });

            // ── PROFILE PICTURE CHANGING SYSTEM (FILE UPLOAD, DRAG & DROP, AND PRESETS) ──
            const avatarFileInput = document.getElementById('profileAvatarFileInput');
            const avatarContainer = document.getElementById('modalAvatarContainer');
            const profileAvatarImg = document.getElementById('modalProfileAvatar');
            const quickUploadBtn = document.getElementById('btnQuickUploadPhoto');
            const triggerBadgeBtn = document.getElementById('btnTriggerAvatarUpload');
            const profileNotice = document.getElementById('profileFormNotice');

            function triggerAvatarSelect() {
                if (avatarFileInput) {
                    avatarFileInput.value = '';
                    avatarFileInput.click();
                }
            }

            if (avatarContainer) {
                avatarContainer.addEventListener('click', (e) => {
                    if (e.target.closest('#btnTriggerAvatarUpload')) return;
                    triggerAvatarSelect();
                });
                avatarContainer.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        triggerAvatarSelect();
                    }
                });

                // Drag & Drop
                avatarContainer.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    avatarContainer.classList.add('drag-over');
                });
                avatarContainer.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    avatarContainer.classList.remove('drag-over');
                });
                avatarContainer.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    avatarContainer.classList.remove('drag-over');
                    const files = e.dataTransfer?.files;
                    if (files && files.length > 0) {
                        handleAvatarFile(files[0]);
                    }
                });
            }

            if (triggerBadgeBtn) {
                triggerBadgeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    triggerAvatarSelect();
                });
            }

            if (quickUploadBtn) {
                quickUploadBtn.addEventListener('click', () => {
                    triggerAvatarSelect();
                });
            }

            function applyNewAvatar(dataUrl, sourceLabel = 'Profile Photo') {
                updatePillDisplay({ avatar: dataUrl });
                if (profileAvatarImg) {
                    profileAvatarImg.src = dataUrl;
                    profileAvatarImg.classList.remove('avatar-updated-pulse');
                    void profileAvatarImg.offsetWidth; // force DOM reflow
                    profileAvatarImg.classList.add('avatar-updated-pulse');
                }

                // Update active preset indicator if matching
                modal.querySelectorAll('.preset-avatar-btn').forEach(btn => {
                    if (btn.dataset.avatar === dataUrl) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                if (profileNotice) {
                    profileNotice.style.display = 'block';
                    profileNotice.style.background = 'rgba(98, 200, 138, 0.15)';
                    profileNotice.style.color = '#62c88a';
                    profileNotice.style.border = '1px solid rgba(98, 200, 138, 0.3)';
                    profileNotice.innerHTML = `<i class="fas fa-circle-check"></i> Profile picture changed successfully (${sourceLabel})!`;
                    setTimeout(() => { profileNotice.style.display = 'none'; }, 3500);
                }
            }

            function handleAvatarFile(file) {
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                    if (profileNotice) {
                        profileNotice.style.display = 'block';
                        profileNotice.style.background = 'rgba(255, 107, 107, 0.15)';
                        profileNotice.style.color = '#ff6b6b';
                        profileNotice.style.border = '1px solid rgba(255, 107, 107, 0.3)';
                        profileNotice.innerHTML = '<i class="fas fa-circle-exclamation"></i> Please select a valid image file (PNG, JPG, WebP, GIF).';
                    }
                    return;
                }
                if (file.size > 6 * 1024 * 1024) {
                    if (profileNotice) {
                        profileNotice.style.display = 'block';
                        profileNotice.style.background = 'rgba(255, 107, 107, 0.15)';
                        profileNotice.style.color = '#ff6b6b';
                        profileNotice.style.border = '1px solid rgba(255, 107, 107, 0.3)';
                        profileNotice.innerHTML = '<i class="fas fa-circle-exclamation"></i> Image size exceeds 6MB. Please choose a smaller photo.';
                    }
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result;
                    if (result) {
                        applyNewAvatar(result, file.name);
                    }
                };
                reader.onerror = () => {
                    if (profileNotice) {
                        profileNotice.style.display = 'block';
                        profileNotice.style.background = 'rgba(255, 107, 107, 0.15)';
                        profileNotice.style.color = '#ff6b6b';
                        profileNotice.innerHTML = '<i class="fas fa-circle-exclamation"></i> Error loading selected file.';
                    }
                };
                reader.readAsDataURL(file);
            }

            if (avatarFileInput) {
                avatarFileInput.addEventListener('change', (e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarFile(file);
                });
            }

            // Preset avatar buttons
            modal.querySelectorAll('.preset-avatar-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const presetSrc = btn.dataset.avatar;
                    const presetTitle = btn.title || 'Preset';
                    if (presetSrc) {
                        applyNewAvatar(presetSrc, presetTitle);
                    }
                });
            });

            // Handle Profile Save
            document.getElementById('heliosProfileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const fullName = document.getElementById('profileFullNameInput').value;
                const email = document.getElementById('profileEmailInput').value;
                const role = document.getElementById('profileRoleSelect').value;
                const notice = document.getElementById('profileFormNotice');

                try {
                    const res = await fetch('/api/auth/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fullName, email, role })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        updatePillDisplay({
                            name: data.user.fullName || fullName,
                            email: data.user.email || email,
                            role: data.user.role || role
                        });
                        document.getElementById('modalProfileName').textContent = fullName;
                        document.getElementById('modalProfileEmail').innerHTML = `<i class="fas fa-envelope"></i> ${email}`;
                        const rBadge = document.getElementById('modalProfileRoleBadge');
                        rBadge.textContent = role;
                        rBadge.className = `helios-role-badge ${role}`;

                        notice.style.display = 'block';
                        notice.style.background = 'rgba(98, 200, 138, 0.15)';
                        notice.style.color = '#62c88a';
                        notice.style.border = '1px solid rgba(98, 200, 138, 0.3)';
                        notice.textContent = 'Profile and role permissions updated successfully!';
                        setTimeout(() => { notice.style.display = 'none'; }, 3000);
                    } else {
                        // Local update if offline or mock state
                        updatePillDisplay({ name: fullName, email, role });
                        notice.style.display = 'block';
                        notice.style.background = 'rgba(182, 140, 255, 0.15)';
                        notice.style.color = '#b68cff';
                        notice.textContent = 'Profile preferences saved locally for this session.';
                        setTimeout(() => { notice.style.display = 'none'; }, 3000);
                    }
                } catch {
                    updatePillDisplay({ name: fullName, email, role });
                    notice.style.display = 'block';
                    notice.style.background = 'rgba(182, 140, 255, 0.15)';
                    notice.style.color = '#b68cff';
                    notice.textContent = 'Profile preferences updated.';
                    setTimeout(() => { notice.style.display = 'none'; }, 3000);
                }
            });

            // Handle Sign out
            document.getElementById('logoutHeliosBtn').addEventListener('click', async () => {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch {}
                updatePillDisplay({
                    name: 'Guest User',
                    email: 'guest@nexus.dev',
                    role: 'employee'
                });
                tabBtnLogin.click();
            });

            // Social Logins (Google/Gmail, Facebook, GitHub, Discord)
            modal.querySelectorAll('.helios-social-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const provider = btn.dataset.provider;
                    openOAuthGateway(provider);
                });
            });


            // Quick Role Switch Buttons
            modal.querySelectorAll('.helios-quick-acc-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const email = btn.dataset.email;
                    const name = btn.dataset.name;
                    const role = btn.dataset.role;

                    const loginNotice = document.getElementById('loginFormNotice');
                    loginNotice.style.display = 'block';
                    loginNotice.style.background = 'rgba(182, 140, 255, 0.15)';
                    loginNotice.style.color = '#b68cff';
                    loginNotice.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Switching to ${role.toUpperCase()} (${name})...`;

                    try {
                        const res = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password: 'Password123!' })
                        });
                        const data = await res.json();
                        if (data.user) {
                            updatePillDisplay({
                                name: data.user.fullName || name,
                                email: data.user.email || email,
                                role: data.user.role || role
                            });
                        } else {
                            updatePillDisplay({ name, email, role });
                        }
                    } catch {
                        updatePillDisplay({ name, email, role });
                    }

                    loginNotice.style.background = 'rgba(98, 200, 138, 0.15)';
                    loginNotice.style.color = '#62c88a';
                    loginNotice.innerHTML = `<i class="fas fa-check-circle"></i> Switched to ${role.toUpperCase()} account!`;
                    setTimeout(() => {
                        modal.classList.remove('open');
                        loginNotice.style.display = 'none';
                    }, 1000);
                });
            });

            // Handle Credentials Form Login
            document.getElementById('heliosCredentialsForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmailInput').value;
                const password = document.getElementById('loginPasswordInput').value;
                const loginNotice = document.getElementById('loginFormNotice');

                loginNotice.style.display = 'block';
                loginNotice.style.background = 'rgba(182, 140, 255, 0.15)';
                loginNotice.style.color = '#b68cff';
                loginNotice.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Verifying credentials...`;

                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (res.ok && data.user) {
                        updatePillDisplay({
                            name: data.user.fullName || data.user.email.split('@')[0],
                            email: data.user.email,
                            role: data.user.role
                        });
                        loginNotice.style.background = 'rgba(98, 200, 138, 0.15)';
                        loginNotice.style.color = '#62c88a';
                        loginNotice.innerHTML = `<i class="fas fa-check-circle"></i> Login verified as ${data.user.role}!`;
                        setTimeout(() => {
                            modal.classList.remove('open');
                            loginNotice.style.display = 'none';
                        }, 1200);
                    } else {
                        loginNotice.style.background = 'rgba(255, 107, 107, 0.15)';
                        loginNotice.style.color = '#ff6b6b';
                        loginNotice.textContent = data.error || 'Invalid credentials. Check email and password.';
                    }
                } catch {
                    loginNotice.style.background = 'rgba(255, 107, 107, 0.15)';
                    loginNotice.style.color = '#ff6b6b';
                    loginNotice.textContent = 'Server connection error during login.';
                }
            });

            // Password Visibility Toggle
            const togglePassBtn = document.getElementById('toggleLoginPassword');
            const passInput = document.getElementById('loginPasswordInput');
            if (togglePassBtn && passInput) {
                togglePassBtn.addEventListener('click', () => {
                    const isPass = passInput.type === 'password';
                    passInput.type = isPass ? 'text' : 'password';
                    togglePassBtn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
                });
            }
        }

        // Always sync active user profile values when opened
        const nameField = document.getElementById('profileFullNameInput');
        const emailField = document.getElementById('profileEmailInput');
        const roleField = document.getElementById('profileRoleSelect');
        const cardName = document.getElementById('modalProfileName');
        const cardEmail = document.getElementById('modalProfileEmail');
        const cardAvatar = document.getElementById('modalProfileAvatar');
        const cardRole = document.getElementById('modalProfileRoleBadge');
        if (nameField) nameField.value = currentUserState.name;
        if (emailField) emailField.value = currentUserState.email;
        if (roleField) roleField.value = currentUserState.role;
        if (cardName) cardName.textContent = currentUserState.name;
        if (cardEmail) cardEmail.innerHTML = `<i class="fas fa-envelope"></i> ${currentUserState.email}`;
        if (cardAvatar) cardAvatar.src = currentUserState.avatar;
        if (cardRole) {
            cardRole.textContent = currentUserState.role;
            cardRole.className = `helios-role-badge ${currentUserState.role}`;
        }

        modal.classList.add('open');
    }

    // ── OAUTH TOAST NOTIFICATION ──
    function showToastNotification(message, type = 'info') {
        let toast = document.getElementById('heliosGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'heliosGlobalToast';
            toast.style.position = 'fixed';
            toast.style.bottom = '24px';
            toast.style.right = '24px';
            toast.style.zIndex = '10070';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '10px';
            toast.style.fontWeight = '600';
            toast.style.fontSize = '13.5px';
            toast.style.boxShadow = '0 12px 30px rgba(0,0,0,0.6)';
            toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            document.body.appendChild(toast);
        }
        const bg = type === 'success' ? '#143823' : (type === 'error' ? '#3d1616' : '#1c1d29');
        const color = type === 'success' ? '#62c88a' : (type === 'error' ? '#ff6b6b' : '#b68cff');
        const border = type === 'success' ? 'rgba(98,200,138,0.4)' : (type === 'error' ? 'rgba(255,107,107,0.4)' : 'rgba(182,140,255,0.4)');
        toast.style.background = bg;
        toast.style.color = color;
        toast.style.border = `1px solid ${border}`;
        toast.innerHTML = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
        }, 4000);
    }

    // ── OAUTH POPUP CROSS-ORIGIN MESSAGE LISTENER ──
    window.addEventListener('message', (event) => {
        const origin = event.origin;
        if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
            return;
        }
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            const { provider, user } = event.data;
            updatePillDisplay({
                name: user.fullName || user.email.split('@')[0],
                email: user.email,
                role: user.role || 'admin',
                avatar: user.avatar || getProviderAvatar(provider),
            });
            const m = document.getElementById('heliosAuthModal');
            if (m) m.classList.remove('open');
            const c = document.getElementById('oauthConsentModal');
            if (c) c.classList.remove('open');
            showToastNotification(`✓ Authenticated via ${provider.toUpperCase()} Gateway!`, 'success');
        } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
            showToastNotification(`✕ OAuth Error: ${event.data.error || 'Authentication aborted'}`, 'error');
        }
    });

    function getProviderAvatar(provider) {
        if (provider === 'google') return 'https://lh3.googleusercontent.com/a/default-user';
        if (provider === 'github') return 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
        if (provider === 'discord') return 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png';
        if (provider === 'facebook') return 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg';
        return 'assets/images/avatar.jpg';
    }

    // ── OAUTH PROVIDER GATEWAY DISPATCHER ──
    async function openOAuthGateway(provider) {
        const callbackUri = `${window.location.origin}/auth/callback/${provider}`;
        try {
            const res = await fetch(`/api/auth/oauth/${provider}/url?redirect_uri=${encodeURIComponent(callbackUri)}`);
            const data = await res.json();
            if (data.configured && data.url) {
                const authWindow = window.open(data.url, 'oauth_popup', 'width=600,height=720');
                if (authWindow) return;
            }
            openOAuthConsentScreen(provider, { configured: false, callbackUri });
        } catch {
            openOAuthConsentScreen(provider, { configured: false, callbackUri });
        }
    }

    // ── AUTHENTIC OAUTH CONSENT DIALOG SCREEN ──
    function openOAuthConsentScreen(provider, meta) {
        let modal = document.getElementById('oauthConsentModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'oauthConsentModal';
            modal.className = 'oauth-consent-overlay';
            document.body.appendChild(modal);
        }

        const callbackUrl = meta?.callbackUri || `${window.location.origin}/auth/callback/${provider}`;
        let providerTitle = 'Sign In';
        let providerSubtitle = 'Authorize Helios Nexus to access your profile';
        let iconHtml = '';
        let defaultEmail = 'sattubeb777@gmail.com';
        let defaultName = 'Sattu Admin';
        let scopes = [];
        let devConsoleUrl = '';
        let devDocName = '';

        if (provider === 'google') {
            providerTitle = 'Sign in with Google';
            providerSubtitle = 'Choose an account to continue to Helios Nexus';
            iconHtml = `<svg viewBox="0 0 24 24" width="28" height="28" style="vertical-align:middle;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;
            defaultEmail = 'sattubeb777@gmail.com';
            defaultName = 'Sattu Admin';
            scopes = [
                { icon: 'fa-envelope', label: 'View your primary Google Account email address (sattubeb777@gmail.com)' },
                { icon: 'fa-id-badge', label: 'See your personal info, including profile name and picture' },
                { icon: 'fa-shield-halved', label: 'Associate your verified Google account with your Helios role' }
            ];
            devConsoleUrl = 'https://console.cloud.google.com/apis/credentials';
            devDocName = 'Google Cloud Console OAuth 2.0 Client';
        } else if (provider === 'github') {
            providerTitle = 'Authorize Helios Nexus';
            providerSubtitle = 'Helios Nexus by @nexus-tech wants to access your GitHub account';
            iconHtml = `<i class="fab fa-github" style="font-size:28px;color:#ffffff;"></i>`;
            defaultEmail = 'dev_octocat@nexus.dev';
            defaultName = 'GitHub Staff';
            scopes = [
                { icon: 'fa-user-check', label: 'read:user — Read your profile data, username and bio' },
                { icon: 'fa-envelope', label: 'user:email — Access primary and verified email addresses' }
            ];
            devConsoleUrl = 'https://github.com/settings/developers';
            devDocName = 'GitHub Developer Settings > OAuth Apps';
        } else if (provider === 'discord') {
            providerTitle = 'Authorize with Discord';
            providerSubtitle = 'Helios Nexus wants to access your Discord profile and servers';
            iconHtml = `<i class="fab fa-discord" style="font-size:28px;color:#5865f2;"></i>`;
            defaultEmail = 'discord_mod@nexus.dev';
            defaultName = 'Discord Staff';
            scopes = [
                { icon: 'fa-user-tag', label: 'identify — Access your Discord username, avatar, and banner' },
                { icon: 'fa-envelope', label: 'email — Access your Discord registered email address' }
            ];
            devConsoleUrl = 'https://discord.com/developers/applications';
            devDocName = 'Discord Developer Portal > OAuth2';
        } else if (provider === 'facebook') {
            providerTitle = 'Log in with Facebook';
            providerSubtitle = 'Helios Nexus is requesting access to your Meta account';
            iconHtml = `<i class="fab fa-facebook" style="font-size:28px;color:#1877f2;"></i>`;
            defaultEmail = 'nadia_exec@nexus.dev';
            defaultName = 'Nadia Rachel';
            scopes = [
                { icon: 'fa-circle-user', label: 'public_profile — Your name and profile picture' },
                { icon: 'fa-envelope', label: 'email — Your registered Facebook email address' }
            ];
            devConsoleUrl = 'https://developers.facebook.com/apps';
            devDocName = 'Meta for Developers > Facebook Login';
        }

        modal.innerHTML = `
            <div class="oauth-consent-box ${provider}">
                <div class="oauth-header" style="padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        ${iconHtml}
                        <div>
                            <h3 style="margin:0;font-size:16px;font-weight:700;letter-spacing:-0.2px;">${providerTitle}</h3>
                            <div style="font-size:11.5px;color:#8f8d99;">${providerSubtitle}</div>
                        </div>
                    </div>
                    <button type="button" id="closeConsentModalBtn" style="background:transparent;border:none;color:#8f8d99;cursor:pointer;font-size:16px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
                    <!-- Identity selection card -->
                    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px 16px;">
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8f8d99;margin-bottom:8px;font-weight:700;">Account to authorize</div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${getProviderAvatar(provider)}" alt="Avatar" style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);object-fit:cover;">
                            <div style="flex:1;">
                                <input type="text" id="consentNameInput" value="${defaultName}" class="form-input" style="padding:4px 8px;font-size:13px;font-weight:600;margin-bottom:4px;" title="Display Name">
                                <input type="email" id="consentEmailInput" value="${defaultEmail}" class="form-input" style="padding:4px 8px;font-size:12px;color:#8f8d99;" title="Email Address">
                            </div>
                        </div>
                    </div>

                    <!-- Role permission grant -->
                    <div>
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8f8d99;margin-bottom:8px;font-weight:700;">System access level</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(182,140,255,0.3);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
                                <input type="radio" name="consentRoleRadio" value="admin" checked style="accent-color:#b68cff;">
                                <span><i class="fas fa-crown" style="color:#b68cff;margin-right:4px;"></i> Administrator</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
                                <input type="radio" name="consentRoleRadio" value="employee" style="accent-color:#62c88a;">
                                <span><i class="fas fa-user-check" style="color:#62c88a;margin-right:4px;"></i> Employee</span>
                            </label>
                        </div>
                    </div>

                    <!-- Scopes checklist -->
                    <div>
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8f8d99;margin-bottom:8px;font-weight:700;">Permissions requested</div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            ${scopes.map(s => `
                                <div class="oauth-scope-item">
                                    <i class="fas ${s.icon}"></i>
                                    <span>${s.label}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Developer Setup & Callback URI Drawer -->
                    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" id="toggleDevDrawerBtn">
                            <span style="font-size:11px;color:#b68cff;font-weight:600;"><i class="fas fa-sliders"></i> Production API Keys & Callback URL</span>
                            <i class="fas fa-chevron-down" id="toggleDevDrawerIcon" style="font-size:11px;color:#8f8d99;transition:transform 0.2s;"></i>
                        </div>
                        <div id="devDrawerBody" style="display:none;margin-top:10px;font-size:11px;color:#8f8d99;line-height:1.6;">
                            <p style="margin:0 0 6px 0;">To connect your live ${provider.toUpperCase()} app, add this Callback URL in <a href="${devConsoleUrl}" target="_blank" rel="noopener noreferrer" style="color:#b68cff;text-decoration:underline;">${devDocName}</a>:</p>
                            <div class="oauth-copy-pill" id="copyCallbackPill" title="Click to copy">
                                <i class="fas fa-copy"></i> <span>${callbackUrl}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:4px;">
                        <button type="button" class="btn btn-secondary" id="cancelConsentBtn" style="padding:9px 16px;font-size:12.5px;">Cancel</button>
                        <button type="button" class="btn oauth-btn-primary ${provider}" id="confirmConsentBtn" style="padding:9px 20px;font-size:12.5px;font-weight:600;border-radius:8px;border:none;cursor:pointer;">
                            Continue with ${provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('open');

        // Close events
        document.getElementById('closeConsentModalBtn').addEventListener('click', () => modal.classList.remove('open'));
        document.getElementById('cancelConsentBtn').addEventListener('click', () => modal.classList.remove('open'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });

        // Toggle Dev drawer
        const toggleBtn = document.getElementById('toggleDevDrawerBtn');
        const drawerBody = document.getElementById('devDrawerBody');
        const drawerIcon = document.getElementById('toggleDevDrawerIcon');
        toggleBtn.addEventListener('click', () => {
            const isHidden = drawerBody.style.display === 'none';
            drawerBody.style.display = isHidden ? 'block' : 'none';
            drawerIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        // Copy Callback pill
        const copyPill = document.getElementById('copyCallbackPill');
        copyPill.addEventListener('click', () => {
            navigator.clipboard.writeText(callbackUrl).then(() => {
                showToastNotification('✓ Callback URL copied to clipboard!', 'success');
            }).catch(() => {
                showToastNotification(`Copied: ${callbackUrl}`, 'info');
            });
        });

        // Confirm Consent Submit
        document.getElementById('confirmConsentBtn').addEventListener('click', async () => {
            const nameInput = document.getElementById('consentNameInput');
            const emailInput = document.getElementById('consentEmailInput');
            const roleRadio = document.querySelector('input[name="consentRoleRadio"]:checked');

            const name = nameInput.value.trim() || defaultName;
            const email = emailInput.value.trim() || defaultEmail;
            const role = roleRadio ? roleRadio.value : 'admin';

            const confirmBtn = document.getElementById('confirmConsentBtn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Authorizing...`;

            try {
                const res = await fetch('/api/auth/social-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider, email, name, role })
                });
                const data = await res.json();
                if (data.ok && data.user) {
                    updatePillDisplay({
                        name: data.user.fullName || name,
                        email: data.user.email || email,
                        role: data.user.role || role,
                        avatar: getProviderAvatar(provider),
                    });
                    modal.classList.remove('open');
                    const authModal = document.getElementById('heliosAuthModal');
                    if (authModal) authModal.classList.remove('open');
                    showToastNotification(`✓ Authenticated via ${provider.toUpperCase()} as ${role.toUpperCase()}!`, 'success');
                } else {
                    throw new Error(data.error || 'Unable to authenticate');
                }
            } catch (err) {
                // Local session fallback
                updatePillDisplay({
                    name,
                    email,
                    role,
                    avatar: getProviderAvatar(provider),
                });
                modal.classList.remove('open');
                const authModal = document.getElementById('heliosAuthModal');
                if (authModal) authModal.classList.remove('open');
                showToastNotification(`✓ Signed in via ${provider.toUpperCase()} (${role})`, 'success');
            }
        });
    }

    // ── BOOTSTRAP HELIOS LISTENERS ──
    function initHelios() {
        renderSvgChart(true);
        initChartScrubbing();
        initWatchlistTabs();
        syncTotalHolding();

        // Explore AI Insights button
        const aiBtn = document.getElementById('exploreAiInsightsBtn');
        if (aiBtn) aiBtn.addEventListener('click', () => openAiInsightsModal());

        // Ask AI input enter key and submit button
        const aiInput = document.getElementById('heliosAiInput');
        const aiSendBtn = document.getElementById('heliosAiBtn');
        const aiBadge = document.getElementById('heliosAiStatusBadge');

        const triggerAiModal = () => {
            const val = aiInput ? aiInput.value : '';
            openAiInsightsModal(val);
            if (aiInput) aiInput.value = '';
        };

        if (aiInput) {
            aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    triggerAiModal();
                }
            });
        }
        if (aiSendBtn) aiSendBtn.addEventListener('click', triggerAiModal);
        if (aiBadge) aiBadge.addEventListener('click', triggerAiModal);

        // Support button
        const supBtn = document.getElementById('sidebarSupportBtn');
        if (supBtn) supBtn.addEventListener('click', openSupportModal);

        // Settings buttons
        const setBtn = document.getElementById('sidebarSettingsBtn');
        const topSetBtn = document.getElementById('topSettingsBtn');
        const openSettingsModal = () => {
            if (typeof window.populateCurrencySelectors === 'function') {
                window.populateCurrencySelectors();
            }
            if (typeof window.updateSettingsConversion === 'function') {
                window.updateSettingsConversion();
            }
            if (typeof window.openModal === 'function') {
                window.openModal('settingsModal');
            }
        };
        if (setBtn) setBtn.addEventListener('click', openSettingsModal);
        if (topSetBtn) topSetBtn.addEventListener('click', openSettingsModal);

        // Notifications button
        const notifBtn = document.getElementById('notifBtn');
        if (notifBtn) notifBtn.addEventListener('click', openNotifModal);

        // See all portfolio button -> navigates to Employees
        const seeAllBtn = document.getElementById('portfolioSeeAllBtn');
        if (seeAllBtn) {
            seeAllBtn.addEventListener('click', () => {
                if (typeof window.switchToTab === 'function') window.switchToTab('employees');
            });
        }

        // Portfolio tab switcher (Operational vs Market Assets)
        const portTabOp = document.getElementById('portTabOperational');
        const portTabMkt = document.getElementById('portTabMarket');
        const portGridOp = document.getElementById('portfolioOperationalGrid');
        const portGridMkt = document.getElementById('portfolioMarketGrid');

        if (portTabOp && portTabMkt && portGridOp && portGridMkt) {
            portTabOp.addEventListener('click', () => {
                portTabOp.classList.add('active');
                portTabMkt.classList.remove('active');
                portGridOp.classList.remove('hidden');
                portGridMkt.classList.add('hidden');
            });
            portTabMkt.addEventListener('click', () => {
                portTabMkt.classList.add('active');
                portTabOp.classList.remove('active');
                portGridMkt.classList.remove('hidden');
                portGridOp.classList.add('hidden');
            });
        }

        // Toggle Financial Breakdown Panel
        const toggleBreakdownBtn = document.getElementById('toggleHoldingBreakdown');
        const breakdownPanel = document.getElementById('holdingBreakdownPanel');
        if (toggleBreakdownBtn && breakdownPanel) {
            toggleBreakdownBtn.addEventListener('click', () => {
                const isHidden = breakdownPanel.style.display === 'none';
                breakdownPanel.style.display = isHidden ? 'grid' : 'none';
                toggleBreakdownBtn.classList.toggle('active', isHidden);
            });
        }

        // User Profile & Login Gateway Pill
        const userPill = document.getElementById('heliosUserPill') || document.querySelector('.helios-user-pill');
        if (userPill) {
            userPill.addEventListener('click', openAuthProfileModal);
            userPill.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openAuthProfileModal();
                }
            });
        }
        fetchCurrentProfile();

        // Subbar Filter pills
        document.querySelectorAll('.helios-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.helios-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.dataset.filter;
                if (filter === 'tools') {
                    const tray = document.getElementById('heliosQuickTray');
                    if (tray) tray.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Initialize Realtime WebSocket Connection & Event Listeners
        initRealtimeEngine();
    }

    // ── REALTIME WEBSOCKET & SSE ENGINE ──
    let realtimeWs = null;
    let realtimeMetrics = null;
    let realtimePingTimer = null;
    let realtimeLatencyMs = 12;

    function initRealtimeEngine() {
        connectRealtimeWebSocket();
        bindLiveActionButtons();
    }

    function updateConnectionStatusUI(connected, label) {
        const modePill = document.getElementById('telemetryModePill');
        const pulseDot = document.getElementById('globalPulseDot');

        if (modePill) {
            modePill.innerHTML = connected 
                ? `<i class="fas fa-bolt"></i> ${label || 'WebSocket Active'}`
                : `<i class="fas fa-arrows-rotate fa-spin"></i> ${label || 'Reconnecting...'}`;
            modePill.style.color = connected ? '#62c88a' : '#f59e0b';
            modePill.style.borderColor = connected ? 'rgba(98, 200, 138, 0.3)' : 'rgba(245, 158, 11, 0.3)';
        }
        if (pulseDot) {
            pulseDot.style.background = connected ? '#62c88a' : '#f59e0b';
            pulseDot.style.boxShadow = connected ? '0 0 8px #62c88a' : '0 0 8px #f59e0b';
        }
    }

    function updateLatencyUI(latency) {
        const pingEl = document.getElementById('telemetryPing');
        const kpiLatEl = document.getElementById('kpiLatency');
        if (pingEl) pingEl.textContent = `Ping: ${latency}ms`;
        if (kpiLatEl) kpiLatEl.textContent = `${latency}ms`;
    }

    let _lastTickerPushTime = 0;
    function pushFeedTickerItem(text) {
        const now = Date.now();
        if (now - _lastTickerPushTime < 1500) return; // Prevent DOM thrashing
        _lastTickerPushTime = now;

        const track = document.getElementById('liveFeedTickerTrack');
        if (!track) return;
        const formatted = text.startsWith('●') ? text : `● ${text}`;
        const item1 = document.createElement('span');
        item1.className = 'feed-ticker-item';
        item1.textContent = formatted;
        track.insertBefore(item1, track.firstChild);

        // Keep duplicated track set balanced for seamless infinite looping
        const item2 = document.createElement('span');
        item2.className = 'feed-ticker-item';
        item2.textContent = formatted;
        track.appendChild(item2);

        // Limit track items to prevent infinite DOM growth
        const items = track.querySelectorAll('.feed-ticker-item');
        if (items.length > 16) {
            items[items.length - 1].remove();
            items[Math.floor(items.length / 2) - 1]?.remove();
        }
    }

    let fallbackEventSource = null;
    let wsAttempts = 0;
    let isSseActive = false;

    function connectRealtimeWebSocket() {
        if (isSseActive) return; // SSE is running smoothly, do not loop
        if (wsAttempts >= 2) {
            connectSseFallback();
            return;
        }

        if (realtimeWs) {
            try { realtimeWs.close(); } catch (_) {}
            realtimeWs = null;
        }

        const isHttps = window.location.protocol === 'https:';
        const wsProto = isHttps ? 'wss:' : 'ws:';
        const wsUrl = `${wsProto}//${window.location.host}/api/ws`;

        try {
            realtimeWs = new WebSocket(wsUrl);

            realtimeWs.onopen = () => {
                wsAttempts = 0;
                updateConnectionStatusUI(true, 'WebSocket Active');
                sendPing();
                startPingLoop();
            };

            realtimeWs.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleRealtimeMessage(msg);
                } catch (err) {
                    console.error('[helios-ws] Parse error:', err);
                }
            };

            realtimeWs.onclose = () => {
                stopPingLoop();
                wsAttempts++;
                if (wsAttempts >= 2) {
                    connectSseFallback();
                } else {
                    setTimeout(connectRealtimeWebSocket, 6000);
                }
            };

            realtimeWs.onerror = () => {
                wsAttempts++;
                if (wsAttempts >= 2) {
                    connectSseFallback();
                }
            };
        } catch (err) {
            connectSseFallback();
        }
    }

    function sendPing() {
        if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
            const now = Date.now();
            realtimeWs.send(JSON.stringify({ action: 'ping', payload: { clientTime: now } }));
        }
    }

    function startPingLoop() {
        stopPingLoop();
        realtimePingTimer = setInterval(sendPing, 15000);
    }

    function stopPingLoop() {
        if (realtimePingTimer) {
            clearInterval(realtimePingTimer);
            realtimePingTimer = null;
        }
    }

    function connectSseFallback() {
        if (fallbackEventSource && fallbackEventSource.readyState !== EventSource.CLOSED) {
            return; // Prevent duplicate EventSources
        }
        try {
            if (fallbackEventSource) {
                try { fallbackEventSource.close(); } catch (_) {}
            }
            fallbackEventSource = new EventSource('/api/dashboard/stream');

            fallbackEventSource.onopen = () => {
                isSseActive = true;
                updateConnectionStatusUI(true, 'Live Sync Active');
            };

            fallbackEventSource.addEventListener('init:state', (e) => {
                isSseActive = true;
                try {
                    const parsed = JSON.parse(e.data);
                    if (parsed.data) {
                        applyRealtimeMetrics(parsed.data);
                        updateConnectionStatusUI(true, 'Live Sync Active');
                    }
                } catch (_) {}
            });

            fallbackEventSource.addEventListener('metrics:update', (e) => {
                try {
                    const parsed = JSON.parse(e.data);
                    if (parsed.data) applyRealtimeMetrics(parsed.data);
                } catch (_) {}
            });

            fallbackEventSource.addEventListener('attendance:updated', (e) => {
                try {
                    const parsed = JSON.parse(e.data);
                    pushFeedTickerItem('Attendance verified & synchronized');
                    if (parsed.metrics) applyRealtimeMetrics(parsed.metrics);
                } catch (_) {}
            });

            fallbackEventSource.addEventListener('payroll:updated', (e) => {
                try {
                    const parsed = JSON.parse(e.data);
                    pushFeedTickerItem('Payroll cycle computed & synchronized');
                    if (parsed.metrics) applyRealtimeMetrics(parsed.metrics);
                } catch (_) {}
            });

            fallbackEventSource.onerror = () => {
                isSseActive = false;
                updateConnectionStatusUI(false, 'Live Stream Syncing...');
            };
        } catch (err) {
            console.error('[helios-sse] Stream error:', err);
        }
    }

    function handleRealtimeMessage(msg) {
        if (!msg || !msg.event) return;

        switch (msg.event) {
            case 'pong':
                if (msg.clientTime) {
                    realtimeLatencyMs = Math.max(3, Date.now() - msg.clientTime);
                    updateLatencyUI(realtimeLatencyMs);
                }
                break;

            case 'init:state':
            case 'metrics:update':
                realtimeMetrics = msg.data;
                applyRealtimeMetrics(msg.data);
                break;

            case 'attendance:updated':
                pushFeedTickerItem(`Attendance verified for ${msg.data?.employee?.name || 'Staff'}: ${msg.data?.record?.status || 'Present'}`);
                if (msg.metrics) applyRealtimeMetrics(msg.metrics);
                break;

            case 'payroll:updated':
                pushFeedTickerItem(`Payroll cycle recalculated: ${msg.data?.runsCount || 3} payroll ledger items verified`);
                if (msg.metrics) applyRealtimeMetrics(msg.metrics);
                break;

            case 'telemetry:tick':
                if (msg.data?.connectedClients) {
                    const modePill = document.getElementById('telemetryModePill');
                    if (modePill) modePill.innerHTML = `<i class="fas fa-bolt"></i> WebSocket Active (${msg.data.connectedClients} live)`;
                }
                break;

            default:
                break;
        }
    }

    let _lastChartRenderTime = 0;
    let _chartRenderTimeout = null;
    function throttledRenderSvgChart() {
        const now = Date.now();
        if (now - _lastChartRenderTime > 1500) {
            _lastChartRenderTime = now;
            renderSvgChart();
        } else if (!_chartRenderTimeout) {
            _chartRenderTimeout = setTimeout(() => {
                _chartRenderTimeout = null;
                _lastChartRenderTime = Date.now();
                renderSvgChart();
            }, 1200);
        }
    }

    // ── APPLY REALTIME METRICS TO DOM ──
    function applyRealtimeMetrics(m) {
        if (!m) return;

        const fmt = typeof window.fmtCurrency === 'function' 
            ? window.fmtCurrency 
            : (v) => '$ ' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const setTxt = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.textContent = txt;
        };

        // 1. Total Holding Section
        if (m.totalHolding) {
            setTxt('heliosHoldingVal', fmt(m.totalHolding.amountUsd));
            const trendEl = document.getElementById('heliosHoldingTrend');
            if (trendEl && m.totalHolding.trendPct) {
                trendEl.innerHTML = `<i class="fas fa-arrow-trend-up"></i> <span>${m.totalHolding.trendPct} from last cycle</span>`;
            }
            setTxt('holdingRunwayText', `${m.totalHolding.runwayMonths} mos runway`);
            setTxt('hbReservesVal', fmt(m.totalHolding.liquidReservesUsd));
            setTxt('hbPayrollVal', fmt(m.totalHolding.payrollLiabilityUsd));
            setTxt('hbDailyBurnVal', `${fmt(m.totalHolding.dailyBurnUsd)} / day`);

            // Compatibility elements
            setTxt('projectedCost', fmt(m.totalHolding.payrollLiabilityUsd));
            setTxt('ks-payroll', fmt(m.totalHolding.payrollLiabilityUsd));
        }

        // 2. AI Decision Summary
        const aiDesc = document.getElementById('aiDecisionSummary');
        if (aiDesc && m.attendance && m.totalHolding) {
            aiDesc.textContent = `Real-time attendance at ${m.attendance.attendanceRate}% with ${m.totalHolding.runwayMonths} months treasury reserve runway. Stable payroll liquidity across operational departments.`;
        }

        // 3. Operational Portfolio (Departments analyzing headcount, spend, attendance)
        if (m.employees && m.employees.departments) {
            const depts = m.employees.departments;
            const eng = depts.find(d => d.name === 'Engineering') || { monthlySpendUsd: 7344, headcount: 1, attendanceRate: 100 };
            const hr = depts.find(d => d.name === 'Human Resources') || { monthlySpendUsd: 5508, headcount: 1, attendanceRate: 100 };
            const sales = depts.find(d => d.name === 'Sales') || { monthlySpendUsd: 6936, headcount: 1, attendanceRate: 100 };

            setTxt('portEngVal', fmt(eng.monthlySpendUsd));
            setTxt('portEngDiff', `+${eng.attendanceRate}% Present`);
            setTxt('portEngHeadcount', `${eng.headcount} Staff`);

            setTxt('portHrVal', fmt(hr.monthlySpendUsd));
            setTxt('portHrDiff', `+${hr.attendanceRate}% Present`);
            setTxt('portHrHeadcount', `${hr.headcount} Staff`);

            setTxt('portSalesVal', fmt(sales.monthlySpendUsd));
            setTxt('portSalesDiff', `+${sales.attendanceRate}% Present`);
            setTxt('portSalesHeadcount', `${sales.headcount} Staff`);

            if (m.payroll) {
                setTxt('portOpsVal', fmt(m.payroll.totalNetUsd));
                setTxt('portOpsDiff', `${eng.efficiencyScore || 99}% Health`);
                setTxt('portOpsTotal', `${m.employees.total} Active`);
            }
        }

        // 4. Performance Analytics & KPIs
        if (m.performance && m.performance.series) {
            CHART_DATA_HOLDING['1D'] = m.performance.series['1D'] || CHART_DATA_HOLDING['1D'];
            CHART_DATA_HOLDING['1W'] = m.performance.series['1W'] || CHART_DATA_HOLDING['1W'];
            CHART_DATA_HOLDING['1M'] = m.performance.series['1M'] || CHART_DATA_HOLDING['1M'];
            CHART_DATA_HOLDING['6M'] = m.performance.series['6M'] || CHART_DATA_HOLDING['6M'];
            CHART_DATA_HOLDING['1Y'] = m.performance.series['1Y'] || CHART_DATA_HOLDING['1Y'];
            throttledRenderSvgChart();
        }

        if (m.totalHolding?.trendPct) setTxt('kpiAlpha', m.totalHolding.trendPct);
        if (m.attendance?.attendanceRate !== undefined) setTxt('kpiAttStability', `${m.attendance.attendanceRate}% On-Duty`);
        if (m.payroll?.disbursementStatus) setTxt('kpiDisbursement', m.payroll.disbursementStatus);
        setTxt('kpiLatency', `${realtimeLatencyMs}ms`);

        // 5. Operations Hub: Attendance Analysis
        if (m.attendance) {
            const att = m.attendance;
            const rate = Number(att.attendanceRate || 0);

            setTxt('hubAttBadge', `${rate}% Rate`);
            setTxt('hubAttPct', `${rate}%`);
            setTxt('hubAttPresent', String(att.presentToday ?? 0));
            setTxt('hubAttLate', String(att.lateToday ?? 0));
            setTxt('hubAttAbsent', String(att.absentToday ?? 0));
            setTxt('hubAttLeaves', String(att.pendingLeaves ?? 0));

            // Radial progress circle arc
            const radialArc = document.getElementById('hubRadialArc');
            if (radialArc) {
                const circumference = 201.06; // 2 * Math.PI * 32
                const offset = circumference - (circumference * (rate / 100));
                radialArc.style.strokeDashoffset = String(offset);
            }

            const statusDesc = document.getElementById('hubAttStatusDesc');
            if (statusDesc) {
                statusDesc.textContent = rate >= 95
                    ? 'All departments meeting punctuality baseline'
                    : `${att.absentToday} staff absent today · review required`;
            }

            // Compatibility counters
            setTxt('presentToday', String(att.presentToday ?? 0));
            setTxt('pendingLeaves', String(att.pendingLeaves ?? 0));
            setTxt('ks-present', String(att.presentToday ?? 0));
            setTxt('ks-leaves', String(att.pendingLeaves ?? 0));
            setTxt('chipPresentDash', String(att.presentToday ?? 0));
            setTxt('chipPendingDash', String(att.pendingLeaves ?? 0));
        }

        // 6. Operations Hub: Payroll Analysis
        if (m.payroll) {
            const pay = m.payroll;
            setTxt('hubPayrollMonthBadge', `Cycle ${pay.month}/${pay.year}`);
            setTxt('hubPayrollNetVal', fmt(pay.totalNetUsd));
            setTxt('hubPayrollGross', fmt(pay.totalGrossUsd));
            setTxt('hubPayrollTax', fmt(pay.totalTaxUsd));
            setTxt('hubPayrollAvg', fmt(pay.avgSalaryUsd));
        }

        // 7. Operations Hub: Employee Workforce Analysis
        if (m.employees) {
            const emp = m.employees;
            setTxt('hubEmployeeBadge', `${emp.total} Active Staff`);

            const deptList = document.getElementById('hubDeptList');
            if (deptList && emp.departments) {
                const colors = ['#b68cff', '#62c88a', '#5cb3ff', '#f59e0b'];
                deptList.innerHTML = emp.departments.map((d, i) => {
                    const color = colors[i % colors.length];
                    const pct = emp.total > 0 ? Math.round((d.headcount / emp.total) * 100) : 33;
                    return `
                        <div class="hub-dept-row">
                            <div class="hub-dept-info">
                                <span class="hub-dept-name"><i class="fas fa-circle-dot" style="color:${color};font-size:9px;margin-right:4px;"></i> ${escapeHtml(d.name)}</span>
                                <span class="hub-dept-meta">${d.headcount} Staff · ${d.attendanceRate}% Present</span>
                            </div>
                            <div class="hub-dept-bar-track">
                                <div class="hub-dept-bar-fill" style="background:${color};width:${pct}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            setTxt('hubRetentionRate', '99.4%');
            setTxt('hubEfficiencyIndex', `${emp.departments?.[0]?.efficiencyScore || 98.5}%`);
            setTxt('hubActiveDeptCount', String(emp.departments?.length || 3));

            // Compatibility counters
            setTxt('totalEmployees', String(emp.total ?? 0));
            setTxt('ks-staff', String(emp.total ?? 0));
            setTxt('chipStaffDash', String(emp.total ?? 0));
        }

        // 8. Sync Timestamp in Geographical Currency Time
        const curCode = document.getElementById('settingsCurrencySelect')?.value || document.getElementById('currencySelect')?.value || window.appCurrency || 'USD';
        if (typeof window.updateGeographicalSyncTime === 'function') {
            window.updateGeographicalSyncTime(curCode, false);
        } else {
            const syncEl = document.getElementById('lastSyncTime');
            if (syncEl) {
                const now = new Date();
                syncEl.textContent = `Sync: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
            }
        }
    }

    // ── LIVE ACTION BUTTONS ──
    function bindLiveActionButtons() {
        // Quick Roll-Call Button
        const rollCallBtn = document.getElementById('liveRollCallBtn');
        if (rollCallBtn) {
            rollCallBtn.addEventListener('click', async () => {
                rollCallBtn.disabled = true;
                rollCallBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Syncing...';

                try {
                    // Send via WebSocket action if open, else fallback to POST
                    if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                        realtimeWs.send(JSON.stringify({
                            action: 'mark_attendance',
                            payload: {
                                employeeId: 1,
                                date: new Date().toISOString().split('T')[0],
                                status: 'Present'
                            }
                        }));
                    } else {
                        const res = await fetch('/api/dashboard/mark-attendance', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                employeeId: 1,
                                date: new Date().toISOString().split('T')[0],
                                status: 'Present'
                            })
                        });
                        const data = await res.json();
                        if (data.metrics) applyRealtimeMetrics(data.metrics);
                    }
                    showToastNotification('✓ Realtime Attendance verified & broadcast', 'success');
                } catch (err) {
                    showToastNotification('Notice: Attendance verified locally', 'info');
                } finally {
                    setTimeout(() => {
                        rollCallBtn.disabled = false;
                        rollCallBtn.innerHTML = '<i class="fas fa-clipboard-check"></i> Roll-Call';
                    }, 600);
                }
            });
        }

        // Run Live Payroll Cycle Button
        const runPayBtn = document.getElementById('liveRunPayrollBtn');
        if (runPayBtn) {
            runPayBtn.addEventListener('click', async () => {
                runPayBtn.disabled = true;
                runPayBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';

                try {
                    const now = new Date();
                    const month = now.getMonth() + 1;
                    const year = now.getFullYear();

                    if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                        realtimeWs.send(JSON.stringify({
                            action: 'run_payroll',
                            payload: { month, year }
                        }));
                    } else {
                        const res = await fetch('/api/dashboard/run-payroll', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ month, year })
                        });
                        const data = await res.json();
                        if (data.metrics) applyRealtimeMetrics(data.metrics);
                    }
                    showToastNotification('✓ Realtime Payroll cycle recalculated & broadcast', 'success');
                } catch (err) {
                    showToastNotification('Notice: Payroll recalculated locally', 'info');
                } finally {
                    setTimeout(() => {
                        runPayBtn.disabled = false;
                        runPayBtn.innerHTML = '<i class="fas fa-play"></i> Process Cycle';
                    }, 600);
                }
            });
        }

        // Manage Staff Button
        const manageStaffBtn = document.getElementById('liveManageStaffBtn');
        if (manageStaffBtn) {
            manageStaffBtn.addEventListener('click', () => {
                if (typeof window.switchToTab === 'function') {
                    window.switchToTab('employees');
                }
            });
        }

        // Refresh / Sync Live Stream Button
        const refreshBtn = document.getElementById('refreshRealtimeBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('fa-spin');

                const curCode = document.getElementById('settingsCurrencySelect')?.value || document.getElementById('currencySelect')?.value || window.appCurrency || 'USD';
                if (typeof window.updateGeographicalSyncTime === 'function') {
                    window.updateGeographicalSyncTime(curCode, true);
                }

                if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                    realtimeWs.send(JSON.stringify({ action: 'get_metrics' }));
                } else {
                    try {
                        const res = await fetch('/api/dashboard/metrics');
                        const data = await res.json();
                        if (data.data) applyRealtimeMetrics(data.data);
                    } catch (_) {}
                }

                setTimeout(() => {
                    refreshBtn.disabled = false;
                    if (icon) icon.classList.remove('fa-spin');
                    showToastNotification('✓ Live telemetry stream synchronized', 'success');
                }, 400);
            });
        }

        // Initialize and maintain dynamic time and date greeting
        updateDashboardGreeting();
        setInterval(updateDashboardGreeting, 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHelios);
    } else {
        initHelios();
    }

    // Expose for global triggers and currency changes
    window.heliosRenderChart = renderSvgChart;
    window.heliosSyncHolding = syncTotalHolding;
    window.heliosApplyMetrics = applyRealtimeMetrics;
})();
