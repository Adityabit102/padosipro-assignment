import type { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Config } from './config';
import type { Logger } from './lib/logger';
import type { Mailer } from './lib/mailer';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { authRoutes } from './routes/auth.routes';
import { meRoutes } from './routes/me.routes';
import { taskRoutes } from './routes/tasks.routes';
import { createAuthService } from './services/auth.service';

export interface AppDeps {
  prisma: PrismaClient;
  mailer: Mailer;
  config: Config;
  logger: Logger;
  /** Injectable clock so tests can move time forward. */
  now?: () => Date;
}

export function createApp(deps: AppDeps) {
  const { prisma, config, logger } = deps;
  const now = deps.now ?? (() => new Date());
  const app = express();

  app.disable('x-powered-by');
  // No reverse proxy in front of the API, so X-Forwarded-For is NOT trusted (it would let
  // clients spoof their IP past the rate limiter). Set 'trust proxy' when deploying behind one.
  app.use(helmet());
  // A native app sends no Origin header, so CORS only matters for browser tools.
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: config.NODE_ENV !== 'test',
      // One compact line per request; bodies and headers (tokens, passwords) are never logged.
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Brute-force protection on the unauthenticated endpoints, on top of the per-code attempt limit.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.AUTH_RATE_LIMIT_PER_15_MIN,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a few minutes and try again.' },
      });
    },
  });

  const auth = createAuthService({ ...deps, now });
  app.use('/auth', authLimiter, authRoutes(auth));
  app.use('/me', requireAuth(config.JWT_SECRET), meRoutes(prisma));
  app.use('/tasks', requireAuth(config.JWT_SECRET), taskRoutes(prisma));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
