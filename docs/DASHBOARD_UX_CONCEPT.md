# Financial Dashboard — Toggleable Navigation UI Concept

**Codename:** *Nexus Metrics — Focus Mode Dashboard*
**Evolves from:** Payroll Nexus HR Intelligence Platform

---

## 1. Concept Overview

A single-page financial command center where **six key metrics** are organized as tabs in a **toggleable navigation bar**. The dashboard always lands on an **Overview** grid showing every metric as a live micro-widget. Selecting any metric — either by clicking the toggle button or the Overview widget — transitions the canvas into a **dedicated interactive visualization mode** (dynamic charts, searchable tables, filters, live streams) that permits deep data exploration.

> **Core principle: One toggle = one focus.** Instead of cramming all charts into a single scrollable wall, each metric owns the entire canvas when selected, giving every interaction room to breathe.

The six metrics:

1. Payroll Trends
2. Monthly Attendance
3. Salary Distribution by Department
4. Live Activity Feed
5. Top Earners for the Current Period
6. Real-time Exchange Rates

---

## 2. Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER   [◆ Nexus Metrics]              ● LIVE ●    ⏰ 18:42:05    │
├────────────────────────────────────────────────────────────────────┤
│ TOGGLE BAR                                                          │
│ ┌────────┐┌─────────────┐┌──────────────┐┌───────────────┐         │
│ │Overview││Payroll Trend││   Attendance ││Salary by Dept │   ...   │
│ └────────┘└─────────────┘└──────────────┘└───────────────┘         │
│  ▲ sliding highlight pill glides to active toggle                   │
├────────────────────────────────────────────────────────────────────┤
│ VIEW CANVAS (single active workspace)                               │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ VIEW TOOLBAR — period chips · metric switcher · search · sort  │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ VISUALIZATION STAGE — chart / graph / live feed / table        │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ DRILL-DOWN PANEL — expands on hover/click for deep exploration │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 2.1 Header
- Brand mark + product name (gradient blue→violet, matching the existing Payroll Nexus identity).
- Global **live indicator** (pulsing dot) and a **live clock** — reinforces the "real-time" nature of the platform.

### 2.2 Toggle Navigation Bar (segmented control)
- One pill-shaped segmented bar containing **Overview + 6 metric tabs**.
- Active state is a **glowing gradient pill** that physically slides between buttons (CSS transform, ~300 ms spring easing).
- Overflow behavior: on narrow screens the bar becomes horizontally scrollable (touch/swipe) instead of wrapping, keeping the segmented look.

### 2.3 View Canvas
- Exactly **one metric workspace is visible at a time** — no vertical scrolling walls of charts.
- Each workspace has a consistent 3-part anatomy:
  1. **View toolbar** — context-specific controls (time ranges, filters, search, sort, refresh).
  2. **Visualization stage** — the primary dynamic chart, graph, feed, or table.
  3. **Drill-down panel** — hidden by default; slides in when the user hovers/clicks a data point for deeper inspection.

---

## 3. Toggle Bar Behavior (Interaction Spec)

| Behavior | Description |
|---|---|
| **Click / Tap** | Activates the metric; the gradient pill glides to the button; the canvas crossfades + rises into place (~450 ms ease-out). |
| **Overview widgets** | Each Overview micro-widget is live (animation + real values) and acts as a second trigger — clicking it jumps to that metric's full interactive workspace. |
| **Keyboard** | Arrow ← / → cycles tabs while focus stays in the bar; Enter/Space activates; Tab moves into the workspace. |
| **ARIA** | `role="tablist"` / `role="tab"` / `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby` fully wired. |
| **Deep-linking** | Selecting a metric writes `#view-name` to the URL hash; loading a hashed URL opens that workspace directly; browser back/forward works. |
| **State persistence** | Last-selected view is remembered in `localStorage` and restored on next visit. |
| **Transition** | Outgoing view fades/scales down; incoming view fades/scales up with staggered inner-element reveal (stagger ~40 ms). Hovering inactive toggles shows a subtle lift + accent tint. |

---

## 4. Interactive Elements per Metric

### 4.1 Payroll Trends
| Element | Interaction |
|---|---|
| **Range chips: 3M / 6M / 12M** | One click re-aggregates and re-animates the chart. |
| **Metric switcher: Gross / Net / Tax** | Dropdown swaps the plotted series; bars/counts recalculate instantly. |
| **Animated bar chart** | Bars grow with spring easing; hover shows a floating tooltip (month, amount, Δ vs previous month). |
| **Click a bar** | Opens the **monthly drill-down panel**: a searchable table of that month's department totals + pay-run summary. |
| **Stat strip** | Total, monthly average, peak month, and period-over-period delta update live with the selected range. |

