// lib/db/src/queries/destinations.ts
//
// The read side of "Obľúbené miesta na Slovensku".
//
// THE ONE INVARIANT THIS FILE EXISTS TO HOLD
//
//   the number on a tile == the number of results you get when you click it
//
// That is the whole point. The current site breaks it on the home page —
// a hero reading "1433+ ubytovaní" above a catalogue of 6
// (audit/DESIGN-AUDIT.md D-01) — and every marketplace that breaks it
// teaches guests to distrust its numbers everywhere else, including the
// ones that matter (price, availability, review count).
//
// It is held here structurally rather than by care: MEMBERSHIP below is the
// single SQL predicate, and both the counting query and the listing query
// interpolate that same fragment. There is no way to change what a tile
// counts without changing what its page shows, because they are the same
// expression.

import { sql, type SQL } from "drizzle-orm";
import type { db as Db } from "../index";

/**
 * A listing belongs to a destination iff it sits inside the destination's
 * circle. No join table, no tagging step, no backfill — see the header of
 * src/schema/destinations.ts for why that choice, and
 * drizzle/0004_destination_centre.sql for the column it relies on.
 *
 * `ST_DWithin` on `geography` takes metres, and uses the GiST indexes on
 * both sides (listings_geog_gist_idx, destinations_centre_gist_idx).
 *
 * Only published listings count. A draft or pending listing is not
 * bookable, so counting it would put a number on a tile that the tile's own
 * page cannot show — exactly the invariant above.
 */
const MEMBERSHIP = sql`
  l.status = 'published'
  AND l.geog IS NOT NULL
  AND ST_DWithin(l.geog, d.centre, d.radius_m)
`;

export type DestinationTile = {
  slug: string;
  name: string;
  kind: "region" | "mountains" | "city" | "thermal" | "heritage" | "nature";
  parentSlug: string | null;
  heroImageUrl: string | null;
  description: string | null;
  listingCount: number;
};

/** The columns every tile needs, named consistently across the queries below. */
const TILE_COLUMNS = sql`
  d.slug,
  d.name,
  d.kind,
  d.parent_slug        AS "parentSlug",
  d.hero_image_url     AS "heroImageUrl",
  d.description,
  c.n                  AS "listingCount"
`;

const COUNT_LATERAL = sql`
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS n
      FROM listings l
     WHERE ${MEMBERSHIP}
  ) c
`;

/**
 * The home page grid.
 *
 * Two rules, both load-bearing:
 *
 *  - `c.n > 0` — a destination with nothing in it is not shown at all.
 *    Never a tile reading "0 možností". With the catalogue at 34 and the
 *    listing count where it is today, a grid that showed everything would
 *    be mostly zeroes, which looks worse and is worse than the flat city
 *    grid it replaces. This section grows as the supply grows, and until
 *    then it shows only the truth.
 *
 *  - `parent_slug IS NULL` — one level at a time. Vysoké Tatry is inside
 *    Tatry; showing both as siblings on the same grid (which is what Mega
 *    Ubytovanie does) reads as two separate places. Drill-in is
 *    getChildDestinations().
 *
 * Ranked by live listing count first, so the biggest real supply leads and
 * `sort_order` only breaks ties. Editorial ordering cannot promote an empty
 * destination into a prominent slot, by construction.
 */
export async function getTopLevelDestinations(
  db: typeof Db,
  limit: number | null = 12
): Promise<DestinationTile[]> {
  // `null` means every one of them — the /miesta directory page. It is the
  // same query rather than a second one written in the app layer, which
  // matters: a copy of MEMBERSHIP living in a page component is precisely
  // how the tile count and the page behind it start to disagree.
  const limitClause = limit === null ? sql`` : sql`LIMIT ${limit}`;

  const result = await db.execute(sql`
    SELECT ${TILE_COLUMNS}
      FROM destinations d
      ${COUNT_LATERAL}
     WHERE d.is_active
       AND d.parent_slug IS NULL
       AND c.n > 0
     ORDER BY c.n DESC, d.sort_order ASC, d.name ASC
     ${limitClause}
  `);
  return result.rows as DestinationTile[];
}

/**
 * Total published, geocoded listings — the number the home page hero shows.
 *
 * It lives here rather than in the page for the same reason as everything
 * else in this file: the hero's claim about inventory has to come from the
 * inventory. "1433+" hardcoded into a component is audit finding D-01, and
 * the only durable defence against it is that no component is in a
 * position to invent the number.
 *
 * `geog IS NOT NULL` is part of the definition, not a filter bolted on: a
 * listing with no coordinates cannot appear in any destination or in
 * distance search, so counting it in the headline would overstate what a
 * guest can actually find.
 */
