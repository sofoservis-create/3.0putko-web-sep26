# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A **ground-up rebuild** of Putko — a Slovak short-term accommodation rental
marketplace (Airbnb/Booking.com model). Operator: Putko s. r. o., IČO 57 329 206.

**Read this before touching anything:** the live putko.sk deploys from a
**different repository** that is not part of this session and must not be
modified. This repo is the replacement being built alongside it. The
`.migration-backup/` directory here is a **read-only snapshot** of the old
Express/MongoDB + Next.js code, kept as reference material — it is not
deployed, and changes to it do not reach production.

The goal is a standalone platform that stands on its own merits, not a
migration that touches the original system.

## Binding business rules

These come from the product owner, not from the code. The snapshot in
`.migration-backup/` actively contradicts several of them — where they
disagree, **these rules win**.

- **Legal position:** Putko is an intermediary (sprostredkovateľ). The rental
  contract is between guest and host; Putko is never a contracting party.
- **Payments:** Stripe Connect Express, *separate charges and transfers* (not
  destination charges). Commission is **6%**, deducted implicitly by
  transferring less than the charge — never a separate API call.
- **Putko is NOT a VAT payer.** No VAT line on the commission invoice.
  (§ 69 ods. 5 zákona č. 222/2004 Z. z.: stating VAT on an invoice makes you
  liable for it whether or not you collected it.)
- **Payout trigger:** nightly cron. Transfer at check-in + 24h *only if* there
  is no open complaint AND the host has ≥3 completed bookings. Otherwise
  check-out + 24h.
- **Cancellation policies:** exactly three fixed tiers — Flexible, Standard,
  Strict. **No custom policies.** The applicable policy must be snapshotted
  onto the booking row at booking time and refunds read from that snapshot —
  never JOINed back to the listing (a host editing their policy must not
  retroactively change existing bookings).
- **Host cancellation after payment:** full guest refund. Account deactivation
  after 3 cancellations in 12 months.
- **Hosts without Stripe onboarding:** "Request to book" only. No money may be
  taken until onboarding is complete and the host confirms.
- **Hosts** are businesses *or* private individuals; mandatory
  podnikateľ/nepodnikateľ declaration with a visible badge on the listing.
- **Invoicing:** hosts invoice guests themselves. Putko issues only a monthly
  aggregate commission invoice to hosts, via the SuperFaktúra API.
- **Local accommodation tax** is collected by hosts on site. The platform must
  not compute or collect it.
- **Guest minimum age 18.** Reservation data retention: 3 years.
- **Search ranking default:** availability → distance → price, unless the user
  picks another sort.
- **Analytics:** Google Analytics and Meta Pixel must be blocked until explicit
  cookie consent. Firing before opt-in is a GDPR violation, not a preference.

## Commands

Package manager is **pnpm** (enforced — a `preinstall` hook rejects npm/yarn).

```sh
pnpm install                      # workspace root
pnpm run typecheck                # all packages
pnpm run build                    # typecheck + build everything
```

Database (`lib/db`, package `@workspace/db`):

```sh
cd lib/db
pnpm run generate                 # generate a migration from the TS schema
pnpm run generate -- --custom --name <name>   # empty migration for hand-written SQL
pnpm run migrate                  # apply migrations
pnpm run push                     # push schema directly (dev only)
pnpm run verify:no-double-booking # the overlap-constraint proof (see below)
```

All `lib/db` commands need `DATABASE_URL`. A local `.env.local` holds it
(gitignored); export it first: `export $(cat .env.local | xargs)`.

### Local Postgres setup

There is **no Docker daemon** in the Claude Code sandbox — `docker` exists but
cannot run. Use the natively installed Postgres 16 instead:

```sh
apt-get install -y postgresql-16-postgis-3 postgresql-16-postgis-3-scripts
service postgresql start
su postgres -c "psql -c \"CREATE ROLE putko WITH LOGIN SUPERUSER PASSWORD 'putko';\""
su postgres -c "createdb -O putko putko"
psql "postgresql://putko:putko@localhost:5432/putko" \
  -c "CREATE EXTENSION postgis; CREATE EXTENSION unaccent;
      CREATE EXTENSION btree_gist; CREATE EXTENSION pg_trgm;"
```

All four extensions are required and all four exist on Render Postgres too —
`postgis` (distance search), `unaccent` ("Kosice" must find "Košice"),
`btree_gist` (required for the overlap constraint), `pg_trgm` (fuzzy name
search).

## Architecture

### The double-booking guarantee — the load-bearing design decision

`calendar_blocks` is the single availability model: confirmed bookings,
checkout holds, manual host blocks and imported iCal events all live in **one
table**, so search and booking cannot disagree about what "taken" means. The
guarantee is a database constraint, not application logic:

```sql
EXCLUDE USING gist (listing_id WITH =, stay WITH &&) WHERE (released_at IS NULL)
```

