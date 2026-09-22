#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# Real-data mode: PostgreSQL required (no fake devices in API)
if grep -q '^DEV_SIMULATOR=true' .env 2>/dev/null; then
  sed -i 's/^DEV_SIMULATOR=true/DEV_SIMULATOR=false/' .env 2>/dev/null || \
    perl -pi -e 's/^DEV_SIMULATOR=true/DEV_SIMULATOR=false/' .env
fi
if ! grep -q '^DEV_SIMULATOR=' .env 2>/dev/null; then
  echo "DEV_SIMULATOR=false" >> .env
fi

pnpm install
pnpm db:generate

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     Guardian Dev Lab — real devices (PostgreSQL + sync)      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Start database (required):"
echo "  docker compose up -d"
echo ""
echo "Then this script starts API + Web dashboard:"
echo ""
echo "  Web dashboard:  http://localhost:5173"
echo "  API:            http://localhost:3000"
echo "  Health check:   http://localhost:3000/health  (database.connected must be true)"
echo ""
echo "Phone: EXPO_PUBLIC_DEV_SIMULATOR=false, EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3000"
echo "       Cloud sync ON + login → same user as dashboard"
echo ""
echo "Without Docker/Postgres the dashboard shows an empty state (no simulation)."
echo ""

export DEV_SIMULATOR=false

pnpm --filter @guardian/api dev &
API_PID=$!

pnpm --filter @guardian/web dev &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

wait
