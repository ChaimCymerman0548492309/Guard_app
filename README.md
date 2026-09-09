# Guardian

Local-first mobile security monitoring. Guardian analyzes app and network behavior on your device to surface privacy risks — without collecting packet payloads or sending raw traffic to the cloud.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full overview.

```
apps/mobile     → Expo React Native dashboard + Android VPN module
apps/api        → Express REST API (optional sync)
packages/shared → Types, Zod schemas, constants
packages/risk-engine → Rule-based risk scoring
packages/simulator     → DEV_SIMULATOR event generator (37 apps)
packages/ui     → Shared UI utilities
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (optional, for PostgreSQL)
- Android Studio + JDK 17 (for Android native builds)
- Physical Android device or emulator (API 29+ recommended for app attribution)

## Setup from zero

### 1. Clone and install

```bash
git clone <repo-url> guardian
cd guardian
./scripts/dev.sh
```

Or manually:

```bash
pnpm install
cp .env.example .env
pnpm db:generate
```

### 2. Run tests

```bash
./scripts/test.sh
```

### 3. Start demo mode (no device needed)

```bash
EXPO_PUBLIC_DEV_SIMULATOR=true pnpm dev:mobile
```

Press `a` for Android emulator or scan QR with Expo Go. Demo mode shows 37 monitored apps and the Photo Cleaner high-risk scenario.

### 4. Start API (optional)

```bash
# With PostgreSQL
docker compose up -d
pnpm dev:api

# Without Docker — simulator fallback
DEV_SIMULATOR=true pnpm dev:api
```

API available at `http://localhost:3000`. See [docs/api.md](docs/api.md).

Optional mobile → cloud sync: set `EXPO_PUBLIC_API_URL=http://localhost:3000` in `.env`. Network metadata batches upload automatically after local processing.

## Android device setup (real VPN monitoring)

VPN requires a **development build** — it does not run in Expo Go.

### 1. Enable USB debugging

On your Android device: Settings → Developer options → USB debugging.

### 2. Connect device and build

```bash
./scripts/android-build.sh
```

Or step by step:

```bash
cd apps/mobile
npx expo prebuild --platform android
EXPO_PUBLIC_DEV_SIMULATOR=false pnpm android
```

### 3. Grant permissions

1. Launch Guardian on device
2. Open **Monitoring setup** from home
3. Tap **Start monitoring** → approve Android VPN dialog
4. Allow notifications when prompted (for high-risk alerts)

### 4. Verify

- Home screen shows **Monitoring active** (green status)
- Android status bar shows VPN key icon
- Foreground notification: "Guardian is active"

### Known Android limitations

See [docs/decisions/ADR-002-android-vpn.md](docs/decisions/ADR-002-android-vpn.md):

- Domains inferred from DNS (UDP/53); DoH/DoT may show IPs only
- App attribution best-effort on Android 10+; system apps harder to identify
- Domain blocking is best-effort (in-memory blocklist, not persisted across restarts)
- No HTTPS payload inspection (by design)
- One VPN at a time; foreground notification required
- iOS not supported

## Development simulator

Set `DEV_SIMULATOR=true` (API) or `EXPO_PUBLIC_DEV_SIMULATOR=true` (mobile).

Demo scenario: **Photo Cleaner** — 1200 photos accessed, new domain contacted, 350MB upload → **SUSPICIOUS**.

Tap **Run Photo Cleaner demo** on the home screen to replay the scenario.

## Scripts

| Script / Command | Description |
| ---------------- | ----------- |
| `./scripts/dev.sh` | Install deps, generate Prisma client, create `.env` |
| `./scripts/test.sh` | Full CI check: build, lint, typecheck, test |
| `./scripts/android-build.sh` | Prebuild + run on Android device |
| `python3 scripts/generate-icon.py` | Regenerate app icon PNG |
| `pnpm dev:api` | Start Express API |
| `pnpm dev:mobile` | Start Expo mobile app |
| `pnpm db:migrate` | Apply Prisma migrations |
| `docker compose up -d` | Start PostgreSQL + API |

## API Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Health check |
| GET | `/api/v1/apps` | List apps with risk |
| GET | `/api/v1/apps/:id` | App details |
| GET | `/api/v1/apps/:id/events` | App network events |
| GET | `/api/v1/apps/:id/risk` | Latest risk assessment |
| GET | `/api/v1/events` | List network events |
| POST | `/api/v1/events/batch` | Ingest events from mobile |
| GET | `/api/v1/alerts` | List alerts |
| POST | `/api/v1/alerts/:id/block` | Block domain |
| POST | `/api/v1/alerts/:id/allow` | Allow and acknowledge |
| GET | `/api/v1/dashboard/summary` | Dashboard counts |
| GET | `/api/v1/openapi` | OpenAPI 3.0 spec |

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [E2E Test Plan](docs/e2e-test-plan.md)
- [Contributing](CONTRIBUTING.md)
- [Privacy](docs/privacy.md)
- [Security](docs/security.md)
- [Threat Model](docs/threat-model.md)
- [ADR-001: Local-First](docs/decisions/ADR-001-local-first.md)
- [ADR-002: Android VPN](docs/decisions/ADR-002-android-vpn.md)

## License

Private — MVP development.
