import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { verifyAccessToken } from '../lib/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by requireAuth. */
    userId?: string;
  }
}

export function requireAuth(jwtSecret: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    const userId = scheme === 'Bearer' && token ? verifyAccessToken(token, jwtSecret) : null;
    if (!userId) {
      next(new AppError(401, 'UNAUTHORIZED', 'Your session has expired. Please log in again.'));
      return;
    }
    req.userId = userId;
    next();
  };
}

/** For handlers mounted behind requireAuth. */
export function authedUserId(req: { userId?: string }): string {
  if (!req.userId) throw new AppError(401, 'UNAUTHORIZED', 'Please log in again.');
  return req.userId;
}
