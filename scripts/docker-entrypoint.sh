#!/usr/bin/env sh
set -e
cd /app
# Bind the HTTP port immediately. Render fails the deploy if migrate/seed
# run first and the process is not listening on 0.0.0.0:$PORT.
export PREPARE_DATABASE_ON_BOOT=true
exec node apps/api/dist/index.js
