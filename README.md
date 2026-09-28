# PadosiPro: onboarding app + API

The first journey of the PadosiPro customer app, built as a **native mobile app** with its own backend:

**Register → verify email (OTP) → log in → first-login profile → pick tasks → home → log out**

| | |
|---|---|
| `backend/` | Node 20 + TypeScript + Express 5 + Prisma + PostgreSQL 16. Emails go to **Mailpit** (local mail catcher). |
| `mobile/` | React Native with Expo SDK 57 + Expo Router + TypeScript. Every screen is native; there is no WebView. |
| [`DESIGN.md`](DESIGN.md) | Architecture, trade-offs, what's left out, next steps |
| [`backend/API.md`](backend/API.md) | Endpoint and error reference |

<p>
<img src="docs/screenshots/login.jpg" width="130" alt="Log in">
<img src="docs/screenshots/verify-wrong-code.jpg" width="130" alt="Verify email, wrong code">
<img src="docs/screenshots/profile.jpg" width="130" alt="First-login profile">
<img src="docs/screenshots/tasks.jpg" width="130" alt="Task selection">
<img src="docs/screenshots/confirm.jpg" width="130" alt="Confirm step">
<img src="docs/screenshots/home.jpg" width="130" alt="Home">
</p>

*Screenshots from the release APK on an Android 15 emulator (Pixel 6), running against the Docker backend.*

---