### 4.2 Monthly Attendance
| Element | Interaction |
|---|---|
| **Month stepper** | ◀ / ▶ buttons + "Today" shortcut; label shows selected month/year. |
| **Stacked day bars (30 days)** | Each day bar is segmented Present / Late / Half-day / Absent; hover surfaces a precise day tooltip. |
| **Legend with status chips** | Chips act as filters — clicking a status toggles that segment's visibility across the whole month. |
| **Click a day** | Opens the **employee-level drill panel**: searchable, sortable table of that date's individuals with status badges. |
| **Summary stat strip** | Attendance %, average late count, total absences, tracked days. |

### 4.3 Salary Distribution by Department
| Element | Interaction |
|---|---|
| **Department filter chips** | "All" + one chip per department; clicking a chip filters both chart and table. |
| **Sort switcher** | Sort by Total spend, Headcount, or Average salary — bars re-rank with a re-order animation. |
| **Horizontal bar chart** | Rows show dept name, amount, and % of total payroll; hover highlights the row and shows a percentage tooltip. |
| **Click a department row** | Expands the **employee drill table**: rank, name, position, basic salary, and share-of-dept progress bars. |
| **Stat strip** | Total payroll, average salary, largest department, total headcount. |

### 4.4 Live Activity Feed
| Element | Interaction |
|---|---|
| **Streaming feed** | New events (payroll runs, leave approvals, attendance syncs, system alerts) append every ~2 s with a slide-in animation. |
| **Pause / Resume** | Freezes the stream (with a "paused" pulse indicator); resume continues seamlessly. |
| **Type filter chips** | Payroll / Attendance / Leave / System — isolate event categories instantly. |
| **Search box** | Live keyword filtering across actor + message. |
| **Click an event** | Inline expansion reveals full metadata (actor, timestamp, department, link to the source record). |

### 4.5 Top Earners (Current Period)
| Element | Interaction |
|---|---|
| **Period chips: Month / Quarter / Year** | Re-derives rankings and re-animates the leaderboard. |
| **Animated podium (top 3)** | Ranks 1–3 with gold/silver/bronze styling, avatar chips, and total-compensation counters that count up. |
| **Ranked table** | Ranks 4–N with share-of-total progress bars; sortable by name, dept, base salary, or total comp. |
| **Click a row** | Opens a **compensation breakdown** drill panel: stacked bars for Basic / Allowances / Bonus and tax deduction, plus net take-home. |

### 4.6 Real-time Exchange Rates
| Element | Interaction |
|---|---|
| **Base-currency selector** | Changes the quote base for the entire table and converter (rates re-normalized live). |
| **Live rates table** | Currency code, rate, ± change, trend badge (▲/▼), and an inline **sparkline** per pair. |
| **Auto-refresh** | Rates jitter every 2 s; a countdown ring + "Refresh now" button gives manual control. |
| **Click a row** | Expands a **24 h mini line chart** for that currency pair with hi/lo/latest markers. |
| **Built-in converter** | Amount + From/To dropdowns + swap button; instant result and rate line. |

---

## 5. Visual & Motion System

- **Theme:** dark fintech (deep navy `#070d1a`) with a signature blue→violet gradient accent; glassmorphic cards.
- **Typography:** Inter for UI, JetBrains Mono for all numeric values (financial data stays tabular-aligned).
- **Motion:** 450 ms canvas transitions · 300 ms pill glide · 800 ms chart springs · 40 ms staggered reveals · pulsing live dots.
- **Consistency:** every metric uses the same toolbar/canvas/drill anatomy so users build one mental model and apply it across all six.
- **Responsive:** desktop grid → tablet 2-col → mobile single column; toggle bar becomes scrollable; drill panels become sheets.

---

## 6. Implementation Notes (for the live prototype)

- **`dashboard-concept/`** is a **self-contained HTML/CSS/JS prototype** with **zero external dependencies** — it runs offline by double-clicking `index.html`.
- Charts are **hand-rolled SVG renderers** (bars, stacked bars, horizontal bars, lines, sparklines) so no chart library is required and animations are fully controllable.
- Mock data is **seeded deterministically** (mulberry32 PRNG) so every load is reproducible yet varied.
- Live layers simulated: activity feed stream, FX rate jitter, global clock.
- The exact toggle-pill, view transitions, keyboard navigation, and ARIA wiring described above are implemented in the prototype.

---

## 7. Future Enhancements

- Swap mock layer for WebSocket/API feeds (e.g., Frankfurter FX, payroll DB).
- Drill-through navigation across metrics (click an earner → their pay history; click an activity event → source record).
- Role-based metric visibility + saved custom views.
- Export each workspace to PDF/Excel directly from its toolbar.