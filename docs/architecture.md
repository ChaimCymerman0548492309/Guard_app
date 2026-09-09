# Guardian Architecture

## Overview

Guardian is a **local-first** mobile security monitoring application. It analyzes app and network behavior on-device to surface privacy and security risks without collecting packet payloads or sending raw traffic to the cloud.

### Stack

| Layer                | Technology           | Notes                                            |
| -------------------- | -------------------- | ------------------------------------------------ |
| Mobile               | React Native (Expo)  | Primary UI; Kotlin documented for future VPN POC |
| API                  | Express (optional)   | Sync/backup skeleton; not required for core flow |
| Business logic       | TypeScript           | Risk engine, shared types, simulator             |
| Persistence (mobile) | SQLite (expo-sqlite) | Apps, events, assessments, alerts                |
| Persistence (API)    | PostgreSQL + Prisma  | Optional cloud sync                              |
| Validation           | Zod                  | Runtime schemas shared across packages           |
| Logging              | Pino                 | Structured API logging                           |

### Design Principles

1. **Local-first** — Risk assessment runs on-device; cloud is optional.
2. **No payload collection** — Only metadata (domains, bytes, timing) is recorded.
3. **Consumer-friendly** — UI uses plain language (Safe / Unusual / Suspicious).
4. **Extensible rules** — `RiskRule` interface allows adding detectors without rewriting the engine.
5. **Honest limitations** — Android VPN monitoring is documented but not faked in production.

## Repository Tree

```
guardian/
├── apps/
│   ├── api/                 # Express REST API skeleton
│   └── mobile/              # Expo React Native app
├── packages/
│   ├── shared/              # Types, Zod schemas, constants
│   ├── risk-engine/         # Rule-based risk scoring
│   ├── ui/                  # Shared UI components
│   └── simulator/           # DEV_SIMULATOR event generator
├── prisma/                  # PostgreSQL schema
├── config/                  # Risk, network, retention, security config
├── docs/                    # Architecture, privacy, security, API
├── scripts/                 # Dev and CI helpers
└── .github/workflows/       # CI pipeline
```

## Domain Models

### App

Represents an installed application on the device.

```typescript
interface App {
  id: string;
  packageName: string;
  displayName: string;
  category: AppCategory;
  isSystem: boolean;
  trustLevel: TrustLevel;
}
```

### SecurityEvent

On-device security-relevant action (permission use, file access, etc.).

```typescript
interface SecurityEvent {
  id: string;
  appId: string;
  type: SecurityEventType;
  timestamp: Date;
  metadata: Record<string, unknown>;
}
```

### NetworkEvent

Network connection metadata — **no packet payloads**.

```typescript
interface NetworkEvent {
  id: string;
  appId: string;
  domain: string;
  bytesSent: number;
  bytesReceived: number;
  isNewDomain: boolean;
  timestamp: Date;
}
```

### RiskAssessment

Output of the risk engine for an app or session.

```typescript
interface RiskAssessment {
  id: string;
  appId: string;
  score: number; // 0–100
  level: RiskLevel; // SAFE | UNUSUAL | SUSPICIOUS
  triggeredRules: string[];
  explanation: string;
  assessedAt: Date;
}
```

### Alert

User-facing notification derived from a risk assessment.

```typescript
interface Alert {
  id: string;
  appId: string;
  riskAssessmentId: string;
  title: string;
  message: string;
  level: RiskLevel;
  acknowledged: boolean;
  createdAt: Date;
}
```

### Supporting Models

- **User** / **Device** — API sync entities
- **Rule** — Configurable rule metadata
- **DomainReputation** — Known tracker/ad domain list
- **AppBehaviorBaseline** — Per-app normal behavior profile

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Simulator  │────▶│ Risk Engine  │────▶│  Dashboard  │
│ (dev mode)  │     │  (on-device) │     │  (mobile)   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   SQLite    │
                    └─────────────┘
                           │
                    (optional sync)
                           ▼
                    ┌─────────────┐
                    │  Express API│
                    │  PostgreSQL │
                    └─────────────┘
```

## Phase 1 Plan

| Step | Deliverable                                        | Status |
| ---- | -------------------------------------------------- | ------ |
| 1    | Monorepo foundation (pnpm, TS, ESLint, Docker, CI) | MVP    |
| 2    | Risk engine with 5 rules + unit tests              | MVP    |
| 3    | DEV_SIMULATOR with demo scenarios                  | MVP    |
| 4    | Mobile dashboard (screens, i18n, SQLite)           | MVP    |
| 5    | API skeleton with Prisma + integration tests       | MVP    |
| —    | Kotlin VPN POC                                     | Future |
| —    | Real Android network monitoring                    | Future |
| —    | Cloud sync                                         | Future |

## Future: Kotlin VPN Module

A native Android VPN service (Kotlin) will intercept connection metadata only — domain, port, byte counts — never packet contents. This module is documented in `docs/decisions/ADR-001-local-first.md` but not implemented in Phase 1.
