# Design

## Architecture

```
 React Native app (Expo Router)                 Node API (Express 5)                    Postgres 16
 ┌───────────────────────────┐   HTTPS/JSON    ┌──────────────────────────────┐  Prisma ┌──────────────┐
 │ screens  login/register/  │ ──────────────▶ │ routes  → zod parse → service │ ──────▶ │ User         │
 │ verify/profile/tasks/home │  Bearer JWT     │ auth · account · task         │         │ EmailOtp (1) │
 │ AuthProvider (SecureStore)│ ◀────────────── │ otp/otp.ts  (pure rules)      │         │ Profile  (1) │
 │ React Query  (cache/retry)│  {error:{code}} │ errorHandler (one format)     │         │ Task*Category│
 └───────────────────────────┘                 └──────────────┬───────────────┘         │ UserTask (n) │
                                                               │ SMTP                   └──────────────┘
                                                               ▼
                                                            Mailpit
```

- **Backend layers:** routes stay thin. They parse input with Zod and call a service; services hold the business rules; `otp/otp.ts` holds the OTP rules as **pure functions with the clock passed in**, which is what makes expiry, lockout and cooldown precisely testable. One error class and one error middleware give every failure the shape `{ error: { code, message, fields?, details? } }`, and the app branches on `code`.
- **Routing:** the app has a single routing guard. The root layout uses `Stack.Protected` with three states: *signed out* → auth screens; *signed in without a profile* → profile only; *profile done* → home and tasks. When the state changes, forbidden screens disappear from history, so the Android back button can't return to login or to the one-time profile.
- **Session:** the JWT is kept in SecureStore. On launch the app calls `/me` to decide where to go. An offline start keeps the token and shows *Retry*, rather than logging the user out; any 401 clears the session.

## Security decisions

| Concern | Choice |
|---|---|
| Passwords | argon2id (OWASP default parameters). Login always runs one hash verify, even for unknown emails, so timing doesn't reveal accounts. |
| OTP storage | `HMAC-SHA256(OTP_SECRET, userId:code)`. The plain code exists only in the email. A leaked table can't be brute-forced (10⁶ codes) without the server secret. |
| OTP rules | CSPRNG 6 digits · 10 min · 5 wrong guesses lock the code (the 5th wrong guess locks it immediately) · single use, enforced atomically (`UPDATE … WHERE consumedAt IS NULL`) · 30 s resend cooldown · a new code replaces the old one and resets attempts. Checks run in a fixed order: used → locked → expired → compare. |
| Enumeration | Wrong password and unknown email give an identical 401. Resend answers the same for unknown emails. Register does reveal a taken *verified* email (409), a deliberate UX trade-off. |
| Abuse | Per-IP rate limit on `/auth/*`, a 10 kB body cap, helmet headers. Secrets are validated at boot, and logs redact auth headers and passwords. |

## Trade-offs

- **One access token (7 days), no refresh token.** Simple to reason about. The cost is that tokens can't be revoked before they expire.
- **Verify, then log in again,** instead of logging the user in automatically. It follows the brief and keeps "a token means verified" true, at the cost of one extra step.
- **Re-registering an unverified email replaces its password.** This rescues users who abandoned sign-up, and is safe because the account stays unusable until someone proves they own the inbox.
- **Search runs on the client** over the 30-task catalogue, so it's instant and works offline. `GET /tasks?q=` also exists for when the catalogue grows.
- **Flat catalogue (category → task)** with stable slug ids, a simplified version of the site's category → subcategory → task tree. Seeding is idempotent and runs on every start.
- **Known race:** concurrent *wrong* guesses at the same instant could each be evaluated before the counter increments. This is bounded by the rate limit. Reserving an attempt atomically before comparing would close it.

## What I left out

Password reset · changing email · editing the profile after onboarding · phone OTP · refresh tokens and a revocation list · i18n (Hindi) · dark mode · push notifications · analytics · automated UI tests on a device.

## Next, with another week

1. **Tests on the app side:** React Native Testing Library for the verify and tasks screens, plus one Maestro end-to-end flow run in CI.
2. **Auth hardening:** short-lived access token + rotating refresh token, an atomic attempt reservation for OTP, rate limiting per email as well as per IP.
3. **Product:** forgot password (reusing the OTP module), profile editing, the site's subcategories, and the requests flow that follows task selection.
4. **Ops:** GitHub Actions (lint, typecheck, tests, EAS build), a staging deploy (Fly/Render + managed Postgres), structured log shipping, Sentry in the app.
