#!/bin/bash
# scripts/replit-start.sh — one command to get the app running on Replit.
#
#   bash scripts/replit-start.sh
#
# Deliberately does not depend on the Run button: if a workflow is cached or
# configured in Replit's UI, editing .replit may not change what Run does,
# and you are left staring at the old app with no clue why. This checks each
# prerequisite in turn and says which one is missing instead.

set -uo pipefail
cd "$(dirname "$0")/.."

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
bad()  { printf '  ✗ %s\n' "$*"; }

say "1/4  Is the new code actually here?"
if [ ! -f artifacts/web/app/page.tsx ]; then
  bad "artifacts/web is missing — the pull did not bring it."
  echo
  echo "     Run:  git fetch origin && git status"
  echo "     If it says you are behind, run:  git pull origin main"
  echo "     If it says you are on a different branch:  git checkout main && git pull"
  exit 1
fi
ok "artifacts/web present ($(git log -1 --format='%h %s' 2>/dev/null || echo 'no git info'))"

say "2/4  Dependencies"
if [ ! -d artifacts/web/node_modules ] || [ ! -d node_modules/.pnpm ]; then
  echo "  installing (this takes a minute the first time)…"
  pnpm install || { bad "pnpm install failed"; exit 1; }
fi
ok "installed"

say "3/4  Database"
if [ -z "${DATABASE_URL:-}" ]; then
  bad "DATABASE_URL is not set."
  echo
  echo "     On Replit: open the Database tab in the left sidebar and create a"
  echo "     PostgreSQL database. Replit sets DATABASE_URL automatically, and"
  echo "     that database supports PostGIS, which this app requires."
  echo
  echo "     Then run this script again."
  exit 1
fi

# Is it already set up? Cheap check: does the destinations table exist and
# have rows. Re-running setup-db.sh is safe either way, but skipping it when
# nothing is needed keeps this fast.
count=$(psql "$DATABASE_URL" -tAc \
  "SELECT count(*) FROM destinations" 2>/dev/null || echo "missing")

if [ "$count" = "missing" ] || [ "$count" = "0" ]; then
  echo "  database is empty — setting it up…"
  bash scripts/setup-db.sh || {
    bad "setup failed. If it says PostGIS is unavailable, this Postgres cannot"
    echo "     run the app — use the Database tab to create a Replit PostgreSQL"
    echo "     database, or point DATABASE_URL at the Render one (docs/DEPLOY.md)."
    exit 1
  }
else
  ok "$count destinations already seeded"
fi

say "4/4  Starting the app"
echo "  Once it says Ready, open the webview — or the *.replit.dev URL."
echo "  Demo login: demo-hostka@putko.example / demo-host@putko.example"
echo "  Password:   putko-demo-2026"
echo

# -H 0.0.0.0 is not optional: Replit proxies in from outside the container,
# so a server bound to localhost is running and unreachable, which looks
# exactly like "nothing happened".
exec pnpm --filter @workspace/web exec next dev -H 0.0.0.0 -p 5000
