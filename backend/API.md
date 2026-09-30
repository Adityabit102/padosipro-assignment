# PadosiPro API

Base URL (local): `http://localhost:4000`. All bodies are JSON.
Authenticated routes need `Authorization: Bearer <token>` (token from `POST /auth/login`, valid 7 days).

## Error format

Every error has the same shape, so the app can branch on `code` and show `message` as is:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Enter a valid email address",
    "fields": { "email": "Enter a valid email address" },
    "details": {}
  }
}
```

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Bad input; `fields` maps each field to its first problem |
| `EMAIL_TAKEN` | 409 | Register with an email that is already verified |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password (same response for both) |
| `EMAIL_NOT_VERIFIED` | 403 | Login before verifying; `details: { email, retryAfterSec }`, a fresh code is emailed |
| `EMAIL_ALREADY_VERIFIED` | 409 | Verify an email that is already verified |
| `OTP_INVALID` | 400 | Wrong code; `details: { attemptsLeft }` |
| `OTP_LOCKED` | 429 | 5 wrong codes; a new code is required |
| `OTP_EXPIRED` | 400 | Code older than 10 minutes |
| `OTP_NOT_FOUND` | 400 | No usable code (already used, never sent, or unknown email) |
| `RESEND_TOO_SOON` | 429 | Resend within 30 s; `details: { retryAfterSec }` |
| `EMAIL_DELIVERY_FAILED` | 502 | SMTP failed; safe to resend immediately |
| `UNAUTHORIZED` | 401 | Missing, invalid or expired token |
| `PROFILE_REQUIRED` | 409 | Save tasks before the profile |
| `UNKNOWN_TASKS` | 400 | Task ids that don't exist; `details: { unknownIds }` |
| `RATE_LIMITED` | 429 | Too many `/auth/*` requests from one IP in 15 minutes (`AUTH_RATE_LIMIT_PER_15_MIN`: 50 by default, 300 in Docker Compose) |
| `SERVICE_UNAVAILABLE` | 503 | `GET /health` when the database is unreachable |
| `NOT_FOUND` / `INTERNAL_ERROR` | 404 / 500 | Unknown route / unexpected failure (details are logged, never returned) |

## Endpoints

### `POST /auth/register`
`{ "email": "test.user@example.com", "password": "secret123" }` → **201** `{ "email", "retryAfterSec": 30 }`
Password: 8–128 characters with at least one letter and one number. Emails a 6-digit code.
Registering again with an **unverified** email replaces the password and re-sends the code (subject to the cooldown).

### `POST /auth/verify-email`
`{ "email", "code": "123456" }` → **200** `{ "email", "verified": true }`
Marks the email verified. The app then sends the user to log in.

### `POST /auth/resend-otp`
`{ "email" }` → **200** `{ "email", "retryAfterSec": 30 }`
Replaces the previous code (and resets the attempt counter). Returns the same response for unknown emails.

### `POST /auth/login`
`{ "email", "password" }` → **200** `{ "token", "user": Account }`

### `GET /me` 🔒
→ **200** `{ "user": Account }`

```json
{
  "id": "…", "email": "test.user@example.com", "emailVerified": true,
  "profileComplete": true, "hasSelectedTasks": false,
  "profile": { "name": "Test User", "mobile": "+919876543210", "address": "…", "businessName": null }
}
```

### `PUT /me/profile` 🔒
`{ "name", "mobile", "address", "businessName"? }` → **200** `{ "user": Account }`
`mobile` accepts `9876543210`, `98765 43210`, `+91 98765 43210`, `09876543210` and is stored as `+919876543210`.
Must be a 10-digit Indian mobile number (starting 6–9). `businessName` is optional.

### `GET /tasks?q=clean` 🔒
→ **200** `{ "categories": [{ "id", "name", "icon", "tasks": [{ "id", "name", "description" }] }] }`
The catalogue grouped by category. `q` searches task name, description and category name (case-insensitive).

### `GET /me/tasks` 🔒
→ **200** `{ "categories": [...] }`: the user's selected tasks, same shape as above.

### `PUT /me/tasks` 🔒
`{ "taskIds": ["deep-cleaning", "flight-booking"] }` → **200** `{ "categories": [...] }`
Replaces the whole selection in one transaction. At least one task is required.

### `GET /health`
→ **200** `{ "status": "ok" }` when the API and its database are up; **503** `SERVICE_UNAVAILABLE` when the database is unreachable.
