# Android Permissions — Play Store Justification

Guardian requests only the permissions required for local network monitoring and user alerts. We avoid broad package visibility and do not inspect packet payloads.

## Declared permissions

| Permission | Purpose | User-facing justification |
| ---------- | ------- | ------------------------- |
| `INTERNET` | Optional cloud sync and domain reputation lookups | Sync metadata to your configured API endpoint |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_SPECIAL_USE` | Keep VPN monitoring active while the app is backgrounded | Android requires a foreground service for active VPN |
| `POST_NOTIFICATIONS` | High-risk security alerts | Notify you when an app behaves suspiciously |
| `VIBRATE` | Alert feedback | Optional haptic feedback for alerts |

## Permissions we deliberately avoid

### `QUERY_ALL_PACKAGES`

**Not used.** Guardian lists installed apps by querying launcher intents (`ACTION_MAIN` + `CATEGORY_LAUNCHER`) via the Android 11+ `<queries>` manifest element. This returns user-visible apps with a home-screen icon — sufficient for monitoring scope without Play Store scrutiny for broad package access.

### Storage permissions

`READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` are legacy Expo template entries. Guardian does not read user files or media contents. These may be removed in a future cleanup once confirmed unused by Expo modules.

## Runtime permission flows

| Flow | When | Behavior |
| ---- | ---- | -------- |
| VPN permission | User taps **Start monitoring** | Android system dialog via `VpnService.prepare()`; required for network metadata capture |
| Notifications | First high-risk alert (Android 13+) | System notification permission prompt via `expo-notifications` |

No runtime permission is needed for installed-app discovery — launcher queries work without user prompts on Android 11+.

## Data collected on device

- App package names and display labels (metadata only)
- Network domains and byte counts (no payloads)
- Risk scores and alert history (local SQLite)

See [privacy.md](privacy.md) and [ADR-001: Local-First](decisions/ADR-001-local-first.md).
