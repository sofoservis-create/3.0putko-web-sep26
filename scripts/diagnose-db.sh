#!/bin/bash
# scripts/diagnose-db.sh — everything needed to work out why setup failed.
#
#   bash scripts/diagnose-db.sh
#
# Read-only. Prints no passwords: the connection string is reduced to
# host/database, so the output is safe to paste into a chat or an issue.

set -uo pipefail
cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set."
  exit 1
fi

# Strip credentials before printing anything.
safe=$(printf '%s' "$DATABASE_URL" | sed -E 's#://[^@]*@#://***@#')
echo "Connection : $safe"
echo "Node       : $(node --version 2>/dev/null || echo '?')"
echo

echo "== Server =="
psql "$DATABASE_URL" -tAc "SELECT version()" 2>&1 | head -1
echo

echo "== Extensions installed =="
psql "$DATABASE_URL" -tAc \
  "SELECT extname||' '||extversion FROM pg_extension ORDER BY extname" 2>&1
echo

echo "== Extensions AVAILABLE but not installed (postgis family) =="
psql "$DATABASE_URL" -tAc \
  "SELECT name FROM pg_available_extensions
    WHERE name IN ('postgis','btree_gist','unaccent','pg_trgm')
      AND installed_version IS NULL" 2>&1
echo

echo "== Tables =="
psql "$DATABASE_URL" -tAc \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename" 2>&1
echo

echo "== Migrations already applied =="
psql "$DATABASE_URL" -tAc \
  "SELECT to_timestamp(created_at/1000)::date||'  '||left(hash,12)
     FROM drizzle.__drizzle_migrations ORDER BY created_at" 2>&1
echo

echo "== The PostGIS columns this app cannot work without =="
psql "$DATABASE_URL" -tAc \
  "SELECT table_name||'.'||column_name||' -> '||udt_name
     FROM information_schema.columns
    WHERE column_name IN ('geog','centre')" 2>&1
echo

echo "== Can this user create a schema? (drizzle needs one for its ledger) =="
psql "$DATABASE_URL" -tAc \
  "SELECT has_database_privilege(current_user, current_database(), 'CREATE')" 2>&1
echo "   current_user: $(psql "$DATABASE_URL" -tAc 'SELECT current_user' 2>&1)"
echo

echo "Paste the whole of the above when asking for help — it contains no password."
