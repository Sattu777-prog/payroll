import 'dotenv/config';

export const config = {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is required in production'); })() : 'dev-secret-change-me'),
    jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
    jwtRefreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS || '7', 10),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    // SQLite file lives in backend/data/nexus.db (node:sqlite, no server needed)
    dbPath: process.env.DB_PATH,
};

export const ROLES = Object.freeze({ ADMIN: 'admin', MANAGER: 'manager', EMPLOYEE: 'employee' });

export const PERMISSIONS = Object.freeze({
    [ROLES.ADMIN]: ['*'],
    [ROLES.MANAGER]: ['employees:read', 'employees:write', 'attendance:read', 'attendance:write', 'leaves:read', 'leaves:approve', 'reports:read', 'payroll:read'],
    [ROLES.EMPLOYEE]: ['profile:read', 'attendance:read:own', 'leaves:read:own', 'leaves:create'],
});