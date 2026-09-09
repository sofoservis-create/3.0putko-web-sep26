-- 0004_destination_centre.sql
--
-- The half of the destinations table Drizzle cannot declare: the PostGIS
-- centre point. Same drizzle-kit limitation already documented for
-- listings.geog in 0002 — a customType whose dataType() carries a type
-- modifier gets quoted as a single identifier and Postgres rejects it. So
-- the column is written here, by hand, as plain correct SQL.
--
-- centre + radius_m together ARE the membership rule. There is no
-- destination_listings join table anywhere in this schema, on purpose:
--
--   a listing belongs to a destination
--     ⟺ ST_DWithin(listings.geog, destinations.centre, destinations.radius_m)
--
-- which means the tile counts are a live COUNT(*) over the listings that
-- exist right now. Nothing to tag when a host publishes, nothing to
-- backfill, nothing that can drift. That is what makes the browse section
-- "kompatibilné s našimi ubytovaniami" structurally rather than by
-- discipline — the exact failure the current site ships (DESIGN-AUDIT.md
-- D-01: a hero reading "1433+ ubytovaní" above a page listing 6).

-- ── The centre point ─────────────────────────────────────────────────────
ALTER TABLE "destinations" ADD COLUMN "centre" geography(Point, 4326);--> statement-breakpoint

-- NOT NULL is added as a separate step rather than inline, because the
-- column has to exist before it can be populated and this migration ships
-- no rows of its own (the destination list is editorial content and lives
-- in scripts/seed-destinations.mjs, where it can be corrected and re-run
-- without a schema migration). The table is empty at this point, so the
-- constraint is satisfied trivially — and from here on a destination
-- without a centre is impossible, which matters: a NULL centre makes
-- ST_DWithin return NULL, the tile matches nothing, and it looks
-- indistinguishable from a real region with no listings yet.
ALTER TABLE "destinations" ALTER COLUMN "centre" SET NOT NULL;--> statement-breakpoint

-- ── The index that makes the counts affordable ───────────────────────────
-- The home page asks "how many published listings are within radius" once
-- per tile. Without a spatial index that is a full scan of listings per
-- tile; with GiST on both sides (listings_geog_gist_idx from 0002 and this
-- one) ST_DWithin is an index-assisted lookup.
CREATE INDEX "destinations_centre_gist_idx" ON "destinations" USING gist ("centre");--> statement-breakpoint

-- ── Slovakia's bounding box ──────────────────────────────────────────────
-- A coordinate typo — swapped lat/lon, a dropped minus, a decimal in the
-- wrong place — produces a perfectly valid Point that lands in the Indian
-- Ocean, and the only symptom is a tile that quietly shows zero. Slovakia
-- is roughly 16.83–22.57 °E, 47.73–49.61 °N; the box below is padded a
-- little beyond that so a legitimate border destination is never rejected,
-- while still catching every class of typo that matters.
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_centre_in_slovakia"
  CHECK (
    ST_X("centre"::geometry) BETWEEN 16.5 AND 23.0
    AND ST_Y("centre"::geometry) BETWEEN 47.5 AND 49.8
  );
