#!/usr/bin/env node
// lib/db/scripts/seed-destinations.mjs
//
// The "Obľúbené miesta na Slovensku" catalogue — the browse layer that
// replaces the home page's flat "Kam sa chystáte?" city grid
// (audit/DESIGN-AUDIT.md D-04).
//
// WHY THIS IS A SCRIPT AND NOT A MIGRATION
//
// This list is editorial, not structural. It will be corrected — a radius
// that turns out too tight, a region worth adding once listings appear
// there, a name spelt the way Slovaks actually search for it. Editorial
// content that changes on a product cadence does not belong in the
// migration chain, where every correction becomes an immutable historical
// row that later migrations have to work around. The script is idempotent
// (ON CONFLICT DO UPDATE), so correcting the list means editing the array
// below and re-running it.
//
// ON THE COORDINATES
//
// These are approximate centre points, chosen to sit in the middle of where
// accommodation in each destination actually clusters — not survey data and
// not the geometric centroid of an administrative boundary. That is the
// right kind of number for this model: membership is a radius of 8–35 km,
// so a centre that is a kilometre or two off changes nothing, while a
// centre placed on the wrong side of a valley would. They are worth a
// human sanity-check on a map before this ships; the
// destinations_centre_in_slovakia CHECK in 0004 catches only the gross
// errors (swapped lat/lon, dropped minus sign), not a plausible-looking
// point in the wrong valley.
//
// ON THE RADII
//
// Deliberately generous, because the failure modes are asymmetric. A radius
// too small means a real chata 3 km outside the circle is invisible in the
// destination its guests would search for — a listing that loses bookings
// and a host who blames the platform. A radius too large means a listing
// appears in one destination more than a purist would like, next to others
// that are unambiguously right. The second is a rounding error in
// relevance; the first is lost revenue for a host.
//
// Usage:
//   DATABASE_URL=postgresql://putko:putko@localhost:5432/putko \
//     node scripts/seed-destinations.mjs

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

