# ADR-001: Local-First Architecture

## Status

Accepted

## Context

Guardian monitors app and network behavior for privacy/security risks. Users are sensitive about data leaving their devices. Regulatory requirements (GDPR, etc.) favor minimal data collection.

## Decision

1. **Risk assessment runs entirely on-device** using the TypeScript risk engine.
2. **No packet payload collection** — only connection metadata (domain, bytes, timing).
3. **SQLite is the primary store** on mobile; PostgreSQL/API is optional for sync.
4. **DEV_SIMULATOR mode** generates realistic events for development without real VPN.
5. **Kotlin VPN module** is planned but not faked — limitations are documented honestly.

## Consequences

- Users get immediate, private risk feedback without network dependency.
- Cloud infrastructure is optional and can be added incrementally.
- Development relies on the simulator until native monitoring is ready.
- API endpoints return mock/seed data initially.

## Alternatives Considered

- **Cloud-only analysis** — Rejected: privacy concerns, latency, offline unusable.
- **Fake VPN in production** — Rejected: misleading to users; simulator is dev-only.