Postgres evaluates this inside the INSERT's own lock, so two concurrent
requests for the same dates cannot both succeed. **Never** reintroduce a
"check availability, then insert" pattern — a separate SELECT first re-opens
exactly the race this closes. Claim dates through `claimDates()` in
`lib/db/src/queries/availability.ts`; it returns
`{ ok: false, reason: "dates_unavailable" }` rather than throwing.

Proof and reproduction: `lib/db/PROOF-no-double-booking.md`.

### Data conventions

- **Money is always integer cents.** Never float, never `numeric`.
- **Date ranges are half-open `[check_in, check_out)`.** The checkout day is
  free for the next guest. This matches iCal's DTEND and Postgres range
  semantics. (`daterange` is a discrete type — Postgres canonicalizes every
  value to `[)` automatically, so a closed range cannot be constructed.)
- **Calendar dates are `date`, not `timestamptz`.** A stay is a pair of
  calendar dates; there is no timezone to get wrong if the column can't hold
  one. Business-time decisions resolve in `Europe/Bratislava`.
- **One status column per aggregate**, with transitions enforced in one place.
  The old system spread booking state across `isApproved`/`paymentStatus`/
  `payoutStatus` with no guard, which permitted eight illegal transitions.
- `legacy_mongo_id` (unique, nullable) on migrated tables makes any ETL from
  the old MongoDB idempotent and re-runnable.

### Layout

- `lib/db/` — Drizzle schema, migrations, queries (`@workspace/db`)
- `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` — OpenAPI spec and
  Orval-generated clients/schemas
- `artifacts/api-server/` — Express scaffold; `test-auth.ts` is a working auth
  prototype (scrypt, hashed session tokens, `timingSafeEqual`) worth building
  on rather than replacing
- `artifacts/putko/` — Vite/React app migrated from the original Next.js app
- `.migration-backup/` — **reference only**, see above
- `render.yaml` — Render Blueprint (`putko-db`, `putko-kv`, Frankfurt/EU)

## Gotchas found the hard way

Each of these cost real debugging time. Don't rediscover them.

- **`drizzle.config.ts` paths must be relative.** drizzle-kit prefixes its own
  `./` onto `out`/`schema`, so `path.join(__dirname, ...)` produces a doubled,
  unresolvable path (`.//home/...`) and breaks `generate`/`migrate` entirely.
- **PostGIS `geography(Point, 4326)` cannot be declared via Drizzle
  `customType()`.** drizzle-kit quotes the whole type expression as an
  identifier and Postgres rejects it (`type "geography(Point, 4326)" does not
  exist`). Add such columns in a hand-written custom migration — drizzle-kit's
  documented pattern for features its schema builder doesn't model. Plain
  single-word types like `daterange` are fine.
- **Drizzle wraps Postgres errors.** The real error code is on
  `err.cause.code`, not `err.code`. Checking only the top level silently
  misses `23P01` (exclusion_violation) and `23514` (check_violation).
- **Testing constraint violations needs SAVEPOINTs.** A Postgres transaction
  aborts entirely after any error and rejects everything after it with
  `25P02`. Wrap each expected-to-fail assertion in `SAVEPOINT` /
  `ROLLBACK TO SAVEPOINT`.
- **`unaccent` is not IMMUTABLE** and cannot be indexed directly. Wrap it:
  `CREATE FUNCTION f_unaccent(text) ... IMMUTABLE ... $$ SELECT
  public.unaccent('public.unaccent', $1) $$;` then index on `f_unaccent(col)`.
- **Exclusion-constraint predicates must be IMMUTABLE**, so hold expiry
  (`now()`) cannot live in the `WHERE`. Expired holds are deleted inside the
  claiming transaction instead.

## Do not

- Modify anything under `.migration-backup/` expecting it to affect production.
- Reintroduce check-then-insert for availability.
- Add a `custom` cancellation policy tier.
- Add Elasticsearch/Meilisearch — Postgres FTS + `unaccent` + `pg_trgm` is
  sufficient well past current scale.
- Add a message queue — Render Cron Jobs (which guarantee at most one
  concurrent run per job) plus a Postgres table cover current needs.
- Keep MongoDB "for some things." One database.

## Reference documents

- `docs/REBUILD-PLAN.md` — phased roadmap, gates, and what's deliberately deferred
- `audit/REPORT.md` — 63 findings against the old system, each with `file:line`
- `audit/DECISIONS-NEEDED.md` — 10 open product/legal decisions
- `audit/ARCHITECTURE.md` — Mermaid diagrams: components, booking state machine, payment lifecycle
- `audit/patches/` — 30 verified patches for the old system (applied here to the snapshot; **not** deployed anywhere)

## Note on `.agents/memory/`

Predates the current strategy and is partly stale. In particular,
`putko-legacy-backend-isolation.md` describes patching the live Render backend
from an `origin/main` worktree — that is **no longer the plan** and directly
contradicts the "do not touch the original repo" rule above.
`putko-rebuild-data-platform.md` (Postgres + PostGIS, preserve legacy payload
compatibility) remains accurate.