// Parents must be inserted before their children — parent_slug is a real FK.
// The array is ordered accordingly; the script does not sort it for you, so
// when adding a child destination, put it after its parent.
//
// [slug, name, kind, parentSlug, lon, lat, radiusM, sortOrder, description]
const DESTINATIONS = [
  // ── The mountain regions people actually search for ────────────────────
  //
  // Note the nesting, which is the one thing Mega Ubytovanie's version of
  // this grid gets wrong: they show "Tatry", "Vysoké Tatry" and "Nízke
  // Tatry" as three sibling tiles, which reads as three separate places
  // when the first contains the second. Here Tatry is the parent of Vysoké
  // and Západné; Nízke Tatry are a genuinely separate range on the far side
  // of the Váh and stand on their own.
  ["tatry", "Tatry", "mountains", null, 20.05, 49.15, 32000, 5,
   "Najvyššie pohorie Slovenska — Vysoké aj Západné Tatry, chaty, plesá a turistika nad hranicou lesa."],
  ["vysoke-tatry", "Vysoké Tatry", "mountains", "tatry", 20.22, 49.1385, 15000, 6,
   "Štrbské Pleso, Starý Smokovec a Tatranská Lomnica — najžiadanejšie ubytovanie v horách na Slovensku."],
  // Three levels deep: Tatry → Vysoké Tatry → Štrbské Pleso. The only
  // individual resort in the catalogue, because it is the one Slovak place
  // people search for by name instead of by region. 9 km reaches down to
  // Tatranská Štrba and Štrba village, where a lot of what is marketed as
  // "Štrbské Pleso" actually sleeps, and stops short of Podbanské.
  ["strbske-pleso", "Štrbské Pleso", "mountains", "vysoke-tatry", 20.0631, 49.1197, 9000, 6,
   "Ubytovanie pri plese v 1350 m — Solisko, bežecké trate a štart na Rysy."],

  ["zapadne-tatry", "Západné Tatry", "mountains", "tatry", 19.75, 49.20, 15000, 7,
   "Roháče a Žiarska dolina — tichšia strana Tatier s dolinami a chatami."],

  // 30 km, not more. 32 km would bring Donovaly's centre inside the circle
  // (it sits 30.1 km out, at the range's western tip) — but Západné Tatry's
  // centre is 30.4 km out on the other side, across the Liptov valley and a
  // different range entirely. 0.3 km apart: no radius separates them, so
  // this takes the one that is unambiguously right. Donovaly stays a child
  // of Nízke Tatry for navigation while sitting just outside its circle for
  // membership; those are two different things and they are allowed to
  // disagree (see getChildDestinations in src/queries/destinations.ts).
  ["nizke-tatry", "Nízke Tatry", "mountains", null, 19.62, 48.94, 30000, 8,
   "Ďumbier, Chopok a Demänovské jaskyne — lyžovačka v zime, hrebeňovky v lete."],
  ["jasna", "Jasná – Demänovská dolina", "mountains", "nizke-tatry", 19.5883, 48.9694, 9000, 9,
   "Najväčšie lyžiarske stredisko na Slovensku, ubytovanie priamo v doline pod Chopkom."],
  ["donovaly", "Donovaly", "mountains", "nizke-tatry", 19.2222, 48.8722, 8000, 40,
   "Rodinné stredisko na sedle medzi Nízkymi Tatrami a Veľkou Fatrou."],

  ["mala-fatra", "Malá Fatra", "mountains", null, 19.03, 49.20, 18000, 35,
   "Terchová, Vrátna dolina a Jánošíkove diery — hory na dosah od Žiliny."],
  ["velka-fatra", "Veľká Fatra", "mountains", null, 19.08, 48.92, 18000, 45,
   "Rozľahlé lesnaté hrebene medzi Turcom a Horehroním, s Vlkolíncom pod nimi."],

  // ── Travel regions (not administrative units — nobody books a "kraj") ───
  ["liptov", "Liptov", "region", null, 19.52, 49.085, 30000, 10,
   "Údolie medzi Nízkymi a Západnými Tatrami — Jasná, Liptovská Mara a termály na jednom mieste."],
  ["besenova", "Bešeňová", "thermal", "liptov", 19.4331, 49.1006, 8000, 15,
   "Termálne kúpalisko v strede Liptova, celoročne otvorené."],

  ["orava", "Orava", "region", null, 19.42, 49.38, 25000, 20,
   "Oravský hrad, drevené kostolíky a chalupy pod Roháčmi na severe Slovenska."],
  ["oravska-priehrada", "Oravská priehrada", "nature", "orava", 19.5167, 49.4167, 12000, 22,
   "Najväčšia vodná plocha na severe — letné kúpanie, plachtenie a Slanický ostrov."],

  ["spis", "Spiš", "region", null, 20.55, 49.00, 32000, 30,
   "Spišský hrad, Levoča a Slovenský raj — najhustejšia koncentrácia pamiatok na východe."],
  ["levoca", "Levoča", "heritage", "spis", 20.5906, 49.0264, 10000, 32,
   "Historické mesto v hradbách s najvyšším dreveným gotickým oltárom na svete."],

  // Radius deliberately tight (18 km, not the 25 km the valley's length
  // would suggest). Horehronie is the one destination in this list a circle
  // fits badly: it is a long east–west valley with the main Nízke Tatry
  // ridge immediately north, so any circle wide enough to reach Telgárt at
  // the eastern end also reaches over the ridge into Demänovská dolina —
  // 18 km apart as the crow flies, an hour by road, and unambiguously
  // Liptov. Verified: at 25 km the Jasná fixture was landing in Horehronie
  // (scripts/verify-destination-membership.mjs asserts it no longer does).
  // This radius covers Brezno, Podbrezová, Mýto pod Ďumbierom and Heľpa and
  // stops short of Telgárt. See the note on circles at the end of this file.
  ["horehronie", "Horehronie", "region", null, 19.72, 48.82, 18000, 60,
   "Horné Pohronie okolo Brezna — Nízke Tatry zo severu, Muránska planina z juhu."],
  ["kysuce", "Kysuce", "region", null, 18.80, 49.43, 20000, 70,
   "Kopanice, drevenice a lesná úvraťová železnica na severozápade."],
  ["zahorie", "Záhorie", "region", null, 17.15, 48.55, 30000, 80,
   "Borovicové lesy, piesočné duny a Malé Karpaty medzi Bratislavou a Moravou."],

  // ── Príroda ────────────────────────────────────────────────────────────
  ["slovensky-raj", "Slovenský raj", "nature", null, 20.38, 48.9333, 14000, 25,
   "Rebríkové rokliny, Dobšinská ľadová jaskyňa a Hrabušice — turistika pre otrlejších."],
  ["pieniny", "Pieniny", "nature", null, 20.4222, 49.3925, 14000, 55,
   "Prielom Dunajca, plte a Červený Kláštor na poľskej hranici."],
  ["slovensky-kras", "Slovenský kras", "nature", null, 20.50, 48.58, 22000, 75,
   "Najväčšie krasové územie v strednej Európe — Domica, Gombasek, Zádielska tiesňava."],
  ["zemplinska-sirava", "Zemplínska šírava", "nature", null, 22.03, 48.79, 15000, 65,
   "Slovenské more pod Vihorlatom — letná dovolenka pri vode na východe."],

  // ── Termály & kúpele ───────────────────────────────────────────────────
  ["piestany", "Piešťany", "thermal", null, 17.8267, 48.5919, 12000, 50,
   "Najznámejšie slovenské kúpele, sírne bahno a Kúpeľný ostrov na Váhu."],
  ["velky-meder", "Veľký Meder", "thermal", null, 17.77, 47.86, 12000, 85,
   "Termálne kúpalisko na Žitnom ostrove, obľúbené na rodinné pobyty."],
  ["podhajska", "Podhájska", "thermal", null, 18.3350, 48.1050, 10000, 86,
   "Termálna voda so zložením blízkym Mŕtvemu moru, celoročná prevádzka."],

  // ── Pamiatky ───────────────────────────────────────────────────────────
  ["banska-stiavnica", "Banská Štiavnica", "heritage", null, 18.8956, 48.4589, 12000, 42,
   "Banské mesto v kaldere sopky, pamiatka UNESCO, tajchy na kúpanie."],
  ["bardejov", "Bardejov", "heritage", null, 21.2761, 49.2919, 12000, 68,
   "Gotické námestie zapísané v UNESCO a Bardejovské kúpele nad mestom."],

  // ── Mestá ──────────────────────────────────────────────────────────────
  // These four are what the current home page grid already shows (Trenčín,
  // Košice, Prešov, Banská Bystrica), so nothing that appears there today
  // disappears when the section is replaced.
  ["bratislava", "Bratislava", "city", null, 17.1077, 48.1486, 18000, 100,
   "Hlavné mesto — Staré Mesto, hrad a Dunaj."],
  ["kosice", "Košice", "city", null, 21.2611, 48.7164, 18000, 101,
   "Metropola východu s najväčšou pamiatkovou rezerváciou na Slovensku."],
  ["zilina", "Žilina", "city", null, 18.7394, 49.2231, 15000, 102,
   "Východisko do Malej Fatry, Terchovej a na Kysuce."],
  ["banska-bystrica", "Banská Bystrica", "city", null, 19.1461, 48.7361, 15000, 103,
   "Srdce stredného Slovenska, pod Nízkymi Tatrami aj Veľkou Fatrou."],
  ["presov", "Prešov", "city", null, 21.2394, 48.9975, 15000, 104,
   "Tretie najväčšie mesto, brána na Šariš a do Vysokých Tatier."],
  ["trencin", "Trenčín", "city", null, 18.0444, 48.8945, 15000, 105,
   "Mesto pod hradom na Považí, s termálmi a Bielymi Karpatmi v okolí."],
  ["nitra", "Nitra", "city", null, 18.0864, 48.3069, 15000, 106,
   "Najstaršie mesto na Slovensku, pod Zoborom a vinohradmi."],
  // 12 km, tighter than the other cities: Poprad sits between two much
  // stronger destinations, and at the 15 km the others use it was pulling
  // in Tatranská Lomnica and Hrabušice — listings whose guests are
  // searching for Vysoké Tatry and Slovenský raj, not for Poprad.
  ["poprad", "Poprad", "city", null, 20.2977, 49.0555, 10000, 107,
   "Dopravný uzol pod Vysokými Tatrami, s AquaCity a letiskom."],
];

