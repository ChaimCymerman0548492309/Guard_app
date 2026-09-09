# Guardian Architecture

## Overview

Guardian is a **local-first** mobile security monitoring application. It analyzes app and network behavior on-device to surface privacy and security risks without collecting packet payloads or sending raw traffic to the cloud.

### Stack

| Layer                | Technology           | Notes                                       |
| -------------------- | -------------------- | ------------------------------------------- |
| Mobile               | React Native (Expo)  | Dashboard + Kotlin VPN module (Android)     |
| Native (Android)     | Kotlin VpnService    | Metadata-only network capture POC           |
| API                  | Express (optional)   | Sync/backup; Prisma + simulator fallback    |
| Business logic       | TypeScript           | Risk engine, baselines, aggregation, alerts |
| Persistence (mobile) | SQLite (expo-sqlite) | Apps, events, baselines, timeline, alerts   |
| Persistence (API)    | PostgreSQL + Prisma  | Optional cloud sync                         |
| Validation           | Zod                  | Runtime schemas shared across packages      |
| Logging              | Pino                 | Structured API logging                      |

### Design Principles

1. **Local-first** — Risk assessment runs on-device; cloud is optional.
2. **No payload collection** — Only metadata (domains, bytes, timing) is recorded.
3. **Consumer-friendly** — UI uses plain language (Safe / Unusual / Suspicious).
4. **Extensible rules** — `RiskRule` interface allows adding detectors without rewriting the engine.
5. **Honest limitations** — Android VPN constraints documented in ADR-002; no faked production behavior.

## Repository Tree

```
guardian/
├── apps/
│   ├── api/                 # Express REST API
│   └── mobile/              # Expo React Native app
│       └── android/         # Kotlin VPN native module
├── packages/
│   ├── shared/              # Types, Zod schemas, constants
│   ├── risk-engine/         # Rule-based risk scoring
│   ├── ui/                  # Shared UI components
│   └── simulator/           # DEV_SIMULATOR event generator
├── prisma/                  # PostgreSQL schema
├── config/                  # Risk, network, retention, security config
├── docs/                    # Architecture, privacy, security, API, ADRs
├── scripts/                 # Dev and CI helpers
└── .github/workflows/       # CI pipeline
```

## Domain Models

See `packages/shared/src/types.ts` for full definitions: `App`, `SecurityEvent`, `NetworkEvent`, `RiskAssessment`, `Alert`, `AppBehaviorBaseline`, `TimelineEvent`, `DomainReputation`.

## Data Flow

### Production (Android, DEV_SIMULATOR=false)

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ GuardianVpnService│────▶│ EventAggregator │────▶│   SQLite     │
│ (Kotlin, metadata)│     │ (dedupe/window) │     │              │
└──────────────────┘     └────────┬────────┘     └──────┬───────┘
                                  │                      │
                                  ▼                      │
                         ┌─────────────────┐             │
                         │  Risk Engine    │◀────────────┘
                         │  + Baseline     │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐     ┌──────────────┐
                         │ Alerts + Timeline│────▶│  Dashboard   │
                         └─────────────────┘     └──────────────┘
                                  │
                           (optional sync)
                                  ▼
                         ┌─────────────────┐
                         │  Express API    │
                         │  PostgreSQL     │
                         └─────────────────┘
```

### Development (DEV_SIMULATOR=true)

The simulator generates realistic seed scenarios (Photo Cleaner high-risk demo) through the same pipeline, ensuring UI and risk logic are tested without VPN hardware.

## Event Pipeline

1. **Collect** — Native VPN events or simulator output
2. **Aggregate** — Merge by app+domain within 60s window (anti-spam)
3. **Store** — SQLite (`network_events`, `timeline_events`)
4. **Baseline** — Update per-app typical domains, volume, active hours
5. **Assess** — Risk engine evaluates against baseline + rules
6. **Alert** — Generate user-facing alerts with notification policy
7. **Retain** — Purge data older than configurable retention (default 30 days)

## Android VPN Module

| Component            | Location                  | Role                                                  |
| -------------------- | ------------------------- | ----------------------------------------------------- |
| `GuardianVpnService` | `android/.../vpn/`        | TUN interface, DNS/domain parsing, foreground service |
| `GuardianVpnModule`  | `android/.../vpn/`        | React Native bridge (start/stop/status/events)        |
| `guardian-vpn.ts`    | `apps/mobile/src/native/` | TypeScript interface + platform fallback              |

See [ADR-002](decisions/ADR-002-android-vpn.md) for platform limitations.

## Alert Notification Policy

| Risk Level | User label | Notification behavior      |
| ---------- | ---------- | -------------------------- |
| SAFE       | Safe       | Silent                     |
| UNUSUAL    | Unusual    | Occasional (non-immediate) |
| SUSPICIOUS | Suspicious | Immediate + block option   |

## Phase Status

| Phase | Deliverable                              | Status |
| ----- | ---------------------------------------- | ------ |
| 1–4   | Monorepo, risk engine, simulator, mobile | Done   |
| 5     | Android VPN POC (Kotlin)                 | Done   |
| 6     | Native event pipeline → SQLite → UI      | Done   |
| 7     | Baselines, alerts, timeline, actions     | Done   |
| 8     | API Prisma wiring + batch events         | Done   |
| 9     | UX polish, a11y, retention, domain stub  | Done   |
| 10    | Tests, CI, README                        | Done   |

## Future Work

- iOS Network Extension
- Production domain reputation feed
- Full per-domain VPN blocking
- Push notification delivery for alerts
