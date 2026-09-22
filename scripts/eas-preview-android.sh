#!/usr/bin/env bash
set -euo pipefail

# Build a preview APK on Expo EAS (internal distribution — install URL for Android phones).
# Requires a valid Expo access token: https://expo.dev/settings/access-tokens
#
# Usage (Git Bash / Linux / macOS):
#   export EXPO_TOKEN='paste_token_only_no_bearer_prefix'
#   ./scripts/eas-preview-android.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "ERROR: Set EXPO_TOKEN to your Expo access token (not your password)." >&2
  echo "  Create one: https://expo.dev/settings/access-tokens" >&2
  echo "  Example: export EXPO_TOKEN='abc123...'" >&2
  exit 1
fi

# Common mistakes that cause: \"Bearer ... is not a legal HTTP header value\"
if [[ "$EXPO_TOKEN" == Bearer* ]]; then
  echo "ERROR: Do not include 'Bearer ' in EXPO_TOKEN — paste the token only." >&2
  exit 1
fi
if [[ ! "$EXPO_TOKEN" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "ERROR: EXPO_TOKEN must be ASCII letters/numbers (no Hebrew placeholders, spaces, or quotes in the value)." >&2
  exit 1
fi

echo "==> EAS Android preview (APK, API: https://guard-app-pe2n.onrender.com)"
npx eas-cli@latest build \
  --platform android \
  --profile preview \
  --non-interactive \
  --wait

echo ""
echo "Open the install link from the output above, or:"
echo "  https://expo.dev/accounts/chaim8114/projects/guardian/builds"
