# Changelog

All notable changes to Guardian are documented in this file.

## [0.1.1] - 2026-03-09

### Added

- First-launch onboarding wizard (welcome, privacy, VPN permission, completion) with skip support
- App category heuristics: MESSAGING, BROWSER, FINANCE alongside existing categories
- Category badge on Apps screen (en/he)
- Home screen empty state, pull-to-refresh, and last scan timestamp
- `LocalDomainReputationProvider` with expanded tracker database (20 domains)
- API endpoint `GET /api/v1/domains/:domain/reputation`
- Risk engine uses app category for sensitive-app-behavior thresholds (photo apps)

### Tests

- Onboarding settings, app category heuristics, domain reputation, sensitive-app rule (60+ total)

## [0.1.0] - 2026-03-09

### MVP release

Local-first mobile security monitoring with optional cloud sync.

#### Post-MVP updates (since `v0.1.0-mvp` tag)

- Settings screen with retention, notifications, cloud sync, and data export
- Trust this app action on app details (50% risk score reduction, fewer alerts)
- English / Hebrew language switcher in settings (persisted locally)
- Trusted-app scoring wired through risk pipeline reassessment
- API health/DB connectivity check and per-device rate limiting
- Cloud sync opt-in gate with `X-Device-Id` header
- Android release config (ProGuard, network security, EAS, keystore template)
- Additional unit tests for settings, sync, score, and rate limiter

#### Mobile

- React Native dashboard with Hebrew RTL support
- 37-app development simulator with Photo Cleaner high-risk demo scenario
- Real installed-app discovery on Android via launcher intent queries (no `QUERY_ALL_PACKAGES`)
- Android VPN native module for metadata-only network monitoring
- Domain blocklist persisted across VPN restarts (SharedPreferences)
- VPN session stats on home screen (packets, events, blocked domains)
- Optional cloud sync with retry and offline queue indicator
- Local SQLite storage with risk assessments and alerts
- Push notifications for high-risk alerts

#### API

- Express REST API with OpenAPI 3.0 spec
- Prisma + PostgreSQL persistence with simulator fallback
- Event batch ingestion from mobile devices
- Dashboard summary, alerts, and app risk endpoints

#### Packages

- `@guardian/shared` — types, Zod schemas, enums
- `@guardian/risk-engine` — rule-based risk scoring
- `@guardian/simulator` — dev event generator
- `@guardian/ui` — shared UI utilities

#### Tooling

- pnpm monorepo with CI (lint, typecheck, test, Android compile)
- Dev scripts: `./scripts/dev.sh`, `./scripts/test.sh`, `./scripts/android-build.sh`

### Known limitations

- VPN domain blocking is best-effort (DNS-based; DoH/DoT may bypass)
- App attribution is best-effort on Android 10+
- Installed-app list shows launcher-visible apps only
- iOS not supported
- Physical Android device required for full VPN verification