## 1. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Docker Desktop (with Compose v2) | any recent | Backend, database and Mailpit, in one command |
| Node.js | 20 LTS or newer (22 recommended) | Running the app and the tests |
| Android emulator **or** an Android phone with **Expo Go** | Android 8+ | Running the app |
| *Only for building the APK locally:* Android Studio (SDK 35+) and JDK 17 | | See [section 5](#5-build-the-apk) |

Ports used: **4000** (API), **5433** (Postgres), **8025** (Mailpit web UI), **1025** (Mailpit SMTP), **8081** (Expo dev server).

---

## 2. Run the backend (one command)

```bash
docker compose up --build
```

This starts three containers. The API waits for Postgres, applies the migrations and seeds the task catalogue (30 tasks in 8 categories), then listens on port 4000.

| Service | URL |
|---|---|
| API | http://localhost:4000/health → `{"status":"ok"}` |
| **Mailpit: read the OTP emails here** | **http://localhost:8025** |
| Postgres | `postgresql://padosipro:padosipro@localhost:5433/padosipro` |

> **Email:** OTP emails are sent over real SMTP to **Mailpit**, a local mail catcher. Nothing leaves your machine.
> Open http://localhost:8025 to read them. To use a real SMTP server instead, set the `SMTP_*` variables below.

Stop with `Ctrl+C`. `docker compose down -v` also wipes the database.

### Environment variables

Docker Compose already sets working local values, so you don't need a `.env` to run it.
To run the API outside Docker (`npm run dev`), copy [`backend/.env.example`](backend/.env.example) to `backend/.env`.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://padosipro:padosipro@localhost:5433/padosipro` | Postgres connection |
| `JWT_SECRET` | *(required, ≥ 32 chars)* | Signs access tokens (HS256) |
| `JWT_EXPIRES_IN` | `7d` | Access token lifetime |
| `OTP_SECRET` | *(required, ≥ 32 chars)* | Key for hashing OTP codes (HMAC-SHA256) |
| `OTP_TTL_MINUTES` | `10` | How long a code is valid |
| `OTP_MAX_ATTEMPTS` | `5` | Wrong guesses before a code is locked |
| `OTP_RESEND_COOLDOWN_SECONDS` | `30` | Minimum gap between codes |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | Mail server (Mailpit) |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | empty / empty / `false` | For a real SMTP provider |
| `MAIL_FROM` | `PadosiPro <no-reply@padosipro.local>` | Sender address |
| `AUTH_RATE_LIMIT_PER_15_MIN` | `50` | Requests per IP to `/auth/*` |
| `PORT` / `LOG_LEVEL` | `4000` / `info` | |

The config is validated at startup. A missing or weak secret stops the server with a clear message.
The secrets in `docker-compose.yml` and `.env.example` are placeholders for local use only. You can override them with `JWT_SECRET=… OTP_SECRET=… docker compose up`.

<details>
<summary>Run the backend without Docker for the API (for development)</summary>

```bash
docker compose up -d db mailpit      # or use your own Postgres and set DATABASE_URL
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                          # http://localhost:4000, restarts on file changes
```
</details>

---

## 3. Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

Then press **`a`** to open the app on a running Android emulator, or scan the QR code with **Expo Go** on your phone.

**Pointing the app at the API.** The app calls `EXPO_PUBLIC_API_URL`, which defaults to `http://10.0.2.2:4000`. `10.0.2.2` is how the Android emulator reaches your computer's `localhost`, so **the emulator works with no changes.**

- **On a real phone:** the phone and your computer must be on the same Wi-Fi. Find your computer's LAN IP (`ipconfig getifaddr en0` on macOS, `ipconfig` on Windows). Then either:
  - tap **"Server: … · Change"** at the bottom of the Log in screen and enter `http://<LAN-IP>:4000` (use *Test connection* to check it), or
  - start Expo with `EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000 npx expo start` (or put it in `mobile/.env`, see [`mobile/.env.example`](mobile/.env.example)).
- **On the iOS simulator:** use `http://localhost:4000`.

### Try the whole flow (about 2 minutes)

1. **Create an account**, e.g. `test.user@example.com` / `secret123`.
2. Open **http://localhost:8025**, copy the 6-digit code and enter it. Try a wrong code first to see the attempts counter, and wait 30 s to see *Resend code* unlock.
3. **Log in**. You land on the one-time **profile** screen: name, `98765 43210`, an address, and an optional business name.
4. **Pick tasks**: search (e.g. "clean"), tick a few, tap *Continue*, check the list, then *Confirm and save*.
5. **Home** lists your tasks. Close and reopen the app: you are still logged in. *Edit tasks* changes the selection; *Log out* ends the session.

Please use test data only (e.g. `@example.com` addresses).

---

## 4. Tests and checks

```bash
cd backend
npm install
docker compose up -d db              # the integration tests use a separate padosipro_test database, created automatically
npm test                             # 66 tests: unit + integration
npm run test:unit                    # 48 pure unit tests, no database needed
npm run typecheck && npm run lint
```

What's covered, with the risky logic first:

- **OTP** (`test/unit/otp.test.ts`): 6-digit format and leading zeros; only a keyed hash is stored; expiry exactly at 10:00; attempts counting down 4→1 and locking on the 5th wrong guess (even the right code is then refused); single use; the 30 s resend cooldown at its boundaries.
- **Login rules and the full API flow** (`test/integration/auth.flow.test.ts`, real Postgres):
  - unverified users get 403 plus a fresh code, and no token
  - a wrong password gets the same response as an unknown email
  - case-insensitive email
  - 5-attempt lockout then recovery; expiry; an old code is invalidated by a resend
  - cooldown; no account enumeration on resend
  - SMTP failure handling
  - profile validation, then catalogue, search, task replace and unknown task ids
- **Security helpers** (`test/unit/security.test.ts`): argon2id hashing and salting; JWT expiry, tampering, the wrong secret and `alg: none`.
- **Validation** (`test/unit/validation.test.ts`): Indian mobile normalisation, password rules, profile rules.

To run the integration tests against another Postgres, set `TEST_DATABASE_URL`.

Mobile: `cd mobile && npm run typecheck && npm run lint && npx expo-doctor`.

---

## 5. Build the APK

The API address is compiled into the build. The default `http://10.0.2.2:4000` suits an emulator.
For a phone, set `EXPO_PUBLIC_API_URL` before building, or change it later in the app from the **Server** link on the Log in screen.
Cleartext `http://` is allowed in release builds (through `expo-build-properties`), so a local API works.

### Option A: EAS cloud build (no Android SDK needed)

```bash
cd mobile
npx eas-cli@latest login                        # free Expo account
npx eas-cli@latest build -p android --profile preview
```

The `preview` profile in `eas.json` produces an installable **`.apk`**. The first run offers to create the EAS project; answer yes. When it finishes, it prints a download link and a QR code.

### Option B: local build (Android SDK + JDK 17 or 21)

Android Studio installs everything you need. The command-line tools alone also work (`brew install --cask android-commandlinetools`, then accept the licences with `sdkmanager --licenses`). Gradle downloads the SDK platform, build tools and NDK it needs on the first build.

```bash
cd mobile
npm install
export ANDROID_HOME=$HOME/Library/Android/sdk   # Windows: %LOCALAPPDATA%\Android\Sdk
export JAVA_HOME=$(/usr/libexec/java_home -v 21) # macOS; any JDK 17 or 21
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000 npm run build:apk:local
# = npx expo prebuild -p android --clean && cd android && ./gradlew assembleRelease
```

The first build takes about 20 minutes (it compiles the native modules); later builds are much faster.
The APK is written to `mobile/android/app/build/outputs/apk/release/app-release.apk`. It is signed with the debug keystore, which is fine for testing.
Install it with `adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk`.

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| App shows *"Can't reach the server"* | Check that http://localhost:4000/health works on your computer. Emulator: the URL must be `http://10.0.2.2:4000`. Phone: use your LAN IP, same Wi-Fi, and allow port 4000 through the firewall. |
| `port is already allocated` | Another service uses 4000, 5433, 8025 or 1025. Stop it, or change the left-hand port in `docker-compose.yml`. |
| No OTP email | Look in Mailpit (http://localhost:8025). Check the API logs with `docker compose logs api`. |
| *"Please wait Ns before requesting a new code"* | This is the 30-second resend cooldown working as intended. |
| Expo Go says the project needs a newer SDK | Update Expo Go from the Play Store (the project uses SDK 57). |
| Stale Metro cache after pulling changes | `npx expo start --clear` |

---

## Decisions worth knowing

- **Business Name is optional.** PadosiPro serves households, and most customers have no business. A required field would push people to type fake values. The field says *(optional)*, and the API stores `null` when it's empty.
- **Verification leads to Log in**, as in the brief ("after registration, users log in through the login page"). An unverified user who logs in is sent back to verification with a fresh code.
- **The profile is shown once.** Its screen is only reachable while the profile is incomplete. After it's saved, the user can't navigate back to it.
