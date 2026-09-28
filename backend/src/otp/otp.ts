import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Pure OTP rules. No database or clock access here: callers pass `now`, which keeps
 * every rule (expiry, attempt limit, single use, resend cooldown) unit-testable.
 */

export interface OtpPolicy {
  ttlMinutes: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
}

/** The persisted state of a user's current code (mirrors the EmailOtp table). */
export interface OtpRecord {
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  sentAt: Date;
}

export const OTP_LENGTH = 6;

/** Uniformly random 6-digit code from a CSPRNG, zero-padded (e.g. "004217"). */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
}

/**
 * Keyed hash of the code, bound to the user. A database leak alone is not enough to
 * brute-force the 10^6 possible codes offline, because the server secret is also needed.
 */
export function hashOtpCode(code: string, userId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

export function newOtpRecord(codeHash: string, now: Date, policy: OtpPolicy): OtpRecord {
  return {
    codeHash,
    expiresAt: new Date(now.getTime() + policy.ttlMinutes * 60_000),
    attempts: 0,
    consumedAt: null,
    sentAt: now,
  };
}

export type OtpFailureReason = 'NOT_FOUND' | 'ALREADY_USED' | 'LOCKED' | 'EXPIRED' | 'INVALID';

export type OtpCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason: OtpFailureReason;
      /** Guesses left after this one (only meaningful for INVALID / LOCKED). */
      attemptsLeft: number;
      /** True when this call was a wrong guess that the caller must count. */
      countAttempt: boolean;
    };

/**
 * Decides whether `candidateHash` unlocks `record` at time `now`.
 *
 * The checks run in a deliberate order: a used or locked code is rejected before
 * expiry, and expiry before comparing the code. An attacker therefore learns nothing
 * about the code once it can no longer be used.
 * `record.attempts` is the number of wrong guesses before this one. A wrong guess
 * returns the attempts left *after* counting it; the caller persists the count
 * (auth.service reserves it atomically before calling this).
 */
export function checkOtp(
  record: OtpRecord | null,
  candidateHash: string,
  now: Date,
  policy: OtpPolicy,
): OtpCheckResult {
  const fail = (reason: OtpFailureReason, attemptsLeft = 0, countAttempt = false) =>
    ({ ok: false, reason, attemptsLeft, countAttempt }) as const;

  if (!record) return fail('NOT_FOUND');
  if (record.consumedAt) return fail('ALREADY_USED');
  if (record.attempts >= policy.maxAttempts) return fail('LOCKED');
  if (now.getTime() >= record.expiresAt.getTime()) return fail('EXPIRED');

  if (!safeEqualHex(record.codeHash, candidateHash)) {
    const attemptsLeft = Math.max(0, policy.maxAttempts - (record.attempts + 1));
    // The guess that uses up the last attempt locks the code immediately.
    return fail(attemptsLeft === 0 ? 'LOCKED' : 'INVALID', attemptsLeft, true);
  }
  return { ok: true };
}

/** Seconds until a new code may be sent; 0 means a resend is allowed now. */
export function resendWaitSeconds(record: OtpRecord | null, now: Date, policy: OtpPolicy): number {
  if (!record) return 0;
  const readyAt = record.sentAt.getTime() + policy.resendCooldownSeconds * 1000;
  return Math.max(0, Math.ceil((readyAt - now.getTime()) / 1000));
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
