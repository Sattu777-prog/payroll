# Payroll Nexus — Backend API

REST API for the Payroll Nexus HR platform with JWT auth (refresh-token rotation, reuse detection), RBAC permissions, and SQLite persistence (Node's built-in `node:sqlite`).

## Stack

- **Node 22.5+ / Express 4** — server, routing, middleware
- **node:sqlite** — zero-config file-based database (no external server needed)
- **jsonwebtoken + bcryptjs** — authN/authZ
- **helmet, cors, express-rate-limit, morgan** — hardening & observability

## Quick Start

```bash
cd backend
npm install
npm run db:setup                # create schema + reference data (roles/departments)
npm run db:seed                 # create demo accounts (idempotent)
npm run dev                     # http://localhost:4000
```

> Node 22.5.0+ (stable in Node 24) is required for `node:sqlite`. No PostgreSQL server or `DATABASE_URL` is needed — the DB file is created automatically at `backend/data/nexus.db`.

### Scripts

| Script            | Purpose                                          |
|-------------------|--------------------------------------------------|
| `npm run dev`     | Start server with `--watch`                     |
| `npm start`       | Start server (production)                       |
| `npm run db:setup`| Create schema + seed roles/departments          |
| `npm run db:seed` | Upsert demo users/employees (bcrypt hashed)     |
| `npm run db:reset`| Setup + seed in one go                          |

## Demo Accounts (created by `db:seed`, password: `$SEED_PASSWORD` or `Password123!`)

| Email                 | Role |
|-----------------------|------|
| admin@nexus.dev       | admin   |
| manager@nexus.dev     | manager |
| employee@nexus.dev    | employee|

## API Overview

| Method | Route                | Access                  | Notes |
|--------|----------------------|-------------------------|-------|
| POST   | `/api/auth/login`    | public                  | Sets httpOnly access+refresh cookies |
| POST   | `/api/auth/refresh`  | public (cookie/body)    | Rotates refresh token (reuse detection) |
| POST   | `/api/auth/logout`   | authenticated           | Revokes refresh token |
| GET    | `/api/auth/me`       | authenticated           | Current user + employee profile |
| GET    | `/api/employees`     | authenticated           | List employees |
| POST   | `/api/employees`     | admin, manager          | Create employee (optional account) |
| GET    | `/api/employees/:id` | authenticated           | Get one employee |
| PUT    | `/api/employees/:id` | admin, manager          | Update employee |
| DELETE | `/api/employees/:id` | admin                   | Delete employee |
| GET    | `/api/payroll`       | admin, manager          | Payroll records by year/month |
| GET    | `/api/payroll/summary`| admin, manager         | Aggregates for dashboard |
| GET    | `/api/health`        | public                  | Health check |

All endpoints (except login/refresh/health) require the access token. The server accepts an
`Authorization: Bearer <jwt>` header **or** the `nexus_access` httpOnly cookie.

### Auth flow

1. `POST /api/auth/login` → sets `nexus_access` (15 min) + `nexus_refresh` (7 days, path `/api/auth`) httpOnly cookies.
2. Client calls protected endpoints with `credentials: 'include'`.
3. On 401, client calls `POST /api/auth/refresh`; server rotates the refresh token and returns fresh cookies.
4. Reuse of a revoked/rotated refresh token revokes the whole session family.

## Environment Variables

See `.env.example`. Required in production: `JWT_SECRET`. All other settings have safe defaults.

## Security Notes

- Passwords are bcrypt-hashed (cost 12) — never stored in plaintext.
- Access token role is re-validated against the DB on each request (role changes take effect immediately).
- Refresh tokens are SHA-256 hashed in the DB; rotation + reuse detection protects against token theft.
- Rate limiting is applied to `/api/auth/*` (100 req / 15 min / IP).

## Deployment Checklist

1. **Node**: 22.5.0+ (tested on 24.x).
2. **Environment**: copy `.env.example` → `.env`; generate a strong `JWT_SECRET` (`openssl rand -base64 48`); set `NODE_ENV=production`; lock down `CLIENT_URL` to the SPA origin.
3. **Database**: run `npm run db:setup` once; then `npm run db:seed` (change `SEED_PASSWORD`).
4. **Backups**: the SQLite file lives at `backend/data/nexus.db` — back it up on a schedule (copy the file while the app is stopped, or use the SPA's built-in Backup/Restore export).
5. **Build the SPA** (separate frontend project) and host it (static host / CDN) — configure `CLIENT_URL` accordingly. The SPA must send requests with `credentials: 'include'`.
6. **HTTPS**: terminate TLS at the platform/load balancer; `secure: true` cookies require it. Also set `trust proxy = 1` (already in `server.js`).
7. **Health checks**: point them at `/api/health`.
8. **Monitoring**: JWT_SECRET rotation plan, rate-limit tuning, and refresh-token cleanup job (purge `refresh_tokens` rows where `expires_at` is old).

## Project Layout

```
backend/
├── package.json
├── .env.example
├── src/
│   ├── server.js              # Express entry (middleware, routes)
│   ├── config.js              # Env config + RBAC permission matrix
│   ├── db/
│   │   ├── db.js              # node:sqlite schema (auto-created)
│   │   ├── pool.js            # pg-compatible adapter over node:sqlite
│   │   ├── migrate.js         # schema + reference data (roles/departments)
│   │   ├── seed.js            # bcrypt-hashed demo data
│   │   └── schema.sql         # (legacy PostgreSQL DDL, kept for reference)
│   ├── middleware/
│   │   ├── auth.js            # JWT verify + role load + authorize()
│   │   └── error.js           # AppError + centralized error handler
│   └── routes/
│       ├── auth.routes.js     # login/refresh/logout/me
│       ├── employees.routes.js# CRUD
│       └── payroll.routes.js  # list + summary