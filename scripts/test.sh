#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pnpm db:generate
pnpm build
pnpm lint
pnpm typecheck
pnpm test

echo "All checks passed."
