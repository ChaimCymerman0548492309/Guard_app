#!/usr/bin/env bash
set -euo pipefail

# Build a preview APK on Expo EAS (internal distribution — install URL for Android phones).
# Requires a valid Expo access token: https://expo.dev/settings/access-tokens
#
# Usage (Git Bash / Linux / macOS):
#   export EXPO_TOKEN='paste_token_only_no_bearer_prefix'
#   ./scripts/eas-preview-android.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "ERROR: Set EXPO_TOKEN to your Expo access token (not your password)." >&2
  echo "  Create one: https://expo.dev/settings/access-tokens" >&2
  echo "  Example: export EXPO_TOKEN='abc123...'" >&2
  exit 1
fi

if [[ "$EXPO_TOKEN" == Bearer* ]]; then
  echo "ERROR: Do not include 'Bearer ' in EXPO_TOKEN — paste the token only." >&2
  exit 1
fi
if [[ ! "$EXPO_TOKEN" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "ERROR: EXPO_TOKEN must be ASCII letters/numbers (no Hebrew placeholders, spaces, or quotes in the value)." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm is required. Install: npm install -g pnpm" >&2
  exit 1
fi

echo "==> Installing monorepo dependencies (required before EAS reads app.config.ts)..."
pnpm install --ignore-scripts
pnpm --filter @guardian/shared build
pnpm --filter @guardian/ui build
pnpm --filter @guardian/risk-engine build
pnpm --filter @guardian/simulator build

MOBILE="$ROOT/apps/mobile"
if [[ ! -e "$MOBILE/node_modules/expo-localization/app.plugin.js" ]]; then
  echo "ERROR: expo-localization is missing under apps/mobile/node_modules." >&2
  echo "  From repo root run: pnpm install" >&2
  echo "  Use pnpm (not npm) — this is a monorepo." >&2
  exit 1
fi

echo "==> Verifying Expo config..."
(cd "$MOBILE" && npx expo config --type public >/dev/null)

echo "==> EAS Android preview (APK, API: https://guard-app-pe2n.onrender.com)"
cd "$MOBILE"
npx eas-cli@latest build \
  --platform android \
  --profile preview \
  --non-interactive \
  --wait

echo ""
echo "Open the install link from the output above, or:"
echo "  https://expo.dev/accounts/chaim8114/projects/guardian/builds"
