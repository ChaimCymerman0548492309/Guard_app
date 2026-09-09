# ADR-002: Android VPN Network Monitoring

## Status

Accepted — Phase 5 POC implemented

## Context

Guardian needs on-device network visibility to detect privacy risks (new domains, large uploads, tracker connections) without collecting packet payloads. Android provides `VpnService` for non-rooted devices, but with significant platform constraints.

## Decision

Implement a minimal Kotlin `GuardianVpnService` that:

1. Establishes a TUN interface via `VpnService.Builder`
2. Runs as a **foreground service** with a persistent notification
3. Parses IP headers and DNS queries to extract **metadata only** (domain, bytes, protocol, direction)
4. Maps traffic to apps via `ConnectivityManager.getConnectionOwnerUid()` (Android 10+)
5. Emits events to React Native through `GuardianVpnModule`
6. Falls back gracefully when VPN is unsupported or permission is denied

Business logic (risk scoring, baselines, alerts) remains in TypeScript.

## Capabilities

| Capability | Supported | Notes |
|------------|-----------|-------|
| Domain from DNS (UDP/53) | Yes | QNAME extracted; answer payloads discarded |
| Byte counts per flow | Yes | Summed from IP packet sizes |
| Protocol (TCP/UDP) | Yes | From IP header |
| App attribution | Partial | Requires Android 10+; fails for some flows |
| HTTPS payload inspection | **No** | TLS encrypted — by design |
| Per-domain blocking | **Best-effort** | Full enforcement needs maintained routing rules |
| iOS | **No** | Network Extension not implemented |

## Limitations

### Platform

- **User consent required**: Android shows a system VPN permission dialog via `VpnService.prepare()`. Users must explicitly approve.
- **One VPN at a time**: Cannot run alongside other VPN apps.
- **Foreground service**: Android 8+ requires visible notification while active.
- **Battery optimization**: OEM power managers may restrict background VPN on some devices.

### Visibility gaps

- **DNS-over-HTTPS/TLS**: Bypasses UDP/53 capture; domains may appear as IP addresses only.
- **Encrypted DNS**: Same limitation — domain inference fails.
- **Split tunneling**: Some apps may route outside VPN depending on OEM/network config.
- **System apps**: Attribution and blocking limited without device-owner privileges.

### Privacy boundaries

- **No payload storage**: Implementation parses headers and DNS QNAME only; packet bodies are forwarded immediately and not persisted.
- **IP fallback**: When domain is unknown, the destination IP is recorded as the identifier.

### Blocking

- `blockDomain()` acknowledges requests but **does not guarantee** network-level enforcement in this POC. Documented as best-effort; production would require maintained blocklists and VPN routing rules.

## Alternatives considered

1. **UsageStatsManager only** — Insufficient for domain-level visibility.
2. **Root/pcap** — Violates non-root requirement.
3. **Fake simulated VPN in production** — Rejected per project principles.

## Consequences

- Real Android builds require a **development build** (`expo prebuild` + native compile), not Expo Go.
- Demo/CI uses `EXPO_PUBLIC_DEV_SIMULATOR=true` for reproducible scenarios.
- Users on unsupported platforms see honest fallback messaging in the Permissions screen.

## References

- [Android VpnService documentation](https://developer.android.com/reference/android/net/VpnService)
- [Connection ownership (API 29+)](https://developer.android.com/reference/android/net/ConnectivityManager#getConnectionOwnerUid(int,%20java.net.InetSocketAddress,%20java.net.InetSocketAddress))
