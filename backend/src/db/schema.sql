-- ────────────────────────────────────────────────────────────────
--  PAYROLL NEXUS — PostgreSQL schema (DDL only)
--  Seed data lives in src/db/seed.js (hashes real passwords with bcrypt).
--  Run with:  npm run db:setup
-- ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ── Roles ───────────────────────────────────────────────────────
CREATE TABLE roles (
    id          SMALLSERIAL PRIMARY KEY,
    code        VARCHAR(32)  NOT NULL UNIQUE CHECK (code IN ('admin', 'manager', 'employee')),
    name        VARCHAR(64)  NOT NULL,
    description TEXT
);

-- ── Users (auth principals) ─────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE
                    CHECK (email = lower(email)),
    full_name       VARCHAR(160) NOT NULL,
    password_hash   TEXT         NOT NULL,
    role_id         SMALLINT     NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Refresh tokens (rotation + revocation) ──────────────────────
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  CHAR(64) NOT NULL UNIQUE,          -- SHA-256 hex of the JWT
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);

-- ── Departments ─────────────────────────────────────────────────
CREATE TABLE departments (
    id          SMALLSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Employees (core HR record, linked to a user account) ────────
CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    department_id   SMALLINT REFERENCES departments(id) ON DELETE SET NULL,
    employee_no     VARCHAR(32)  NOT NULL UNIQUE,
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80)  NOT NULL,
    position        VARCHAR(120),
    email           VARCHAR(255) UNIQUE
                    CHECK (email = lower(email)),
    phone           VARCHAR(32),
    base_salary_usd NUMERIC(12, 2) NOT NULL DEFAULT 0
                    CHECK (base_salary_usd >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Attendance ──────────────────────────────────────────────────
CREATE TABLE attendance (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date    DATE NOT NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'present'
                 CHECK (status IN ('present', 'absent', 'late', 'half-day')),
    notes        VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, work_date)
);
CREATE INDEX idx_attendance_date        ON attendance (work_date);
CREATE INDEX idx_attendance_employee    ON attendance (employee_id);

-- ── Leave requests ──────────────────────────────────────────────
CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type      VARCHAR(64) NOT NULL
                    CHECK (leave_type IN ('Annual Leave', 'Sick Leave', 'Unpaid Leave')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    reason          TEXT,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    attachment_path VARCHAR(500) NOT NULL DEFAULT '',
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_valid_range CHECK (end_date >= start_date)
);
CREATE INDEX idx_leave_employee ON leave_requests (employee_id);
CREATE INDEX idx_leave_status   ON leave_requests (status);

-- ── Payroll runs (per employee per period) ──────────────────────
CREATE TABLE payroll (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_month    SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year     SMALLINT NOT NULL,
    work_days       SMALLINT NOT NULL DEFAULT 0,
    leave_days      SMALLINT NOT NULL DEFAULT 0,
    basic_usd       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allowances_usd  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_usd         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_usd         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    generated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, period_month, period_year)
);
CREATE INDEX idx_payroll_period ON payroll (period_year, period_month);

-- ── Safety net ──────────────────────────────────────────────────
-- The app DB user only needs DML on these tables, not DDL privileges
-- on the whole schema. Grant the app user minimal rights in production:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ... TO app_user;
REVOKE DROP ON SCHEMA public FROM PUBLIC;