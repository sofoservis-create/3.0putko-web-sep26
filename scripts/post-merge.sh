#!/bin/bash
set -e
pnpm install --frozen-lockfile

# `drizzle-kit migrate`, NOT `drizzle-kit push`.
#
# push diffs the TypeScript schema against the database. listings.geog and
# destinations.centre are deliberately absent from the TypeScript schema —
# drizzle-kit cannot emit a PostGIS type modifier, so both columns live in
# hand-written migrations (see CLAUDE.md). Under push they would simply
# never be created, and every destination query, the home page grid and the
# whole browse layer would fail against a schema that looked complete.
#
# migrate walks the journal and applies the hand-written migrations too.
# Extensions must already exist; scripts/setup-db.sh does that on first run.
pnpm --filter @workspace/db run migrate
