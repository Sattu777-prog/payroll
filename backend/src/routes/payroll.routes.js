import { Router } from 'express';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/error.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/** GET /api/payroll?year=&month= — list payroll records (admin + manager) */
router.get('/', authenticate, authorize('payroll:read'), async (req, res, next) => {
    try {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = req.query.month ? parseInt(req.query.month, 10) : null;

        if (month && (month < 1 || month > 12)) {
            throw new AppError(422, 'Month must be between 1 and 12.');
        }

        const params = [year];
        let filter = 'p.period_year = $1';
        if (month) {
            params.push(month);
            filter += ' AND p.period_month = $2';
        }

        const { rows } = await pool.query(
            `SELECT p.id, p.period_month, p.period_year, p.work_days, p.leave_days,
                    p.basic_usd, p.allowances_usd, p.tax_usd, p.net_usd, p.created_at,
                    e.employee_no, e.first_name, e.last_name
               FROM payroll p
               JOIN employees e ON e.id = p.employee_id
              WHERE ${filter}
              ORDER BY e.last_name, e.first_name`,
            params
        );
        res.json({ payroll: rows });
    } catch (err) {
        next(err);
    }
});

/** GET /api/payroll/summary — aggregate figures for the dashboard */
router.get('/summary', authenticate, authorize('payroll:read'), async (req, res, next) => {
    try {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const { rows } = await pool.query(
            `SELECT COUNT(DISTINCT employee_id)               AS employee_count,
                    COALESCE(SUM(basic_usd), 0)               AS total_basic,
                    COALESCE(SUM(allowances_usd), 0)          AS total_allowances,
                    COALESCE(SUM(tax_usd), 0)                 AS total_tax,
                    COALESCE(SUM(net_usd), 0)                 AS total_net
               FROM payroll
              WHERE period_year = $1`,
            [year]
        );
        res.json({ summary: rows[0] });
    } catch (err) {
        next(err);
    }
});

export default router;