import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app';
import { loadConfig } from '../../src/config';
import { createLogger } from '../../src/lib/logger';
import type { Mailer } from '../../src/lib/mailer';
import { seedCatalogue } from '../../prisma/seed';

/**
 * Integration tests run against a real Postgres database, which they wipe.
 * Defaults to a `padosipro_test` database on the docker compose Postgres.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://padosipro:padosipro@localhost:5433/padosipro_test?schema=public';

export class FakeMailer implements Mailer {
  readonly sent: { to: string; code: string }[] = [];
  failNext = false;

  async sendOtp(to: string, code: string): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('SMTP down');
    }
    this.sent.push({ to, code });
  }

  lastCodeFor(email: string): string {
    const last = [...this.sent].reverse().find((m) => m.to === email);
    if (!last) throw new Error(`No email sent to ${email}`);
    return last.code;
  }
}

/** A clock the tests can move forward. */
export class TestClock {
  private t = new Date('2026-09-28T10:00:00.000Z').getTime();
  now = () => new Date(this.t);
  advanceSeconds(s: number) {
    this.t += s * 1000;
  }
}

export async function createTestContext() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_SECRET: 'test-jwt-secret-0123456789-0123456789',
    OTP_SECRET: 'test-otp-secret-0123456789-0123456789',
    AUTH_RATE_LIMIT_PER_15_MIN: '10000',
    LOG_LEVEL: 'silent',
  });
  const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
  await prisma.user.deleteMany();
  await seedCatalogue(prisma);

  const mailer = new FakeMailer();
  const clock = new TestClock();
  const app = createApp({ prisma, mailer, config, logger: createLogger('silent', false), now: clock.now });
  return { app, prisma, mailer, clock, config };
}
