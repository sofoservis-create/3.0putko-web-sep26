-- 0002_geography_and_exclusion.sql
--
-- Two Postgres features Drizzle's schema builder does not model
-- declaratively, added here by hand — drizzle-kit's own documented pattern
-- for this class of gap (`drizzle-kit generate --custom`), not a workaround.
--
-- 1. listings.geog — a PostGIS geography column. Declaring it via
--    customType() in the TS schema made drizzle-kit quote the whole type
--    expression as an identifier and fail outright; verified against a real
--    database (see the comment in src/schema/listings.ts).
--
-- 2. calendar_blocks — THE constraint this entire schema exists to prove:
--    a database-level guarantee that no listing can ever be double-booked.
--    Application-level "check, then insert" — what the audited system did —
--    is not this. Two concurrent requests both read "available", both
--    insert, and the second one only finds out it lost the race after the
--    guest has already paid. This constraint makes that request sequence
--    physically impossible: Postgres evaluates it inside the INSERT's own
--    lock, so the second writer's statement fails outright, before anything
--    is committed and long before any external side effect (a Stripe charge)
--    could have happened on the strength of a stale read.

-- ── 1. Geography column ──────────────────────────────────────────────────
ALTER TABLE "listings" ADD COLUMN "geog" geography(Point, 4326);--> statement-breakpoint
CREATE INDEX "listings_geog_gist_idx" ON "listings" USING gist ("geog");--> statement-breakpoint

-- ── 2. calendar_blocks.stay: the range type itself ───────────────────────
-- Drizzle generated this column as `daterange` already (its customType
-- resolves to a plain, unmodified type name, which drizzle-kit handles
-- correctly — see the note in src/schema/calendar-blocks.ts). What's added
-- here is everything that makes it a GUARANTEE rather than just a column.

-- Half-open — `[)`, inclusive start, exclusive end — is the convention
-- iCal's DTEND, Stripe's date handling and Postgres range types all already
-- use. The audited system stored the opposite convention for native
-- bookings and the DTEND-exclusive convention for imported ones, IN THE
-- SAME ARRAY, which is how a booking's own check-out night ended up blocked
-- against itself.
--
-- Only NOT isempty(stay) is asserted below, not lower_inc/upper_inc — those
-- would be redundant. Verified directly against this database: `daterange`
-- is a DISCRETE range type, and Postgres canonicalizes every discrete range
-- to `[)` form on construction, whatever bounds you write. Passing '[]'
-- (closed) for '2026-10-01'..'2026-10-05' is stored as
-- [2026-10-01,2026-10-06) — there is no way to construct a `daterange` value
-- that could fail a half-open check in the first place. isempty() is the one
-- real gap it doesn't close on its own: check_in = check_out (a zero-night
-- booking) produces an empty range, which canonicalization has no opinion
-- about and which the exclusion constraint below would silently let through
-- without this.
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_stay_not_empty"
  CHECK (NOT isempty("stay"));--> statement-breakpoint

-- THE constraint. btree_gist is required for a plain equality column
-- (listing_id) to appear in a GiST exclusion constraint alongside a range
-- column — confirmed enabled via \dx before this migration ran.
--
-- The predicate is `released_at IS NULL`, not anything involving now():
-- Postgres requires exclusion-constraint predicates to be IMMUTABLE, and
-- "is this hold still live" depends on the current time, which is not
-- immutable. Expired holds are deleted inside the same transaction that
-- claims new dates (see the application-level claimDates() function this
-- constraint backs), so by the time a write reaches this constraint, every
-- row with released_at IS NULL is a block that is genuinely still active.
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "stay" WITH &&
  )
  WHERE ("released_at" IS NULL);
