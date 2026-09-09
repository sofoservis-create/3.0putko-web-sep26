# Obľúbené miesta na Slovensku — the destination catalogue

Reviewed by the owner: Štrbské Pleso added, every other proposed addition
declined. 35 destinations.

This replaces the home page's flat "Kam sa chystáte?" city grid
(`audit/DESIGN-AUDIT.md` D-04). It is the browse layer: travel regions and
mountain areas alongside cities, the way people actually decide where to go —
nobody books "a kraj", they book Liptov.

The mechanism is verified; which 35 places to list, and how wide each one is,
stays a product decision about the Slovak market. Correcting it is cheap and
needs no migration: edit the array in
`lib/db/scripts/seed-destinations.mjs` and re-run
`pnpm run seed:destinations` (idempotent upsert — re-running is safe), then
`pnpm run verify:destinations`.

## How a listing gets into a destination

By geography, not by tagging:

```
listing ∈ destination  ⟺  ST_DWithin(listings.geog, destinations.centre, radius_m)
```

Each destination is a centre point and a radius. A host publishes a listing
with coordinates and it appears in every destination whose circle contains
it — immediately, with no tagging step, no admin action, no backfill.

That is what makes it *kompatibilné s našimi ubytovaniami* structurally
rather than by discipline. The number on a tile is a live `COUNT(*)`:

> **the number on a tile == the number of results you get when you click it**

Both numbers come from the same SQL fragment (`MEMBERSHIP` in
`lib/db/src/queries/destinations.ts`), so they cannot drift apart. This is
the direct fix for audit finding D-01 — the current site's hero reads
"1433+ ubytovaní" above a catalogue of 6.

### Two things that follow from this

**Destinations overlap, and that is correct.** A chata near Štrbské pleso is
in Vysoké Tatry, in Tatry, in Spiš and in Poprad, all at once. A guest
browsing any of the four should find it. This is where Mega Ubytovanie's
version of the grid goes wrong in the other direction: they show *Tatry*,
*Vysoké Tatry* and *Nízke Tatry* as three sibling tiles, which reads as three
separate places when the first contains the second. Here Vysoké and Západné
Tatry are children of Tatry, and the home page shows one level at a time.

**Nothing empty is ever shown.** The home grid filters to destinations with
at least one published listing and ranks by that count. With supply where it
is today, a grid of 35 tiles would be mostly "0 možností" — worse than the
city grid it replaces. The section grows as the supply grows; until then it
shows only what is true. Editorial `sort_order` only breaks ties between
destinations that already have listings, so it cannot promote an empty one.

## The catalogue

Coordinates are approximate centre points — placed where accommodation
actually clusters, not the geometric centroid of a boundary. At radii of
8–32 km a kilometre of error changes nothing; a centre on the wrong side of a
valley would. **Worth checking on a map before this ships.**

Radii are deliberately generous, because the failure modes are asymmetric: a
radius too small hides a real chata 3 km outside the circle from the guests
searching for it (a host loses bookings and blames the platform); a radius
too large shows a listing in one destination more than a purist would like.

### Hory

| Destinácia | Parent | Lat | Lon | Polomer |
|---|---|---|---|---|
| Tatry | — | 49.1500 | 20.0500 | 32 km |
| Vysoké Tatry | Tatry | 49.1385 | 20.2200 | 15 km |
| Štrbské Pleso | Vysoké Tatry | 49.1197 | 20.0631 | 9 km |
| Západné Tatry | Tatry | 49.2000 | 19.7500 | 15 km |
| Nízke Tatry | — | 48.9400 | 19.6200 | 30 km |
| Jasná – Demänovská dolina | Nízke Tatry | 48.9694 | 19.5883 | 9 km |
| Donovaly | Nízke Tatry | 48.8722 | 19.2222 | 8 km |
| Malá Fatra | — | 49.2000 | 19.0300 | 18 km |
| Veľká Fatra | — | 48.9200 | 19.0800 | 18 km |

### Regióny

| Destinácia | Parent | Lat | Lon | Polomer |
|---|---|---|---|---|
| Liptov | — | 49.0850 | 19.5200 | 30 km |
| Orava | — | 49.3800 | 19.4200 | 25 km |
| Spiš | — | 49.0000 | 20.5500 | 32 km |
| Horehronie | — | 48.8200 | 19.7200 | 18 km |
| Kysuce | — | 49.4300 | 18.8000 | 20 km |
| Záhorie | — | 48.5500 | 17.1500 | 30 km |

### Príroda

| Destinácia | Parent | Lat | Lon | Polomer |
|---|---|---|---|---|
| Slovenský raj | — | 48.9333 | 20.3800 | 14 km |
| Pieniny | — | 49.3925 | 20.4222 | 14 km |
| Slovenský kras | — | 48.5800 | 20.5000 | 22 km |
| Zemplínska šírava | — | 48.7900 | 22.0300 | 15 km |
| Oravská priehrada | Orava | 49.4167 | 19.5167 | 12 km |

### Termály a kúpele

| Destinácia | Parent | Lat | Lon | Polomer |
|---|---|---|---|---|
| Bešeňová | Liptov | 49.1006 | 19.4331 | 8 km |
| Piešťany | — | 48.5919 | 17.8267 | 12 km |
| Veľký Meder | — | 47.8600 | 17.7700 | 12 km |
| Podhájska | — | 48.1050 | 18.3350 | 10 km |

