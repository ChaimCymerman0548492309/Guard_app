#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "EAS pre-install at: $ROOT"
pnpm install --ignore-scripts
pnpm --filter @guardian/shared build
pnpm --filter @guardian/ui build
pnpm --filter @guardian/risk-engine build
pnpm --filter @guardian/simulator build
