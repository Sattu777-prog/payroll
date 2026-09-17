import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const SEED_USERS = [
    { email: 'admin@nexus.dev', full_name: 'Alex Admin', role: 'admin', employeeNo: 'EMP1001', firstName: 'sattu', lastName: 'sattu ', position: 'Lead Developer', dept: 'Engineering', salary: 7200 },
    { email: 'manager@nexus.dev', full_name: 'Maria Manager', role: 'manager', employeeNo: 'EMP1002', firstName: 'Bianca', lastName: 'Lopez', position: 'HR Generalist', dept: 'Human Resources', salary: 5400 },
    { email: 'employee@nexus.dev', full_name: 'Owen Employee', role: 'employee', employeeNo: 'EMP1003', firstName: 'Chen', lastName: 'Wei', position: 'Sales Manager', dept: 'Sales', salary: 6800 },
];

export async function seed(shouldClosePool = false) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: roles } = await client.query('SELECT id, code FROM roles');
        const roleId = (code) => roles.find((r) => r.code === code)?.id;
        if (!roleId) throw new Error('Roles not seeded — run `npm run db:setup` first.');

        const { rows: depts } = await client.query('SELECT id, name FROM departments');
        const deptId = (name) => depts.find((d) => d.name === name)?.id;

        const password = process.env.SEED_PASSWORD || 'Password123!';
        const hash = await bcrypt.hash(password, 12);

        for (const u of SEED_USERS) {
            const { rowCount: hasUser } = await client.query(
                'SELECT 1 FROM users WHERE email = $1',
                [u.email]
            );
            if (hasUser > 0) continue; // idempotent

            const { rows: [user] } = await client.query(
                `INSERT INTO users (email, full_name, password_hash, role_id)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO NOTHING
                 RETURNING id`,
                [u.email, u.full_name, hash, roleId(u.role)]
            );
            if (!user) continue;

            await client.query(
                `INSERT INTO employees
                    (user_id, department_id, employee_no, first_name, last_name, position, email, base_salary_usd)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (employee_no) DO NOTHING`,
                [user.id, deptId(u.dept), u.employeeNo, u.firstName, u.lastName, u.position, u.email, u.salary]
            );
            console.log(`Seeded: ${u.email} (${u.role})`);
        }

        // Seed attendance, leave requests, and payroll if empty
        const { rows: emps } = await client.query('SELECT id, base_salary_usd FROM employees');
        const today = new Date().toISOString().slice(0, 10);
        const now = new Date();
        const curM = now.getMonth() + 1;
        const curY = now.getFullYear();

        for (let i = 0; i < emps.length; i++) {
            const emp = emps[i];
            const attStatus = i === 1 ? 'present' : (i === 2 ? 'present' : 'present');
            await client.query(
                `INSERT INTO attendance (employee_id, work_date, status, notes)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (employee_id, work_date) DO NOTHING`,
                [emp.id, today, attStatus, 'System verified check-in']
            );

            // Seed payroll for current month
            const basic = parseFloat(emp.base_salary_usd) || 5000;
            const allowances = basic * 0.20;
            const gross = basic + allowances;
            const tax = gross * 0.15;
            const net = gross - tax;

            await client.query(
                `INSERT INTO payroll (employee_id, period_month, period_year, work_days, leave_days, basic_usd, allowances_usd, tax_usd, net_usd)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (employee_id, period_month, period_year) DO NOTHING`,
                [emp.id, curM, curY, 22, 0, basic, allowances, tax, net]
            );
        }

        if (emps.length > 1) {
            const { rowCount: hasLeave } = await client.query('SELECT 1 FROM leave_requests LIMIT 1');
            if (hasLeave === 0) {
                await client.query(
                    `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [emps[1].id, 'Annual Leave', today, today, 'Family vacation', 'pending']
                );
            }
        }

        await client.query('COMMIT');
        console.log('Seed complete. Login with password:', process.env.SEED_PASSWORD || 'Password123!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', err);
        if (shouldClosePool) {
            process.exitCode = 1;
        }
    } finally {
        client.release();
        if (shouldClosePool) {
            await pool.end();
        }
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    seed(true);
}