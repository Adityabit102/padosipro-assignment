import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/lib/jwt';
import { hashPassword, verifyPassword } from '../../src/lib/password';

const SECRET = 'test-jwt-secret-0123456789-0123456789';

describe('password hashing', () => {
  it('stores an argon2id hash, never the password', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('secret123');
  });

  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword(hash, 'secret123')).toBe(true);
    expect(await verifyPassword(hash, 'Secret123')).toBe(false);
    expect(await verifyPassword('not-a-hash', 'secret123')).toBe(false);
  });

  it('salts: same password gives different hashes', async () => {
    expect(await hashPassword('secret123')).not.toBe(await hashPassword('secret123'));
  });
});

describe('access tokens', () => {
  it('round-trips the user id', () => {
    expect(verifyAccessToken(signAccessToken('user-1', SECRET, '7d'), SECRET)).toBe('user-1');
  });

  it('carries an expiry', () => {
    const decoded = jwt.decode(signAccessToken('user-1', SECRET, '7d')) as jwt.JwtPayload;
    expect(decoded.exp! - decoded.iat!).toBe(7 * 24 * 3600);
  });

  it('rejects expired, tampered and foreign tokens', () => {
    const expired = jwt.sign({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
    expect(verifyAccessToken(expired, SECRET)).toBeNull();
    expect(verifyAccessToken(signAccessToken('user-1', 'another-secret-0123456789-0123456789', '7d'), SECRET)).toBeNull();
    expect(verifyAccessToken('garbage', SECRET)).toBeNull();
    const none = jwt.sign({ sub: 'user-1' }, '', { algorithm: 'none' });
    expect(verifyAccessToken(none, SECRET)).toBeNull();
  });
});
