import 'dotenv/config';

export const config = {
    port: 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me-nexus-jwt',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
    jwtRefreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS || '7', 10),
    clientUrl: process.env.CLIENT_URL || '*',
    // SQLite file lives in backend/data/nexus.db (node:sqlite, no server needed)
    dbPath: process.env.DB_PATH,
};

export const ROLES = Object.freeze({ ADMIN: 'admin', MANAGER: 'manager', EMPLOYEE: 'employee' });

export const PERMISSIONS = Object.freeze({
    [ROLES.ADMIN]: ['*'],
    [ROLES.MANAGER]: ['employees:read', 'employees:write', 'attendance:read', 'attendance:write', 'leaves:read', 'leaves:approve', 'reports:read', 'payroll:read'],
    [ROLES.EMPLOYEE]: ['profile:read', 'attendance:read:own', 'leaves:read:own', 'leaves:create'],
});