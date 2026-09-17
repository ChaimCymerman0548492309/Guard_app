#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# Ensure simulator mode for lab environment
if ! grep -q '^DEV_SIMULATOR=true' .env 2>/dev/null; then
  echo "DEV_SIMULATOR=true" >> .env
fi

pnpm install
pnpm db:generate

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Guardian Dev Lab — no phone required               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Starting API (simulator) + Web dashboard..."
echo ""
echo "  Web dashboard:  http://localhost:5173"
echo "  API:            http://localhost:3000"
echo "  Health check:   http://localhost:3000/health"
echo ""
echo "Virtual devices are pre-seeded. Open the dashboard to view reports."
echo ""
echo "Optional — Android Emulator (install real apps):"
echo "  1. Install Android Studio + create a Pixel emulator (API 29+)"
echo "  2. EXPO_PUBLIC_DEV_SIMULATOR=true pnpm dev:mobile"
echo "  3. Press 'a' to launch on emulator"
echo ""
echo "See docs/DEV-LAB.md for full Hebrew/English guide."
echo ""

export DEV_SIMULATOR=true

pnpm --filter @guardian/api dev &
API_PID=$!

pnpm --filter @guardian/web dev &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

wait
