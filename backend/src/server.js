import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from './config.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import employeesRoutes from './routes/employees.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import fxRoutes from './routes/fx.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

const app = express();

app.set('trust proxy', 1); // behind reverse proxy (Heroku/Fly/Railway etc.)

// ── Security middleware ─────────────────────────────────────────
// Disable helmet CSP, frameguard and COEP so AI Studio iframe preview and external CDNs work cleanly
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
}));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again later.', statusCode: 429 },
});
app.use('/api/auth', authLimiter);

if (config.nodeEnv !== 'test') {
    app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use(
    cors({
        origin: (origin, callback) => callback(null, true),
        credentials: true, // allow httpOnly cookies
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Health check (no auth)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/fx', fxRoutes);

// ── Static frontend serving ─────────────────────────────────────
app.use(express.static(rootDir));

// Fallback to index.html for non-API client routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(join(rootDir, 'index.html'));
});

// 404 + centralized error handling for /api routes
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, '0.0.0.0', () => {
    console.log(`[server] Payroll Nexus API listening on http://0.0.0.0:${config.port} (${config.nodeEnv})`);
});