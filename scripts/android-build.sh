#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"

echo "Generating Android native project..."
npx expo prebuild --platform android --clean

echo "Building and installing on connected device (production mode, no simulator)..."
EXPO_PUBLIC_DEV_SIMULATOR=false pnpm android

echo "Android build complete."
