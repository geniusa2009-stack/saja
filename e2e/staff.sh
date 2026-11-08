#!/bin/sh
# Content-publishing workflow e2e on a throwaway database: sign up three people,
# make the first an admin with the operator CLI (server stopped), then drive the staff UI.
set -e
PORT=${E2E_PORT:-8899}
DIR=${E2E_DATA:-/tmp/saja-e2e-$PORT}
sh e2e/serve.sh
ADMIN=$(node e2e/staff.mjs accounts | tail -1)
P=$(lsof -ti tcp:$PORT || true); [ -n "$P" ] && kill $P && sleep 2
PGLITE_DIR="$DIR/pglite" npx tsx --tsconfig server/tsconfig.json server/cli.ts grant-role "$ADMIN" admin
E2E_KEEP=1 sh e2e/serve.sh
node e2e/staff.mjs workflow
