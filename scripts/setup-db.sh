#!/bin/bash
# scripts/setup-db.sh — bring an empty Postgres up to a working Putko database.
#
# Idempotent: safe to re-run. Needs DATABASE_URL.
#
# Order matters and is not negotiable:
#   1. extensions  — migration 0002 creates a geography column and a GiST
#                    exclusion constraint, so postgis and btree_gist have to
#                    exist BEFORE it runs, not after.
#   2. migrate     — drizzle-kit migrate, which walks the journal and applies
#                    the hand-written SQL migrations too. NOT `drizzle-kit
#                    push`: push diffs the TypeScript schema against the
#                    database, and listings.geog / destinations.centre are
#                    deliberately not in the TypeScript schema (drizzle-kit
#                    cannot emit a PostGIS type modifier — see CLAUDE.md).
#                    Push would therefore create every table WITHOUT those
#                    columns and every destination query would fail.
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
pnpm --filter @workspace/db run migrate

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
