import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext } from './harness';

let ctx: Awaited<ReturnType<typeof createTestContext>>;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx?.prisma.$disconnect();
});

const PASSWORD = 'secret123';
let emailCounter = 0;
const newEmail = () => `test.user${++emailCounter}@example.com`;

async function registerAndVerify(email = newEmail()) {
  await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
  await request(ctx.app)
    .post('/auth/verify-email')
    .send({ email, code: ctx.mailer.lastCodeFor(email) })
    .expect(200);
  return email;
}

async function loginToken(email: string) {
  const res = await request(ctx.app).post('/auth/login').send({ email, password: PASSWORD }).expect(200);
  return res.body.token as string;
}

describe('POST /auth/register', () => {
  it('creates an unverified user, stores only hashes, and emails a 6-digit code', async () => {
    const email = newEmail();
    const res = await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    expect(res.body).toEqual({ email, retryAfterSec: 30 });

    const code = ctx.mailer.lastCodeFor(email);
    expect(code).toMatch(/^\d{6}$/);

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email }, include: { otp: true } });
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.otp?.codeHash).not.toContain(code);
    expect(user.otp!.expiresAt.getTime() - user.otp!.sentAt.getTime()).toBe(10 * 60_000);
  });

  it('returns field errors for invalid input', async () => {
    const res = await request(ctx.app).post('/auth/register').send({ email: 'nope', password: 'short' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toEqual({
      email: 'Enter a valid email address',
      password: 'Password must be at least 8 characters',
    });
  });

  it('rejects an already verified email', async () => {
    const email = await registerAndVerify();
    const res = await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('treats email case-insensitively', async () => {
    const email = await registerAndVerify();
    await request(ctx.app).post('/auth/register').send({ email: email.toUpperCase(), password: PASSWORD }).expect(409);
  });

  it('returns 502 and allows an immediate retry when email delivery fails', async () => {
    const email = newEmail();
    ctx.mailer.failNext = true;
    const res = await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(502);
    expect(res.body.error.code).toBe('EMAIL_DELIVERY_FAILED');
    await request(ctx.app).post('/auth/resend-otp').send({ email }).expect(200);
    expect(ctx.mailer.lastCodeFor(email)).toMatch(/^\d{6}$/);
  });
});

describe('POST /auth/verify-email', () => {
  it('verifies with the right code, and the code is single-use', async () => {
    const email = newEmail();
    await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const code = ctx.mailer.lastCodeFor(email);

    await request(ctx.app).post('/auth/verify-email').send({ email, code }).expect(200, { email, verified: true });
    const again = await request(ctx.app).post('/auth/verify-email').send({ email, code }).expect(409);
    expect(again.body.error.code).toBe('EMAIL_ALREADY_VERIFIED');
  });

  it('counts wrong attempts and locks after 5', async () => {
    const email = newEmail();
    await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const code = ctx.mailer.lastCodeFor(email);
    const wrong = code === '000000' ? '111111' : '000000';

    for (let left = 4; left >= 1; left--) {
      const res = await request(ctx.app).post('/auth/verify-email').send({ email, code: wrong }).expect(400);
      expect(res.body.error).toMatchObject({ code: 'OTP_INVALID', details: { attemptsLeft: left } });
    }
    const fifth = await request(ctx.app).post('/auth/verify-email').send({ email, code: wrong }).expect(429);
    expect(fifth.body.error.code).toBe('OTP_LOCKED');

    // Even the correct code no longer works.
    const locked = await request(ctx.app).post('/auth/verify-email').send({ email, code }).expect(429);
    expect(locked.body.error.code).toBe('OTP_LOCKED');

    // A new code resets the counter.
    ctx.clock.advanceSeconds(30);
    await request(ctx.app).post('/auth/resend-otp').send({ email }).expect(200);
    await request(ctx.app)
      .post('/auth/verify-email')
      .send({ email, code: ctx.mailer.lastCodeFor(email) })
      .expect(200);
  });

  it('rejects a code after 10 minutes', async () => {
    const email = newEmail();
    await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    ctx.clock.advanceSeconds(10 * 60);
    const res = await request(ctx.app)
      .post('/auth/verify-email')
      .send({ email, code: ctx.mailer.lastCodeFor(email) })
      .expect(400);
    expect(res.body.error.code).toBe('OTP_EXPIRED');
  });

  it('invalidates the old code when a new one is sent', async () => {
    const email = newEmail();
    await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const oldCode = ctx.mailer.lastCodeFor(email);
    ctx.clock.advanceSeconds(30);
    await request(ctx.app).post('/auth/resend-otp').send({ email }).expect(200);
    const newCode = ctx.mailer.lastCodeFor(email);
    if (oldCode !== newCode) {
      await request(ctx.app).post('/auth/verify-email').send({ email, code: oldCode }).expect(400);
    }
    await request(ctx.app).post('/auth/verify-email').send({ email, code: newCode }).expect(200);
  });
});

describe('POST /auth/resend-otp', () => {
  it('enforces the 30s cooldown', async () => {
    const email = newEmail();
    await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);

    ctx.clock.advanceSeconds(10);
    const early = await request(ctx.app).post('/auth/resend-otp').send({ email }).expect(429);
    expect(early.body.error).toMatchObject({ code: 'RESEND_TOO_SOON', details: { retryAfterSec: 20 } });

    ctx.clock.advanceSeconds(20);
    await request(ctx.app).post('/auth/resend-otp').send({ email }).expect(200, { email, retryAfterSec: 30 });
  });

  it('does not reveal whether an email is registered', async () => {
    const res = await request(ctx.app).post('/auth/resend-otp').send({ email: 'nobody@example.com' }).expect(200);
    expect(res.body).toEqual({ email: 'nobody@example.com', retryAfterSec: 30 });
    expect(ctx.mailer.sent.some((m) => m.to === 'nobody@example.com')).toBe(false);
  });
});

describe('POST /auth/login', () => {
  it('sends unverified users back to verification with a fresh code', async () => {
    const email = newEmail();
    await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    ctx.clock.advanceSeconds(31);
    const before = ctx.mailer.sent.length;

    const res = await request(ctx.app).post('/auth/login').send({ email, password: PASSWORD }).expect(403);
    expect(res.body.error).toMatchObject({ code: 'EMAIL_NOT_VERIFIED', details: { email, retryAfterSec: 30 } });
    expect(res.body.token).toBeUndefined();
    expect(ctx.mailer.sent.length).toBe(before + 1);
  });

  it('does not tell an unverified user anything without the right password', async () => {
    const email = newEmail();
    await request(ctx.app).post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    const res = await request(ctx.app).post('/auth/login').send({ email, password: 'wrong-pass1' }).expect(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const email = await registerAndVerify();
    const wrongPw = await request(ctx.app).post('/auth/login').send({ email, password: 'wrong-pass1' }).expect(401);
    const unknown = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: PASSWORD })
      .expect(401);
    expect(wrongPw.body).toEqual(unknown.body);
  });

  it('returns a token and account state for a verified user', async () => {
    const email = await registerAndVerify();
    const res = await request(ctx.app).post('/auth/login').send({ email: ` ${email.toUpperCase()} `, password: PASSWORD }).expect(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email, emailVerified: true, profileComplete: false, hasSelectedTasks: false });
  });
});

