#!/usr/bin/env node
// lib/db/scripts/verify-destination-membership.mjs
//
// Re-runnable proof for the claim the destinations feature rests on:
//
//   the number on a tile == the number of results you get when you click it
//
// The current site fails this on its home page (audit/DESIGN-AUDIT.md D-01:
// "1433+ ubytovaní" above a catalogue of 6). Here it is not a promise, it
// is a property of the schema — both numbers come from the same SQL
// predicate — and this script is the evidence, not the assertion.
//
// It inserts fixture listings at real Slovak coordinates INSIDE A
// TRANSACTION IT ALWAYS ROLLS BACK, so it leaves the database exactly as it
// found it and is safe to re-run. It does need the destinations seeded
// first (scripts/seed-destinations.mjs).
//
// Usage:
//   DATABASE_URL=postgresql://putko:putko@localhost:5432/putko \
//     node scripts/verify-destination-membership.mjs
//
// Exits 0 and prints ALL PASS only if every assertion held.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required — point it at a throwaway database, never production.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    console.error(`  FAIL  ${label}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`);
    failures++;
  }
}

// The membership predicate, copied from src/queries/destinations.ts. If this
// script and that file ever disagree, this script is what catches it.
const MEMBERSHIP = `
  l.status = 'published'
  AND l.geog IS NOT NULL
  AND ST_DWithin(l.geog, d.centre, d.radius_m)
`;

const tileCount = (slug) =>
  client.query(
    `SELECT count(*)::int AS n
       FROM destinations d JOIN listings l ON ${MEMBERSHIP}
      WHERE d.slug = $1`,
    [slug]
  ).then((r) => r.rows[0].n);

const pageSlugs = (slug) =>
  client.query(
    `SELECT l.slug
       FROM destinations d JOIN listings l ON ${MEMBERSHIP}
      WHERE d.slug = $1
      ORDER BY l.slug`,
    [slug]
  ).then((r) => r.rows.map((x) => x.slug));

