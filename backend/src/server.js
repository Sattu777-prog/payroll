import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './config.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import employeesRoutes from './routes/employees.routes.js';
import payrollRoutes from './routes/payroll.routes.js';

const app = express();

app.set('trust proxy', 1); // behind reverse proxy (Heroku/Fly/Railway etc.)

// ── Security middleware ─────────────────────────────────────────
app.use(helmet());

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
        origin: config.clientUrl.split(',').map((s) => s.trim()),
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

// 404 + centralized error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
    console.log(`[server] Payroll Nexus API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});