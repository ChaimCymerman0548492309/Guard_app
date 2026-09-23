# Guardian Dev Lab

Run a full **phone simulation + web dashboard** on your computer — no physical device required.

---

## Quick start (recommended)

```bash
./scripts/dev-lab.sh
```

Then open:

- **Web dashboard:** http://localhost:5173
- **API:** http://localhost:3000

Three virtual devices are pre-seeded:

| Device             | ID                                     | Description                                        |
| ------------------ | -------------------------------------- | -------------------------------------------------- |
| Virtual Demo Phone | `00000000-0000-4000-8000-000000000001` | Online by default, 37 apps, Photo Cleaner scenario |
| Android Emulator   | `00000000-0000-4000-8000-000000000002` | Simulates an emulator slot                         |
| Lab Test Device    | `00000000-0000-4000-8000-000000000003` | Extra lab device                                   |

---

## What you get

### Web dashboard (`apps/web`)

- List of connected / virtual devices
- Per-device report: apps, risk levels, alerts
- Block / Allow / Ignore alert actions
- **Run Photo Cleaner demo** button per device
- Hebrew (RTL) + English toggle

### Simulator API (`DEV_SIMULATOR=true`)

Same data pipeline as the mobile app, without VPN:

```bash
curl http://localhost:3000/api/v1/devices
curl http://localhost:3000/api/v1/dashboard/summary
curl http://localhost:3000/api/v1/devices/00000000-0000-4000-8000-000000000001/apps
```

---

## Option A — Web only (fastest)

No emulator, no phone:

```bash
./scripts/dev-lab.sh
```

Open http://localhost:5173 — full dashboard with simulated devices.

---

## Option B — Mobile UI on Android Emulator

Simulates a real phone screen where you can install APKs and run the Guardian app.

### Prerequisites

1. [Android Studio](https://developer.android.com/studio)
2. Create a virtual device: **Pixel 7**, **API 34**, with Google Play
3. Start the emulator from Android Studio (or `emulator -avd <name>`)

### Run Guardian mobile in demo mode

```bash
# Terminal 1 — API + web
./scripts/dev-lab.sh

# Terminal 2 — mobile app
EXPO_PUBLIC_DEV_SIMULATOR=true EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 pnpm dev:mobile
```

Press **`a`** in the Expo terminal to open on the Android emulator.

> `10.0.2.2` is the emulator's alias for your computer's `localhost`.

Enable **Cloud sync** in app Settings to push events to the API. The web dashboard will show the device as connected.

### Install other APKs on the emulator

Drag an `.apk` file onto the emulator window, or:

```bash
adb install path/to/app.apk
```

Guardian monitors network metadata via VPN (requires a **development build**, not Expo Go):

```bash
./scripts/android-build.sh
```

---

## Option C — Manual services

```bash
pnpm install
cp .env.example .env   # DEV_SIMULATOR=true

# Terminal 1
DEV_SIMULATOR=true pnpm dev:api

# Terminal 2
pnpm dev:web
```

---

## API endpoints (devices)

| Method | Path                          | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| GET    | `/api/v1/devices`             | List all devices               |
| GET    | `/api/v1/devices/:id`         | Device details                 |
| GET    | `/api/v1/devices/:id/summary` | Device dashboard summary       |
| GET    | `/api/v1/devices/:id/apps`    | Apps on device                 |
| GET    | `/api/v1/devices/:id/alerts`  | Alerts for device              |
| POST   | `/api/v1/devices/:id/demo`    | Run Photo Cleaner demo         |
| POST   | `/api/v1/devices/register`    | Register a device (lab / sync) |

---

## עברית — מדרך מהיר

### התחלה מהירה

```bash
./scripts/dev-lab.sh
```

פתח: http://localhost:5173

### מה רואים בדשבורד?

- רשימת מכשירים (3 מכשירים וירטואליים מוכנים)
- דוח לכל מכשיר: אפליקציות, רמת סיכון, התראות
- כפתור **הרץ תרחיש Photo Cleaner** לדמו
- מעבר עברית / English

### בלי טלפון — רק מחשב

מספיק `./scripts/dev-lab.sh` — אין צורך במכשיר פיזי.

### עם אמולטור Android (להתקנת אפליקציות)

1. התקן Android Studio
2. צור Pixel emulator עם Google Play
3. `./scripts/dev-lab.sh` + `EXPO_PUBLIC_DEV_SIMULATOR=true pnpm dev:mobile`
4. לחץ `a` בטרמינל של Expo

---

## Troubleshooting

| Problem                              | Fix                                                    |
| ------------------------------------ | ------------------------------------------------------ |
| Dashboard empty / API error          | Ensure API runs on port 3000 with `DEV_SIMULATOR=true` |
| Mobile can't reach API from emulator | Use `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`         |
| VPN not working in Expo Go           | Use `./scripts/android-build.sh` for a dev build       |
| Port 5173 in use                     | Change port in `apps/web/vite.config.ts`               |
