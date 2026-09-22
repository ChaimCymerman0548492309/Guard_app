# Guardian E2E Test Plan

## Scope

End-to-end validation covers the critical user journey from monitoring setup through alert response. Automated integration tests run in CI (`apps/api/src/integration.test.ts`); manual device tests are required for VPN and notifications.

## Automated (CI)

| Flow | Location | Status |
| ---- | -------- | ------ |
| API health + apps + dashboard | `apps/api/src/app.test.ts` | Automated |
| Events list + batch ingest | `apps/api/src/app.test.ts` | Automated |
| Alerts list + block/allow | `apps/api/src/app.test.ts` | Automated |
| Critical path integration | `apps/api/src/integration.test.ts` | Automated |
| Risk engine rules | `packages/risk-engine` | Automated |
| Event pipeline + baselines | `apps/mobile/src/pipeline`, `services` | Automated |

## Manual — Android Device

### Prerequisites

- Development build (`npx expo run:android`)
- `EXPO_PUBLIC_DEV_SIMULATOR=false`
- Physical device or emulator with Google Play

### Test 1: VPN permission and status

1. Launch app → open **Monitoring setup**
2. Tap **Start monitoring** → approve VPN dialog
3. Verify home screen shows **VPN connected** status
4. Tap **Stop monitoring** → status returns to disconnected

**Expected:** Foreground VPN notification while active; no crash on revoke.

### Test 2: Demo scenario (simulator mode)

1. Set `EXPO_PUBLIC_DEV_SIMULATOR=true`, relaunch
2. Home shows demo banner and **37 apps monitored** (or current count)
3. Tap **Run demo scenario** → Photo Editor becomes SUSPICIOUS
4. Open alert → verify block/allow actions

**Expected:** Reproducible high-risk scenario without VPN.

### Test 3: High-risk notification

1. Simulator mode with SUSPICIOUS alert
2. Verify local notification appears (expo-notifications)

**Expected:** Notification for SUSPICIOUS only; SAFE stays silent.

### Test 4: Hebrew RTL

1. Set device language to Hebrew
2. Verify layouts mirror correctly; text aligns right

### Test 5: Domain blocking (best-effort)

1. Real VPN mode → trigger alert with domain
2. Tap **Block this connection**
3. Observe blocked domain in VPN layer logs (logcat: `GuardianVpn`)

**Expected:** Best-effort drop of DNS/TCP to blocked domain; DoH may bypass.

### Test 6: Real device alert (Hebrew + VPN)

1. Preview/dev APK, VPN **connected**, app language **Hebrew**
2. Follow `docs/phone-alert-demo-he.md` — e.g. Chrome visit ad-heavy sites
3. Confirm push title **«התראה: …»** and Hebrew explanation in app details

**Expected:** At least UNUSUAL on Chrome; SUSPICIOUS when multiple rules fire.

## API + Docker smoke

```bash
docker compose up -d
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/openapi
```

## Pass criteria

- All `pnpm test` suites green
- Integration test passes without database
- Manual VPN test documents any OEM-specific failures
