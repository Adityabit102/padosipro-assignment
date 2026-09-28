import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
};

/** The single place errors become HTTP responses. Internals never leak to the client. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({
        error: { code: err.code, message: err.message, details: err.details, fields: err.fields },
      });
      return;
    }
    // Malformed JSON body from express.json()
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' } });
      return;
    }
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is too large' } });
      return;
    }
    logger.error({ err, path: req.path }, 'Unhandled error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
  };
}
