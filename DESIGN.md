# Design

## Architecture

```
 React Native app (Expo Router)                 Node API (Express 5)                    Postgres 16
 ┌───────────────────────────┐   HTTP/JSON     ┌──────────────────────────────┐  Prisma ┌──────────────┐
 │ screens  login/register/  │ ──────────────▶ │ routes  → zod parse → service │ ──────▶ │ User         │
 │ verify/profile/tasks/home │  Bearer JWT     │ auth · account · task         │         │ EmailOtp (1) │
 │ AuthProvider (SecureStore)│ ◀────────────── │ otp/otp.ts  (pure rules)      │         │ Profile  (1) │
 │ React Query  (cache/retry)│  {error:{code}} │ errorHandler (one format)     │         │ Task*Category│
 └───────────────────────────┘                 └──────────────┬───────────────┘         │ UserTask (n) │
                                                               │ SMTP                   └──────────────┘
                                                               ▼
                                                            Mailpit
```

- **Backend layers:** thin routes parse input with Zod and call services, which hold the business rules. `otp/otp.ts` keeps the OTP rules as **pure functions with the clock passed in**, so expiry, lockout and cooldown are precisely testable. One error middleware gives every failure the shape `{ error: { code, message, fields?, details? } }`; the app branches on `code`.
- **Routing:** one guard in the root layout (`Stack.Protected`) with three states: *signed out* → auth screens; *no profile yet* → profile only; *profile done* → home and tasks. Forbidden screens leave the history, so Back can't return to login or the one-time profile.
- **Session:** the JWT is kept in SecureStore. On launch the app calls `/me` to decide where to go. An offline start keeps the token and offers *Retry* or *Change server* rather than logging the user out; any 401 clears the session.
- **Testability:** the API address defaults to the emulator's `10.0.2.2:4000` but can be changed in the app, so one APK works with any reviewer's backend over Wi-Fi or a hotspot. `/health` also checks the database.

## Security decisions

| Concern | Choice |
|---|---|
| Passwords | argon2id (OWASP default parameters). Login always runs one hash verify, even for unknown emails, so timing doesn't reveal accounts. |
| OTP storage | `HMAC-SHA256(OTP_SECRET, userId:code)`. The plain code exists only in the email. A leaked table can't be brute-forced (10⁶ codes) without the server secret. |
| OTP rules | CSPRNG 6 digits · 10 min · the 5th wrong guess locks the code · each guess is counted atomically *before* the compare (`UPDATE … WHERE attempts < 5`), so parallel requests can't sneak in extra guesses · single use, also atomic (`WHERE consumedAt IS NULL`) · 30 s resend cooldown · a new code replaces the old one. Check order: used → locked → expired → compare. |
| Enumeration | Wrong password and unknown email give an identical 401. Resend answers the same for unknown emails, and verify answers an unknown email like a sign-up with no usable code. Register does reveal a taken *verified* email (409), a deliberate UX trade-off. |
| Abuse | Per-IP rate limit on `/auth/*`, a 10 kB body cap, helmet headers. Secrets are validated at boot, and logs redact auth headers and passwords. |

## Trade-offs

- **One access token (7 days), no refresh token.** Simple to reason about. The cost is that tokens can't be revoked before they expire.
- **Verify, then log in again,** instead of logging the user in automatically. It follows the brief and keeps "a token means verified" true, at the cost of one extra step.
- **Re-registering an unverified email replaces its password.** This rescues users who abandoned sign-up, and is safe because the account stays unusable until someone proves they own the inbox.
- **Search runs on the client** over the 30-task catalogue, so it's instant and works offline. `GET /tasks?q=` also exists for when the catalogue grows.
- **Flat catalogue (category → task)** with stable slug ids, a simplified version of the site's category → subcategory → task tree. Seeding is idempotent and runs on every start.

## What I left out

Password reset · changing email · editing the profile after onboarding · phone OTP · refresh tokens and a revocation list · i18n (Hindi) · dark mode · push notifications · analytics · automated UI tests on a device.

## Next, with another week

1. **Tests on the app side:** React Native Testing Library for the verify and tasks screens, plus one Maestro end-to-end flow run in CI.
2. **Auth hardening:** short-lived access token + rotating refresh token, rate limiting per email as well as per IP.
3. **Product:** forgot password (reusing the OTP module), profile editing, the site's subcategories, and the requests flow that follows task selection.
4. **Ops:** an EAS build step in the existing CI, a staging deploy (Fly/Render + managed Postgres), structured log shipping, Sentry in the app.
