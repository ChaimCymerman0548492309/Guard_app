#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

pnpm install
pnpm db:generate

echo ""
echo "Guardian dev environment ready."
echo "  API:    pnpm dev:api"
echo "  Mobile: EXPO_PUBLIC_DEV_SIMULATOR=true pnpm dev:mobile"
echo "  DB:     docker compose up -d postgres"
echo ""
