// lib/db/scripts/smoke-destination-queries.ts
//
// verify-destination-membership.mjs proves the PREDICATE is right, but it
// writes its own SQL. This runs the actual exported functions from
// src/queries/destinations.ts — the ones the app will call — because
// Drizzle's nested `sql` composition (MEMBERSHIP inside COUNT_LATERAL
// inside the query, with parameters interleaved) is exactly the sort of
// thing that typechecks cleanly and then emits invalid SQL at runtime.
//
// That is not hypothetical here: the double-booking work found a real bug
// this way — claimDates() read the Postgres error code off the wrong
// property, which no amount of reading the code revealed and one run
// against a live database did (see PROOF-no-double-booking.md).
//
//   DATABASE_URL=... pnpm exec tsx scripts/smoke-destination-queries.ts
//
// Writes fixtures inside a transaction and always rolls back.

import { sql } from "drizzle-orm";
import { db, pool } from "../src/index";
import {
  getTopLevelDestinations,
  getChildDestinations,
  getDestination,
  getDestinationListings,
  getDestinationsForListing,
} from "../src/queries/destinations";

class Rollback extends Error {}

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    failures++;
  }
}

try {
  await db.transaction(async (tx) => {
    const t = tx as unknown as typeof db;

    await tx.execute(sql`
      INSERT INTO putko_test_guests (email, password_hash, name, last_name, phone_number, gender)
      VALUES ('smoke-destinations@example.test', 'x', 'Smoke', 'Host', '+421000000001', 'unspecified')
    `);

    const fixtures: Array<[string, string, number, number]> = [
      ["smoke-strbske", "Chata Štrbské Pleso", 20.0631, 49.1197],
      ["smoke-lomnica", "Apartmán Tatranská Lomnica", 20.2775, 49.1656],
      ["smoke-demanovska", "Chata Demänovská dolina", 19.5883, 48.9694],
      ["smoke-besenova", "Apartmán Bešeňová", 19.4331, 49.1006],
    ];
    for (const [slug, name, lon, lat] of fixtures) {
      await tx.execute(sql`
        INSERT INTO listings (host_id, slug, name, status, base_price_cents, max_guests, min_nights, geog)
        SELECT g.id, ${slug}, ${name}, 'published', 8000, 4, 1,
               ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
          FROM putko_test_guests g
         WHERE g.email = 'smoke-destinations@example.test'
      `);
    }

    console.log("\ngetTopLevelDestinations()\n");
    const grid = await getTopLevelDestinations(t, 12);
    for (const d of grid) console.log(`  ${d.name.padEnd(22)} ${d.listingCount}`);
    check("returns rows", grid.length > 0);
    check("no tile has a zero count", grid.every((d) => d.listingCount > 0));
    check("no child destination appears in the grid", grid.every((d) => d.parentSlug === null));
    check(
      "ranked by live count, not editorial order",
      grid.every((d, i) => i === 0 || grid[i - 1].listingCount >= d.listingCount)
    );
    check("Liptov is present (Bešeňová + Demänovská are inside it)",
      grid.some((d) => d.slug === "liptov"));

    console.log("\ngetChildDestinations('liptov')\n");
    const children = await getChildDestinations(t, "liptov");
    for (const d of children) console.log(`  ${d.name.padEnd(22)} ${d.listingCount}`);
    check("Bešeňová surfaces as a child of Liptov",
      children.some((d) => d.slug === "besenova"));
    check("every child names Liptov as its parent",
      children.every((d) => d.parentSlug === "liptov"));

    console.log("\ngetDestination() / getDestinationListings()\n");
    const tatry = await getDestination(t, "vysoke-tatry");
    check("getDestination returns Vysoké Tatry", tatry?.slug === "vysoke-tatry");
    const listings = await getDestinationListings(t, "vysoke-tatry");
    for (const l of listings) {
      console.log(`  ${String(l.name).padEnd(30)} ${l.distanceM} m from centre`);
    }
    check(
      "THE INVARIANT: the tile's count equals the page's row count",
      tatry?.listingCount === listings.length,
      `tile ${tatry?.listingCount} vs page ${listings.length}`
    );
    check(
      "ordered by distance from the destination centre",
      listings.every((l, i) => i === 0 || Number(listings[i - 1].distanceM) <= Number(l.distanceM))
    );

    check("an unknown slug returns null, not a crash",
      (await getDestination(t, "no-such-place")) === null);
    // Pick an empty destination from the data rather than naming one:
    // this assertion originally used Bratislava, which was empty until
    // seed-demo-listings.mjs put an apartment there. A test that names a
    // specific row is a test that breaks when the data grows.
    const { rows: emptyRows } = await tx.execute(sql`
      SELECT d.slug
        FROM destinations d
        CROSS JOIN LATERAL (
          SELECT count(*)::int AS n FROM listings l
           WHERE l.status = 'published' AND l.geog IS NOT NULL
             AND ST_DWithin(l.geog, d.centre, d.radius_m)
        ) c
       WHERE d.is_active AND c.n = 0
       LIMIT 1
    `);
    const emptySlug = (emptyRows[0] as { slug: string } | undefined)?.slug;
    check(
      "an empty destination still resolves, with count 0 (not a 404)",
      emptySlug !== undefined &&
        (await getDestination(t, emptySlug))?.listingCount === 0,
      emptySlug ? `used ${emptySlug}` : "no empty destination to test with"
    );

    console.log("\ngetDestinationsForListing() — the listing-page breadcrumb\n");
    const { rows } = await tx.execute(sql`
      SELECT id FROM listings WHERE slug = 'smoke-demanovska'
    `);
    const crumbs = await getDestinationsForListing(t, (rows[0] as { id: string }).id);
    console.log(`  ${crumbs.map((c) => c.name).join(" · ")}`);
    check("Demänovská dolina resolves to Jasná, Nízke Tatry and Liptov",
      ["jasna", "nizke-tatry", "liptov"].every((s) => crumbs.some((c) => c.slug === s)));
    check("narrowest destination first (Jasná before Nízke Tatry)",
      crumbs.findIndex((c) => c.slug === "jasna") <
        crumbs.findIndex((c) => c.slug === "nizke-tatry"));

    throw new Rollback();
  });
} catch (err) {
  if (!(err instanceof Rollback)) {
    console.error("\nSmoke test threw:", err);
    failures++;
  }
}

// This script's OWN rows only. Asserting the whole table is empty passed
// only while it was — and would have kept "passing" against real data
// while proving nothing.
const left = await db.execute(
  sql`SELECT count(*)::int AS n FROM listings WHERE slug LIKE 'smoke-%'`
);
check("rollback left none of this script's fixtures behind",
  (left.rows[0] as { n: number }).n === 0);

await pool.end();

if (failures > 0) {
  console.error(`\n${failures} FAILURE(S).`);
  process.exit(1);
}
console.log("\nALL PASS — the exported query functions work against a real database.");
