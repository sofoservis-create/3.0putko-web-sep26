#!/bin/bash
# scripts/setup-db.sh — bring an empty Postgres up to a working Putko database.
#
# Idempotent: safe to re-run. Needs DATABASE_URL.
#
# Order matters and is not negotiable:
#   1. extensions  — migration 0002 creates a geography column and a GiST
#                    exclusion constraint, so postgis and btree_gist have to
#                    exist BEFORE it runs, not after.
#   2. migrate     — lib/db/scripts/migrate.mjs, which walks the journal and
#                    applies the hand-written SQL migrations too, and which
#                    REPORTS THE POSTGRES ERROR when one fails. drizzle-kit
#                    migrate swallows it: a failure there prints a spinner
#                    and exits 1 with no code, no message and no filename.
#                    The two are interchangeable — same ledger, same hashes.
#                    NOT `drizzle-kit push`: push diffs the TypeScript schema,
#                    and listings.geog / destinations.centre are deliberately
#                    not in it (drizzle-kit cannot emit a PostGIS type
#                    modifier — see CLAUDE.md), so push would create every
#                    table WITHOUT them and every geographic query would fail.
#   3. seed        — destinations are reference data the app needs; the demo
#                    listings and accounts are development-only.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

echo "==> 1/3  Extensions"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SQL

# Fail loudly and specifically if PostGIS is missing. Without it nothing
# geographic works, and the error you would otherwise get is a confusing
# "type geography does not exist" from the middle of a migration.
psql "$DATABASE_URL" -tAc "SELECT 1 FROM pg_extension WHERE extname='postgis'" | grep -q 1 || {
  echo "PostGIS is not available on this Postgres. The destinations feature cannot work without it." >&2
  exit 1
}
echo "    postgis, btree_gist, unaccent, pg_trgm ready"

echo "==> 2/3  Migrations"
# Capture rather than stream. drizzle-kit prints a spinner and then pnpm's
# "Exit status 1" replaces the actual Postgres error, so a failure here
# arrives as "migrate failed" with no reason — which is exactly what
# happened on the first real Replit run, and sent the user chasing a PostGIS
# problem that did not exist.
migrate_log=$(mktemp)
if ! pnpm --filter @workspace/db run migrate > "$migrate_log" 2>&1; then
  echo
  echo "    Migrations FAILED. The real error follows:" >&2
  echo "    ----------------------------------------" >&2
  sed 's/^/    /' "$migrate_log" >&2
  echo "    ----------------------------------------" >&2
  echo >&2
  # Recognise the one failure that has a specific, correct answer, rather
  # than leaving every failure to a generic "run the diagnostics".
  if grep -qE '42P07|42710' "$migrate_log"; then
    echo "    ── What this means ──────────────────────────────────────" >&2
    echo "    A table or type already exists that no migration created." >&2
    echo "    That is the signature of \`drizzle-kit push\`: it builds a" >&2
    echo "    schema by diffing the TypeScript definitions and leaves no" >&2
    echo "    migration ledger behind." >&2
    echo >&2
    echo "    Do NOT work around it by skipping the migration. A pushed" >&2
    echo "    schema has no listings.geog and no destinations.centre —" >&2
    echo "    drizzle-kit cannot emit a PostGIS type modifier — so the" >&2
    echo "    database would look complete and every map, destination and" >&2
    echo "    distance query would fail." >&2
    echo >&2
    echo "    On a development database, start over:" >&2
    echo "      bash scripts/reset-db.sh" >&2
    echo "    It lists what it would delete and asks before doing it." >&2
    echo >&2
  fi
  echo "    For a full picture of the database, run:" >&2
  echo "      bash scripts/diagnose-db.sh" >&2
  rm -f "$migrate_log"
  exit 1
fi
rm -f "$migrate_log"
echo "    applied"

echo "==> 3/3  Seed"
pnpm --filter @workspace/db run seed:destinations
if [ "${NODE_ENV:-}" != "production" ]; then
  pnpm --filter @workspace/db run seed:demo-listings
  pnpm --filter @workspace/db exec tsx scripts/seed-demo-accounts.ts
else
  echo "    NODE_ENV=production — skipping demo listings and demo accounts"
fi

echo
echo "Database ready."