export async function countPublishedListings(db: typeof Db): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n
      FROM listings
     WHERE status = 'published' AND geog IS NOT NULL
  `);
  return (result.rows[0] as { n: number }).n;
}

/**
 * The sub-tiles on a destination page — Liptov → Bešeňová, Tatry → Vysoké
 * Tatry and Západné Tatry.
 *
 * Same `c.n > 0` rule as above, for the same reason.
 *
 * Note that a child's count is computed from the CHILD's own circle, not
 * intersected with the parent's. So a child can, at the edges, count a
 * listing the parent does not — Jasná's circle is not perfectly contained
 * in Nízke Tatry's. That is intentional and it is the honest number: each
 * tile counts exactly what its own page will show, which is the invariant
 * at the top of this file. It does mean child counts do not have to sum to
 * the parent's, and any UI that presents them as a breakdown would be
 * wrong to.
 */
export async function getChildDestinations(
  db: typeof Db,
  parentSlug: string
): Promise<DestinationTile[]> {
  const result = await db.execute(sql`
    SELECT ${TILE_COLUMNS}
      FROM destinations d
      ${COUNT_LATERAL}
     WHERE d.is_active
       AND d.parent_slug = ${parentSlug}
       AND c.n > 0
     ORDER BY c.n DESC, d.sort_order ASC, d.name ASC
  `);
  return result.rows as DestinationTile[];
}

/**
 * One destination, count included — the header of /miesta/[slug].
 * Returns null for an unknown or deactivated slug so the route can 404
 * rather than render an empty page.
 *
 * Unlike the grid queries this does NOT filter on `c.n > 0`: a destination
 * that currently has nothing in it is a legitimate page to land on (from a
 * search, a link, a sitemap) and should say so honestly rather than 404.
 * It just doesn't get advertised on the home page.
 */
export async function getDestination(
  db: typeof Db,
  slug: string
): Promise<DestinationTile | null> {
  const result = await db.execute(sql`
    SELECT ${TILE_COLUMNS}
      FROM destinations d
      ${COUNT_LATERAL}
     WHERE d.is_active
       AND d.slug = ${slug}
     LIMIT 1
  `);
  return (result.rows[0] as DestinationTile | undefined) ?? null;
}

/**
 * The listings a destination tile promises.
 *
 * This is the other half of the invariant: it uses MEMBERSHIP — the exact
 * predicate the tile's count used — so the two cannot disagree.
 *
 * Ordering is distance from the destination centre, which is the useful
 * default here specifically: someone browsing "Vysoké Tatry" wants what is
 * most central to the Tatras first. It is NOT the platform's general search
 * ranking (availability → distance → price, per the product rules) — that
 * applies when a guest has given dates and a search origin, which a browse
 * page has not. When this feeds the real search, dates come with it and the
 * full ranking applies.
 */
export async function getDestinationListings(
  db: typeof Db,
  slug: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<Array<Record<string, unknown>>> {
  const { limit = 24, offset = 0 } = opts;
  const result = await db.execute(sql`
    SELECT l.id,
           l.slug,
           l.name,
           l.city,
           l.base_price_cents      AS "basePriceCents",
           l.max_guests            AS "maxGuests",
           ROUND(ST_Distance(l.geog, d.centre))::int AS "distanceM"
      FROM destinations d
      JOIN listings l ON ${MEMBERSHIP}
     WHERE d.is_active
       AND d.slug = ${slug}
     ORDER BY ST_Distance(l.geog, d.centre) ASC, l.base_price_cents ASC
     LIMIT ${limit}
    OFFSET ${offset}
  `);
  return result.rows as Array<Record<string, unknown>>;
}

/** Every destination containing a given listing — the breadcrumb on a listing page. */
export async function getDestinationsForListing(
  db: typeof Db,
  listingId: string
): Promise<Array<{ slug: string; name: string; kind: string }>> {
  const result = await db.execute(sql`
    SELECT d.slug, d.name, d.kind
      FROM destinations d
      JOIN listings l ON ST_DWithin(l.geog, d.centre, d.radius_m)
     WHERE d.is_active
       AND l.id = ${listingId}
       AND l.geog IS NOT NULL
     ORDER BY d.radius_m ASC, d.sort_order ASC
  `);
  return result.rows as Array<{ slug: string; name: string; kind: string }>;
}

export type { SQL };
