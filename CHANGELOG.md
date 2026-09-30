# Changelog

Each version was installed and tested end to end on an Android emulator (and the backend from a fresh clone) before release. Only the latest APK is published on the [Releases page](https://github.com/Adityabit102/padosipro-assignment/releases/latest); earlier versions remain as git tags.

## v1.0.4 (2026-09-30)

Found while testing on a real phone:

- **Keyboard:** on Android the keyboard no longer covers the password fields or the main button on Log in, Create account and the profile form. The screen now shrinks to the space above the keyboard and keeps the field you're typing in visible. (Android now draws apps edge-to-edge, so the old "resize the window" setting no longer applies.)
- The Business name placeholder is shorter, so it no longer gets cut off.

## v1.0.3 (2026-09-30)

- The first-time task step offers **Log out**, both in the list and on its error screen, so it has no dead end if the task list can't load.
- `GET /health` also checks the database and returns 503 when Postgres is unreachable, so Docker's healthcheck and the app's *Test connection* only pass when the whole backend works.
- README: plainer APK build steps, with separate Mac and Windows commands. `DESIGN.md` trimmed to one page.

## v1.0.2 (2026-09-30)

Found by testing every screen on a 360 dp and a 320 dp wide emulator, with normal and large text:

- **Back button:** with the keyboard open, Back now only closes the keyboard (it used to leave the app). Back on Register returns to Log in.
- **Task selection:** the header and search scroll with the list, so small screens and large text keep room for the tasks. The back arrow stays pinned while editing.
- **Verify email:** after a wrong code or a new code, the keyboard reopens so the next code can be typed straight away.
- **Connecting from a phone:** when the app starts logged in but can't reach the server, it offers **Change server**, so a laptop whose IP changed (new Wi-Fi or hotspot) can be fixed without logging out. Connection help now covers hotspots and how to find the computer's IP.
- Centred layout on tablets; unused code removed; Mailpit image pinned to v1.31.3.
- README rewritten as a step-by-step guide for reviewers.

## v1.0.1 (2026-09-28)

- **OTP attempts:** each guess is now counted atomically before the code is compared, so parallel requests can never get more than 5 guesses against one code. A test sends 20 guesses at once to prove it.
- Verifying an unknown email gets the same answer as a sign-up with no usable code, so the endpoint doesn't reveal which emails are registered.
- Docker Compose allows 300 auth requests per 15 minutes (the API default stays 50), because all emulator traffic comes from one IP.
- *Test connection* on the Server screen no longer saves the address it tests; only *Save* does.

## v1.0.0 (2026-09-28)

First complete version:

- **Backend:** register, email OTP (hashed, 10-minute expiry, single use, 5 attempts, 30-second resend cooldown), login with JWT, profile, a 30-task catalogue and task selection. Node, Express, Prisma and PostgreSQL, with emails sent to Mailpit. Runs with `docker compose up --build`.
- **App:** native React Native (Expo) screens for the whole journey, from registration to home and logout, with loading, empty and error states.
- **Quality:** unit and integration tests for the OTP and login rules, GitHub Actions CI, README and `DESIGN.md`.
