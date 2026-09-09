#!/bin/bash
# scripts/reset-db.sh — drop everything and rebuild from migrations.
#
#   bash scripts/reset-db.sh
#
# DESTRUCTIVE. Deletes every table, type and row in the `public` schema.
#
# When this is the right tool: the database has a partial schema that no
# migration created — typically from `drizzle-kit push`, which builds tables
# by diffing the TypeScript schema and leaves no ledger behind. Migrations
# then fail on the first CREATE ("already exists") and there is no honest way
# to continue: the pushed schema is missing listings.geog and
# destinations.centre, because drizzle-kit cannot emit a PostGIS type
# modifier. Marking the migrations as applied would leave a database that
# looks complete and fails every geographic query.
#
# So: start over. On a development database that has never held real
# bookings, that costs nothing.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

if [ "${NODE_ENV:-}" = "production" ]; then
  echo "Refusing to reset a database with NODE_ENV=production." >&2
  exit 1
fi

safe=$(printf '%s' "$DATABASE_URL" | sed -E 's#://[^@]*@#://***@#')

echo "About to DROP EVERYTHING in:"
echo "  $safe"
echo

# Show what is actually there, with row counts, so the decision is informed
# rather than blind. A database with real bookings in it should stop you.
echo "Tables and row counts:"
psql "$DATABASE_URL" -tA -F'  ' <<'SQL' 2>/dev/null || echo "  (could not read table list)"
SELECT c.relname,
       COALESCE(s.n_live_tup, 0)::text || ' rows'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY c.relname;
SQL
echo

# Bookings are the one thing that would make this a mistake.
bookings=$(psql "$DATABASE_URL" -tAc "SELECT count(*) FROM bookings" 2>/dev/null || echo "0")
if [ "${bookings:-0}" != "0" ]; then
  echo "⚠  This database contains $bookings booking(s)."
  echo "   If any of them are real, STOP and back up first."
  echo
fi

printf 'Type  reset  to continue, anything else to abort: '
read -r answer
if [ "$answer" != "reset" ]; then
  echo "Aborted. Nothing was changed."
  exit 1
fi

echo
echo "==> Dropping schema public"
# CASCADE takes the tables, the types, the constraints and the extensions
# that live in this schema with it. The drizzle ledger lives in its own
# schema, so it is dropped separately — leaving it behind would make the
# rebuild think every migration had already run.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS drizzle CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
SQL
echo "    done"
echo

exec bash scripts/setup-db.sh
