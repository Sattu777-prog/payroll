import 'dotenv/config';
import { db } from './db.js';

/**
 * SQLite migration / setup runner.
 *
 * The full schema is created automatically when `db.js` is imported
 * (CREATE TABLE IF NOT EXISTS ...). This script additionally seeds the
 * baseline reference data (roles + departments) that the app and the
 * seed script depend on.
 */
async function migrate() {
    try {
        const seedRole = db.prepare(
            `INSERT OR IGNORE INTO roles (id, code, name, description)
             VALUES (?, ?, ?, ?)`
        );
        seedRole.run(1, 'admin', 'Administrator', 'Full system access');
        seedRole.run(2, 'manager', 'Manager', 'HR / management access');
        seedRole.run(3, 'employee', 'Employee', 'Self-service access');

        const seedDept = db.prepare(
            `INSERT OR IGNORE INTO departments (id, name, description)
             VALUES (?, ?, ?)`
        );
        seedDept.run(1, 'Engineering', 'Software & platform engineering');
        seedDept.run(2, 'Human Resources', 'People operations');
        seedDept.run(3, 'Sales', 'Revenue & accounts');
        seedDept.run(4, 'Finance', 'Budgeting & accounting');

        console.log('Migration complete: SQLite schema + reference data ready.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        try {
            db.close();
        } catch {
            /* already closed */
        }
    }
}

migrate();