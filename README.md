# Guardian

Local-first mobile security monitoring. Guardian analyzes app and network behavior on your device to surface privacy risks — without collecting packet payloads or sending raw traffic to the cloud.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full overview.

```
apps/mobile     → Expo React Native dashboard
apps/api        → Express REST API (optional sync)
packages/shared → Types, Zod schemas, constants
packages/risk-engine → Rule-based risk scoring
packages/simulator     → DEV_SIMULATOR event generator
packages/ui     → Shared UI utilities
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Start PostgreSQL
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

## Development Simulator

Set `DEV_SIMULATOR=true` (API) or `EXPO_PUBLIC_DEV_SIMULATOR=true` (mobile) to use simulated events instead of real network monitoring.

Demo scenario: **Photo Cleaner** — 1200 photos accessed, new domain contacted, 350MB upload → **HIGH RISK**.

Seed apps: WhatsApp, Google Photos, Photo Editor, Calculator, Unknown App.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all package tests |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm build` | Build packages and API |
| `pnpm dev:api` | Start Express API |
| `pnpm dev:mobile` | Start Expo mobile app |

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Privacy](docs/privacy.md)
- [Security](docs/security.md)
- [Threat Model](docs/threat-model.md)
- [ADR-001: Local-First](docs/decisions/ADR-001-local-first.md)

## Limitations

- **No real VPN monitoring** in Phase 1 — uses development simulator
- **Kotlin VPN module** documented for future Android POC
- **Cloud sync** is optional skeleton only
- **iOS Network Extension** not implemented

## License

Private — MVP development.
