import { db, begin, commit, rollback } from './db.js';

// ─────────────────────────────────────────────────────────────────
//  SQLite-backed query adapter with a pg-compatible API so the
//  route/middleware/seed code can keep the familiar pool.query()
//  shape while persisting to the built-in node:sqlite database.
//  - translates $1/$2 positional params to SQLite '?' placeholders
//  - normalizes boolean/undefined bindings for node:sqlite
//  - handles BEGIN / COMMIT / ROLLBACK + rowCount semantics
// ─────────────────────────────────────────────────────────────────

const CONTROL = new Set(['BEGIN', 'COMMIT', 'ROLLBACK']);

function translate(sql) {
    return sql.replace(/\$(\d+)/g, '?');
}

function normalizeValue(v) {
    if (v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
}

function isResultStatement(sql) {
    const head = sql.trim().split(/\s+/)[0].toUpperCase();
    return (
        head === 'SELECT' ||
        head === 'PRAGMA' ||
        head === 'EXPLAIN' ||
        / RETURNING\s/i.test(sql)
    );
}

async function query(text, params = []) {
    const trimmed = String(text).trim();
    const upper = trimmed.toUpperCase();
    if (CONTROL.has(upper)) {
        if (upper === 'BEGIN') begin();
        else if (upper === 'COMMIT') commit();
        else rollback();
        return { rows: [], rowCount: 0 };
    }

    const sql = translate(trimmed);
    const stmt = db.prepare(sql);
    const args = params.map(normalizeValue);

    if (isResultStatement(sql)) {
        const rows = stmt.all(...args);
        return { rows: rows || [], rowCount: (rows || []).length };
    }

    const result = stmt.run(...args);
    return { rows: [], rowCount: result.changes || 0, changes: result.changes };
}

export const pool = {
    async query(text, params = []) {
        return query(text, params);
    },
    async connect() {
        return {
            query: (text, params = []) => query(text, params),
            release: async () => { },
            end: async () => { },
        };
    },
    async end() {
        try {
            db.close();
        } catch {
            /* already closed */
        }
    },
    on() { },
};