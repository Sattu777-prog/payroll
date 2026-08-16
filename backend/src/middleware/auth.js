import jwt from 'jsonwebtoken';
import { config, PERMISSIONS } from '../config.js';
import { AppError } from './error.js';
import { pool } from '../db/pool.js';

/**
 * Extract Bearer token from the Authorization header,
 * falling back to the httpOnly access cookie set at login.
 */
function extractToken(req) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) return header.slice(7).trim();
    return req.cookies?.nexus_access || null;
}

/**
 * authenticate — verifies the JWT access token and loads the
 * user's current role + active flag from the DB on every request
 * (so role changes / deactivation take effect immediately).
 */
export async function authenticate(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) throw new AppError(401, 'Authentication required. Please log in.');

        let payload;
        try {
            payload = jwt.verify(token, config.jwtSecret);
        } catch (err) {
            throw new AppError(401, err.name === 'TokenExpiredError' ? 'Your session has expired. Please log in again.' : 'Invalid or expired token.');
        }

        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.full_name, u.is_active, r.code AS role
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = $1`,
            [payload.sub]
        );
        const user = rows[0];
        if (!user) throw new AppError(401, 'Account no longer exists.');
        if (!user.is_active) throw new AppError(403, 'Account is deactivated. Contact an administrator.');

        req.user = { ...user, permissions: PERMISSIONS[user.role] || [] };
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * authorize — RBAC guard. Checks a required permission.
 * Usage: authorize('payroll:process')  → admin only ('*' implies all)
 *        authorize('leaves:approve')   → admin + manager
 */
export function authorize(permission) {
    return (req, res, next) => {
        if (!req.user) return next(new AppError(401, 'Authentication required.'));
        const perms = req.user.permissions || [];
        if (perms.includes('*') || perms.includes(permission)) return next();
        return next(new AppError(403, 'You do not have permission to perform this action.'));
    };
}