#!/usr/bin/env bash
set -euo pipefail

echo "Installing dependencies..."
pnpm install

echo "Generating Prisma client..."
pnpm db:generate

echo "Copying .env.example to .env if missing..."
[ -f .env ] || cp .env.example .env

echo "Setup complete. Run 'docker compose up -d postgres' for the database."
