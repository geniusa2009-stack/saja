#!/bin/sh
# Content-publishing workflow e2e on a throwaway database: sign up three people,
# make the first an admin with the operator CLI (server stopped), then drive the staff UI.
set -e
PORT=${E2E_PORT:-8899}
DIR=${E2E_DATA:-/tmp/saja-e2e-$PORT}
sh e2e/serve.sh
# Preserve the accounts command's exit status; a failed prerequisite must not
# become an empty email passed to the role-grant command.
ACCOUNTS_LOG=$(mktemp /tmp/saja-staff-accounts.XXXXXX)
node e2e/staff.mjs accounts > "$ACCOUNTS_LOG"
ADMIN=$(tail -1 "$ACCOUNTS_LOG")
P=$(lsof -ti tcp:$PORT || true); [ -n "$P" ] && kill $P && sleep 2
PGLITE_DIR="$DIR/pglite" npx tsx --tsconfig server/tsconfig.json server/cli.ts grant-role "$ADMIN" admin
E2E_KEEP=1 sh e2e/serve.sh
node e2e/staff.mjs workflow
