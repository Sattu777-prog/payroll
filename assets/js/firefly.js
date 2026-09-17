/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ✦ PAYROLL NEXUS — AUTONOMOUS FIREFLY SYSTEM
 * A tiny living creature freely exploring the Payroll Nexus environment
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    // Guard against duplicate instances
    if (window.__PAYROLL_NEXUS_FIREFLY__) {
        try {
            window.__PAYROLL_NEXUS_FIREFLY__.destroy();
        } catch (_) {}
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 1. MOTION PREFERENCE MANAGER
    // ══════════════════════════════════════════════════════════════════════════
    class MotionPreferenceManager {
        constructor() {
            this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.prefersReduced = this.mediaQuery.matches;

            this.mediaQuery.addEventListener('change', (e) => {
                this.prefersReduced = e.matches;
            });
        }

        isReduced() {
            const hasAppDisabled = document.body.classList.contains('motion-disabled') ||
                                   document.body.classList.contains('no-anim');
            return this.prefersReduced || hasAppDisabled;
        }

        getSpeedScale() {
            return this.isReduced() ? 0.35 : 1.0;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. ANTENNA SPRING PHYSICS
    // ══════════════════════════════════════════════════════════════════════════
    class AntennaPhysics {
        constructor(svgRoot) {
            this.svg = svgRoot;
            this.pathL = svgRoot.querySelector('#fireflyAntennaL');
            this.pathR = svgRoot.querySelector('#fireflyAntennaR');
            this.tipL = svgRoot.querySelector('#fireflyAntennaTipL');
            this.tipR = svgRoot.querySelector('#fireflyAntennaTipR');
            this.glintL = svgRoot.querySelector('#fireflyAntennaTipGlintL');
            this.glintR = svgRoot.querySelector('#fireflyAntennaTipGlintR');

            // Rest positions in 160x160 SVG coordinate frame
            this.baseL = { x: 76, y: 46 };
            this.restTipL = { x: 55, y: 20 };
            this.currTipL = { x: 55, y: 20 };

            this.baseR = { x: 84, y: 46 };
            this.restTipR = { x: 105, y: 20 };
            this.currTipR = { x: 105, y: 20 };

            this.spring = 0.22;
            this.damping = 0.78;
            this.vxL = 0;
            this.vyL = 0;
            this.vxR = 0;
            this.vyR = 0;
        }

        update(dt, velocity, acceleration, mouseCuriosity = 0, isPeeking = false) {
            // Velocity drag & acceleration inertia
            const dragX = -velocity.x * 0.035 - acceleration.x * 0.06;
            const dragY = -velocity.y * 0.035 - acceleration.y * 0.06;

            // Curious twitch while peeking or noticing mouse
            const twitch = isPeeking ? Math.sin(performance.now() * 0.008) * 3 : 0;

            const targetLx = this.restTipL.x + dragX + mouseCuriosity * 5 + twitch;
            const targetLy = this.restTipL.y + dragY + (isPeeking ? -2 : 0);

            const targetRx = this.restTipR.x + dragX + mouseCuriosity * 5 - twitch;
            const targetRy = this.restTipR.y + dragY + (isPeeking ? -2 : 0);

            // Left spring integration
            const axL = (targetLx - this.currTipL.x) * this.spring;
            const ayL = (targetLy - this.currTipL.y) * this.spring;
            this.vxL = (this.vxL + axL) * this.damping;
            this.vyL = (this.vyL + ayL) * this.damping;
            this.currTipL.x += this.vxL;
            this.currTipL.y += this.vyL;

            // Right spring integration
            const axR = (targetRx - this.currTipR.x) * this.spring;
            const ayR = (targetRy - this.currTipR.y) * this.spring;
            this.vxR = (this.vxR + axR) * this.damping;
            this.vyR = (this.vyR + ayR) * this.damping;
            this.currTipR.x += this.vxR;
            this.currTipR.y += this.vyR;

            // Update SVG paths
            if (this.pathL && this.tipL) {
                const midLx = (this.baseL.x + this.currTipL.x) * 0.5 - 4;
                const midLy = (this.baseL.y + this.currTipL.y) * 0.5 - 2;
                this.pathL.setAttribute('d', `M ${this.baseL.x} ${this.baseL.y} Q ${midLx.toFixed(1)} ${midLy.toFixed(1)} ${this.currTipL.x.toFixed(1)} ${this.currTipL.y.toFixed(1)}`);
                this.tipL.setAttribute('cx', this.currTipL.x.toFixed(1));
                this.tipL.setAttribute('cy', this.currTipL.y.toFixed(1));
                if (this.glintL) {
                    this.glintL.setAttribute('cx', (this.currTipL.x - 0.7).toFixed(1));
                    this.glintL.setAttribute('cy', (this.currTipL.y - 0.7).toFixed(1));
                }
            }

            if (this.pathR && this.tipR) {
                const midRx = (this.baseR.x + this.currTipR.x) * 0.5 + 4;
                const midRy = (this.baseR.y + this.currTipR.y) * 0.5 - 2;
                this.pathR.setAttribute('d', `M ${this.baseR.x} ${this.baseR.y} Q ${midRx.toFixed(1)} ${midRy.toFixed(1)} ${this.currTipR.x.toFixed(1)} ${this.currTipR.y.toFixed(1)}`);
                this.tipR.setAttribute('cx', this.currTipR.x.toFixed(1));
                this.tipR.setAttribute('cy', this.currTipR.y.toFixed(1));
                if (this.glintR) {
                    this.glintR.setAttribute('cx', (this.currTipR.x - 0.7).toFixed(1));
                    this.glintR.setAttribute('cy', (this.currTipR.y - 0.7).toFixed(1));
                }
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. SUBTLE DIGITAL DUST PARTICLE SYSTEM (Max 12 particles)
    // ══════════════════════════════════════════════════════════════════════════
    class ParticleSystem {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.maxParticles = 12;
            this.pool = [];
            this.colors = ['#ffd768', '#b68cff', '#7c8cff', '#60a5fa', '#ffffff'];

            this.resize();
            this.onResize = () => this.resize();
            window.addEventListener('resize', this.onResize, { passive: true });

            for (let i = 0; i < this.maxParticles; i++) {
                this.pool.push({
                    active: false,
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    size: 1.5,
                    alpha: 1,
                    life: 0,
                    maxLife: 0.5,
                    color: '#ffd768'
                });
            }
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        spawn(x, y, speed = 60, burst = false) {
            let p = null;
            for (let i = 0; i < this.pool.length; i++) {
                if (!this.pool[i].active) {
                    p = this.pool[i];
                    break;
                }
            }
            if (!p) return;

            p.active = true;
            p.x = x + (Math.random() - 0.5) * 4;
            p.y = y + (Math.random() - 0.5) * 4;

            const spread = burst ? 45 : 16;
            p.vx = (Math.random() - 0.5) * spread;
            p.vy = (Math.random() - 0.5) * spread + 6;
            p.size = Math.random() * 1.6 + 1.0;
            p.alpha = Math.min(0.85, 0.4 + speed * 0.002);
            p.life = 0;
            p.maxLife = 0.35 + Math.random() * 0.3;
            p.color = this.colors[Math.floor(Math.random() * this.colors.length)];
        }

        updateAndRender(dt) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (let i = 0; i < this.pool.length; i++) {
                const p = this.pool[i];
                if (!p.active) continue;

                p.life += dt;
                if (p.life >= p.maxLife) {
                    p.active = false;
                    continue;
                }

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.size *= 0.96;
                const progress = p.life / p.maxLife;
                const alpha = Math.max(0, p.alpha * (1 - progress));

                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = p.color;
                this.ctx.shadowBlur = 4;
                this.ctx.shadowColor = p.color;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, Math.max(0.4, p.size), 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        destroy() {
            window.removeEventListener('resize', this.onResize);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. ENVIRONMENT SCANNER & TARGET SELECTOR
    // ══════════════════════════════════════════════════════════════════════════
    class EnvironmentScanner {
        constructor() {
            this.cards = [];
            this.dangerZones = [];
            this.currentSection = 'dashboard';
            this.recentTargets = [];
            this.lastScan = 0;

            this.scan();
        }

        scan() {
            const now = performance.now();
            if (now - this.lastScan < 600) return; // Throttle scans
            this.lastScan = now;

            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // 1. Scan UI Cards & Panels
            this.cards = [];
            const cardSelectors = [
                '.glass', '.helios-chart-card', '.qa-card', '.kpi-card',
                '.table-wrap', '.helios-telemetry-banner', '.dc10-card',
                '.payroll-stat-card', '.tilt-card', '#payrollTrendChart',
                '#empDeptChart', '#attendancePieChart'
            ];

            const foundEls = document.querySelectorAll(cardSelectors.join(','));
            foundEls.forEach(el => {
                const r = el.getBoundingClientRect();
                // Only consider visible elements in viewport
                if (r.width > 60 && r.height > 40 && r.bottom > 40 && r.top < vh - 40 && r.right > 40 && r.left < vw - 40) {
                    this.cards.push({
                        el,
                        left: r.left,
                        top: r.top,
                        right: r.right,
                        bottom: r.bottom,
                        width: r.width,
                        height: r.height,
                        cx: (r.left + r.right) * 0.5,
                        cy: (r.top + r.bottom) * 0.5
                    });
                }
            });

            // 2. Scan Danger / Important Interactive Areas (Buttons, inputs, modals)
            this.dangerZones = [];
            const dangerSelectors = [
                'button', 'input', 'select', 'textarea', '.tab-btn',
                '.modal-card', '.pn-drawer', '#themeToggle', '.helios-metric-value'
            ];
            const dangerEls = document.querySelectorAll(dangerSelectors.join(','));
            dangerEls.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh) {
                    this.dangerZones.push({
                        left: r.left - 10,
                        top: r.top - 10,
                        right: r.right + 10,
                        bottom: r.bottom + 10
                    });
                }
            });
        }

        isDanger(x, y) {
            for (let i = 0; i < this.dangerZones.length; i++) {
                const z = this.dangerZones[i];
                if (x >= z.left && x <= z.right && y >= z.top && y <= z.bottom) {
                    return true;
                }
            }
            return false;
        }

        selectDestination(currentX, currentY, energy = 0.5, forceType = null) {
            this.scan();

            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const candidates = [];

            // ── TYPE A: Spaces Between Sections & Corridors (Through channels and gutters) ──
            const emptyCorridors = [
                // Top header airspace between shell top and topbar
                { x: vw * 0.22, y: Math.max(60, vh * 0.10), type: 'empty' },
                { x: vw * 0.52, y: Math.max(60, vh * 0.12), type: 'empty' },
                { x: vw * 0.82, y: Math.max(60, vh * 0.10), type: 'empty' },
                // Mid-screen left/right gutters beside sections
                { x: Math.max(35, vw * 0.05), y: vh * 0.42, type: 'beside-section' },
                { x: Math.min(vw - 35, vw * 0.95), y: vh * 0.38, type: 'beside-section' },
                // Lower exploration airspace below sections
                { x: vw * 0.28, y: Math.min(vh - 55, vh * 0.78), type: 'empty' },
                { x: vw * 0.72, y: Math.min(vh - 55, vh * 0.76), type: 'empty' },
                // Central traverse between sections
                { x: vw * 0.48, y: vh * 0.46, type: 'inter-section' }
            ];

            emptyCorridors.forEach(pt => {
                candidates.push({
                    x: pt.x + (Math.random() - 0.5) * 60,
                    y: pt.y + (Math.random() - 0.5) * 50,
                    type: pt.type,
                    targetCard: null
                });
            });

            // ── TYPE B: Gaps Between Sections & Beside Panels ──
            this.cards.forEach(card => {
                // Spaces beside cards / sections
                candidates.push({
                    x: Math.max(35, card.left - 24),
                    y: card.top + card.height * (0.2 + Math.random() * 0.6),
                    type: 'beside-section',
                    targetCard: card
                });
                candidates.push({
                    x: Math.min(vw - 35, card.right + 24),
                    y: card.top + card.height * (0.2 + Math.random() * 0.6),
                    type: 'beside-section',
                    targetCard: card
                });
                // Space above card (inter-section channel)
                candidates.push({
                    x: card.left + card.width * (0.25 + Math.random() * 0.5),
                    y: Math.max(55, card.top - 20),
                    type: 'inter-section',
                    targetCard: card
                });
                // Space below card (between rows of sections)
                candidates.push({
                    x: card.left + card.width * (0.25 + Math.random() * 0.5),
                    y: Math.min(vh - 55, card.bottom + 18),
                    type: 'inter-section',
                    targetCard: card
                });

                // ── TYPE C: Cross-Section Flights (Underneath cards & panels) ──
                // When moving between sections, flight across or behind the card occludes parts of the creature
                if (card.width > 120 && card.height > 80) {
                    // Flight target taking it underneath the card/panel
                    candidates.push({
                        x: card.cx + (Math.random() - 0.5) * card.width * 0.6,
                        y: card.cy + (Math.random() - 0.5) * card.height * 0.6,
                        type: 'underneath-section',
                        targetCard: card
                    });

                    // Peeking along card perimeter from underneath
                    candidates.push({
                        x: card.left + card.width * 0.45 + (Math.random() - 0.5) * 40,
                        y: card.top + 6,
                        type: 'peek',
                        targetCard: card
                    });
                }
            });

            // Filter candidates:
            // 1. Must be comfortably inside viewport
            // 2. Minimum travel distance (~130px) to prevent getting stuck
            // 3. Not in recent target history
            let valid = candidates.filter(cand => {
                cand.x = Math.max(35, Math.min(vw - 35, cand.x));
                cand.y = Math.max(45, Math.min(vh - 45, cand.y));

                const dist = Math.hypot(cand.x - currentX, cand.y - currentY);
                if (dist < 120) return false;

                for (let i = 0; i < this.recentTargets.length; i++) {
                    const r = this.recentTargets[i];
                    if (Math.hypot(cand.x - r.x, cand.y - r.y) < 90) return false;
                }

                if (forceType && cand.type !== forceType) return false;

                return true;
            });

            if (valid.length === 0) {
                valid = candidates.sort((a, b) => {
                    const da = Math.hypot(a.x - currentX, a.y - currentY);
                    const db = Math.hypot(b.x - currentX, b.y - currentY);
                    return db - da;
                });
            }

            // Weighted selection:
            // High energy -> prefers cross-section travel, corridors, and spaces between sections
            // Low energy -> prefers peeking under card edges or resting in quiet spaces
            let chosen = null;
            if (energy < 0.35 && Math.random() < 0.5) {
                const peeks = valid.filter(c => c.type === 'peek');
                if (peeks.length > 0) chosen = peeks[Math.floor(Math.random() * peeks.length)];
            }

            if (!chosen) {
                // Natural weighted pick
                chosen = valid[Math.floor(Math.random() * valid.length)] || {
                    x: Math.max(45, Math.min(vw - 45, vw * 0.5 + (Math.random() - 0.5) * vw * 0.6)),
                    y: Math.max(55, Math.min(vh - 55, vh * 0.4 + (Math.random() - 0.5) * vh * 0.5)),
                    type: 'empty',
                    targetCard: null
                };
            }

            // Save history
            this.recentTargets.push({ x: chosen.x, y: chosen.y });
            if (this.recentTargets.length > 4) this.recentTargets.shift();

            return chosen;
        }

        isUnderCard(x, y) {
            for (let i = 0; i < this.cards.length; i++) {
                const c = this.cards[i];
                if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) {
                    return c;
                }
            }
            return null;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. NATURAL FLIGHT PHYSICS SYSTEM (Never teleports, organic curved paths)
    // ══════════════════════════════════════════════════════════════════════════
    class PhysicsSystem {
        constructor(startX, startY) {
            this.x = startX;
            this.y = startY;
            this.vx = 0;
            this.vy = 0;
            this.ax = 0;
            this.ay = 0;

            this.targetX = startX;
            this.targetY = startY;

            // Head and body rotations for organic follow-through
            this.rotation = 0;
            this.targetRotation = 0;
            this.bodyRotLag = 0;
            this.abdomenRotLag = 0;
            this.bankAngle = 0;

            // Physics parameters
            this.maxSpeed = 210;
            this.maxForce = 320;
            this.friction = 0.92;
            this.arrivalRadius = 85;

            // Organic curvature wave phase
            this.curvePhase = Math.random() * Math.PI * 2;
            this.curveFreq = 3.2;
            this.curveAmp = 38;
        }

        setTarget(x, y, style = 'normal') {
            this.targetX = x;
            this.targetY = y;
            this.curvePhase = Math.random() * Math.PI * 2;
            this.isOrbiting = false;

            if (style === 'wide-arc') {
                this.curveFreq = 1.8;
                this.curveAmp = 55;
            } else if (style === 's-curve') {
                this.curveFreq = 4.2;
                this.curveAmp = 35;
            } else {
                this.curveFreq = 2.8;
                this.curveAmp = 28;
            }
        }

        setOrbit(cx, cy, radiusX, radiusY) {
            this.orbitCenter = { cx, cy };
            this.orbitRadiusX = Math.max(35, radiusX);
            this.orbitRadiusY = Math.max(28, radiusY);
            this.orbitAngle = Math.atan2(this.y - cy, this.x - cx);
            this.isOrbiting = true;
        }

        clearOrbit() {
            this.isOrbiting = false;
            this.orbitCenter = null;
        }

        update(dt, speedScale = 1.0) {
            if (this.isOrbiting && this.orbitCenter) {
                // Circular/elliptical parametric orbit for INTERACTING state ("slow circle or hover")
                this.orbitAngle += dt * 1.5;
                this.targetX = this.orbitCenter.cx + Math.cos(this.orbitAngle) * this.orbitRadiusX;
                this.targetY = this.orbitCenter.cy + Math.sin(this.orbitAngle) * this.orbitRadiusY;
            }

            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 5) {
                // Reynolds Seek with Dynamic Arrival
                let desiredSpeed = this.maxSpeed * speedScale;
                if (dist < this.arrivalRadius) {
                    desiredSpeed *= (dist / this.arrivalRadius);
                }

                const nx = dx / dist;
                const ny = dy / dist;

                // Organic lateral wave force perpendicular to path
                this.curvePhase += dt * this.curveFreq;
                const lateralFactor = Math.min(1.0, dist / 80) * Math.sin(this.curvePhase) * this.curveAmp;
                const perpX = -ny * lateralFactor;
                const perpY = nx * lateralFactor;

                const targetVx = (nx * desiredSpeed) + (perpX * 0.4);
                const targetVy = (ny * desiredSpeed) + (perpY * 0.4);

                const steerX = Math.max(-this.maxForce, Math.min(this.maxForce, (targetVx - this.vx) * 3.6));
                const steerY = Math.max(-this.maxForce, Math.min(this.maxForce, (targetVy - this.vy) * 3.6));

                this.ax = steerX;
                this.ay = steerY;
            } else {
                // Gentle settling damping
                this.ax = -this.vx * 4.2;
                this.ay = -this.vy * 4.2;
            }

            // Velocity integration with framerate-independent friction
            this.vx += this.ax * dt;
            this.vy += this.ay * dt;

            const frictionCoeff = Math.pow(this.friction, dt * 60);
            this.vx *= frictionCoeff;
            this.vy *= frictionCoeff;

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Viewport boundary containment
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            this.x = Math.max(30, Math.min(vw - 30, this.x));
            this.y = Math.max(45, Math.min(vh - 45, this.y));

            // Smooth heading rotation & banking
            const currentSpeed = Math.hypot(this.vx, this.vy);
            if (currentSpeed > 14) {
                this.targetRotation = Math.atan2(this.vy, this.vx) + (Math.PI * 0.5);
            }

            let diff = this.targetRotation - this.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            // Turn rate dictates banking lean
            const turnRate = diff / Math.max(0.001, dt);
            this.bankAngle = Math.max(-0.42, Math.min(0.42, -turnRate * 0.04));

            this.rotation += diff * Math.min(1.0, dt * 6.5);

            // Body follow-through lag
            this.bodyRotLag += (this.rotation - this.bodyRotLag) * Math.min(1.0, dt * 4.8);
            this.abdomenRotLag += (this.bodyRotLag - this.abdomenRotLag) * Math.min(1.0, dt * 3.5);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. AUTONOMOUS STATE MACHINE & ENERGY SYSTEM
    // ══════════════════════════════════════════════════════════════════════════
    const STATES = {
        IDLE: 'state-idle',
        ENTERING: 'state-entering',
        TRAVEL: 'state-travelling',
        REACT: 'state-reacting',
        INTERACT: 'state-interacting',
        REST: 'state-resting',
        HOVER: 'state-hover',
        PEEK: 'state-peeking',
        INSPECT: 'state-inspecting'
    };

    class FireflyStateMachine {
        constructor(controller) {
            this.ctrl = controller;
            this.state = STATES.ENTERING;
            this.stateTimer = 0;
            this.duration = 1.5;
            this.energy = 0.85; // Energy scale: 0.0 (tired) -> 1.0 (energetic)
        }

        setState(newState, duration = 3.0) {
            this.state = newState;
            this.stateTimer = 0;
            this.duration = duration;

            const el = this.ctrl.creatureEl;
            Object.values(STATES).forEach(cls => el.classList.remove(cls));
            el.classList.add(newState);

            this.ctrl.onStateTransition(newState);
        }

        update(dt) {
            this.stateTimer += dt;

            // Energy dynamics
            if (this.state === STATES.TRAVEL) {
                this.energy = Math.max(0.1, this.energy - dt * 0.04);
            } else if (this.state === STATES.REST) {
                this.energy = Math.min(1.0, this.energy + dt * 0.12);
            } else {
                this.energy = Math.min(1.0, this.energy + dt * 0.02);
            }

            if (this.stateTimer >= this.duration) {
                this.decideNextStep();
            }
        }

        decideNextStep() {
            const dist = Math.hypot(this.ctrl.physics.targetX - this.ctrl.physics.x, this.ctrl.physics.targetY - this.ctrl.physics.y);

            // If still traveling long distance, extend travel slightly
            if (this.state === STATES.TRAVEL && dist > 50 && this.stateTimer < 5.0) {
                this.stateTimer = 0;
                this.duration = 1.5;
                return;
            }

            // Arrived at destination: decide what to do at this location
            if (this.state === STATES.TRAVEL || this.state === STATES.ENTERING) {
                const currentType = this.ctrl.currentDestinationType;
                const targetCard = this.ctrl.peekingCard;

                if (currentType === 'peek') {
                    // Peek behind card perimeter!
                    this.setState(STATES.PEEK, 2.5 + Math.random() * 1.8);
                    return;
                } else if (targetCard && (currentType === 'beside-section' || currentType === 'underneath-section')) {
                    // 65% chance: INTERACTING ("Explores UI elements, slow circle or hover")
                    if (Math.random() < 0.65) {
                        this.ctrl.physics.setOrbit(
                            targetCard.cx,
                            targetCard.cy,
                            Math.min(targetCard.width * 0.45, 95),
                            Math.min(targetCard.height * 0.45, 65)
                        );
                        this.setState(STATES.INTERACT, 2.8 + Math.random() * 2.0);
                        return;
                    } else {
                        // IDLE: "Gentle floating, subtle wing movement, soft glow pulse"
                        this.setState(STATES.IDLE, 2.2 + Math.random() * 2.0);
                        return;
                    }
                } else {
                    // IDLE: open airspace float
                    this.setState(STATES.IDLE, 2.2 + Math.random() * 2.5);
                    return;
                }
            }

            // If done interacting, idling, peeking, or resting:
            if (this.state === STATES.INTERACT || this.state === STATES.IDLE || this.state === STATES.HOVER || this.state === STATES.PEEK || this.state === STATES.REST || this.state === STATES.REACT || this.state === STATES.INSPECT) {
                this.ctrl.physics.clearOrbit();

                // If tired, enter REST state ("Minimal movement, soft pulse, calm float")
                if (this.energy < 0.25 && this.state !== STATES.REST && Math.random() < 0.6) {
                    this.setState(STATES.REST, 3.5 + Math.random() * 3.5);
                    return;
                }

                // If peeking, emerge smoothly first
                if (this.state === STATES.PEEK) {
                    this.ctrl.emergeFromPeek();
                }

                this.ctrl.takeOffToNewTarget();
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. MASTER FIREFLY CONTROLLER
    // ══════════════════════════════════════════════════════════════════════════
    class FireflyController {
        constructor() {
            this.motionMgr = new MotionPreferenceManager();
            this.scanner = new EnvironmentScanner();

            this.currentDestinationType = 'empty';
            this.currentDepth = 'front';
            this.peekingCard = null;

            this.mousePos = { x: -999, y: -999 };
            this.mouseCuriosity = 0;
            this.lastReactionTime = 0;
            this.isUnderCardActive = false;

            this.initDOM();
            this.initPhysics();
            this.initAntenna();
            this.initParticles();
            this.initEnvironmentEvents();

            this.stateMachine = new FireflyStateMachine(this);

            this.lastTime = performance.now();
            this.rafId = null;
            this.isRunning = true;

            this.loop = this.loop.bind(this);
            this.rafId = requestAnimationFrame(this.loop);

            // Tab visibility management (CPU guard)
            this.onVisibilityChange = () => {
                if (document.hidden) {
                    this.pause();
                } else {
                    this.resume();
                }
            };
            document.addEventListener('visibilitychange', this.onVisibilityChange);

            // Launch first autonomous flight after page settles
            setTimeout(() => {
                this.takeOffToNewTarget();
            }, 500);
        }

        initDOM() {
            let world = document.getElementById('firefly-world');
            if (!world) {
                world = document.createElement('div');
                world.id = 'firefly-world';
                world.setAttribute('aria-hidden', 'true');
                document.body.appendChild(world);
            }
            world.setAttribute('data-depth', 'underneath');
            this.worldEl = world;

            // Subtle particle canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'firefly-particle-canvas';
            this.worldEl.appendChild(canvas);
            this.canvasEl = canvas;

            // Creature container
            const creature = document.createElement('div');
            creature.className = 'firefly-creature state-entering';
            creature.id = 'payroll-firefly';

            // High-fidelity SVG based on reference image
            creature.innerHTML = `
                <svg class="firefly-svg" viewBox="0 0 160 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <!-- Translucent wing gradient with specular rim -->
                        <linearGradient id="fireflyWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="var(--firefly-wing-specular)" stop-opacity="0.95"/>
                            <stop offset="35%" stop-color="var(--firefly-wing-fill)" stop-opacity="0.55"/>
                            <stop offset="70%" stop-color="var(--firefly-accent)" stop-opacity="0.32"/>
                            <stop offset="100%" stop-color="var(--firefly-accent2)" stop-opacity="0.55"/>
                        </linearGradient>

                        <!-- Glowing bioluminescent abdomen core -->
                        <radialGradient id="fireflyCoreGrad" cx="50%" cy="38%" r="58%">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
                            <stop offset="26%" stop-color="var(--firefly-glow-warm)" stop-opacity="0.95"/>
                            <stop offset="65%" stop-color="var(--firefly-accent)" stop-opacity="0.75"/>
                            <stop offset="92%" stop-color="var(--firefly-accent2)" stop-opacity="0.35"/>
                            <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                        </radialGradient>

                        <!-- Inner core hotspot -->
                        <radialGradient id="fireflyCoreInnerGrad" cx="50%" cy="32%" r="50%">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
                            <stop offset="42%" stop-color="#fff8cc" stop-opacity="0.95"/>
                            <stop offset="80%" stop-color="var(--firefly-glow-warm)" stop-opacity="0.85"/>
                            <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                        </radialGradient>

                        <!-- Soft atmospheric glow aura -->
                        <radialGradient id="fireflyAuraGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="var(--firefly-glow-warm)" stop-opacity="0.9"/>
                            <stop offset="40%" stop-color="var(--firefly-glow-ambient)" stop-opacity="0.45"/>
                            <stop offset="75%" stop-color="var(--firefly-glow-violet)" stop-opacity="0.22"/>
                            <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                        </radialGradient>

                        <!-- Head specular sheen -->
                        <radialGradient id="fireflyHeadHighlight" cx="38%" cy="30%" r="62%">
                            <stop offset="0%" stop-color="rgba(255,255,255,0.45)"/>
                            <stop offset="50%" stop-color="rgba(255,255,255,0.06)"/>
                            <stop offset="100%" stop-color="transparent"/>
                        </radialGradient>
                    </defs>

                    <g class="firefly">
                        <!-- Soft localized glow aura -->
                        <g class="glow-auras">
                            <circle cx="80" cy="102" r="44" fill="url(#fireflyAuraGrad)" class="firefly-aura"/>
                        </g>

                        <!-- 2 BACK WINGS -->
                        <g class="wings-back">
                            <g class="wing-group wing-left-back">
                                <path class="firefly-wing" d="M 73 76 C 56 70, 28 66, 16 75 C 10 80, 16 92, 38 92 C 54 92, 68 83, 73 76 Z"/>
                                <path class="firefly-wing-vein" d="M 73 76 C 48 78, 26 80, 18 76"/>
                            </g>
                            <g class="wing-group wing-right-back">
                                <path class="firefly-wing" d="M 87 76 C 104 70, 132 66, 144 75 C 150 80, 144 92, 122 92 C 106 92, 92 83, 87 76 Z"/>
                                <path class="firefly-wing-vein" d="M 87 76 C 112 78, 134 80, 142 76"/>
                            </g>
                        </g>

                        <!-- ABDOMEN & BIOLUMINESCENT DATA CORE -->
                        <g class="abdomen-group">
                            <path class="firefly-abdomen" d="M 70 82 C 67 98, 68 116, 80 128 C 92 116, 93 98, 90 82 Z"/>
                            <!-- Cybernetic ribbed data bands -->
                            <path d="M 71 90 Q 80 95 89 90" stroke="var(--firefly-accent)" stroke-width="1.2" opacity="0.65" fill="none"/>
                            <path d="M 73 99 Q 80 104 87 99" stroke="var(--firefly-accent2)" stroke-width="1.2" opacity="0.75" fill="none"/>
                            <!-- Glowing data hotspots -->
                            <ellipse cx="80" cy="104" rx="14" ry="18" fill="url(#fireflyCoreGrad)" class="firefly-core"/>
                            <ellipse cx="80" cy="107" rx="8" ry="11" fill="url(#fireflyCoreInnerGrad)" class="firefly-core-inner"/>
                        </g>

                        <!-- BODY / THORAX -->
                        <g class="body-group">
                            <ellipse cx="80" cy="74" rx="13" ry="12" class="firefly-body-main"/>
                            <ellipse cx="78" cy="70" rx="9" ry="6" fill="rgba(255,255,255,0.18)"/>
                        </g>

                        <!-- HEAD & EXPRESSIVE SENSOR EYES -->
                        <g class="head-group">
                            <circle cx="80" cy="55" r="12" class="firefly-head"/>
                            <circle cx="80" cy="55" r="12" fill="url(#fireflyHeadHighlight)"/>
                            <circle cx="75" cy="53" r="2.8" class="firefly-eye"/>
                            <circle cx="74.2" cy="52.2" r="0.9" fill="#ffffff" opacity="0.9"/>
                            <circle cx="85" cy="53" r="2.8" class="firefly-eye"/>
                            <circle cx="84.2" cy="52.2" r="0.9" fill="#ffffff" opacity="0.9"/>
                        </g>

                        <!-- 2 DYNAMIC ANTENNAE WITH SPRING PHYSICS -->
                        <g class="antennae-group">
                            <path id="fireflyAntennaL" class="antenna antenna-left" d="M 76 46 Q 65 33 55 20"/>
                            <circle id="fireflyAntennaTipL" cx="55" cy="20" r="2.8" class="antenna-tip antenna-tip-left"/>
                            <circle id="fireflyAntennaTipGlintL" cx="54.2" cy="19.2" r="0.9" fill="#ffffff"/>

                            <path id="fireflyAntennaR" class="antenna antenna-right" d="M 84 46 Q 95 33 105 20"/>
                            <circle id="fireflyAntennaTipR" cx="105" cy="20" r="2.8" class="antenna-tip antenna-tip-right"/>
                            <circle id="fireflyAntennaTipGlintR" cx="104.2" cy="19.2" r="0.9" fill="#ffffff"/>
                        </g>

                        <!-- 2 FRONT WINGS -->
                        <g class="wings-front">
                            <g class="wing-group wing-left-front">
                                <path class="firefly-wing" d="M 74 68 C 65 44, 30 28, 12 36 C 4 41, 8 62, 38 72 C 55 78, 70 72, 74 68 Z"/>
                                <path class="firefly-wing-vein" d="M 74 68 C 50 54, 26 42, 14 38"/>
                                <path d="M 12 36 C 30 28, 65 44, 74 68" fill="none" stroke="var(--firefly-wing-specular)" stroke-width="0.75" opacity="0.8"/>
                            </g>
                            <g class="wing-group wing-right-front">
                                <path class="firefly-wing" d="M 86 68 C 95 44, 130 28, 148 36 C 156 41, 152 62, 122 72 C 105 78, 90 72, 86 68 Z"/>
                                <path class="firefly-wing-vein" d="M 86 68 C 110 54, 134 42, 146 38"/>
                                <path d="M 148 36 C 130 28, 95 44, 86 68" fill="none" stroke="var(--firefly-wing-specular)" stroke-width="0.75" opacity="0.8"/>
                            </g>
                        </g>
                    </g>
                </svg>
            `;

            this.worldEl.appendChild(creature);
            this.creatureEl = creature;
            this.svgEl = creature.querySelector('svg');
        }

        initPhysics() {
            // Initial position: safe upper-right area of screen
            const startX = Math.min(window.innerWidth - 65, window.innerWidth * 0.76);
            const startY = 120;
            this.physics = new PhysicsSystem(startX, startY);
        }

        initAntenna() {
            this.antenna = new AntennaPhysics(this.svgEl);
        }

        initParticles() {
            this.particles = new ParticleSystem(this.canvasEl);
        }

        initEnvironmentEvents() {
            // Mouse observation (NOT controller: cursor is only environmental context)
            window.addEventListener('pointermove', (e) => {
                this.mousePos.x = e.clientX;
                this.mousePos.y = e.clientY;
            }, { passive: true });

            // Viewport Scroll: continuous physical observer (never teleports!)
            let scrollTimeout = null;
            window.addEventListener('scroll', () => {
                if (scrollTimeout) clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.scanner.scan();
                }, 200);
            }, { passive: true });

            // Tab switching
            document.addEventListener('click', (e) => {
                const tab = e.target.closest && e.target.closest('[data-tab]');
                if (tab) {
                    setTimeout(() => {
                        this.scanner.scan();
                        if (this.stateMachine.state !== STATES.REST) {
                            this.takeOffToNewTarget();
                        }
                    }, 250);
                }
            }, true);

            // Interactive Click / Tap: Clicking near the firefly creates a burst of sparks and reaction
            window.addEventListener('click', (e) => {
                const cdist = Math.hypot(e.clientX - this.physics.x, e.clientY - this.physics.y);
                if (cdist < 140) {
                    this.lastReactionTime = performance.now();
                    this.particles.spawn(this.physics.x, this.physics.y, 80, true);
                    this.stateMachine.setState(STATES.REACT, 0.7);
                    setTimeout(() => {
                        this.takeOffToNewTarget();
                    }, 450);
                }
            }, { passive: true });

            // Interactive UI Exploration: Hovering over interactive cards invites the creature to circle or inspect
            document.addEventListener('pointerover', (e) => {
                const interactiveEl = e.target.closest && e.target.closest('.kpi-card, .helios-chart-card, .helios-hub-action-btn, #liveRunPayrollBtn, .tab-btn, .tilt-card');
                if (interactiveEl && (this.stateMachine.state === STATES.IDLE || this.stateMachine.state === STATES.HOVER)) {
                    const rect = interactiveEl.getBoundingClientRect();
                    const dist = Math.hypot(rect.left + rect.width * 0.5 - this.physics.x, rect.top + rect.height * 0.5 - this.physics.y);
                    if (dist < 260 && Math.random() < 0.55) {
                        this.stateMachine.setState(STATES.REACT, 0.7);
                        setTimeout(() => {
                            if (this.stateMachine.state === STATES.REACT) {
                                this.physics.setOrbit(
                                    rect.left + rect.width * 0.5,
                                    rect.top + rect.height * 0.5,
                                    Math.min(rect.width * 0.45, 90),
                                    Math.min(rect.height * 0.45, 60)
                                );
                                this.stateMachine.setState(STATES.INTERACT, 2.6);
                            }
                        }, 550);
                    }
                }
            }, { passive: true });
        }

        setDepth(depth) {
            if (this.currentDepth === depth) return;
            this.currentDepth = depth;
            this.worldEl.setAttribute('data-depth', depth);
        }

        takeOffToNewTarget() {
            const next = this.scanner.selectDestination(this.physics.x, this.physics.y, this.stateMachine.energy);
            this.currentDestinationType = next.type;
            this.peekingCard = next.targetCard;

            // Choose flight style based on destination and energy
            let style = 'normal';
            if (Math.random() < 0.35) style = 'wide-arc';
            else if (Math.random() < 0.35) style = 's-curve';

            this.physics.setTarget(next.x, next.y, style);

            // Persistent creature flight strictly in dedicated layer underneath website UI sections
            if (next.type === 'peek') {
                this.setDepth('back');
            } else {
                this.setDepth('underneath');
            }

            const dist = Math.hypot(next.x - this.physics.x, next.y - this.physics.y);
            const duration = Math.max(1.8, Math.min(4.5, dist / 110));
            this.stateMachine.setState(STATES.TRAVEL, duration);
        }

        emergeFromPeek() {
            // Smooth emergence from behind card into spaces between sections
            this.setDepth('underneath');
            this.physics.vy -= 40;
            this.physics.vx += (Math.random() - 0.5) * 50;
            this.particles.spawn(this.physics.x, this.physics.y, 60, true);
        }

        onStateTransition(newState) {
            switch (newState) {
                case STATES.TRAVEL:
                    this.physics.maxSpeed = 220;
                    break;
                case STATES.ENTERING:
                    this.physics.maxSpeed = 180;
                    break;
                case STATES.INTERACT:
                    this.physics.maxSpeed = 95;
                    break;
                case STATES.REACT:
                    this.physics.maxSpeed = 45;
                    break;
                case STATES.EXPLORE:
                    this.physics.maxSpeed = 160;
                    break;
                case STATES.INSPECT:
                    this.physics.maxSpeed = 45;
                    break;
                case STATES.PEEK:
                    this.physics.maxSpeed = 30;
                    break;
                case STATES.REST:
                    this.physics.maxSpeed = 25;
                    break;
                case STATES.HOVER:
                case STATES.IDLE:
                default:
                    this.physics.maxSpeed = 70;
                    break;
            }
        }

        pause() {
            this.isRunning = false;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
        }

        resume() {
            if (!this.isRunning) {
                this.isRunning = true;
                this.lastTime = performance.now();
                this.rafId = requestAnimationFrame(this.loop);
            }
        }

        loop(now) {
            const dt = Math.min((now - this.lastTime) * 0.001, 0.064);
            this.lastTime = now;

            if (!this.isRunning) return;

            const speedScale = this.motionMgr.getSpeedScale();

            // 1. Environmental Cursor Interaction (Notice & Avoid, never chase)
            const mdx = this.mousePos.x - this.physics.x;
            const mdy = this.mousePos.y - this.physics.y;
            const mDist = Math.hypot(mdx, mdy);

            if (mDist < 120 && mDist > 0) {
                // Expressive antenna curiosity
                this.mouseCuriosity = (mdx / mDist);

                // If creature is in IDLE, HOVER, or REST, trigger REACTING ("Brief glow increase, looks toward element")
                if ((this.stateMachine.state === STATES.IDLE || this.stateMachine.state === STATES.REST || this.stateMachine.state === STATES.HOVER) && (now - this.lastReactionTime > 2400)) {
                    this.lastReactionTime = now;
                    this.stateMachine.setState(STATES.REACT, 0.85);
                }

                // Gentle avoidance if cursor gets uncomfortably close (< 60px)
                if (mDist < 60) {
                    const push = (1 - (mDist / 60)) * 140;
                    this.physics.vx -= (mdx / mDist) * push * dt;
                    this.physics.vy -= (mdy / mDist) * push * dt;
                }
            } else {
                this.mouseCuriosity *= 0.92;
            }

            // 2. Autonomous Decision Tree & Physics Update
            this.stateMachine.update(dt);
            this.physics.update(dt, speedScale);

            // 3. Micro-hovering organic float layer (Lissajous compound oscillations)
            const t = now * 0.001;
            const isResting = (this.stateMachine.state === STATES.REST);
            const isPeeking = (this.stateMachine.state === STATES.PEEK);
            const amp = isResting ? 0.35 : (isPeeking ? 0.5 : 1.0);

            const floatX = (Math.sin(t * 1.7) * 3.5 + Math.cos(t * 2.4) * 1.6) * amp;
            const floatY = (Math.cos(t * 2.1) * 4.2 + Math.sin(t * 1.4) * 2.0) * amp;
            const floatRot = Math.sin(t * 1.5) * 3.2 * amp;

            const renderX = this.physics.x + floatX;
            const renderY = this.physics.y + floatY;
            const renderRot = (this.physics.rotation * 180 / Math.PI) + floatRot + (this.physics.bankAngle * 25);

            // 4. GPU-accelerated rendering
            this.creatureEl.style.transform = `translate3d(${renderX.toFixed(1)}px, ${renderY.toFixed(1)}px, 0) rotate(${renderRot.toFixed(1)}deg)`;

            // Calibrate perceived 50% visibility while underneath UI sections
            const underCard = this.scanner.isUnderCard(renderX, renderY);
            if (underCard) {
                if (!this.isUnderCardActive) {
                    this.isUnderCardActive = true;
                    this.creatureEl.classList.add('is-underneath');
                }
            } else {
                if (this.isUnderCardActive) {
                    this.isUnderCardActive = false;
                    this.creatureEl.classList.remove('is-underneath');
                }
            }

            // 5. Antenna physics
            this.antenna.update(
                dt,
                { x: this.physics.vx, y: this.physics.vy },
                { x: this.physics.ax, y: this.physics.ay },
                this.mouseCuriosity,
                isPeeking
            );

            // 6. Subtle Digital Dust Particles
            const speed = Math.hypot(this.physics.vx, this.physics.vy);
            if (!isResting && !this.motionMgr.isReduced()) {
                if (speed > 55 || this.stateMachine.state === STATES.REACT) {
                    const tailAngle = this.physics.rotation + Math.PI;
                    const tailDist = 18;
                    const tailX = renderX + Math.sin(tailAngle) * tailDist;
                    const tailY = renderY - Math.cos(tailAngle) * tailDist;

                    if (Math.random() < 0.38) {
                        this.particles.spawn(tailX, tailY, speed);
                    }
                }
            }

            this.particles.updateAndRender(dt);

            this.rafId = requestAnimationFrame(this.loop);
        }

        destroy() {
            this.pause();
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            this.particles.destroy();
            if (this.worldEl) {
                this.worldEl.remove();
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. BOOTSTRAP
    // ══════════════════════════════════════════════════════════════════════════
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.__PAYROLL_NEXUS_FIREFLY__ = new FireflyController();
            });
        } else {
            window.__PAYROLL_NEXUS_FIREFLY__ = new FireflyController();
        }
    }

    init();
})();
