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
| Network monitoring         | Kotlin VPN (metadata only)  | Future |

## Out of Scope (Phase 1)

- Real-time packet inspection
- Android VPN service implementation
- iOS Network Extension
- Malware signature detection
- Root/jailbreak detection

## Honest Limitations

Guardian Phase 1 uses a **development simulator** for event generation. Production network monitoring requires a native Android VPN module (Kotlin) that captures connection metadata only. This is documented but **not faked** in the production build.