### Pamiatky

| Destinácia | Parent | Lat | Lon | Polomer |
|---|---|---|---|---|
| Banská Štiavnica | — | 48.4589 | 18.8956 | 12 km |
| Bardejov | — | 49.2919 | 21.2761 | 12 km |
| Levoča | Spiš | 49.0264 | 20.5906 | 10 km |

### Mestá

| Destinácia | Parent | Lat | Lon | Polomer |
|---|---|---|---|---|
| Bratislava | — | 48.1486 | 17.1077 | 18 km |
| Košice | — | 48.7164 | 21.2611 | 18 km |
| Žilina | — | 49.2231 | 18.7394 | 15 km |
| Banská Bystrica | — | 48.7361 | 19.1461 | 15 km |
| Prešov | — | 48.9975 | 21.2394 | 15 km |
| Trenčín | — | 48.8945 | 18.0444 | 15 km |
| Nitra | — | 48.3069 | 18.0864 | 15 km |
| Poprad | — | 49.0555 | 20.2977 | 10 km |

Trenčín, Košice, Prešov and Banská Bystrica are the four the current home
page already shows, so nothing visible today disappears when the section is
replaced.

## Reviewed by the owner

**Štrbské Pleso added** as the one further destination worth having — the only
individual resort in the catalogue, because it is the one Slovak place people
search for by name rather than by region. It sits three levels deep
(Tatry → Vysoké Tatry → Štrbské Pleso) with a 9 km radius, which reaches down
to Tatranská Štrba and Štrba village — where a good share of what is marketed
as "Štrbské Pleso" actually sleeps — and stops short of Podbanské.

**Confirmed omissions**, reviewed and deliberately left out: Gemer, Šariš,
Zemplín, Podunajsko, Turiec, Muránska planina, Vihorlat, Poloniny. Adding one
later is an edit to the array plus a re-run — no migration, no backfill.

### Still open

1. **Radii.** Especially Záhorie (30 km) and Slovenský kras (22 km), which I
   placed with the least confidence.
2. **Names.** Spelt the way a Slovak guest would type them into search.
3. **Descriptions.** One sentence each, currently mine. They will be read.
4. **Coordinates.** Approximate centre points from my own knowledge — fine for
   8–32 km radii, still worth a pass on a map.

## Known limitation: circles

A circle cannot follow a ridge. Horehronie is the clearest case — a long
east–west valley with the Nízke Tatry immediately north, so a circle wide
enough to reach Telgárt at the eastern end also reaches over the ridge into
Demänovská dolina: 18 km as the crow flies, an hour by road, and
unambiguously Liptov. The radius is tightened to 18 km to prevent that, at
the cost of not reaching Telgárt.

Circles are still the right first model: one indexed predicate, no boundary
data needed (Liptov, Spiš and Horehronie have no official geometry — they
are not administrative units), nothing to maintain. And the upgrade path is
open and free: replacing `centre + radius_m` with a `geography(Polygon)` and
`ST_Covers` changes the one `MEMBERSHIP` fragment and nothing else — no
route, no component, no calling code. Worth doing when a destination's
results are wrong often enough for a host to complain about it; not worth
doing before that.

## Verification

`pnpm run verify:destinations` — writes fixtures at real Slovak coordinates
inside a transaction it always rolls back, then asserts:

- membership works (Štrbské Pleso is in Vysoké Tatry; Hrabušice, 25 km away,
  is not);
- overlap works (the same listing is in both Vysoké Tatry and Tatry);
- draft listings and listings without coordinates are never counted;
- **every tile's count equals its own page's result set**;
- no tile is ever shown with a count of zero;
- and a catalogue-wide sanity check: if destination A's centre falls inside
  destination B's circle, that pair must be on an explicit allowlist of
  overlaps that are genuinely correct.

That last check is what makes the radii safe to edit. It caught seven real
errors on its first run: Orava reaching 24 km south into Liptov as far as
Bešeňová, Veľká Fatra swallowing Banská Bystrica, Malá Fatra and Kysuce both
swallowing Žilina, Slovenský raj reaching Levoča, Poprad reaching Starý
Smokovec, and Spiš reaching Rožňava in Gemer. Change a radius and it tells
you what else you just changed.

`pnpm exec tsx lib/db/scripts/smoke-destination-queries.ts` runs the exported
query functions themselves against a real database, because Drizzle's nested
`sql` composition typechecks cleanly and can still emit invalid SQL — that is
exactly how the one real bug in `claimDates()` was found
(`lib/db/PROOF-no-double-booking.md`).

## Where this shows up in the product

- **Home page** — `getTopLevelDestinations()`: the replacement for the city
  grid. Ranked by live count.
- **`/miesta/[slug]`** — `getDestination()` + `getDestinationListings()`, with
  `getChildDestinations()` for drill-in (Liptov → Bešeňová).
- **Listing page breadcrumb** — `getDestinationsForListing()`, narrowest
  destination first: *Jasná – Demänovská dolina · Nízke Tatry · Liptov*.

One thing the browse pages deliberately do **not** do is apply the platform's
search ranking (availability → distance → price). That ranking needs dates and
a search origin, which a browse page does not have; destination listings are
ordered by distance from the destination centre instead. When a browse tile
hands off to real search, the dates come with it and the full ranking applies.
