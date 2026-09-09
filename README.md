# Guardian

Local-first mobile security monitoring. Guardian analyzes app and network behavior on your device to surface privacy risks — without collecting packet payloads or sending raw traffic to the cloud.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full overview.

```
apps/mobile     → Expo React Native dashboard + Android VPN module
apps/api        → Express REST API (optional sync)
packages/shared → Types, Zod schemas, constants
packages/risk-engine → Rule-based risk scoring
packages/simulator     → DEV_SIMULATOR event generator
packages/ui     → Shared UI utilities
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL, optional)
- Android Studio + JDK 17 (for Android native builds)

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Start PostgreSQL (optional, for API sync)
docker compose up -d postgres

# Run tests
pnpm test

# Typecheck
pnpm typecheck

# Start API dev server
pnpm dev:api

# Start mobile app (simulator mode)
EXPO_PUBLIC_DEV_SIMULATOR=true pnpm dev:mobile
```

## Android Build (VPN POC)

The Android VPN module requires a **development build** — it does not run in Expo Go.

```bash
cd apps/mobile

# Generate native Android project (first time)
npx expo prebuild --platform android

# Run on connected device/emulator
pnpm android
# or: npx expo run:android
```

### Real network monitoring

```bash
# Disable simulator to use native VPN events
EXPO_PUBLIC_DEV_SIMULATOR=false npx expo run:android
```

On first launch, open **Monitoring setup** from the home screen and tap **Start monitoring**. Android will show the VPN permission dialog.

### Known Android limitations

See [docs/decisions/ADR-002-android-vpn.md](docs/decisions/ADR-002-android-vpn.md):

- Domains inferred from DNS; DoH/DoT may show IPs only
- App attribution best-effort on Android 10+
- No HTTPS payload inspection (by design)
- One VPN at a time; foreground notification required

## Development Simulator

Set `DEV_SIMULATOR=true` (API) or `EXPO_PUBLIC_DEV_SIMULATOR=true` (mobile) to use simulated events instead of real network monitoring.

Demo scenario: **Photo Cleaner** — 1200 photos accessed, new domain contacted, 350MB upload → **HIGH RISK**.

Seed apps: WhatsApp, Google Photos, Photo Editor, Calculator, Unknown App.

## Scripts

| Command           | Description            |
| ----------------- | ---------------------- |
| `pnpm test`       | Run all package tests  |
| `pnpm typecheck`  | TypeScript check       |
| `pnpm lint`       | ESLint                 |
| `pnpm build`      | Build packages and API |
| `pnpm dev:api`    | Start Express API      |
| `pnpm dev:mobile` | Start Expo mobile app  |

## API Endpoints

| Method | Path                        | Description         |
| ------ | --------------------------- | ------------------- |
| GET    | `/health`                   | Health check        |
| GET    | `/api/v1/apps`              | List apps with risk |
| GET    | `/api/v1/dashboard/summary` | Dashboard counts    |
| POST   | `/api/v1/events/batch`      | Optional event sync |

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Privacy](docs/privacy.md)
- [Security](docs/security.md)
- [Threat Model](docs/threat-model.md)
- [ADR-001: Local-First](docs/decisions/ADR-001-local-first.md)
- [ADR-002: Android VPN](docs/decisions/ADR-002-android-vpn.md)

## License

Private — MVP development.
