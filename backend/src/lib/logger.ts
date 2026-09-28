import pino from 'pino';

export function createLogger(level: string, pretty: boolean) {
  return pino({
    level,
    redact: ['req.headers.authorization', '*.password', '*.code', '*.passwordHash'],
    transport: pretty ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
