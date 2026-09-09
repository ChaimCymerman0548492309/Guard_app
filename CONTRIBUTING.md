# Contributing to Guardian

## Development setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
./scripts/dev.sh
```

## Workflow

1. Create a branch from `main`: `cursor/<description>-c702`
2. Make focused changes with conventional commits (`feat:`, `fix:`, `docs:`, `test:`)
3. Run `./scripts/test.sh` before pushing
4. Open a PR against `main`

## Code standards

- **Local-first**: never collect packet payloads or send raw traffic off-device
- **TypeScript strict**: run `pnpm typecheck` — no `any` without justification
- **Tests**: add tests for API endpoints and business logic; mobile VPN requires manual device testing
- **Honest limitations**: document Android VPN constraints in ADR-002 when changing native code

## Project structure

| Path | Purpose |
| ---- | ------- |
| `apps/mobile` | Expo React Native + Kotlin VPN |
| `apps/api` | Express REST API |
| `packages/shared` | Shared types and schemas |
| `packages/risk-engine` | Rule-based scoring |
| `packages/simulator` | DEV_SIMULATOR data |
| `prisma/` | PostgreSQL schema and migrations |

## Android native changes

VPN code lives in `apps/mobile/android/`. After Kotlin changes:

```bash
cd apps/mobile && npx expo prebuild --platform android
pnpm android
```

Native changes cannot be tested in Expo Go — use a development build.
