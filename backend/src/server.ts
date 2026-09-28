import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './lib/logger';
import { createSmtpMailer } from './lib/mailer';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.LOG_LEVEL, config.NODE_ENV === 'development');
  const prisma = new PrismaClient();
  await prisma.$connect();

  const app = createApp({ prisma, mailer: createSmtpMailer(config), config, logger });
  const server = app.listen(config.PORT, '0.0.0.0', () => {
    logger.info(`PadosiPro API listening on http://0.0.0.0:${config.PORT}`);
  });

  const shutdown = () => {
    server.close(() => void prisma.$disconnect().finally(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  process.stderr.write(`Failed to start: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
