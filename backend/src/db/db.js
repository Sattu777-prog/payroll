import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'nexus.db'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(`
CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE CHECK (code IN ('admin','manager','employee')), name TEXT NOT NULL, description TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), email TEXT NOT NULL UNIQUE CHECK (email = lower(email)), full_name TEXT NOT NULL, password_hash TEXT NOT NULL, role_id INTEGER NOT NULL REFERENCES roles(id), is_active INTEGER NOT NULL DEFAULT 1, last_login_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, revoked_at TEXT, replaced_by TEXT REFERENCES refresh_tokens(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL, department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL, employee_no TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, position TEXT, email TEXT UNIQUE CHECK (email = lower(email)), phone TEXT, base_salary_usd REAL NOT NULL DEFAULT 0 CHECK (base_salary_usd >= 0), is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE, work_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','half-day')), notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (employee_id, work_date));
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE TABLE IF NOT EXISTS leave_requests (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE, leave_type TEXT NOT NULL CHECK (leave_type IN ('Annual Leave','Sick Leave','Unpaid Leave')), start_date TEXT NOT NULL, end_date TEXT NOT NULL, reason TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')), attachment_path TEXT NOT NULL DEFAULT '', reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL, reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK (end_date >= start_date));
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE TABLE IF NOT EXISTS payroll (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE, period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12), period_year INTEGER NOT NULL, work_days INTEGER NOT NULL DEFAULT 0, leave_days INTEGER NOT NULL DEFAULT 0, basic_usd REAL NOT NULL DEFAULT 0, allowances_usd REAL NOT NULL DEFAULT 0, tax_usd REAL NOT NULL DEFAULT 0, net_usd REAL NOT NULL DEFAULT 0, generated_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (employee_id, period_month, period_year));
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_year, period_month);
`);

export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const get = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);
export const begin = () => db.exec('BEGIN');
export const commit = () => db.exec('COMMIT');
export const rollback = () => db.exec('ROLLBACK');