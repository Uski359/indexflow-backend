import createHttpError from 'http-errors';
import { config } from '../../infra/config/env.js';
import { logger } from '../../infra/config/logger.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function notFoundHandler(req, _res, next) {
    next(createHttpError(404, `Route ${req.originalUrl} not found`));
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(error, req, res, _next) {
    void _next;
    const httpError = createHttpError.isHttpError(error)
        ? error
        : createHttpError(500, 'Internal server error', { cause: error });
    if (httpError.status >= 500) {
        logger.error({ err: httpError, path: req.path }, 'Unhandled error');
    }
    else {
        logger.warn({ err: httpError, path: req.path }, 'Client error');
    }
    res.status(httpError.status).json({
        statusCode: httpError.status,
        message: httpError.message,
        ...httpError.errors ? { errors: httpError.errors } : {},
        ...(config.nodeEnv === 'development' && httpError.cause
            ? { cause: httpError.cause.message ?? String(httpError.cause) }
            : {})
    });
}
