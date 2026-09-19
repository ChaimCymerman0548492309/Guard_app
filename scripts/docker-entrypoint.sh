#!/usr/bin/env sh
set -e
cd /app
if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy --schema=prisma/schema.prisma || echo "Migration skipped (DB unavailable)"
fi
if [ "${RUN_DB_SEED:-false}" = "true" ] && [ -n "$DATABASE_URL" ]; then
  pnpm db:seed || echo "Seed skipped or failed"
fi
exec node apps/api/dist/index.js
