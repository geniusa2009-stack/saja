#!/bin/sh
# Starts the production build on :8899 with a fresh embedded database (for e2e runs).
set -e
DIR=${E2E_DATA:-/tmp/saja-e2e}
P=$(lsof -ti tcp:8899 || true); [ -n "$P" ] && kill $P && sleep 2
[ -z "$E2E_KEEP" ] && rm -rf "$DIR" "$DIR.lock"; rm -f "$DIR/pglite.lock"; mkdir -p "$DIR"
SAJA_ENV=production PORT=8899 APP_ORIGIN=http://localhost:8899 COOKIE_SECURE=false PGLITE_DIR="$DIR/pglite" UPLOAD_DIR="$DIR/uploads" \
  nohup npx tsx --tsconfig server/tsconfig.json server/index.ts > "$DIR.log" 2>&1 &
for i in $(seq 1 40); do curl -sf http://localhost:8899/api/system/health >/dev/null && exit 0; sleep 1; done
echo "server did not start"; cat "$DIR.log"; exit 1
