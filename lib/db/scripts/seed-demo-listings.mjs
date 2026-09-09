#!/usr/bin/env node
// lib/db/scripts/seed-demo-listings.mjs
//
// ⚠️  DEMO DATA. These 17 listings are invented — the properties, the
// hosts, the prices. They exist so the home page, search and destination
// pages have something real-shaped to render during development, and so
// the destination tile counts are exercised against a realistic spread
// rather than four fixtures.
//
// Everything is created under ONE fictional host account
// (demo-host@putko.example) so it can be identified and removed in one
// statement. Nothing here should ever reach a production database; the
// guard below refuses NODE_ENV=production, which is a speed bump, not a
// security control — the real control is not pointing DATABASE_URL at
// production.
//
// The coordinates ARE real (that is the point — they have to fall inside
// the right destination circles). The prices are plausible for the Slovak
// market as of 2026: a chata for 8 runs €180–280 a night in season, an
// apartment for 2–4 runs €70–140, a room in a penzión €60–90.
//
// Usage:
//   DATABASE_URL=postgresql://putko:putko@localhost:5432/putko \
//     node scripts/seed-demo-listings.mjs

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo listings with NODE_ENV=production.");
  process.exit(1);
}

const HOST_EMAIL = "demo-host@putko.example";

// [slug, name, propertyType, rentalForm, city, maxGuests, minNights,
//  basePriceCents, cancellationPolicy, lon, lat, description]
const LISTINGS = [
  // ── Vysoké Tatry / Štrbské Pleso ──────────────────────────────────────
  ["apartman-solisko-strbske-pleso", "Apartmán s výhľadom na Solisko",
   "apartment", "entire_place", "Štrbské Pleso", 4, 2, 14500, "standard",
   20.0631, 49.1197,
   "Dvojizbový apartmán 300 m od plesa. Lyžiareň, parkovanie pri dome, zastávka električky za rohom."],
  ["chata-pod-krivanom", "Chata pod Kriváňom",
   "cabin", "entire_place", "Tatranská Štrba", 8, 2, 21000, "strict",
   20.0619, 49.0644,
   "Zrubová chata pre dve rodiny. Krb, sauna, veľká terasa s výhľadom na Kriváň."],
  ["horsky-apartman-tatranska-lomnica", "Horský apartmán Tatranská Lomnica",
   "apartment", "entire_place", "Tatranská Lomnica", 4, 1, 12900, "flexible",
   20.2775, 49.1656,
   "Pešo 5 minút na lanovku na Skalnaté pleso. Vhodné aj mimo sezóny."],
  ["penzion-stary-smokovec", "Penzión Starý Smokovec — izba s balkónom",
   "guesthouse", "private_room", "Starý Smokovec", 2, 1, 7900, "flexible",
   20.2200, 49.1385,
   "Izba s vlastnou kúpeľňou a balkónom. Raňajky v cene, parkovanie pri budove."],

  // ── Nízke Tatry / Jasná / Liptov ──────────────────────────────────────
  ["chalet-demanovska-dolina", "Chalet Demänovská dolina",
   "cabin", "entire_place", "Demänovská Dolina", 10, 3, 28000, "strict",
   19.5883, 48.9694,
   "Celá chata pre veľkú partiu. 2 km od Jasnej, vírivka, sušiareň na lyže."],
  ["apartman-jasna-chopok-sever", "Apartmán Jasná – Chopok sever",
   "apartment", "entire_place", "Demänovská Dolina", 4, 2, 13500, "standard",
   19.5900, 48.9800,
   "Ski-in/ski-out apartmán priamo pri zjazdovke. V lete východisko na Chopok."],
  ["drevenica-pribylina", "Drevenica Pribylina",
   "cabin", "entire_place", "Pribylina", 6, 2, 16000, "standard",
   19.7900, 49.1050,
   "Pôvodná liptovská drevenica po rekonštrukcii. Pec, záhrada, ticho."],
  ["apartman-besenova", "Apartmán pri termáloch Bešeňová",
   "apartment", "entire_place", "Bešeňová", 5, 1, 9500, "flexible",
   19.4331, 49.1006,
   "10 minút pešo na termálne kúpalisko. Rodinný apartmán s kuchyňou."],
  ["chata-nad-liptovskou-marou", "Chata nad Liptovskou Marou",
   "cabin", "entire_place", "Liptovský Trnovec", 8, 2, 19000, "standard",
   19.6100, 49.0900,
   "Výhľad na priehradu a Roháče. Vlastný pozemok, gril, mólo 400 m."],

  // ── Slovenský raj / Spiš ──────────────────────────────────────────────
  ["penzion-hrabusice-pri-raji", "Penzión Hrabušice pri Raji",
   "guesthouse", "entire_place", "Hrabušice", 12, 2, 15000, "standard",
   20.3667, 48.9403,
   "Celý penzión pre skupinu. Štart do Suchej Belej a Piecok priamo z dediny."],
  ["chalupka-podlesok", "Chalúpka Podlesok",
   "cabin", "entire_place", "Hrabušice", 4, 2, 8900, "flexible",
   20.3833, 48.9500,
   "Malá chalúpka na okraji lesa, pri vstupe do Slovenského raja."],
  ["apartman-levoca-namestie", "Apartmán Levoča — historické centrum",
   "apartment", "entire_place", "Levoča", 3, 1, 7500, "flexible",
   20.5906, 49.0264,
   "Byt v meštianskom dome na námestí, 100 m od Chrámu sv. Jakuba."],

  // ── Malá Fatra / Orava ────────────────────────────────────────────────
  ["zrub-terchova-vratna", "Zrub Terchová – Vrátna",
   "cabin", "entire_place", "Terchová", 6, 2, 17500, "standard",
   19.0322, 49.2547,
   "Zrub nad Terchovou. Jánošíkove diery 3 km, lanovka do Vrátnej 6 km."],
  ["chalupa-zuberec-rohace", "Chalupa pod Roháčmi, Zuberec",
   "cabin", "entire_place", "Zuberec", 8, 2, 18500, "standard",
   19.6167, 49.2603,
   "Oravská chalupa pri skanzene. Východisko do Roháčov a na Spálenú."],

  // ── Mestá ─────────────────────────────────────────────────────────────
  ["byt-v-centre-kosic", "Byt v centre Košíc",
   "apartment", "entire_place", "Košice", 4, 1, 8500, "flexible",
   21.2611, 48.7164,
   "Dvojizbový byt na Hlavnej. Pešo všade po centre, parkovanie v garáži."],
  ["apartman-stare-mesto-bratislava", "Apartmán Staré Mesto Bratislava",
   "apartment", "entire_place", "Bratislava", 2, 2, 9900, "standard",
   17.1077, 48.1486,
   "Tichý dvorový apartmán pár krokov od Michalskej brány."],
  ["podkrovny-byt-banska-stiavnica", "Podkrovný byt Banská Štiavnica",
   "apartment", "entire_place", "Banská Štiavnica", 4, 2, 8000, "flexible",
   18.8956, 48.4589,
   "Podkrovie v pamiatkovej zóne, výhľad na Kalváriu. Tajchy 10 minút autom."],
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO putko_test_guests
       (email, password_hash, name, last_name, phone_number, gender, role, host_activated_at)
     VALUES ($1, 'demo-not-a-real-credential', 'Demo', 'Ubytovateľ', '+421900000000', 'unspecified', 'host', now())
     ON CONFLICT (email) DO NOTHING`,
    [HOST_EMAIL]
  );

  const { rows } = await client.query(
    `SELECT id FROM putko_test_guests WHERE email = $1`,
    [HOST_EMAIL]
  );
  const hostId = rows[0].id;

  for (const [slug, name, propertyType, rentalForm, city, maxGuests, minNights,
               basePriceCents, policy, lon, lat, description] of LISTINGS) {
    await client.query(
      `INSERT INTO listings
         (host_id, slug, name, description, property_type, rental_form, city,
          max_guests, min_nights, base_price_cents, cancellation_policy,
          status, geog)
       VALUES ($1, $2, $3, $4, $5, $6::rental_form, $7, $8, $9, $10,
               $11::cancellation_policy, 'published',
               ST_SetSRID(ST_MakePoint($12, $13), 4326)::geography)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description,
         property_type = EXCLUDED.property_type, rental_form = EXCLUDED.rental_form,
         city = EXCLUDED.city, max_guests = EXCLUDED.max_guests,
         min_nights = EXCLUDED.min_nights, base_price_cents = EXCLUDED.base_price_cents,
         cancellation_policy = EXCLUDED.cancellation_policy,
         status = EXCLUDED.status, geog = EXCLUDED.geog, updated_at = now()`,
      [hostId, slug, name, description, propertyType, rentalForm, city,
       maxGuests, minNights, basePriceCents, policy, lon, lat]
    );
  }

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Seed failed, nothing written:", err.message);
  await client.end();
  process.exit(1);
}

const summary = await client.query(`
  SELECT d.name, c.n
    FROM destinations d
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS n FROM listings l
       WHERE l.status = 'published' AND l.geog IS NOT NULL
         AND ST_DWithin(l.geog, d.centre, d.radius_m)
    ) c
   WHERE d.is_active AND d.parent_slug IS NULL AND c.n > 0
   ORDER BY c.n DESC, d.sort_order, d.name
`);

console.log(`Seeded ${LISTINGS.length} demo listings. Home page grid now reads:\n`);
for (const r of summary.rows) {
  console.log(`  ${r.name.padEnd(20)} ${String(r.n).padStart(2)}`);
}

await client.end();
