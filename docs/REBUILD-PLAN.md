# Putko — rebuild plan

> **REVISED — read this first.** This plan was written assuming a *strangler
> migration*: the new app fronting the live putko.sk and proxying anything it
> hadn't taken over yet. **That premise no longer holds.** The live site
> deploys from a separate repository which is deliberately not being touched;
> this repo is a standalone replacement built alongside it.
>
> What that changes:
> - **Phase 0 (patching the live system) is not on the critical path.** The 30
>   patches were applied to the `.migration-backup/` snapshot in this repo and
>   are not deployed anywhere. They stand as evidence of what's wrong with the
>   current build, not as a shipped fix.
> - **The `LEGACY_ORIGIN` fallback-proxy in Phase 1.4 is unnecessary.** There
>   is no legacy app to fall through to. Build routes directly.
> - **The ETL from the old MongoDB (Phase 2.4) is deferred**, not deleted —
>   development runs on synthetic seed data. Importing real listings is a
>   separate decision, made when there's something worth importing them into.
> - **Phase ordering is unchanged, but for a different reason.** Read path
>   before money path is no longer about migrating safely — it's about
>   reaching something demonstrable fastest. There is currently no URL anyone
>   can open; that, not backend depth, is the binding constraint.
>
> Everything below still describes the target architecture accurately. Read
> the sequencing as "what to build next," not "what to migrate next."

**Shape:** standalone rebuild. A new Next.js 15 + Postgres app, built to stand on its own, with the existing Express/MongoDB system left untouched and used only as reference material.

**Assumptions from the audit and your answers:**

* putko.sk is live with hosts onboarded, but little or no money has moved yet. That is the best possible moment for this — the migration is small and the security fixes are urgent but not on fire.
* Everything stays on Render, Frankfurt region (EU data residency for Slovak guest data).
* One person building, with AI assistance. Every phase below is sequenced so that each step is independently verifiable and nothing needs specialist ops knowledge.

**Honest timeline:** 5–7 months to full parity at a steady solo pace. Phases 0–2 (≈10 weeks) already give you a materially better, safer product than what is live today. If you only ever finish Phase 3, you have a working marketplace on solid foundations.

---

## The one-paragraph version

Week 1 you apply the 30 security patches and rotate the leaked credential, because the current system is not safe to take money on. Then you stand up a Postgres database whose schema makes double-booking *physically impossible* rather than merely unlikely, and put a new Next.js app in front of the old one that proxies everything it doesn't yet own. You move the read paths first (search, listing pages) — that is where the mobile-first win is, and it carries no money risk. Then the booking and payment path. Then host tools and channel sync. Then you turn the old app off.

---

## Phase 0 — Make the live site safe (Week 1)

Do this before anything else. It is a week of work and it is not optional — right now anyone on the internet can take over a host account with one HTTP request.

### 0.1 Rotate the leaked credential first

`utils/redis.js:5` has a live Upstash password committed to git. It is in every clone and every fork of the history.

1. Upstash console → rotate the password (or create a new database and move over).
2. Set `REDIS_URL` in the Render service environment.
3. Apply patch `004`, which makes the app read from the environment and refuse to start without it.

Do **not** try to scrub git history first — that breaks every clone and the credential is already out. Rotate, then move on.

### 0.2 Apply the patches

```sh
git checkout -b fix/security-critical
for p in audit/patches/*.patch; do
  git apply --3way "$p" || echo "CONFLICT: $p"
done
```

Then read `audit/patches/README.md` before deploying — three of them have prerequisites:

| Patch | Prerequisite |
|---|---|
| `004` | Redis credential rotated, `REDIS_URL` set |
| `010` | Backfill `icalExportToken` on every listing, then re-issue subscription URLs to hosts (old URLs stop working — that is the point) |
| `025` | **Mongo starts deleting within a minute of the TTL index being created.** Take a backup. Confirm the retention periods first. |

### 0.3 Deploy in two batches

**Batch 1 — pure security, no behaviour change** (deploy immediately):
`001, 002, 003, 004, 005, 006, 007, 012, 013, 020, 021, 022, 023, 024, 028, 030`