describe('authenticated routes', () => {
  it('reject missing and invalid tokens', async () => {
    for (const path of ['/me', '/tasks', '/me/tasks']) {
      const res = await request(ctx.app).get(path).expect(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
    await request(ctx.app).get('/me').set('Authorization', 'Bearer not-a-token').expect(401);
  });

  it('runs the full onboarding: profile, catalogue, task selection', async () => {
    const email = await registerAndVerify();
    const auth = { Authorization: `Bearer ${await loginToken(email)}` };

    // Tasks can't be saved before the profile.
    const early = await request(ctx.app).put('/me/tasks').set(auth).send({ taskIds: ['deep-cleaning'] }).expect(409);
    expect(early.body.error.code).toBe('PROFILE_REQUIRED');

    const bad = await request(ctx.app)
      .put('/me/profile')
      .set(auth)
      .send({ name: 'T', mobile: '12345', address: 'x' })
      .expect(400);
    expect(Object.keys(bad.body.error.fields).sort()).toEqual(['address', 'mobile', 'name']);

    const profile = await request(ctx.app)
      .put('/me/profile')
      .set(auth)
      .send({ name: 'Test User', mobile: '98765 43210', address: '12 Test Street, Bengaluru' })
      .expect(200);
    expect(profile.body.user).toMatchObject({
      profileComplete: true,
      profile: { name: 'Test User', mobile: '+919876543210', businessName: null },
    });

    const catalogue = await request(ctx.app).get('/tasks').set(auth).expect(200);
    const categories = catalogue.body.categories as { tasks: unknown[] }[];
    expect(categories.length).toBeGreaterThanOrEqual(4);
    expect(categories.flatMap((c) => c.tasks).length).toBeGreaterThanOrEqual(20);

    const search = await request(ctx.app).get('/tasks').query({ q: 'PLUMB' }).set(auth).expect(200);
    expect(search.body.categories).toEqual([
      expect.objectContaining({ id: 'home', tasks: [expect.objectContaining({ id: 'plumbing-repairs' })] }),
    ]);

    const unknown = await request(ctx.app).put('/me/tasks').set(auth).send({ taskIds: ['deep-cleaning', 'nope'] }).expect(400);
    expect(unknown.body.error).toMatchObject({ code: 'UNKNOWN_TASKS', details: { unknownIds: ['nope'] } });

    const saved = await request(ctx.app)
      .put('/me/tasks')
      .set(auth)
      .send({ taskIds: ['deep-cleaning', 'flight-booking', 'deep-cleaning'] })
      .expect(200);
    expect(saved.body.categories.map((c: { id: string }) => c.id)).toEqual(['home', 'travel']);

    // Saving again replaces the selection.
    await request(ctx.app).put('/me/tasks').set(auth).send({ taskIds: ['wifi-setup'] }).expect(200);
    const mine = await request(ctx.app).get('/me/tasks').set(auth).expect(200);
    expect(mine.body.categories).toEqual([
      expect.objectContaining({ id: 'tech', tasks: [expect.objectContaining({ id: 'wifi-setup' })] }),
    ]);

    const me = await request(ctx.app).get('/me').set(auth).expect(200);
    expect(me.body.user).toMatchObject({ profileComplete: true, hasSelectedTasks: true });
  });
});

describe('error handling', () => {
  it('returns JSON errors for unknown routes and malformed bodies', async () => {
    const notFound = await request(ctx.app).get('/nope').expect(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');
    const badJson = await request(ctx.app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(badJson.body.error.code).toBe('VALIDATION_ERROR');
  });
});
