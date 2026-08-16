import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const ACCESS_COOKIE = 'nexus_access';
const REFRESH_COOKIE = 'nexus_refresh';

const cookieBase = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
};

const accessCookieOpts = {
    ...cookieBase,
    maxAge: 15 * 60 * 1000, // 15 min
};

const refreshCookieOpts = {
    ...cookieBase,
    maxAge: config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    path: '/api/auth',
};

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
    return jwt.sign(
        { sub: user.id, role: user.role, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtAccessTtl }
    );
}

function signRefreshToken(user, jti) {
    return jwt.sign(
        { sub: user.id, role: user.role, jti },
        config.jwtSecret,
        { expiresIn: `${config.jwtRefreshTtlDays}d` }
    );
}

function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie(ACCESS_COOKIE, accessToken, accessCookieOpts);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOpts);
}

function clearAuthCookies(res) {
    res.clearCookie(ACCESS_COOKIE, { ...accessCookieOpts, maxAge: 0 });
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOpts, maxAge: 0 });
}

async function persistRefreshToken(userId, token) {
    // Revoke any previous live token for this user (single active session).
    // This also invalidates the JWT reuse-detection chain.
    await pool.query(
        `UPDATE refresh_tokens
            SET revoked_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId]
    );
    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, datetime('now', '+' || $3 || ' days'))`,
        [userId, hashToken(token), config.jwtRefreshTtlDays]
    );
}

async function loadUserById(id) {
    const { rows } = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.is_active, r.code AS role
           FROM users u
           JOIN roles r ON r.id = u.role_id
          WHERE u.id = $1`,
        [id]
    );
    return rows[0];
}

/** POST /api/auth/login */
router.post('/login', async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!email || !password) {
            throw new AppError(422, 'Email and password are required.');
        }

        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active, r.code AS role
               FROM users u
               JOIN roles r ON r.id = u.role_id
              WHERE u.email = $1`,
            [email]
        );
        const user = rows[0];

        // Run bcrypt even when the user is missing to reduce timing side-channels.
        const dummyHash = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7Dl4QH7X8Z9y0nJm0kLQmB1v2c3d4e5';
        const hashToCheck = user ? user.password_hash : dummyHash;
        const ok = await bcrypt.compare(password, hashToCheck);

        if (!user || !ok) {
            throw new AppError(401, 'Invalid email or password.');
        }
        if (!user.is_active) {
            throw new AppError(403, 'Account is deactivated. Contact an administrator.');
        }

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user, crypto.randomUUID());
        await persistRefreshToken(user.id, refreshToken);

        await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        setAuthCookies(res, accessToken, refreshToken);
        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
            },
        });
    } catch (err) {
        next(err);
    }
});

/** POST /api/auth/refresh — rotate the refresh token (reuse detection) */
router.post('/refresh', async (req, res, next) => {
    try {
        const incoming = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
        if (!incoming) throw new AppError(401, 'Refresh token missing.');

        let payload;
        try {
            payload = jwt.verify(incoming, config.jwtSecret);
        } catch {
            throw new AppError(401, 'Invalid or expired refresh token.');
        }

        const tokenHash = hashToken(incoming);
        const { rows } = await pool.query(
            `SELECT id, revoked_at, replaced_by
               FROM refresh_tokens
              WHERE user_id = $1 AND token_hash = $2`,
            [payload.sub, tokenHash]
        );
        const record = rows[0];

        // Reuse detection: if the presented token was already revoked/replaced,
        // revoke the entire family for that user.
        if (!record || record.revoked_at || record.replaced_by) {
            await pool.query(
                `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
                  WHERE user_id = $1 AND revoked_at IS NULL`,
                [payload.sub]
            );
            throw new AppError(401, 'Session reused or revoked — please log in again.');
        }

        const user = await loadUserById(payload.sub);
        if (!user) throw new AppError(401, 'Account no longer exists.');
        if (!user.is_active) throw new AppError(403, 'Account is deactivated.');

        // Rotate: revoke the presented token, insert its replacement,
        // then link old → new (reuse detection uses replaced_by).
        const newRefresh = signRefreshToken(user, crypto.randomUUID());
        const oldId = record.id;
        await pool.query(
            `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [oldId]
        );
        const newIdRes = await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, datetime('now', '+' || $3 || ' days'))
             RETURNING id`,
            [user.id, hashToken(newRefresh), config.jwtRefreshTtlDays]
        );
        await pool.query(
            `UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2`,
            [newIdRes.rows[0].id, oldId]
        );

        const accessToken = signAccessToken(user);
        setAuthCookies(res, accessToken, newRefresh);
        res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
    } catch (err) {
        next(err);
    }
});

/** POST /api/auth/logout — revoke refresh token */
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const incoming = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
        if (incoming) {
            await pool.query(
                `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
                  WHERE user_id = $1 AND token_hash = $2`,
                [req.user.id, hashToken(incoming)]
            );
        }
        clearAuthCookies(res);
        res.json({ message: 'Logged out.' });
    } catch (err) {
        next(err);
    }
});

/** GET /api/auth/me — current user profile */
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT e.id AS employee_id, e.employee_no, e.first_name, e.last_name,
                    e.position, e.email, e.phone, e.base_salary_usd,
                    d.name AS department
               FROM employees e
               LEFT JOIN departments d ON d.id = e.department_id
              WHERE e.user_id = $1`,
            [req.user.id]
        );
        res.json({
            user: {
                id: req.user.id,
                email: req.user.email,
                fullName: req.user.full_name,
                role: req.user.role,
                profile: rows[0] || null,
            },
        });
    } catch (err) {
        next(err);
    }
});

export default router;