import { describe, expect, it } from 'vitest';
import { loginSchema, otpCodeSchema, registerSchema } from '../../src/schemas/auth.schemas';
import { normalizeIndianMobile, profileSchema } from '../../src/schemas/profile.schemas';
import { saveTasksSchema } from '../../src/schemas/task.schemas';

describe('normalizeIndianMobile', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['6000000000', '+916000000000'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each(['12345', '5876543210', '98765432101', '+1 9876543210', 'abcdefghij', ''])('rejects %s', (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});

describe('registerSchema', () => {
  it('normalises email case and whitespace', () => {
    expect(registerSchema.parse({ email: '  Test.User@Example.COM ', password: 'secret123' }).email).toBe(
      'test.user@example.com',
    );
  });

  it.each([
    ['short1', 'at least 8'],
    ['onlyletters', 'number'],
    ['12345678', 'letter'],
  ])('rejects weak password %s', (password, message) => {
    const result = registerSchema.safeParse({ email: 'a@b.co', password });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(message);
  });

  it('rejects an invalid email', () => {
    expect(registerSchema.safeParse({ email: 'not-an-email', password: 'secret123' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('does not apply the signup password rules', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });
});

describe('otpCodeSchema', () => {
  it('accepts 6 digits, rejects anything else', () => {
    expect(otpCodeSchema.safeParse('012345').success).toBe(true);
    for (const bad of ['12345', '1234567', '12a456', '']) expect(otpCodeSchema.safeParse(bad).success).toBe(false);
  });
});

describe('profileSchema', () => {
  const valid = { name: '  Test   User ', mobile: '98765 43210', address: 'Flat 1, Test Street, Bengaluru' };

  it('normalises input and makes business name optional', () => {
    expect(profileSchema.parse(valid)).toEqual({
      name: 'Test User',
      mobile: '+919876543210',
      address: 'Flat 1, Test Street, Bengaluru',
      businessName: null,
    });
    expect(profileSchema.parse({ ...valid, businessName: '   ' }).businessName).toBeNull();
    expect(profileSchema.parse({ ...valid, businessName: ' Acme  Co ' }).businessName).toBe('Acme Co');
  });

  it('reports a clear message for a bad mobile number', () => {
    const result = profileSchema.safeParse({ ...valid, mobile: '12345' });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['mobile'],
      message: 'Enter a valid 10-digit Indian mobile number',
    });
  });

  it('rejects names with digits and too-short addresses', () => {
    expect(profileSchema.safeParse({ ...valid, name: 'R2D2' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, address: 'short' }).success).toBe(false);
  });
});

describe('saveTasksSchema', () => {
  it('deduplicates ids and requires at least one', () => {
    expect(saveTasksSchema.parse({ taskIds: ['a', 'b', 'a'] }).taskIds).toEqual(['a', 'b']);
    expect(saveTasksSchema.safeParse({ taskIds: [] }).success).toBe(false);
  });
});
