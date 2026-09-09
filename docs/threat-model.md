# Threat Model

## Assets

1. User's app usage metadata (domains, byte counts)
2. Risk assessments and alerts
3. Device-local SQLite database

## Threat Actors

| Actor              | Capability                  | Motivation         |
| ------------------ | --------------------------- | ------------------ |
| Malicious app      | Network access, permissions | Data exfiltration  |
| Network attacker   | MITM on unencrypted traffic | Intercept metadata |
| Tracker/ad network | Domain connections          | Profiling          |

## Mitigations

| Threat                     | Mitigation                  | Status |
| -------------------------- | --------------------------- | ------ |
| Malicious app exfiltration | On-device risk detection    | MVP    |
| Tracker domains            | KNOWN_TRACKER rule          | MVP    |
| Large data uploads         | LARGE_UPLOAD rule           | MVP    |
| Sensitive data access      | SENSITIVE_APP_BEHAVIOR rule | MVP    |
| Network monitoring         | Kotlin VPN (metadata only)  | POC (Android) |

## Out of Scope (Phase 1)

- Real-time packet inspection
- Full per-domain VPN blocking
- iOS Network Extension
- Malware signature detection
- Root/jailbreak detection

## Honest Limitations

Guardian uses a **development simulator** (`DEV_SIMULATOR=true`) for demo and testing. On Android with `DEV_SIMULATOR=false`, a native Kotlin VPN module captures connection metadata only — see [ADR-002](decisions/ADR-002-android-vpn.md). The simulator is never faked as real VPN data in production builds.
