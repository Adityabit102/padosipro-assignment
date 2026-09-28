import type { PrismaClient, User } from '@prisma/client';
import type { Config } from '../config';
import { AppError } from '../lib/errors';
import { signAccessToken } from '../lib/jwt';
import type { Logger } from '../lib/logger';
import type { Mailer } from '../lib/mailer';
import { getDummyHash, hashPassword, verifyPassword } from '../lib/password';
import {
  checkOtp,
  generateOtpCode,
  hashOtpCode,
  newOtpRecord,
  resendWaitSeconds,
  type OtpCheckResult,
  type OtpPolicy,
} from '../otp/otp';
import { getAccountSummary, type AccountSummary } from './account.service';

export interface AuthDeps {
  prisma: PrismaClient;
  mailer: Mailer;
  config: Config;
  logger: Logger;
  now: () => Date;
}

export interface OtpSentResult {
  email: string;
  /** Seconds until the app may offer "Resend code". */
  retryAfterSec: number;
}

export interface LoginResult {
  token: string;
  user: AccountSummary;
}

export function createAuthService(deps: AuthDeps) {
  const { prisma, mailer, config, logger, now } = deps;
  const policy: OtpPolicy = {
    ttlMinutes: config.OTP_TTL_MINUTES,
    maxAttempts: config.OTP_MAX_ATTEMPTS,
    resendCooldownSeconds: config.OTP_RESEND_COOLDOWN_SECONDS,
  };

  /** Replaces any previous code with a fresh one and emails it. */
  async function issueOtp(user: Pick<User, 'id' | 'email'>): Promise<void> {
    const code = generateOtpCode();
    const record = newOtpRecord(hashOtpCode(code, user.id, config.OTP_SECRET), now(), policy);
    await prisma.emailOtp.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...record },
      update: record,
    });
    try {
      await mailer.sendOtp(user.email, code, policy.ttlMinutes);
    } catch (err) {
      // Delete the code so the cooldown doesn't block an immediate retry.
      await prisma.emailOtp.delete({ where: { userId: user.id } }).catch(() => undefined);
      logger.error({ err }, 'Failed to send OTP email');
      throw new AppError(
        502,
        'EMAIL_DELIVERY_FAILED',
        "We couldn't send the verification email. Please try again in a moment.",
      );
    }
  }

  async function register(email: string, password: string): Promise<OtpSentResult> {
    const existing = await prisma.user.findUnique({ where: { email }, include: { otp: true } });
    if (existing?.emailVerifiedAt) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Please log in.', undefined, {
        email: 'An account with this email already exists',
      });
    }

    const passwordHash = await hashPassword(password);

    // Signing up again with an unverified email is treated as a retry. The account
    // only becomes usable once someone proves they own the inbox, so replacing the
    // password here gives nobody access they shouldn't have.
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } })
      : await prisma.user.create({ data: { email, passwordHash } });

    const wait = resendWaitSeconds(existing?.otp ?? null, now(), policy);
    if (wait > 0) return { email, retryAfterSec: wait }; // a code was just sent; keep it
    await issueOtp(user);
    return { email, retryAfterSec: policy.resendCooldownSeconds };
  }

  async function verifyEmail(email: string, code: string): Promise<{ email: string }> {
    const user = await prisma.user.findUnique({ where: { email }, include: { otp: true } });
    if (!user) {
      throw new AppError(400, 'OTP_NOT_FOUND', 'No verification is pending for this email. Please sign up first.');
    }
    if (user.emailVerifiedAt) {
      throw new AppError(409, 'EMAIL_ALREADY_VERIFIED', 'Your email is already verified. Please log in.');
    }

    const result = checkOtp(user.otp, hashOtpCode(code, user.id, config.OTP_SECRET), now(), policy);

    if (!result.ok) {
      if (result.countAttempt) {
        await prisma.emailOtp.update({ where: { userId: user.id }, data: { attempts: { increment: 1 } } });
      }
      throw otpError(result);
    }

    const verifiedAt = now();
    await prisma.$transaction(async (tx) => {
      // The consumedAt: null condition makes the code single-use even if two
      // correct submissions race each other.
      const consumed = await tx.emailOtp.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: verifiedAt },
      });
      if (consumed.count === 0) {
        throw new AppError(400, 'OTP_NOT_FOUND', 'This code has already been used. Please request a new code.');
      }
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: verifiedAt } });
    });
    return { email };
  }

  async function resendOtp(email: string): Promise<OtpSentResult> {
    const user = await prisma.user.findUnique({ where: { email }, include: { otp: true } });
    // Unknown and already-verified emails get the same response as a successful
    // send, so this endpoint can't be used to find out who has an account.
    if (!user || user.emailVerifiedAt) return { email, retryAfterSec: policy.resendCooldownSeconds };

    const wait = resendWaitSeconds(user.otp, now(), policy);
    if (wait > 0) {
      throw new AppError(429, 'RESEND_TOO_SOON', `Please wait ${wait}s before requesting a new code.`, {
        retryAfterSec: wait,
      });
    }
    await issueOtp(user);
    return { email, retryAfterSec: policy.resendCooldownSeconds };
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique({ where: { email }, include: { otp: true } });
    // Always run one argon2 verify, so an unknown email takes as long as a wrong password.
    const passwordOk = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
    if (!user || !passwordOk) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    }

    if (!user.emailVerifiedAt) {
      // Help the user finish verification: send a fresh code unless one was just sent.
      let wait = resendWaitSeconds(user.otp, now(), policy);
      if (wait === 0) {
        try {
          await issueOtp(user);
          wait = policy.resendCooldownSeconds;
        } catch (err) {
          logger.warn({ err }, 'Could not send OTP during login; user can resend from the app');
        }
      }
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email to continue. We sent you a code.', {
        email: user.email,
        retryAfterSec: wait,
      });
    }

    const token = signAccessToken(user.id, config.JWT_SECRET, config.JWT_EXPIRES_IN);
    return { token, user: await getAccountSummary(prisma, user.id) };
  }

  return { register, verifyEmail, resendOtp, login };
}

function otpError(result: Extract<OtpCheckResult, { ok: false }>): AppError {
  switch (result.reason) {
    case 'INVALID':
      return new AppError(
        400,
        'OTP_INVALID',
        `That code is incorrect. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`,
        { attemptsLeft: result.attemptsLeft },
        { code: 'Incorrect code' },
      );
    case 'LOCKED':
      return new AppError(429, 'OTP_LOCKED', 'Too many incorrect attempts. Please request a new code.', {
        attemptsLeft: 0,
      });
    case 'EXPIRED':
      return new AppError(400, 'OTP_EXPIRED', 'This code has expired. Please request a new code.');
    case 'ALREADY_USED':
    case 'NOT_FOUND':
      return new AppError(400, 'OTP_NOT_FOUND', 'This code is no longer valid. Please request a new code.');
  }
}

export type AuthService = ReturnType<typeof createAuthService>;
