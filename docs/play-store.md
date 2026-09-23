# Play Store Submission Checklist

Complete guide for publishing Guardian v1.0.0 to Google Play.

## Pre-submission

- [ ] Version `1.0.0`, `versionCode` 100 in `app.config.ts` / `app.json`
- [ ] Production build: `EXPO_PUBLIC_DEV_SIMULATOR=false` (set in `eas.json` production profile)
- [ ] Dev UI hidden in release builds (demo button, simulator banner)
- [ ] Privacy Policy accessible in-app (Settings → Privacy Policy)
- [ ] Terms of Use accessible in-app (Settings → Terms of Use)
- [ ] Privacy policy URL configured: `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- [ ] App name on launcher: **Guardian**
- [ ] Icon and splash verified (`apps/mobile/assets/icon.png`)
- [ ] Release signing keystore configured (not debug keystore for production)
- [ ] All tests pass: `./scripts/test.sh`

## Build commands

### Play Store bundle (AAB)

```bash
cd apps/mobile
npx eas-cli build --platform android --profile production
```

### Direct-install APK (testing)

```bash
./scripts/build-release-apk.sh
# or EAS preview profile:
npx eas-cli build --platform android --profile preview
```

## Store listing assets

Files in `store-listing/`:

| Asset             | Spec                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| Short description | 80 chars max — `short-description-en.txt`, `short-description-he.txt` |
| Full description  | 4000 chars max — `full-description-en.txt`, `full-description-he.txt` |
| Feature graphic   | 1024×500 PNG — see `store-listing/FEATURE-GRAPHIC.md`                 |
| Phone screenshots | Min 2, 1080×1920 or 1440×2560 — see `store-listing/SCREENSHOTS.md`    |
| App icon          | 512×512 PNG (high-res icon) — export from `assets/icon.png`           |

## Play Console form fields

### App content

- **Privacy policy URL**: value of `EXPO_PUBLIC_PRIVACY_POLICY_URL` (default `https://guardian.app/privacy`)
- **Data safety**: declare network metadata collection (domains, bytes, timestamps); no personal content
- **VPN service**: disclose local VPN for network monitoring; metadata only, no payload inspection
- **Foreground service**: required for VPN — declare in Data safety and App content

### Permissions justification

| Permission           | Why                                                       |
| -------------------- | --------------------------------------------------------- |
| `BIND_VPN_SERVICE`   | Core feature — per-app network monitoring                 |
| `FOREGROUND_SERVICE` | Android requires foreground notification while VPN active |
| `POST_NOTIFICATIONS` | High-risk security alerts                                 |
| `INTERNET`           | Optional cloud sync only                                  |

See [docs/android-permissions.md](android-permissions.md) and [docs/privacy.md](privacy.md).

### Content rating

Complete IARC questionnaire. No violence, gambling, or mature content. Security/utility app.

### Target audience

General audience. Not designed for children under 13.

## Release tracks

1. **Internal testing** — upload AAB, add tester emails, verify VPN + onboarding on physical device
2. **Closed testing** — expand tester group
3. **Production** — after internal QA passes

## Post-launch

- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews
- [ ] Bump `versionCode` on every release (never reuse)
- [ ] Update `CHANGELOG.md` and tag (`v1.0.1`, etc.)

## Install guide for testers

Point testers to [INSTALL-ON-PHONE.md](INSTALL-ON-PHONE.md).
