import { describe, expect, it } from 'vitest';
import {
  checkOtp,
  generateOtpCode,
  hashOtpCode,
  newOtpRecord,
  resendWaitSeconds,
  type OtpPolicy,
  type OtpRecord,
} from '../../src/otp/otp';

const SECRET = 'test-otp-secret-0123456789-0123456789';
const USER = 'user-1';
const policy: OtpPolicy = { ttlMinutes: 10, maxAttempts: 5, resendCooldownSeconds: 30 };
const T0 = new Date('2026-09-28T10:00:00.000Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

function recordFor(code: string, overrides: Partial<OtpRecord> = {}): OtpRecord {
  return { ...newOtpRecord(hashOtpCode(code, USER, SECRET), T0, policy), ...overrides };
}

describe('generateOtpCode', () => {
  it('always returns exactly 6 digits', () => {
    for (let i = 0; i < 2000; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it('keeps leading zeros and is not constant', () => {
    const codes = new Set(Array.from({ length: 500 }, generateOtpCode));
    expect(codes.size).toBeGreaterThan(490);
  });
});

describe('hashOtpCode', () => {
  it('never contains the plain code and is deterministic', () => {
    const hash = hashOtpCode('123456', USER, SECRET);
    expect(hash).not.toContain('123456');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOtpCode('123456', USER, SECRET)).toBe(hash);
  });

  it('depends on the user and the server secret', () => {
    const hash = hashOtpCode('123456', USER, SECRET);
    expect(hashOtpCode('123456', 'user-2', SECRET)).not.toBe(hash);
    expect(hashOtpCode('123456', USER, `${SECRET}x`)).not.toBe(hash);
  });
});

describe('checkOtp', () => {
  const right = hashOtpCode('123456', USER, SECRET);
  const wrong = hashOtpCode('654321', USER, SECRET);

  it('accepts the right code before expiry', () => {
    expect(checkOtp(recordFor('123456'), right, at(0), policy)).toEqual({ ok: true });
  });

  it('rejects when there is no code', () => {
    expect(checkOtp(null, right, T0, policy)).toMatchObject({ ok: false, reason: 'NOT_FOUND' });
  });

  describe('expiry (10 minutes)', () => {
    it('is valid 1 ms before 10 minutes', () => {
      expect(checkOtp(recordFor('123456'), right, at(10 * 60_000 - 1), policy).ok).toBe(true);
    });

    it('is expired at exactly 10 minutes', () => {
      expect(checkOtp(recordFor('123456'), right, at(10 * 60_000), policy)).toMatchObject({
        ok: false,
        reason: 'EXPIRED',
        countAttempt: false,
      });
    });

    it('does not count a guess against an expired code', () => {
      const result = checkOtp(recordFor('123456'), wrong, at(11 * 60_000), policy);
      expect(result).toMatchObject({ reason: 'EXPIRED', countAttempt: false });
    });
  });

  describe('attempt limit (5)', () => {
    it('counts down attempts on wrong codes', () => {
      for (let used = 0; used < 4; used++) {
        expect(checkOtp(recordFor('123456', { attempts: used }), wrong, T0, policy)).toEqual({
          ok: false,
          reason: 'INVALID',
          attemptsLeft: 4 - used,
          countAttempt: true,
        });
      }
    });

    it('locks on the 5th wrong guess', () => {
      expect(checkOtp(recordFor('123456', { attempts: 4 }), wrong, T0, policy)).toEqual({
        ok: false,
        reason: 'LOCKED',
        attemptsLeft: 0,
        countAttempt: true,
      });
    });

    it('rejects even the right code once locked', () => {
      expect(checkOtp(recordFor('123456', { attempts: 5 }), right, T0, policy)).toMatchObject({
        ok: false,
        reason: 'LOCKED',
        countAttempt: false,
      });
    });

    it('still accepts the right code after 4 wrong guesses', () => {
      expect(checkOtp(recordFor('123456', { attempts: 4 }), right, T0, policy).ok).toBe(true);
    });
  });

  describe('single use', () => {
    it('rejects a code that was already consumed', () => {
      const used = recordFor('123456', { consumedAt: at(1000) });
      expect(checkOtp(used, right, at(2000), policy)).toMatchObject({ ok: false, reason: 'ALREADY_USED' });
    });
  });
});

describe('resendWaitSeconds (30s cooldown)', () => {
  const record = recordFor('123456');

  it('allows the first send when no code exists', () => {
    expect(resendWaitSeconds(null, T0, policy)).toBe(0);
  });

  it('blocks right after sending', () => {
    expect(resendWaitSeconds(record, T0, policy)).toBe(30);
  });

  it('rounds up partial seconds', () => {
    expect(resendWaitSeconds(record, at(29_001), policy)).toBe(1);
  });

  it('allows a resend at 30s and after', () => {
    expect(resendWaitSeconds(record, at(30_000), policy)).toBe(0);
    expect(resendWaitSeconds(record, at(31_000), policy)).toBe(0);
  });
});