// ── A note on circles, since this model will eventually outgrow them ──────
//
// centre + radius is the right first model: it is one indexed predicate, it
// needs no boundary data for regions (Liptov, Spiš and Horehronie have no
// official geometry — they are not administrative units), and it costs
// nothing to maintain. What it cannot express is a boundary that is not
// round: a valley behind a ridge, a lake shore, a national park.
//
// The escape hatch is already open and costs nothing to keep open: every
// query goes through the single MEMBERSHIP predicate in
// src/queries/destinations.ts. Swapping centre+radius_m for a
// geography(Polygon) and ST_Covers there changes that one fragment and
// nothing else — no calling code, no route, no component. Worth doing when
// a destination's listings are wrong often enough for a host to complain;
// not worth doing before that, on 34 hand-placed circles.


const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");

  for (const [slug, name, kind, parentSlug, lon, lat, radiusM, sortOrder, description] of DESTINATIONS) {
    await client.query(
      `INSERT INTO destinations
         (slug, name, kind, parent_slug, centre, radius_m, sort_order, description)
       VALUES
         ($1, $2, $3::destination_kind, $4,
          ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
          $7, $8, $9)
       ON CONFLICT (slug) DO UPDATE SET
         name        = EXCLUDED.name,
         kind        = EXCLUDED.kind,
         parent_slug = EXCLUDED.parent_slug,
         centre      = EXCLUDED.centre,
         radius_m    = EXCLUDED.radius_m,
         sort_order  = EXCLUDED.sort_order,
         description = EXCLUDED.description`,
      [slug, name, kind, parentSlug, lon, lat, radiusM, sortOrder, description]
    );
  }

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Seed failed, nothing written:", err.message);
  await client.end();
  process.exit(1);
}

const { rows } = await client.query(
  `SELECT kind, count(*)::int AS n FROM destinations GROUP BY kind ORDER BY kind`
);
console.log(`Seeded ${DESTINATIONS.length} destinations:`);
for (const r of rows) console.log(`  ${String(r.n).padStart(3)}  ${r.kind}`);

await client.end();
