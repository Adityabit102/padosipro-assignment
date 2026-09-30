# PadosiPro: onboarding app + API

A native Android app and its backend for the first steps of the PadosiPro customer journey:

**Create account → verify email with a 6-digit code → log in → fill in your details (once) → pick tasks → home → log out**

<p>
<img src="docs/screenshots/login.jpg" width="130" alt="Log in">
<img src="docs/screenshots/verify-wrong-code.jpg" width="130" alt="Verify email, wrong code">
<img src="docs/screenshots/profile.jpg" width="130" alt="First-login profile">
<img src="docs/screenshots/tasks.jpg" width="130" alt="Task selection">
<img src="docs/screenshots/confirm.jpg" width="130" alt="Confirm step">
<img src="docs/screenshots/home.jpg" width="130" alt="Home">
</p>

- `backend/`: the API, built with Node, TypeScript, Express and PostgreSQL.
- `mobile/`: the app, built with React Native (Expo). Every screen is native; there's no WebView.
- [`DESIGN.md`](DESIGN.md) explains the architecture and trade-offs, [`backend/API.md`](backend/API.md) lists the endpoints, and [`CHANGELOG.md`](CHANGELOG.md) shows what changed in each version.

---

## Try it in about 10 minutes

You'll need:

- **Docker Desktop**, installed and running ([download](https://www.docker.com/products/docker-desktop/)).
- **An Android phone**, or an **Android emulator**. Any of these works:
  - **Android Studio emulator** (recommended): install [Android Studio](https://developer.android.com/studio), then create a virtual device in **Device Manager** ([how to](https://developer.android.com/studio/run/managing-avds)).
  - **[Genymotion Desktop](https://www.genymotion.com/product-desktop/download/)**, free for personal use.
  - **[BlueStacks](https://www.bluestacks.com/download.html)** (Windows and Mac).

### 1. Get the project

Download the ZIP from GitHub (**Code → Download ZIP**) and unzip it, or run:

```bash
git clone https://github.com/Adityabit102/padosipro-assignment.git
cd padosipro-assignment
```

### 2. Start the backend

In the project folder, run:

```bash
docker compose up --build
```

Leave it running. After a minute or two, http://localhost:4000/health should show `{"status":"ok"}`.

The verification codes don't go to a real inbox. They land in **Mailpit**, a local inbox at **http://localhost:8025**. Keep it open in a browser tab.

### 3. Install the app

Download **`PadosiPro-v1.0.3.apk`** from the [latest release](https://github.com/Adityabit102/padosipro-assignment/releases/latest).

**On an emulator**, drag the APK onto the emulator window (BlueStacks and Nox also have an *Install APK* button) and open **PadosiPro**. Then check the server address, which you'll find under **Server · Change** at the bottom of the Log in screen:

- **Android Studio emulator:** nothing to change. The app already uses `http://10.0.2.2:4000`, the emulator's address for your computer.
- **Genymotion:** set it to `http://10.0.3.2:4000`.
- **BlueStacks, Nox, LDPlayer or any other emulator:** set it to `http://<computer's IP>:4000`. Step 2 of the phone steps below shows how to find the IP.

After changing it, tap **Test connection**, then **Save**. Read the codes in Mailpit on your computer's browser.

**On a phone**:

1. Put the phone and the computer on the same network. The same Wi-Fi works, and so does a hotspot, including the phone's own.
2. Find the computer's IP address: on a Mac run `ipconfig getifaddr en0`; on Windows run `ipconfig` and use the Wi-Fi adapter's **IPv4 Address**.
3. Install the APK on the phone. If Android asks, allow installing unknown apps. If Play Protect warns you, tap **More details → Install anyway** (it's a test build, not a Play Store app).
4. In the app, tap **Server · Change** at the bottom of the Log in screen. Enter `http://<computer's IP>:4000`, tap **Test connection**, then **Save**.

Tip: you can read the codes on the phone too, by opening `http://<computer's IP>:8025` in its browser.

If the computer later joins a different network, its IP changes. Just update the server the same way. If you're already logged in when that happens, the app offers **Change server** as soon as it starts and can't connect.

### 4. Walk through the app

1. **Create an account** with a test email like `test.user@example.com` and a password like `secret123` (at least 8 characters, with a letter and a number). Try a bad email or mismatched passwords to see the messages.
2. **Enter the code** from Mailpit. A wrong code tells you how many tries are left, and five wrong tries lock it. You can ask for a new code after a 30-second countdown, and codes expire after 10 minutes.
3. **Log in.** If you log in before verifying, the app takes you back to the code screen with a fresh code.
4. **Add your details.** The mobile number must be a valid Indian number, such as `98765 43210`. Business name is optional. You'll only see this screen once.
5. **Pick tasks.** Search (try "wifi" or "clean"), tick a few, tap **Continue**, then **Confirm and save**.
6. **Home** shows your tasks. Close the app fully and reopen it: you're still logged in.
7. **Log out.** Logging back in takes you straight to Home.

When you're done, press `Ctrl+C` in the terminal. Run `docker compose down -v` if you also want to delete the test accounts.

Please use test data only.

---

## If something goes wrong

- **"Can't reach the server"**: check that http://localhost:4000/health works on the computer. Then check the server address: `10.0.2.2:4000` on the Android Studio emulator (**Server · Change → Reset to default**), `10.0.3.2:4000` on Genymotion, and the computer's IP on other emulators and on phones (never `localhost`).
- **The phone still can't connect**: some office, college and public Wi-Fi networks stop devices from talking to each other. Use a phone hotspot instead. On Windows, allow Docker through the firewall when asked. If there's no shared network at all, connect the phone by USB, run `adb reverse tcp:4000 tcp:4000` and set the server to `http://localhost:4000`.
- **No code arrived**: look in Mailpit at http://localhost:8025, or check the logs with `docker compose logs api`.
- **On the emulator, the email box shows a small toolbar instead of the keyboard**: that's the emulator's handwriting mode, not the app. Type with your computer's keyboard, or open the emulator's **Settings**, search for **stylus**, and turn off writing in text fields.
- **"Cannot connect to the Docker daemon"**: start Docker Desktop and wait until it's running.
- **"Port is already allocated"**: another program is using port 4000, 5433, 8025 or 1025. Close it, or change the first number of that port in `docker-compose.yml`.

---

## For developers

### Prerequisites

- **Docker Desktop**, for the backend, database and Mailpit.
- **Node.js 20 or newer** (22 recommended), to run the app from source and the tests.
- **Android Studio**, only if you want to build the APK on your own computer.

### Backend

`docker compose up --build` starts the API (port 4000), PostgreSQL (port 5433) and Mailpit (web inbox on 8025, SMTP on 1025). On startup the API applies the database migrations and loads the task catalogue: 30 tasks in 8 categories.

Emails are sent over SMTP to **Mailpit**, so nothing leaves your machine. To send real email, point the `SMTP_*` settings at a real mail server.

Docker Compose already provides working settings. To run the API outside Docker instead:

```bash
docker compose up -d db mailpit
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Environment variables

All of these are in [`backend/.env.example`](backend/.env.example) with safe local values. Never commit real secrets.

| Variable | Default | What it does |
|---|---|---|
| `DATABASE_URL` | local Postgres on port 5433 | Database connection |
| `JWT_SECRET` | required, at least 32 characters | Signs login tokens |
| `JWT_EXPIRES_IN` | `7d` | How long a login lasts |
| `OTP_SECRET` | required, at least 32 characters | Key used to hash verification codes |
| `OTP_TTL_MINUTES` / `OTP_MAX_ATTEMPTS` / `OTP_RESEND_COOLDOWN_SECONDS` | `10` / `5` / `30` | Code expiry, wrong tries allowed, wait before a new code |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | Mail server (Mailpit) |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | empty / empty / `false` | Only needed for a real mail server |
| `MAIL_FROM` | `PadosiPro <no-reply@padosipro.local>` | Sender address |
| `AUTH_RATE_LIMIT_PER_15_MIN` | `50` (`300` in Docker Compose) | Sign-in requests allowed per IP address |
| `PORT` / `LOG_LEVEL` | `4000` / `info` | |

The server checks these at startup and stops with a clear message if a secret is missing or too short.

### Run the app from source

```bash
cd mobile
npm install
npx expo start
```

Press `a` to open it on a running Android emulator, or scan the QR code with **Expo Go** on a phone. The app talks to `http://10.0.2.2:4000` by default; on a phone, change it with **Server · Change**, or start Expo with `EXPO_PUBLIC_API_URL=http://<computer's IP>:4000 npx expo start`.

### Tests

```bash
cd backend
npm install
docker compose up -d db
npm test
```

That runs 72 tests; the integration tests use a real PostgreSQL database. They cover the risky parts first:

- **Verification codes**: always 6 digits, only a hash stored, expiry at exactly 10 minutes, locking after 5 wrong tries (even with 20 guesses sent at once), single use and the 30-second resend wait.
- **Login rules**: unverified users are sent back to verification, and a wrong password looks the same as an unknown email.
- **The whole API flow**, from sign-up to saving tasks, plus input validation, password hashing and login tokens.

Checks for the app: `cd mobile && npm run typecheck && npm run lint`.

### Build the APK yourself

You don't need this to test the app: the ready-made APK is on the [Releases page](https://github.com/Adityabit102/padosipro-assignment/releases/latest). Either way below gives you an APK that works with the emulator out of the box.

**Option A: in the cloud with Expo (easiest).** You need Node.js and a free [Expo account](https://expo.dev/signup).

```bash
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Answer **yes** when it asks to create the project and a keystore. After 10 to 20 minutes you get a download link for the APK.

**Option B: on your computer.** You need Node.js and [Android Studio](https://developer.android.com/studio). Open Android Studio once so it sets up the Android SDK.

On a Mac:

```bash
cd mobile
npm install
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
npm run build:apk:local
```

On Windows (PowerShell):

```powershell
cd mobile
npm install
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npx expo prebuild -p android --clean
cd android
.\gradlew.bat assembleRelease
```

The first build takes 15 to 20 minutes. The APK ends up in `mobile/android/app/build/outputs/apk/release/app-release.apk`. It's signed with a test key, which is fine for trying it out but not for the Play Store.

### A few decisions

- **Business name is optional.** Most PadosiPro customers are households, not businesses, and a required field would just push people to type something made up.
- **After verifying, you log in.** This follows the brief, so having a login token always means the email is verified.
- **The server address can be changed inside the app**, so one APK works with anyone's backend, on an emulator or a phone.
