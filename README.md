# PadosiPro: onboarding app + API

A native Android app with its own backend, covering the first journey of the PadosiPro customer app:

**Create account → verify email with a 6-digit code → log in → fill in your details (once) → pick tasks → home → log out**

<p>
<img src="docs/screenshots/login.jpg" width="130" alt="Log in">
<img src="docs/screenshots/verify-wrong-code.jpg" width="130" alt="Verify email, wrong code">
<img src="docs/screenshots/profile.jpg" width="130" alt="First-login profile">
<img src="docs/screenshots/tasks.jpg" width="130" alt="Task selection">
<img src="docs/screenshots/confirm.jpg" width="130" alt="Confirm step">
<img src="docs/screenshots/home.jpg" width="130" alt="Home">
</p>

| Part | What it is |
|---|---|
| `backend/` | The API: Node + TypeScript + Express + PostgreSQL. Verification emails go to **Mailpit**, a local inbox you open in your browser. |
| `mobile/` | The app: React Native (Expo). Every screen is native; there is no WebView. |
| [`DESIGN.md`](DESIGN.md) | Architecture, trade-offs, what's left out, next steps |
| [`backend/API.md`](backend/API.md) | Endpoint and error reference |

---

## Try it (about 10 minutes)

You need two things:

- **Docker Desktop**, installed and running: [download for Mac or Windows](https://www.docker.com/products/docker-desktop/). It runs the backend, the database and the email inbox with one command.
- **An Android phone**, or an **Android emulator** from [Android Studio](https://developer.android.com/studio) (Device Manager → create a device → ▶).

### Step 1: Get the project

Download it as a ZIP (green **Code** button → **Download ZIP** on the GitHub page) and unzip it, or run:

```bash
git clone https://github.com/Adityabit102/padosipro-assignment.git
cd padosipro-assignment
```

### Step 2: Start the backend

Open a terminal in the project folder and run:

```bash
docker compose up --build
```

The first run takes 1 to 3 minutes. Leave this terminal open. The backend is ready when **http://localhost:4000/health** shows `{"status":"ok"}` in your browser.

Keep **http://localhost:8025** open in a browser tab too. This is **Mailpit**, where the 6-digit verification codes arrive. No real email is sent.

### Step 3: Install the app

Download **`PadosiPro-v1.0.3.apk`** from the [latest release](https://github.com/Adityabit102/padosipro-assignment/releases/latest). (To build it yourself instead, see [Build the APK yourself](#build-the-apk-yourself).)

**On an Android emulator**

1. Drag the APK file onto the emulator window. It installs automatically.
2. Open **PadosiPro**. With the **Android Studio emulator** there is nothing else to set up: it reaches your computer at `10.0.2.2:4000`, which is the app's default.
3. Read the codes in Mailpit at http://localhost:8025 in your computer's browser (not inside the emulator).

Using a different emulator, or running the backend on another computer? Set the server once (tap **Server · Change** on the Log in screen, then **Test connection** and **Save**):

| Emulator | Server address |
|---|---|
| Android Studio emulator | `http://10.0.2.2:4000` (default, no change needed) |
| Genymotion | `http://10.0.3.2:4000` |
| BlueStacks, Nox or another emulator | `http://<your computer's IP>:4000` (see *On an Android phone*, step 2, to find the IP) |
| Backend on a different computer | `http://<that computer's IP>:4000` |

**On an Android phone**

1. Connect the phone and the computer to the **same network**. Any of these works:
   - the same Wi-Fi router;
   - the **phone's own hotspot**, with the computer connected to it;
   - another device's hotspot, with both connected to it.
2. Find the computer's IP address on that network:
   - **Mac:** run `ipconfig getifaddr en0` in Terminal (for example `192.168.43.20`).
   - **Windows:** run `ipconfig` in Command Prompt and use the **IPv4 Address** of the Wi-Fi adapter.
3. Copy the APK to the phone (or open the release page in the phone's browser) and tap it to install.
   - Allow "Install unknown apps" for your browser or file manager when Android asks.
   - If Google Play Protect warns about an unknown app, tap **More details → Install anyway**. The APK is a test build that isn't on the Play Store.
4. Open the app. At the bottom of the Log in screen, tap **Server · Change**.
5. Enter `http://<the IP from step 2>:4000`, for example `http://192.168.43.20:4000`. Tap **Test connection**; it should say *Connected*. Then tap **Save**.

The IP address changes when the computer joins a different network, or sometimes when a hotspot reconnects. If the app says it can't reach the server, repeat steps 2, 4 and 5. When it can't connect, the app offers a **Change server** button, both on the sign-in screens and when it starts up already logged in.

### Step 4: Walk through the app

| # | Do this | What to check |
|---|---|---|
| 1 | Tap **Create an account**. Use a test address such as `test.user@example.com` and a password like `secret123`. | Clear messages under each field for a bad email, a short password or passwords that don't match |
| 2 | Open **Mailpit** (http://localhost:8025 on the computer), copy the 6-digit code and type it in the app | A wrong code shows how many attempts are left; the 5th wrong code locks it. *Resend code* unlocks after a 30-second countdown. Codes expire after 10 minutes. |
| 3 | **Log in** with the same email and password | Logging in before verifying sends you back to the code screen with a fresh code |
| 4 | Fill in your **details**. *Business name* is optional. | The mobile number must be a valid 10-digit Indian number, such as `98765 43210`. This screen appears only once. |
| 5 | **Pick tasks**: search (try "wifi" or "clean"), tick a few, tap *Continue*, then *Confirm and save* | Tasks are grouped by category. A search with no results shows a message and a *Clear search* button. |
| 6 | **Home** lists your tasks | Close the app completely and reopen it: you're still logged in. *Edit tasks* changes your picks. |
| 7 | **Log out** | You're back on Log in. Logging in again goes straight to Home, not the details screen. |

On a phone you can also read the codes in the phone's browser at `http://<computer IP>:8025`.

### Step 5: Stop

Press `Ctrl+C` in the terminal from step 2. To also delete the test accounts, run `docker compose down -v`.

---

## If something goes wrong

| Problem | Fix |
|---|---|
| The app says **"Can't reach the server"** | Check that http://localhost:4000/health works on the computer. **Android Studio emulator:** the server must be `10.0.2.2:4000` (tap *Server · Change → Reset to default*). **Genymotion:** `10.0.3.2:4000`. **Other emulators:** the computer's IP. **Phone:** use the computer's IP on the shared network (step 3), not `localhost`. |
| Phone still can't connect, but the IP is right | Some networks (office, college or public Wi-Fi) block devices from reaching each other. Use a phone hotspot instead. On **Windows**, allow Docker Desktop through the firewall when asked, and set the network to *Private*. On **Mac**, if the firewall is on, allow incoming connections for Docker. |
| No network at all between phone and computer | Connect the phone by USB with USB debugging on, run `adb reverse tcp:4000 tcp:4000`, and set the server to `http://localhost:4000`. |
| No verification email | Look in Mailpit at http://localhost:8025. Check the backend logs with `docker compose logs api`. |
| *"Please wait Ns before requesting a new code"* | The 30-second resend cooldown, working as intended. |
| `docker compose` says **Cannot connect to the Docker daemon** | Start Docker Desktop and wait until it says it's running. |
| `port is already allocated` | Another program uses port 4000, 5433, 8025 or 1025. Stop it, or change the left-hand number of that port in `docker-compose.yml`. |
| Android blocks the install | Allow "Install unknown apps" for the app you opened the APK with. For Play Protect, tap *More details → Install anyway*. |

Please use test data only, such as `@example.com` addresses.

---

## For developers

### Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Docker Desktop (Compose v2) | any recent | Backend, database and Mailpit |
| Node.js | 20 LTS or newer (22 recommended) | Running the app from source and the tests |
| Android emulator, or a phone with **Expo Go** | Android 8+ | Running the app from source |
| Android Studio (includes the Android SDK and Java) | recent | Only for building the APK on your computer |

Ports: **4000** (API), **5433** (Postgres), **8025** (Mailpit web), **1025** (Mailpit SMTP), **8081** (Expo dev server).

### Backend

`docker compose up --build` starts three containers. The API waits for Postgres, applies the migrations, seeds the task catalogue (30 tasks in 8 categories) and listens on port 4000.

| Service | Address |
|---|---|
| API | http://localhost:4000/health |
| Mailpit | http://localhost:8025 |
| Postgres | `postgresql://padosipro:padosipro@localhost:5433/padosipro` |

> **Email:** OTP emails are sent over real SMTP to **Mailpit**, a local mail catcher, so nothing leaves your machine. To use a real SMTP server, set the `SMTP_*` variables below.

Docker Compose already sets working local values, so you don't need a `.env` file. To run the API outside Docker, copy [`backend/.env.example`](backend/.env.example) to `backend/.env`:

```bash
docker compose up -d db mailpit
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                          # http://localhost:4000, restarts on file changes
```

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
| `AUTH_RATE_LIMIT_PER_15_MIN` | `50` (`300` in Docker Compose) | Requests per IP to `/auth/*`. Compose raises it because all emulator traffic comes from one IP. |
| `PORT` / `LOG_LEVEL` | `4000` / `info` | |

The config is validated at startup; a missing or weak secret stops the server with a clear message. The secrets in `docker-compose.yml` and `.env.example` are placeholders for local use. Override them with `JWT_SECRET=… OTP_SECRET=… docker compose up`.

### Run the app from source

```bash
cd mobile
npm install
npx expo start
```

Press **`a`** to open it on a running Android emulator, or scan the QR code with **Expo Go** on a phone.
The app calls `EXPO_PUBLIC_API_URL`, which defaults to `http://10.0.2.2:4000` (the emulator's address for your computer). On a phone, change it from **Server · Change** on the Log in screen, or start Expo with `EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000 npx expo start` (see [`mobile/.env.example`](mobile/.env.example)). On the iOS simulator, use `http://localhost:4000`.

### Tests and checks

```bash
cd backend
npm install
docker compose up -d db              # the integration tests use a separate padosipro_test database, created automatically
npm test                             # 72 tests: unit + integration
npm run test:unit                    # 50 pure unit tests, no database needed
npm run typecheck && npm run lint
```

What's covered, with the risky logic first:

- **OTP** (`test/unit/otp.test.ts`): 6-digit format and leading zeros; only a keyed hash is stored; expiry exactly at 10:00; attempts counting down 4→1 and locking on the 5th wrong guess (even the right code is then refused); single use; the 30 s resend cooldown at its boundaries.
- **Login rules and the full API flow** (`test/integration/auth.flow.test.ts`, real Postgres):
  - unverified users get 403 plus a fresh code, and no token
  - a wrong password gets the same response as an unknown email
  - case-insensitive email
  - 5-attempt lockout then recovery, including 20 parallel guesses (only 5 are ever compared); expiry; an old code is invalidated by a resend
  - cooldown; no account enumeration on resend
  - SMTP failure handling
  - profile validation, then catalogue, search, task replace and unknown task ids
  - `/health` reports a database outage as 503
- **Security helpers** (`test/unit/security.test.ts`): argon2id hashing and salting; JWT expiry, tampering, the wrong secret and `alg: none`.
- **Validation** (`test/unit/validation.test.ts`): Indian mobile normalisation, password rules, profile rules.

Set `TEST_DATABASE_URL` to run the integration tests against another Postgres.

Mobile: `cd mobile && npm run typecheck && npm run lint && npx expo-doctor`.

### Build the APK yourself

You don't need this to test the app: the ready-made APK is on the [Releases page](https://github.com/Adityabit102/padosipro-assignment/releases/latest). Pick one of the two ways below. Both produce an APK that connects to `http://10.0.2.2:4000` (the Android emulator's address for your computer) until you change the server in the app.

**Option A: build in the cloud with Expo (easiest, no Android tools needed)**

You need Node.js and a free [Expo account](https://expo.dev/signup).

```bash
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Answer **yes** when it asks to create the project and to generate a keystore. The build runs on Expo's servers (usually 10 to 20 minutes) and ends with a download link for the APK.

**Option B: build on your computer**

You need Node.js and [Android Studio](https://developer.android.com/studio). Open Android Studio once so it installs the Android SDK; it also includes the Java version the build needs.

On **Mac**:

```bash
cd mobile
npm install
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"   # or any JDK 17 or 21
npm run build:apk:local
```

On **Windows** (PowerShell):

```powershell
cd mobile
npm install
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"   # or any JDK 17 or 21
npx expo prebuild -p android --clean
cd android
.\gradlew.bat assembleRelease
```

The first build takes 15 to 20 minutes; later builds are much faster. The APK is saved at `mobile/android/app/build/outputs/apk/release/app-release.apk`. Drag it onto the emulator, or run `adb install -r` followed by that path.

Notes:
- The build is signed with Android's standard debug key, which is fine for testing but not for the Play Store.
- The app is allowed to use plain `http://` addresses, so it can talk to the local backend.
- To bake a different default server into the build, set `EXPO_PUBLIC_API_URL` first (for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:4000` on Mac). Changing it in the app works too.

### Decisions worth knowing

- **Business Name is optional.** PadosiPro serves households, and most customers have no business. A required field would push people to type fake values. The field says *(optional)*, and the API stores `null` when it's empty.
- **Verification leads to Log in**, as in the brief ("after registration, users log in through the login page"). An unverified user who logs in is sent back to verification with a fresh code.
- **The profile is shown once.** Its screen is only reachable while the profile is incomplete. After it's saved, the user can't navigate back to it.
- **The server address can be changed in the app**, so one APK works with any tester's backend: emulator, Wi-Fi or hotspot.
