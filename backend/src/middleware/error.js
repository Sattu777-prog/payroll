import { config } from '../config.js';

/** AppError — throw with a statusCode to map to an HTTP response. */
export class AppError extends Error {
    constructor(statusCode, message, details = undefined) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

/** 404 handler for unknown API routes. */
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} does not exist.`,
        statusCode: 404,
    });
}

/**
 * Centralized exception handler.
 * - Logs the full error server-side (never sent to clients).
 * - Maps known errors (AppError, JWT, SQLite, pg) to safe client messages.
 * - Never exposes stack traces; hides error internals in production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let details = err.details;

    // JWT errors from jsonwebtoken
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid or expired token.';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Access token expired.';
    }

    // SQLite errors (node:sqlite)
    if (typeof err.code === 'string' && err.code.startsWith('SQLITE_')) {
        switch (err.code) {
            case 'SQLITE_CONSTRAINT_UNIQUE':
            case 'SQLITE_CONSTRAINT_PRIMARYKEY':
                statusCode = 409;
                message = 'A record with that value already exists.';
                break;
            case 'SQLITE_CONSTRAINT_FOREIGNKEY':
                statusCode = 409;
                message = 'This record is still referenced by other data.';
                break;
            case 'SQLITE_CONSTRAINT_CHECK':
            case 'SQLITE_CONSTRAINT_NOTNULL':
                statusCode = 422;
                message = 'The submitted data violates a validation rule.';
                break;
            case 'SQLITE_CONSTRAINT':
                statusCode = 409;
                message = 'A data constraint was violated.';
                break;
            default:
                statusCode = 503;
                message = 'Database is not reachable or a query failed.';
        }
    } else if (err.code) {
        // PostgreSQL errors (legacy)
        switch (err.code) {
            case '23505': // unique_violation
                statusCode = 409;
                message = 'A record with that value already exists.';
                break;
            case '23503': // foreign_key_violation
                statusCode = 409;
                message = 'This record is still referenced by other data.';
                break;
            case '23514': // check_violation
                statusCode = 422;
                message = 'The submitted data violates a validation rule.';
                break;
            case '22P02': // invalid_text_representation (bad UUID etc.)
                statusCode = 422;
                message = 'Invalid identifier or value provided.';
                break;
            case '28P01':
            case '3D000':
                statusCode = 503;
                message = 'Database connection is not configured correctly.';
                break;
            default:
                statusCode = 500;
                message = 'Database error occurred.';
        }
        details = err.detail || details;
    }

    // Never leak internals in production
    if (statusCode >= 500) {
        console.error('[Error]', err);
        if (config.nodeEnv === 'production') {
            message = 'Something went wrong. Please try again.';
            details = undefined;
        }
    }

    res.status(statusCode).json({
        error: message,
        statusCode,
        ...(details !== undefined ? { details } : {}),
    });
}