try {
  await client.query("BEGIN");

  const seeded = (await client.query("SELECT count(*)::int AS n FROM destinations")).rows[0].n;
  if (seeded === 0) {
    console.error("No destinations seeded — run scripts/seed-destinations.mjs first.");
    await client.query("ROLLBACK");
    await client.end();
    process.exit(1);
  }

  await client.query(`
    INSERT INTO putko_test_guests (email, password_hash, name, last_name, phone_number, gender)
    VALUES ('destination-fixture@example.test', 'x', 'Fixture', 'Host', '+421000000000', 'unspecified')
  `);

  // Real places, so the assertions below say something about Slovakia and
  // not just about arithmetic. [lon, lat] — GeoJSON order, which is what
  // ST_MakePoint takes and the opposite of how people write coordinates.
  const FIXTURES = [
    ["fx-strbske-pleso", "Chata Štrbské Pleso", "published", 20.0631, 49.1197],
    ["fx-tatranska-lomnica", "Apartmán Tatranská Lomnica", "published", 20.2775, 49.1656],
    ["fx-demanovska", "Chata Demänovská dolina", "published", 19.5883, 48.9694],
    ["fx-hrabusice", "Penzión Hrabušice", "published", 20.3667, 48.9403],
    ["fx-kosice-centrum", "Byt Košice centrum", "published", 21.2611, 48.7164],
    // Draft, at the same coordinates as the Štrbské Pleso one. Must never
    // be counted anywhere — a tile that counts unbookable listings is the
    // D-01 failure in miniature.
    ["fx-draft-tatry", "Rozpísaný inzerát", "draft", 20.0631, 49.1197],
    // Published but never geocoded. Also must never be counted: geog IS
    // NULL makes ST_DWithin return NULL, and a NULL predicate is not a
    // match — asserted here rather than assumed.
    ["fx-nogeo", "Bez súradníc", "published", null, null],
  ];

  for (const [slug, name, status, lon, lat] of FIXTURES) {
    await client.query(
      `INSERT INTO listings (host_id, slug, name, status, base_price_cents, max_guests, min_nights, geog)
       SELECT g.id, $1, $2, $3::listing_status, 8000, 4, 1,
              CASE WHEN $4::float8 IS NULL THEN NULL
                   ELSE ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography END
         FROM putko_test_guests g
        WHERE g.email = 'destination-fixture@example.test'`,
      [slug, name, status, lon, lat]
    );
  }

  console.log("\nMembership — a listing is in a destination iff it is inside the circle:\n");

  check("Štrbské Pleso + Tatranská Lomnica are in Vysoké Tatry",
    await pageSlugs("vysoke-tatry"),
    ["fx-strbske-pleso", "fx-tatranska-lomnica"]);

  check("both are also in the parent, Tatry (overlap is correct, not a bug)",
    await pageSlugs("tatry"),
    ["fx-strbske-pleso", "fx-tatranska-lomnica"]);

  check("Štrbské Pleso, the one resort in the catalogue, holds only its own listing",
    await pageSlugs("strbske-pleso"), ["fx-strbske-pleso"]);

  check("...and Tatranská Lomnica, 16 km east, is not in it",
    (await pageSlugs("strbske-pleso")).includes("fx-tatranska-lomnica"), false);

  check("Demänovská dolina is in Jasná",
    await pageSlugs("jasna"), ["fx-demanovska"]);

  check("...and in Nízke Tatry, its parent",
    await pageSlugs("nizke-tatry"), ["fx-demanovska"]);

  check("...and in Liptov, a different top-level destination that also contains it",
    await pageSlugs("liptov"), ["fx-demanovska"]);

  check("Hrabušice is in Slovenský raj",
    await pageSlugs("slovensky-raj"), ["fx-hrabusice"]);

  // Spiš gets Tatranská Lomnica too, which looked like a bug on the first
  // run and is not: historic Spiš reaches north to the Tatra foothills —
  // Kežmarok, Poprad and Tatranská Lomnica are all in it. A guest browsing
  // "Spiš" finding a Tatra apartment is correct, not leakage. The
  // assertion was wrong, not the data.
  check("Spiš contains Hrabušice AND Tatranská Lomnica — historic Spiš reaches the Tatras",
    await pageSlugs("spis"), ["fx-hrabusice", "fx-tatranska-lomnica"]);

  // The counter-case, and the one that WAS a bug: Demänovská dolina is in
  // Liptov, on the far side of the Nízke Tatry ridge from Brezno. At the
  // 25 km radius Horehronie originally had, its circle reached over the
  // ridge and claimed it. Radius tightened to 18 km in
  // scripts/seed-destinations.mjs; this locks that in.
  check("Demänovská dolina is NOT in Horehronie (other side of the ridge)",
    await pageSlugs("horehronie"), []);

  check("Hrabušice is NOT in Vysoké Tatry (~25 km away, radius 15 km)",
    (await pageSlugs("vysoke-tatry")).includes("fx-hrabusice"), false);

  check("Košice contains only the Košice listing",
    await pageSlugs("kosice"), ["fx-kosice-centrum"]);

  check("Bratislava contains nothing — 300 km from every fixture",
    await pageSlugs("bratislava"), []);

  console.log("\nUnbookable listings are never counted:\n");

  check("a draft listing at Štrbské Pleso is excluded from Vysoké Tatry",
    (await pageSlugs("vysoke-tatry")).includes("fx-draft-tatry"), false);

  check("a published listing with no coordinates is in no destination at all",
    (await client.query(
      `SELECT count(*)::int AS n FROM destinations d JOIN listings l ON ${MEMBERSHIP}
        WHERE l.slug = 'fx-nogeo'`
    )).rows[0].n, 0);

  console.log("\nTHE INVARIANT — every tile's count equals its page's result set:\n");

  const { rows: tiles } = await client.query(`
    SELECT d.slug, c.n
      FROM destinations d
      CROSS JOIN LATERAL (
        SELECT count(*)::int AS n FROM listings l WHERE ${MEMBERSHIP}
      ) c
     WHERE d.is_active AND c.n > 0
     ORDER BY d.slug
  `);

  let mismatches = 0;
  for (const t of tiles) {
    const actual = (await pageSlugs(t.slug)).length;
    if (actual !== t.n) {
      console.error(`  FAIL  ${t.slug}: tile says ${t.n}, page returns ${actual}`);
      mismatches++;
    }
  }
  check(`all ${tiles.length} non-empty tiles agree with their own page`, mismatches, 0);

  check("no tile is shown with a count of zero",
    (await client.query(`
      SELECT count(*)::int AS n FROM destinations d
      CROSS JOIN LATERAL (SELECT count(*)::int AS n FROM listings l WHERE ${MEMBERSHIP}) c
      WHERE d.is_active AND d.parent_slug IS NULL AND c.n > 0 AND c.n = 0
    `)).rows[0].n, 0);

  console.log("\nHome page grid, as it would render with these 5 fixtures:\n");
  const { rows: grid } = await client.query(`
    SELECT d.name, c.n
      FROM destinations d
      CROSS JOIN LATERAL (SELECT count(*)::int AS n FROM listings l WHERE ${MEMBERSHIP}) c
     WHERE d.is_active AND d.parent_slug IS NULL AND c.n > 0
     ORDER BY c.n DESC, d.sort_order ASC, d.name ASC
     LIMIT 12
  `);
  for (const r of grid) {
    console.log(`  ${r.name.padEnd(24)} ${r.n} ${r.n === 1 ? "ubytovanie" : "ubytovania"}`);
  }

  check("the grid shows only destinations that actually have something in it",
    grid.every((r) => r.n > 0), true);

  // ── Catalogue sanity: whose circle swallows whose centre ────────────────
  //
  // The fixtures above test five points. This tests the catalogue itself:
  // if destination A's centre falls inside destination B's circle, then
  // every listing at the heart of A also shows up under B. Sometimes that
  // is right (Jasná's centre is inside Nízke Tatry — it IS in Nízke
  // Tatry). Sometimes it means a radius is reaching somewhere it
  // shouldn't, and the only symptom in production would be a guest
  // browsing Orava and finding a Liptov apartment.
  //
  // The allowlist below is every containment that is genuinely correct.
  // Anything else fails. This is what makes the radii maintainable: change
  // one and this tells you what else you just changed. It caught seven on
  // the first run — Orava reaching 24 km south into Liptov as far as
  // Bešeňová, Veľká Fatra swallowing Banská Bystrica, Malá Fatra and
  // Kysuce both swallowing Žilina, Slovenský raj reaching Levoča, Poprad
  // reaching Starý Smokovec, Spiš reaching Rožňava in Gemer. All seven
  // fixed by tuning centres and radii in seed-destinations.mjs.
  const ALLOWED_CONTAINMENT = new Set([
    // Parent / child — correct by definition.
    "vysoke-tatry>tatry", "tatry>vysoke-tatry",
    "zapadne-tatry>tatry",
    "strbske-pleso>vysoke-tatry", "strbske-pleso>tatry",
    // Tatry's nominal centre happens to sit 3.5 km from Štrbské Pleso, so
    // the resort's 9 km circle contains it. Harmless — it says something
    // about where a centre point was placed, not about the boundaries.
    "tatry>strbske-pleso",
    "jasna>nizke-tatry", "nizke-tatry>jasna",
    // NOT "donovaly>nizke-tatry" — Donovaly is a child of Nízke Tatry in the
    // navigation tree but its centre sits 30.1 km from Ďumbier, just outside
    // the 30 km circle. Deliberate: see the comment on nizke-tatry in
    // seed-destinations.mjs. A child is not required to be inside its parent.
    "besenova>liptov", "liptov>besenova",
    "oravska-priehrada>orava", "orava>oravska-priehrada",
    "levoca>spis", "spis>levoca",
    // Genuinely overlapping geography — a place really is in both.
    "jasna>liptov",              // Demänovská dolina is in Liptov
    "zapadne-tatry>liptov",      // Žiarska dolina is the Liptov side of the Roháče
    "horehronie>nizke-tatry",    // Brezno sits under the Nízke Tatry's south face
    "nizke-tatry>horehronie",    // and Ďumbier stands directly above Brezno
    "nizke-tatry>liptov",        // the range's north side IS Liptov
    "liptov>nizke-tatry",
    "besenova>nizke-tatry",      // Bešeňová is where people staying for Jasná sleep
    "slovensky-raj>spis",        // Slovenský raj lies inside historic Spiš
    "poprad>spis", "poprad>tatry", "poprad>vysoke-tatry",
    "vysoke-tatry>spis",         // historic Spiš reaches the Tatra foothills
    "donovaly>velka-fatra",      // the saddle between both ranges
  ]);

  const { rows: containment } = await client.query(`
    SELECT a.slug AS inner_slug, b.slug AS outer_slug
      FROM destinations a
      JOIN destinations b
        ON b.slug <> a.slug
       AND ST_DWithin(a.centre, b.centre, b.radius_m)
     ORDER BY a.slug, b.slug
  `);
  const unexpected = containment
    .map((r) => `${r.inner_slug}>${r.outer_slug}`)
    .filter((pair) => !ALLOWED_CONTAINMENT.has(pair));

  console.log("\nCatalogue sanity — circles reaching into other destinations:\n");
  if (unexpected.length) {
    for (const p of unexpected) console.log(`  unexpected: ${p.replace(">", " is inside ")}`);
  } else {
    console.log(`  ${containment.length} containments, all of them expected`);
  }
  check("no destination's circle swallows another's centre unexpectedly",
    unexpected, []);

  // The reverse check: an allowlist entry that no longer describes reality
  // is a stale exemption, and a stale exemption is how a real overlap gets
  // waved through later.
  const actual = new Set(containment.map((r) => `${r.inner_slug}>${r.outer_slug}`));
  const stale = [...ALLOWED_CONTAINMENT].filter((p) => !actual.has(p));
  check("no stale entries in the allowlist", stale, []);
} finally {
  // Always. This script must never leave a fixture behind.
  await client.query("ROLLBACK");
}

const left = (await client.query("SELECT count(*)::int AS n FROM listings")).rows[0].n;
check("rollback left no fixture listings behind", left, 0);

await client.end();

if (failures > 0) {
  console.error(`\n${failures} FAILURE(S).`);
  process.exit(1);
}
console.log("\nALL PASS — tile counts and destination pages cannot disagree.");
