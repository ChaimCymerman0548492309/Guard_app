#!/usr/bin/env bash
set -euo pipefail

# Build a release APK for direct install on a physical Android phone.
# Output: apps/mobile/android/app/build/outputs/apk/release/app-release.apk

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"

export EXPO_PUBLIC_DEV_SIMULATOR=false

echo "==> Prebuild Android project (release)..."
npx expo prebuild --platform android --clean

echo "==> Building release APK..."
cd android
./gradlew assembleRelease

APK="app/build/outputs/apk/release/app-release.apk"
if [[ -f "$APK" ]]; then
  echo ""
  echo "Release APK ready:"
  echo "  $(pwd)/$APK"
  echo ""
  echo "Install on phone (USB debugging enabled):"
  echo "  adb install -r $APK"
else
  echo "ERROR: APK not found at $APK" >&2
  exit 1
fi
