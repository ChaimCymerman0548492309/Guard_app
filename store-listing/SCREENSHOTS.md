# Play Store Screenshots

## Phone screenshots (required)

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Min count      | **2** (recommend 4–8)              |
| Aspect ratio   | 16:9 or 9:16                       |
| Min dimensions | 320 px on short side               |
| Recommended    | **1080 × 1920** or **1440 × 2560** |
| Format         | PNG or JPEG                        |

## Suggested screens to capture

Capture on a physical Android phone after installing a release build:

1. **Onboarding — Welcome** (shows Guardian branding)
2. **Home** — monitoring active, risk counts
3. **Apps list** — monitored apps with risk badges
4. **App details** — risk explanation for one app
5. **Alert** — sample security alert
6. **Settings** — language, privacy links
7. **Hebrew** — home screen in RTL (optional second locale set)

## How to capture

### On device

- Power + Volume Down (most Android phones)
- Or: `adb exec-out screencap -p > screenshot.png`

### Automated (optional)

```bash
# With device connected and app on foreground:
adb shell screencap -p /sdcard/guardian-home.png
adb pull /sdcard/guardian-home.png store-listing/screenshots/01-home.png
```

## Tablet screenshots (optional)

7-inch and 10-inch tablet screenshots can improve discoverability but are not required for phone-only apps.

## File naming

```
store-listing/screenshots/
  01-onboarding-en.png
  02-home-en.png
  03-apps-en.png
  04-settings-en.png
  05-home-he.png
```

Create the `screenshots/` folder when you have captures ready.