**Batch 2 — behaviour changes, tell your hosts first** (deploy a few days later):
`008` (cookie banner appears), `009` (cleanup cron), `010` (new calendar URLs), `011` (booking race), `014`+`015` (**commission changes from 2.03 % to 6 %** — your hosts' terms change, so this needs notice), `016` (payout timing), `017`, `018`, `019`, `025`, `026` (host cancellations now refund in full), `027`, `029`

Batch 2 changes what hosts are paid and what guests are refunded. Send an email and update the terms page before it goes live.

### 0.4 Decide the open questions

`audit/DECISIONS-NEEDED.md` has ten. Three block Phase 3, so decide them now, not later:

* **§2 VAT already invoiced** — run the three queries in that section this week. If invoices went out with a 23 % VAT line, that is a live tax liability and it needs your accountant now.
* **§3 host cancellation refund** — patch `026` implements full refund. Confirm that is what you want.
* **§4 the date interval migration** — this one changes the meaning of every stored date and belongs in Phase 2 of the rebuild, not here.

### Gate — Phase 0 is done when

- [ ] `curl https://api.putko.sk/api/reservation/` returns 401, not a list of guests
- [ ] `curl https://api.putko.sk/api/hosts/<id>` contains no `password` field
- [ ] `POST /api/auth/change-password` without a token returns 401
- [ ] Redis credential rotated and the old one is dead
- [ ] Loading the site sets no `_fbp` cookie until you click Accept

---

## Phase 1 — Foundations (Weeks 2–4)

Nothing user-visible ships in this phase. That is fine — everything after it depends on getting this right.

### 1.1 Render infrastructure

Create these in the Render dashboard, **all in Frankfurt**:

| Service | Type | Plan to start | Purpose |
|---|---|---|---|
| `putko-db` | Postgres 16 | Basic-1GB | The new database. Upgrade before launch — Basic has no point-in-time recovery. |
| `putko-web` | Web Service (Node) | Starter | The new Next.js app |
| `putko-jobs` | Cron Job ×3 | Starter | iCal sync, payout sweep, invoice run — one Render Cron Job each |
| `putko-kv` | Key Value | Starter | Rate limiting, session cache |

Two things about Render that matter for this build:

* **Render guarantees at most one run of a given cron job is active at a time**, and delays the next run if one is still going. That solves the overlapping-iCal-sync problem the audit found (`audit/REPORT.md` C-06) with no locking code at all. Move each `node-cron` job out of the web process into its own Render Cron Job and the problem disappears.
* **Render cron schedules are in UTC.** Your business timezone is Europe/Bratislava, which is UTC+1/+2 depending on DST. Either accept an hour of drift on the payout sweep, or schedule for 01:00 UTC and re-check the precise window in code — which `utils/timezone.js` already does correctly.

Budget: roughly $25–50/month at this scale to start ([Render pricing](https://render.com/pricing) — check current figures, a Starter web service plus Basic Postgres was about $13/month as of mid-2026).

Keep the existing Express service running throughout. It is the fallback the new app proxies to.

### 1.2 The database schema — this is the important part

The single most valuable thing this rebuild buys you is that **double-booking becomes impossible at the database level**. Not "checked carefully" — impossible. Postgres refuses the write.

```sql
-- Run once, on the new database
CREATE EXTENSION IF NOT EXISTS postgis;      -- distance search
CREATE EXTENSION IF NOT EXISTS unaccent;     -- Košice / Kosice
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- required to mix = and && in one constraint
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy name search
```

#### One availability table, one guarantee

Every source of unavailability goes in **one** table. That is what makes the guarantee possible — a booking cannot overlap a manual block if they are rows in the same constraint.

```sql
CREATE TYPE block_source AS ENUM ('booking', 'hold', 'manual', 'ical');

CREATE TABLE calendar_blocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- Half-open: [check_in, check_out). The checkout day is free for the next
  -- guest. This is the convention iCal, Stripe and Postgres all use, and it is
  -- the one the current system gets wrong (audit H-08).
  stay            daterange NOT NULL,

  source          block_source NOT NULL,
  booking_id      uuid REFERENCES bookings(id) ON DELETE CASCADE,
  feed_id         uuid REFERENCES ical_feeds(id) ON DELETE CASCADE,
  ics_uid         text,                 -- RFC 5545 UID: stable identity across syncs
  hold_expires_at timestamptz,          -- only for source = 'hold'
  released_at     timestamptz,          -- soft release, so history survives
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT stay_is_half_open
    CHECK (lower_inc(stay) AND NOT upper_inc(stay) AND NOT isempty(stay)),

  -- THE GUARANTEE. Two active blocks cannot overlap on one listing. Ever.
  -- No transaction, no application check and no race can get past this.
  CONSTRAINT no_overlapping_blocks
    EXCLUDE USING gist (listing_id WITH =, stay WITH &&)
    WHERE (released_at IS NULL)
);

CREATE UNIQUE INDEX calendar_blocks_feed_uid
  ON calendar_blocks (feed_id, ics_uid)
  WHERE ics_uid IS NOT NULL AND released_at IS NULL;
```

Note the predicate is `released_at IS NULL` and **not** anything involving `now()` — Postgres requires index predicates to be immutable, so a live-hold check cannot go in there. Expired holds are cleared inside the claiming transaction instead:

```sql
BEGIN;

-- Clear this listing's lapsed holds so their space is genuinely free
DELETE FROM calendar_blocks
 WHERE listing_id = $1
   AND source = 'hold'
   AND released_at IS NULL
   AND hold_expires_at <= now();

-- Claim. If anything active overlaps, Postgres raises 23P01 and the whole
-- transaction rolls back. Catch it and return 409 to the guest.
INSERT INTO calendar_blocks (listing_id, stay, source, booking_id, hold_expires_at)
VALUES ($1, daterange($2, $3, '[)'), 'hold', $4, now() + interval '30 minutes');

COMMIT;
```

In application code that is:

```ts
try {
  await claimDates(listingId, checkIn, checkOut, bookingId);
} catch (e) {
  if (e.code === '23P01') return { ok: false, reason: 'dates_unavailable' };
  throw e;
}
```

Nine lines, and the class of bug is gone. Compare `.migration-backup/backend/utils/calendarHold.js` — 250 lines of careful application logic that still races.

#### Search must use the same predicate

The audit found search and booking disagreeing about what "taken" means (H-03). Define availability **once**, as a view, and make both read it:

```sql
CREATE VIEW active_blocks AS
  SELECT * FROM calendar_blocks
   WHERE released_at IS NULL
     AND (hold_expires_at IS NULL OR hold_expires_at > now());
```

Search then filters with `NOT EXISTS (SELECT 1 FROM active_blocks b WHERE b.listing_id = l.id AND b.stay && daterange($from, $to, '[)'))`. One definition, no drift possible.

#### Geo and diacritics

```sql
ALTER TABLE listings ADD COLUMN geog geography(Point, 4326);
CREATE INDEX listings_geog_idx ON listings USING gist (geog);

-- unaccent() is not IMMUTABLE, so it cannot be indexed directly.
-- This wrapper is the standard workaround.
CREATE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
  $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE INDEX listings_name_unaccent_idx
  ON listings USING gin (f_unaccent(name) gin_trgm_ops);
CREATE INDEX listings_city_unaccent_idx
  ON listings (f_unaccent(city));
```

"Kosice" now finds "Košice", on an index. And your stated default ranking becomes one query:

```sql
SELECT l.*, ST_Distance(l.geog, $point) AS distance_m
  FROM listings l
 WHERE l.status = 'published'
   AND NOT EXISTS (SELECT 1 FROM active_blocks b
                    WHERE b.listing_id = l.id
                      AND b.stay && daterange($from, $to, '[)'))   -- availability
   AND ST_DWithin(l.geog, $point, $radius_m)
 ORDER BY distance_m ASC,                                          -- distance
          l.base_price_cents ASC                                   -- price
 LIMIT 24;
```

Availability → distance → price. Exactly the rule, enforced by the database.

#### Region taxonomy

Model the 8 kraje and 79 okresy as real tables now — retrofitting them later means re-geocoding everything.

```sql
CREATE TABLE kraje  (code text PRIMARY KEY, name text NOT NULL);   -- 8 rows
CREATE TABLE okresy (code text PRIMARY KEY, name text NOT NULL,
                     kraj_code text NOT NULL REFERENCES kraje(code)); -- 79 rows
ALTER TABLE listings ADD COLUMN okres_code text REFERENCES okresy(code);
```

Source data: the Statistical Office (ŠÚ SR) publishes the official NUTS/LAU codes. Resolve `okres_code` from the geocode at save time. This gives you `/ubytovanie/presovsky-kraj` landing pages, which is real SEO in a market this size.

#### Money and state

Two rules, both violated by the current system:

* **Every money column is `integer` cents.** Never `numeric`, never `real`. `base_price_cents`, `total_cents`, `commission_cents`, `host_payout_cents`.
* **One status column per aggregate, with a CHECK constraint on legal transitions.** The current system spreads booking state across `isApproved`, `paymentStatus` and `payoutStatus` with no guard, which is why the audit found eight illegal transitions. One enum, one state machine, transitions enforced in a single function.

### 1.3 The Next.js app skeleton

```
apps/web/                    ← new Next.js 15, App Router
  app/
    (public)/                ← search, listing, static pages
    (guest)/                 ← booking, my stays
    (host)/                  ← host dashboard
    api/
  lib/
    db/                      ← Drizzle client + queries
    auth/
    stripe/
packages/
  db/                        ← Drizzle schema + migrations (reuse lib/db)
  ui/                        ← design system components
```

Keep the existing `lib/db` Drizzle setup — it is already correctly configured, and the auth prototype in `artifacts/api-server/src/routes/test-auth.ts` is genuinely good work (scrypt, hashed session tokens, `timingSafeEqual`). Build on it rather than starting over.

### 1.4 The strangler proxy — how both apps coexist

This is the mechanism that makes the whole migration low-risk. Point the domain at the **new** app, and have it fall through to the old one for anything it doesn't implement yet:

```js
// apps/web/next.config.js
module.exports = {
  async rewrites() {
    return {
      // `fallback` runs AFTER Next's own pages and API routes.
      // Any route the new app implements wins; everything else
      // is proxied to the old Express app, invisibly to the user.
      fallback: [
        { source: '/:path*', destination: `${process.env.LEGACY_ORIGIN}/:path*` },
      ],
    };
  },
};
```

Set `LEGACY_ORIGIN` to the existing Render service's internal URL. Now migrating a page means *creating the file* — the moment `app/(public)/ubytovanie/page.tsx` exists, that route stops being proxied. Deleting the file rolls it back. That is your migration switch, per route, with no feature flags and no DNS changes.

### 1.5 Environments

Three, all on Render:

| | Purpose | Database |
|---|---|---|
| `production` | putko.sk | `putko-db` |
| `staging` | staging.putko.sk | `putko-db-staging`, restored from a production backup weekly |
| local | your machine | Docker Postgres with the same extensions |

Local Postgres with everything you need:

```yaml
# docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_PASSWORD: putko
      POSTGRES_DB: putko
    ports: ["5432:5432"]
```

`postgis/postgis` ships PostGIS, and `unaccent`/`btree_gist`/`pg_trgm` are in contrib, so one image gives you the exact production extension set.

### Gate — Phase 1 is done when

- [ ] `INSERT` of two overlapping blocks on one listing raises `23P01`. **Write this test first and watch it fail before the constraint exists.**
- [ ] Search query returning listings ranked availability → distance → price runs in <50 ms on 10,000 seeded rows
- [ ] `SELECT * FROM listings WHERE f_unaccent(city) = f_unaccent('Kosice')` finds Košice, using the index (check with `EXPLAIN`)
- [ ] The new app serves a "hello" page at one route and transparently proxies everything else to the old app
- [ ] CI runs migrations against a throwaway Postgres and the test suite passes

---

## Phase 2 — The read path, and the mobile-first win (Weeks 5–10)

Move search and listing pages to the new app. **No money is involved**, so this phase carries almost no risk — and it is where your users feel the difference.

### 2.1 Why this is the biggest win

Measured on the current production build:

| Route | First-load JS (gzip) |
|---|---|
| Search (`/listing-stay-map`) | **436 kB** |
| Listing (`/listings/[details]`) | **390 kB** |
| Checkout | 378 kB |
| Login | **329 kB** — including a date picker |
| Google's "good" threshold | ~170 kB |

Worse, it is client-rendered: the browser downloads 1.35 MB of JavaScript, parses it, *then* makes the API call, *then* renders. On a mid-range Android on Slovak 4G that is 4–6 seconds before the guest sees a listing.

React Server Components change the shape of that problem, not just the size. The listing page becomes HTML streamed from the server with the data already in it; JavaScript ships only for the parts that are actually interactive.

**Target: under 120 kB gzip on the search route, LCP under 2.0 s on a throttled 4G profile.**

### 2.2 How to get there

* **Server Components by default.** Only add `"use client"` to a component that genuinely needs state or an event handler. The date picker and the map need it; a listing card does not.
* **Dynamic-import the heavy parts.** The map (`@react-google-maps/api`) loads only when the map tab is opened. The date picker loads on interaction, not on page load. That is ~70 kB gz off the search route immediately.
* **`next/font` instead of the Google Fonts `<link>`.** The current app render-blocks on a cross-origin stylesheet pulling five families at full variable weight. `next/font` self-hosts and inlines the critical CSS. Also — do you need five typefaces? Two is usually the honest answer.
* **`next/image` everywhere, with `sizes`.** There are currently 88 raw `<img>` tags against 4 `next/image`, so full-resolution photos ship to phones. Set `deviceSizes` to real breakpoints and always pass `sizes`.
* **Declare a `browserslist`.** Next ships a 38.5 kB gz legacy polyfill bundle to every browser without one. Patch `029` has the config.
* **Drop `maximum-scale=1`.** It blocks pinch-zoom, which fails WCAG 1.4.4 and makes the map and date picker unusable for anyone who needs to magnify.

### 2.3 Preserving the design

You like the current design and you should keep it. The way to keep it *and* rebuild is to extract it first, then build against the extraction:

1. **Pull the tokens out of `globals.css`** — colours (that `#357965` green, `#163C2E`), spacing scale, type scale, radii, shadows — into CSS custom properties and a Tailwind theme config. Do this before writing a single component.
2. **Use `audit/listing-5ka-{mobile,tablet,desktop}.jpg` as the reference.** Those screenshots are your spec for the listing page.
3. **Rebuild components against the tokens, not by copying the JSX.** `ClientPage.js` is 2,494 lines and `AddAccommodation.js` is 3,708 — those are not files to port, they are files to replace with the same *visual output*.
4. **Design mobile-first, literally.** Write the 375 px layout first, add breakpoints upward. The current app was clearly built desktop-first and squeezed down, which is why the search filters are a 2,024-line component.

Minimum touch target 44×44 px, and nothing important behind a hover — the map card highlight at `SectionGridHasMap.js:435` is `onMouseEnter`, which does not exist on a phone.

### 2.4 Data during this phase

Search reads from Postgres, so listings must be there. Write a **one-way, idempotent, re-runnable** ETL:

```
scripts/migrate/
  01-hosts.ts        Host        → hosts
  02-listings.ts     Accommodation → listings (+ geog, okres_code)
  03-blocks.ts       occupancyCalendar → calendar_blocks
  04-bookings.ts     Reservation  → bookings
  05-verify.ts       row counts, spot-check totals, assert no overlaps
```

Every table gets a `legacy_mongo_id text UNIQUE` column. That makes the ETL idempotent (upsert on it), lets you re-run after fixing a mapping bug, and lets you cross-check the two systems while both are live.

During Phase 2, run the ETL **nightly**. The old app is still the writer; Postgres is a read replica you are learning to trust. When the numbers match for a week, you are ready for Phase 3.

**This is where the interval migration happens** (`audit/DECISIONS-NEEDED.md` §4). The new schema is half-open by construction, so `03-blocks.ts` is where you convert: native booking rows are already `[check_in, check_out)`, iCal rows stored as an inclusive last night need `+1 day` on the end. Assert in `05-verify.ts` that no currently-booked night became free.

### Gate — Phase 2 is done when

- [ ] Search and listing pages serve from the new app; everything else still proxies
- [ ] Lighthouse mobile ≥ 90 performance on the search route, LCP < 2.0 s throttled 4G
- [ ] First-load JS < 120 kB gz on search
- [ ] "Kosice" finds Košice; "chaty do 20 km od Štrbského plesa" returns sensible results
- [ ] Nightly ETL runs clean for 7 consecutive days with matching counts
- [ ] Usable one-handed at 375 px — you personally book a stay on your own phone

---

## Phase 3 — Booking and money (Weeks 11–18)

The riskiest phase. Take it slowly and keep the old system able to serve bookings until the new path has run real money through it.

### 3.1 Order of work

1. **Availability + quote API** on the new app (read-only, no writes) — verify against the old app's answers for a week
2. **Booking creation** writing to Postgres, with the exclusion constraint doing the work
3. **Stripe Checkout** — reuse the existing integration almost as-is; `buildCheckoutSession` in the current code is correct. Add the idempotency key it is missing (audit M-13).
4. **Webhook handler** — port `handleStripeWebhook` nearly verbatim. It is the best code in the current system: signature verified, claimed against a unique index, released on failure. Replace the Mongo ledger with a Postgres table and keep the logic.
5. **Payout job** as a Render Cron Job, with the corrected trigger rule from patch `016`
6. **Cancellation and refunds** against the snapshotted policy — the snapshot mechanism in the current code is correct and should be copied, not redesigned
7. **Monthly commission invoice** via SuperFaktúra, at 6 %, with no VAT line

### 3.2 The booking state machine

One column, one function, transitions enforced:

```
                 ┌──────────────────────────────────────┐
                 ▼                                      │
draft ──► request_pending ──► awaiting_payment ──► confirmed ──► completed
             │                      │                 │
             └──────────────────────┴─────────────────┴──► cancelled
```

Every transition goes through one `transitionBooking(id, from, to)` that does `UPDATE ... WHERE id = $1 AND status = $2` and fails if zero rows matched. That single pattern eliminates all eight illegal transitions the audit found — including "cancelled → paid", which is currently reachable because `applyPaidCheckoutSession` never checks `isApproved`.

### 3.3 What to carry over unchanged

The current payments code is genuinely good in places. Copy, do not redesign:

* separate charges and transfers, commission implicit in transferring less (`config/payments.js`)
* deterministic Stripe idempotency keys (`transfer_booking_<id>`)
* the cancellation-policy snapshot — frozen at booking time, never re-read from the listing
* `auth/authorize.js` — the actor-derivation logic is careful work; port the *idea* to the new auth layer
* `utils/timezone.js` — the Europe/Bratislava handling is correct

### 3.4 What to fix on the way

Everything in `audit/DECISIONS-NEEDED.md` §1, §5, §8, plus:

* commission at 6 %, no VAT line
* payout trigger: check-in + 24 h only with ≥3 completed stays, otherwise check-out + 24 h
* the complaint record that makes the "no open complaint" condition possible at all
* server-side Meta CAPI gated on the consent flag stored with the booking
* guest age 18 collected and checked

### 3.5 Running both systems during cutover

For two weeks, new bookings go through the new path and the old path is read-only. The ETL reverses direction: Postgres becomes the writer, and a small sync keeps Mongo current so the old host dashboard still shows today's bookings. Then Phase 4 replaces that dashboard and the sync stops.

### Gate — Phase 3 is done when

- [ ] A booking, a payment, a payout and a refund have all completed end-to-end in Stripe **test** mode
- [ ] The same, in **live** mode, for one real €1 booking you make yourself
- [ ] Two concurrent booking requests for the same dates: one succeeds, one gets a clean 409
- [ ] A commission invoice generated for a test host shows 6 %, no VAT, and "Nie sme platiteľmi DPH."
- [ ] Webhook replay of the same event twice changes nothing the second time

---

## Phase 4 — Host tools and channel sync (Weeks 19–24)

### 4.1 Host dashboard

Listing editor, calendar, bookings, payouts, billing details, Stripe onboarding. The largest surface by volume but the lowest risk — hosts are a small, reachable group you can support through the change directly.

Split `AddAccommodation.js` (3,708 lines) into a multi-step form with per-step server-side validation. Autosave to a draft row.

### 4.2 iCal sync — do this properly

The current importer has four separate defects (audit C-06, H-04, H-05, and no deletion pass). Rebuild it as its own Render Cron Job:

* **Fetching:** the guarded fetcher from patch `005` — https only, DNS resolved and checked against private ranges, redirects re-validated per hop, timeout and size cap. Port it as-is.
* **Parsing:** replace `ical@0.8` (last published 2019) with `node-ical` or `ical.js`, and **expand `RRULE` properly, honouring `EXDATE`**. Recurring blocks are currently imported as a single occurrence with the rest silently dropped — that is a direct route to a double booking.
* **Reconciling:** key on `UID`. Present and unchanged → skip. Present and moved → update the range. **Absent → release the block.** The unique index on `(feed_id, ics_uid)` makes this straightforward.
* **Concurrency:** Render's cron guarantee handles it. No lock code needed.
* **Interval:** every 30 minutes rather than 3 hours. That is your realistic double-booking window against Airbnb and Booking.com, and 3 hours is too wide.

Export: token in the URL, `SUMMARY: Reserved` with no guest name.

### 4.3 Admin

Bookings, hosts, invoices, DAC7 export, the complaint queue from §1, and the host-deactivation review. Keep it plain — this is internal.

### Gate — Phase 4 is done when

- [ ] A host completes onboarding, publishes a listing and receives a payout, all on the new app
- [ ] An Airbnb feed with a recurring block imports every occurrence
- [ ] Cancelling on Airbnb releases the block here within 30 minutes
- [ ] A host with two Stripe accounts routes two listings to two different accounts correctly

---

## Phase 5 — Cutover and decommission (Weeks 25–28)

1. Remove the `fallback` rewrite from `next.config.js`. Anything still 404ing was a route you forgot — find it in the logs, not from your users.
2. Run the final ETL. Freeze the Mongo writer.
3. Keep the Express service running but unrouted for 30 days as a read-only escape hatch.
4. Export a final Mongo dump to cold storage, then delete the cluster.
5. Delete `.migration-backup/` from the repository.

### Then, and only then

* Multi-language (SK/EN/DE/PL — Polish and German guests are your neighbours)
* Reviews with the moderation you will need once you have volume
* Host analytics
* PWA / offline listing viewing

---

## Things I would not do

**Do not add Elasticsearch or Meilisearch.** Postgres full-text with `unaccent` and `pg_trgm` handles this comfortably to ~50,000 listings. Adding a search cluster is a second database to keep in sync and a second thing to be woken up by.

**Do not add a message queue yet.** Render Cron Jobs plus a `jobs` table in Postgres covers everything you have. `pg-boss` if you outgrow that — still no new infrastructure.

**Do not build a mobile app.** A fast PWA beats a slow native app, and you have neither the volume nor the capacity for two more codebases.

**Do not keep MongoDB "just for some things."** Two databases means two consistency models and no foreign keys between them. One Postgres.

**Do not do Phases 2 and 3 in parallel.** You are one person. Search shipping while checkout is half-migrated is how you end up with a site where guests can find a listing and not book it.

---

## Where the risk actually is

| Risk | Why it bites | What to do |
|---|---|---|
| Money migration | A bug here loses real euros and real trust | Phase 3 gate: run one real €1 booking through the live path yourself before any guest does |
| Interval semantics | Half-open vs closed changes every stored date; get it wrong and you free nights that are booked | `05-verify.ts` asserts no currently-booked night became available. Run it before and after. |
| Scope creep | "While we're rewriting, let's also…" is how six months becomes eighteen | The new app ships the *same features*, better. New features start after Phase 5. |
| Host disruption | New calendar URLs, new dashboard, changed commission | Communicate each one a week ahead. Your hosts are a small enough group to email personally — that is an advantage, use it. |
| Solo burnout | 6 months is a long time alone | Ship something user-visible every 2 weeks. Phase 2 exists partly for this reason. |

---

## First five things to do, in order

1. Rotate the Upstash Redis credential. Today.
2. Apply and deploy patch batch 1.
3. Run the three VAT queries in `audit/DECISIONS-NEEDED.md` §2 and talk to your accountant if any invoice went out with a tax line.
4. Create `putko-db` on Render in Frankfurt, enable the four extensions, and write the failing overlap test before the constraint exists.
5. Stand up the Next.js app with the fallback rewrite, serving one page.

Step 4 is the one worth doing carefully. Watching Postgres reject an overlapping booking that your application code cheerfully allowed is the moment this rebuild justifies itself.
