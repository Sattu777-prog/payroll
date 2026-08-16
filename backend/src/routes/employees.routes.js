import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/error.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/** GET /api/employees — list (any authenticated user) */
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT e.id, e.employee_no, e.first_name, e.last_name, e.position,
                    e.email, e.phone, e.base_salary_usd, e.is_active,
                    d.name AS department
               FROM employees e
               LEFT JOIN departments d ON d.id = e.department_id
              ORDER BY e.last_name, e.first_name`
        );
        res.json({ employees: rows });
    } catch (err) {
        next(err);
    }
});

/** GET /api/employees/:id — single employee (any authenticated user) */
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT e.id, e.employee_no, e.first_name, e.last_name, e.position,
                    e.email, e.phone, e.base_salary_usd, e.is_active, e.created_at,
                    d.name AS department
               FROM employees e
               LEFT JOIN departments d ON d.id = e.department_id
              WHERE e.id = $1`,
            [req.params.id]
        );
        if (!rows[0]) throw new AppError(404, 'Employee not found.');
        res.json({ employee: rows[0] });
    } catch (err) {
        next(err);
    }
});

/** POST /api/employees — create (admin + manager) */
router.post(
    '/',
    authenticate,
    authorize('employees:write'),
    async (req, res, next) => {
        try {
            const b = req.body;
            const required = ['employeeNo', 'firstName', 'lastName', 'email'];
            for (const field of required) {
                if (!b[field] || !String(b[field]).trim()) {
                    throw new AppError(422, `Field "${field}" is required.`);
                }
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
                throw new AppError(422, 'A valid email is required.');
            }
            if ((b.baseSalaryUsd ?? 0) < 0) {
                throw new AppError(422, 'Salary cannot be negative.');
            }

            const email = b.email.toLowerCase();
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                let departmentId = null;
                if (b.department) {
                    const deptRes = await client.query(
                        `INSERT INTO departments (name) VALUES ($1)
                         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                         RETURNING id`,
                        [b.department.trim()]
                    );
                    departmentId = deptRes.rows[0].id;
                }

                let userId = null;
                if (b.createAccount) {
                    const roleRes = await client.query(
                        `SELECT id FROM roles WHERE code = 'employee'`
                    );
                    const tempPassword = b.tempPassword || 'Changeme123!';
                    const hash = await bcrypt.hash(tempPassword, 12);
                    const userRes = await client.query(
                        `INSERT INTO users (email, full_name, password_hash, role_id)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (email) DO NOTHING
                         RETURNING id`,
                        [email, `${b.firstName} ${b.lastName}`.trim(), hash, roleRes.rows[0].id]
                    );
                    userId = userRes.rows[0]?.id || null;
                }

                const empRes = await client.query(
                    `INSERT INTO employees
                        (user_id, department_id, employee_no, first_name, last_name,
                         position, email, phone, base_salary_usd)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING id`,
                    [userId, departmentId, b.employeeNo.trim(), b.firstName.trim(),
                        b.lastName.trim(), b.position?.trim() || null, email,
                        b.phone?.trim() || null, b.baseSalaryUsd ?? 0]
                );

                await client.query('COMMIT');
                res.status(201).json({ id: empRes.rows[0].id });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            next(err);
        }
    }
);

/** PUT /api/employees/:id — update (admin + manager) */
router.put(
    '/:id',
    authenticate,
    authorize('employees:write'),
    async (req, res, next) => {
        try {
            const b = req.body;
            const { rows } = await pool.query(
                `UPDATE employees SET
                    employee_no      = COALESCE($2, employee_no),
                    first_name       = COALESCE($3, first_name),
                    last_name        = COALESCE($4, last_name),
                    position         = COALESCE($5, position),
                    email            = COALESCE($6, email),
                    phone            = COALESCE($7, phone),
                    base_salary_usd  = COALESCE($8, base_salary_usd),
                    is_active        = COALESCE($9, is_active),
                    updated_at       = CURRENT_TIMESTAMP
                 WHERE id = $1
                 RETURNING id`,
                [
                    req.params.id,
                    b.employeeNo?.trim() || null,
                    b.firstName?.trim() || null,
                    b.lastName?.trim() || null,
                    b.position?.trim() || null,
                    b.email ? b.email.toLowerCase() : null,
                    b.phone?.trim() || null,
                    b.baseSalaryUsd ?? null,
                    typeof b.isActive === 'boolean' ? b.isActive : null,
                ]
            );
            if (!rows[0]) throw new AppError(404, 'Employee not found.');
            res.json({ id: rows[0].id });
        } catch (err) {
            next(err);
        }
    }
);

/** DELETE /api/employees/:id — delete (admin only) */
router.delete('/:id', authenticate, authorize('employees:delete'), async (req, res, next) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
        if (rowCount === 0) throw new AppError(404, 'Employee not found.');
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

export default router;