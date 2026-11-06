#!/bin/sh
# Starts the production build on $E2E_PORT (default 8899) with a fresh embedded database (for e2e runs).
# Use a different E2E_PORT (and SAJA_URL) per worktree so parallel checkouts don't stop each other's server.
set -e
PORT=${E2E_PORT:-8899}
DIR=${E2E_DATA:-/tmp/saja-e2e-$PORT}
P=$(lsof -ti tcp:$PORT || true); [ -n "$P" ] && kill $P && sleep 2
[ -z "$E2E_KEEP" ] && rm -rf "$DIR" "$DIR.lock"; rm -f "$DIR/pglite.lock"; mkdir -p "$DIR"
SAJA_ENV=production PORT=$PORT APP_ORIGIN=http://localhost:$PORT COOKIE_SECURE=false PGLITE_DIR="$DIR/pglite" UPLOAD_DIR="$DIR/uploads" \
  nohup npx tsx --tsconfig server/tsconfig.json server/index.ts > "$DIR.log" 2>&1 &
for i in $(seq 1 40); do curl -sf http://localhost:$PORT/api/system/health >/dev/null && exit 0; sleep 1; done
echo "server did not start"; cat "$DIR.log"; exit 1
