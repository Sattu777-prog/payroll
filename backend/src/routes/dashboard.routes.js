import { Router } from 'express';
import {
    getDashboardMetrics,
    registerSseClient,
    recordAttendance,
    processPayrollRun,
    broadcastRealtime
} from '../services/realtime.js';

const router = Router();

/**
 * GET /api/dashboard/metrics or /api/dashboard/realtime — fetch live metrics snapshot
 */
router.get(['/metrics', '/realtime'], async (req, res, next) => {
    try {
        const metrics = await getDashboardMetrics();
        res.json({ ok: true, data: metrics, metrics });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/dashboard/stream — Server-Sent Events (SSE) fallback stream
 */
router.get('/stream', async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    res.write(': connected\n\n');
    registerSseClient(res);

    // Push initial state immediately
    try {
        const metrics = await getDashboardMetrics();
        res.write(`event: init:state\ndata: ${JSON.stringify({ event: 'init:state', data: metrics, timestamp: Date.now() })}\n\n`);
    } catch (_) {}
});

/**
 * POST /api/dashboard/mark-attendance — quick update or roll-call
 */
router.post('/mark-attendance', async (req, res, next) => {
    try {
        const { employeeId, status, notes } = req.body;
        const result = await recordAttendance({ employeeId, status, notes });
        broadcastRealtime('attendance:updated', result);
        const metrics = await getDashboardMetrics();
        broadcastRealtime('metrics:update', metrics);
        res.json({ ok: true, result, metrics });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/dashboard/run-payroll — trigger a live payroll computation
 */
router.post('/run-payroll', async (req, res, next) => {
    try {
        const { month, year } = req.body;
        const result = await processPayrollRun({ month, year });
        broadcastRealtime('payroll:updated', result);
        const metrics = await getDashboardMetrics();
        broadcastRealtime('metrics:update', metrics);
        res.json({ ok: true, result, metrics });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/dashboard/sync — client sync trigger
 */
router.post('/sync', async (req, res, next) => {
    try {
        const metrics = await getDashboardMetrics();
        broadcastRealtime('metrics:update', metrics);
        res.json({ ok: true, metrics });
    } catch (err) {
        next(err);
    }
});

export default router;
