# Putko — design & UX audit

A page-by-page review of the existing site's structure, flow and content, done
before rebuilding it — so the rebuild doesn't faithfully reproduce the
problems along with the good parts.

**Scope:** information architecture, user flow, content gaps and mobile
usability. This is separate from `audit/REPORT.md`, which covers security and
correctness. Where a finding here has a code cause, it's cross-referenced.

**Evidence:** the screenshots in `screenshots/` and `audit/*.jpg`, plus the
page source under `.migration-backup/frontend/src/app/`. Every claim below
names where it comes from.

**Verdict up front:** the visual design is genuinely good and should be kept
almost as-is — the typography, the green palette, the card language, the trust
badges, the "price you see is the price you pay" positioning are all strong.
The problems are structural: **there is no way to browse**, only to search;
the headline numbers don't match reality; and the desktop search page gives
40% of the screen to a broken map.

---

## Severity key

| | |
|---|---|
| **BLOCKER** | Actively costs trust or breaks a core flow. Fix before launch. |
| **HIGH** | Materially suppresses conversion or discovery. |
| **MEDIUM** | Worth fixing in the rebuild; not urgent on its own. |
| **LOW** | Polish. |

---

# 1. Home page (`/`)

**Section order**, from `src/app/page.js:226–281`:

```
Header / MobileHeader
AnimatedHero              ← headline, trust chips, search bar
StickySearchMobile
SavingsComparisonStrip    ← "Rovnaké ubytovanie. Lepšia cena."
PainPointSection
SectionGridCategoryBox    ← 8 city tiles  (see D-03)
BenefitsSection
GridFeaturePlaces         ← "Odporúčané ubytovanie"
TestimonialsSection
SectionHowItWork
GridFeatureBooking
PropertyBanner
SectionFAQ
Footer
```

### D-01 — BLOCKER · The headline numbers are not true

The hero claims **"1433+ overených ubytovaní"** and **"4.3 · 7250+ hodnotení"**
(`task-39-desktop.jpg`). The search page, one click later, says
**"6 overených ubytovaní"** (`discovery-desktop.jpg`) — while *also* still
displaying "Slovensko · 1 433 ubytovaní" directly above it.

So the same screen contradicts itself, and the gap is not marginal: 1,433
claimed against 6 real.

This is the single most damaging thing on the site. A visitor who notices it
stops believing everything else — including the genuinely true and genuinely
differentiating "€0 servisný poplatok". It is also very likely an unfair
commercial practice under **§ 8 zákona č. 250/2007 Z. z. o ochrane
spotrebiteľa** (misleading claims about the extent of a service), which is a
regulator problem, not just a trust problem.

**Fix:** every count on the page comes from a live `COUNT(*)`. If the real
number is small, say something true that doesn't depend on volume — *"Každé
ubytovanie osobne overené naším tímom"* is a stronger claim at 6 listings than
a fake 1,433 ever is. Small and honest beats large and false, and it's the
claim you can actually defend.

### D-02 — HIGH · You cannot browse. You can only search.

Every route into inventory from the home page requires the visitor to already
know where they want to go and type it: the hero search bar
(`KAM SA CHYSTÁTE?`), the sticky mobile search, and the header CTA all lead to
the same empty text input.

That is the wrong default for this product. Someone booking a *chata* for a
long weekend is usually deciding **where** by browsing — "somewhere in the
Tatras", "near a thermal spa", "somewhere with a hot tub within 2 hours of
Bratislava". Airbnb and Booking both lead with inspiration for exactly this
reason. Putko leads with a blank field.

### D-03 — HIGH · The one browse module uses the wrong taxonomy, and is fake

`components/GridCategoryBox.js:17` defines `DEMO_CATS` — eight hardcoded tiles:
Bratislava, Košice, Banská Bystrica, Trenčín, žilina, prešov, and two more.

Three problems, in increasing order of importance:

1. **It's hardcoded demo data** with `count: 0` on every entry, so no tile can
   show how many places are actually available.
2. **Casing is inconsistent** — `"žilina"` and `"prešov"` lowercase against
   `"Bratislava"` and `"Košice"` capitalised. Visible on screen.
3. **These are administrative regional capitals, not holiday destinations.**
   This is the real issue. Nobody rents a chalet in order to visit Trenčín's
   city centre. Slovak short-term rental demand is concentrated in mountains,
   water and heritage — none of which the current grid names.

### D-04 — HIGH · Missing: regions and landmarks (the gap you identified)

There is no regional browse, no destination pages, and no landmark proximity
anywhere on the site. Confirmed by grep: `Tatry` appears **once** in the entire
frontend, `Liptov` once, `Štrbské`/`Jasná`/`Donovaly`/`Slovenský raj` **zero
times**.

This is simultaneously the biggest UX gap and the biggest SEO gap. "Chaty
Vysoké Tatry" and "ubytovanie Liptov" are the searches that actually happen;
the site currently ranks for none of them because no page exists to rank.

**Proposed structure** — two layers, because they answer different questions:

**Layer 1 — Regions** (administrative, complete, good for SEO breadth). The 8
kraje, already modelled as tables in `lib/db/src/schema/regions.ts` and waiting
to be seeded:

> Bratislavský · Trnavský · Trenčiansky · Nitriansky · Žilinský ·
> Banskobystrický · Prešovský · Košický

**Layer 2 — Destinations** (how people actually think). Curated, editorial,
each with a real page:

| Type | Examples |
|---|---|
| Mountains | Vysoké Tatry, Nízke Tatry / Jasná, Malá Fatra / Terchová, Orava, Slovenský raj |
| Water & thermal | Liptov / Bešeňová, Aquacity Poprad, Rajecké Teplice, Podhájska, Vadaš Štúrovo |
| Heritage (UNESCO) | Banská Štiavnica, Spišský hrad, Vlkolínec, Bardejov, Levoča |
| Cities | Bratislava, Košice |
| Activities | Lyžovačka, Wellness pobyt, Turistika, Rodinná dovolenka, Pobyt so psom |

Each destination page: hero image, one honest paragraph, live listing count,
map, and the listings themselves. That is a real page that ranks, and a real
answer to "kam ideme cez víkend?".

The database can already do the proximity part — `listings.geog` is a PostGIS
`geography(Point, 4326)` with a GiST index (`lib/db/drizzle/0002_*.sql`), so
"chaty do 20 km od Štrbského plesa" is one `ST_DWithin` query. The data layer
is ready; nothing consumes it yet.

### D-05 — MEDIUM · The hero mascot crowds the actual task

The lynx in kroj (`task-39-desktop.jpg`) is charming and genuinely
distinctive — keep it. But at desktop it occupies roughly the right-hand 45%
of the hero and pushes the search bar to the lower third, below the fold on
shorter laptop screens. The mascot is competing with the primary action
instead of framing it.

**Fix:** scale it down or move it behind the search bar rather than beside it.
Keep the character; give the search bar the centre.

### D-06 — MEDIUM · Thirteen sections, no destination content in any of them

The page has plenty of *persuasion* — savings strip, pain points, benefits,
testimonials, how-it-works, FAQ — and no *inventory* beyond one "Odporúčané
ubytovanie" row. It argues at length for why to use Putko before showing what
Putko has.

**Fix:** move regions/destinations directly under the hero, before the
persuasion sections. Show the goods, then argue.

---

# 2. Search results (`/listing-stay-map`)

### D-07 — BLOCKER · The map is dead, and it occupies 40% of the desktop page

`discovery-desktop.jpg` shows the entire right-hand column rendering
**"Mapa nie je dostupná / Ubytovanie si môžete prehľadávať v zozname"**.

This is the missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (noted in
`.agents/memory/putko-map-provider.md`, and the empty-state behaviour is
deliberate — the decision to keep Google Maps rather than swap to
OpenStreetMap was explicit). But the result today is that the most valuable
region of the widest viewport is a permanent apology.

For an accommodation site, map-based browsing is not decoration — it's a
primary discovery mode, and it's the natural home for the landmark proximity
described in D-04.

**Fix:** add the API key. If that's blocked on billing, collapse the map
column entirely and give the space to listings rather than to an error
message.

### D-08 — HIGH · Filters imply a catalogue that isn't there

The filter bar offers `Typ miesta ▾`, `Izby a postele ▾`, `Viac filtrov (3)`,
`Triediť` — a full filtering apparatus over **6 results**. Filtering six items
is friction, not utility.

Worse, **`Viac filtrov (3)` shows three filters already active** on first
load, which the visitor didn't set. If those defaults are what reduces the
catalogue to 6, that is actively hiding inventory.

**Fix:** no filters applied by default, ever. Progressively reveal the filter
bar once results exceed a threshold (~20).

### D-09 — MEDIUM · Sort doesn't offer what the product promises

The business rule is that default ranking should be
**availability → distance → price**. The old code sorts on `{ recommended: -1 }`
only (`audit/REPORT.md` M-06), and distance ranking is impossible in the old
stack because no geospatial index exists (M-07).

The new schema fixes the capability. The UI needs to expose it: sort by
distance from a chosen point, which only becomes meaningful once D-04's
destinations give the user a point to measure from.

---

# 3. Listing detail (`/listings/[slug]`)

Reference: `audit/listing-5ka-mobile.jpg`.

**This page is the strongest thing on the site.** The gallery, the category
and `• Overený` chips, the serif title, the amenity chip grid, the host row
with verified avatar, and the sticky `€45 /noc` + `Požiadať o rezerváciu` bar
are all well judged. Very little should change.

### D-10 — HIGH · The price is unbookable until you leave the page

The sticky bar shows **"€45 /noc"** with **"Vyberte dátum"** underneath — but
no dates are selected, so the visitor cannot see what their actual stay costs
without another interaction, and the headline figure is a per-night rate that
their real total will exceed.

Given the site's entire positioning is *"Cena, ktorú vidíte, je cena, ktorú
zaplatíte"*, showing an unachievable per-night number on the most important
page undercuts the one claim the brand is built on.

**Fix:** default to a plausible stay (next free weekend), show the true total
for it, and let the visitor adjust. Total first, per-night secondary.

### D-11 — MEDIUM · The verification badge doesn't say what it means

`• Overený` and `Overené Putkom` appear on every listing and card, and
verification is a central differentiator — but nothing explains what was
verified. Photos? The owner's identity? The property itself?

**Fix:** make the badge a tooltip/expandable that states exactly what the team
checked. A specific claim is far more persuasive than a generic tick.

### D-12 — MEDIUM · No landmark context on the listing

The listing gives an address and (when working) a map pin, but never answers
the question the guest actually has: *how far is it from the thing I'm coming
for?* "18 km to Jasná, 9 km to Demänovská jaskyňa slobody" is high-value,
trust-building, and — with `ST_Distance` against a curated landmark table —
essentially free to compute.

### D-13 — MEDIUM · podnikateľ / nepodnikateľ badge is required and absent

A binding business rule requires a visible declaration of whether the host is
a business or a private individual. The field exists on the host record
(`billingSubjectType`) and drives invoicing, but is rendered nowhere on the
listing (`audit/REPORT.md` L-02).

---

# 4. Booking & checkout (`/Checkout`, `/book-now`, `/PayPage`)

### D-14 — HIGH · Three overlapping routes for one flow

`/Booking`, `/book-now`, `/Checkout` and `/PayPage` all exist as separate
top-level routes. Whatever the history, four entry points into one purchase is
a maintenance and analytics problem, and makes it very hard to reason about
where people drop out.

**Fix:** one route, explicit steps: `/rezervacia/[id]/{detaily,platba,potvrdenie}`.

### D-15 — HIGH · "Request to book" isn't visually distinguished from instant booking

The listing CTA reads **"Požiadať o rezerváciu"** (request), which is correct
for a host without completed Stripe onboarding — but a guest cannot tell from
the search results which listings will charge them immediately and which will
make them wait for host approval. Two very different experiences, presented
identically until the final screen.

**Fix:** badge the difference on the card. "Okamžitá rezervácia" vs
"Na požiadanie" — Airbnb's Instant Book distinction, which exists precisely
because this matters to how people choose.

### D-16 — MEDIUM · Guest age (18+) is never asked

A binding rule; no field anywhere in the flow (`audit/REPORT.md` M-04). The
new `bookings` schema has `guestDateOfBirth` / `guestConfirmedAdultAt` ready.

---

# 5. Host-facing (`/Profile`, `/host/onboard/*`)

### D-17 — HIGH · Listing creation is one 3,708-line form

`Profile/component/AddAccommodation.js` is a single component of 3,708 lines.
Whatever it looks like, a host adding a property faces one enormous form.
Abandonment on long single-step forms is severe, and every abandoned host is
lost inventory — the thing the site most needs.

**Fix:** multi-step wizard, autosaving to a draft row after each step, with
progress shown. A host should be able to stop after step 2 and come back.

### D-18 — MEDIUM · Nothing explains the money before onboarding

Commission, payout timing and the invoice a host receives are the three things
a prospective host most wants to know, and the footer's `Cenník` link is the
only route to any of it. There's no worked example — *"Guest pays €100 → you
receive €94 → Putko invoices €6 commission monthly"* — at the point of
decision.

---

# 6. Cross-cutting

### D-19 — HIGH · The footer has no destination links

`footer-desktop-after.png`: three columns — PRE HOSTÍ, PRE HOSTITEĽOV, O PUTKU
— and no destinations at all.

For a regional accommodation marketplace this is the single most valuable
piece of unused real estate on the site. A footer block of ~24 destination and
region links appears on every page and is exactly what search engines use to
discover and weight those pages. It costs one component.

### D-20 — MEDIUM · Slovak-only, in a market with obvious foreign demand

There's a language switcher (SK flag) and `locales/en.js` exists, but the
default and effectively only experience is Slovak. Czech, Polish, Hungarian,
German and Austrian visitors are a large share of Slovak tourism, and the
Tatras in particular draw heavily from Poland and Czechia.

Not urgent — but the URL structure decided in the rebuild determines whether
this is cheap or expensive later. Decide the locale routing now, populate it
later.

### D-21 — MEDIUM · No empty, loading or error states for a small catalogue

With 6 listings, most filter combinations return nothing. There's no designed
"no results" state offering nearby alternatives or relaxed filters — the
highest-value moment to retain someone, since a dead end here means they
leave for Booking.

### D-22 — LOW · Bottom nav labels don't match the site's own vocabulary

Mobile bottom nav reads `Explore / Login / Menu` (`discovery-mobile.jpg`) —
English labels in an otherwise fully Slovak interface, and "Explore" promises
browsing the site doesn't offer (D-02).

**Fix:** `Objaviť / Prihlásiť / Menu`, and make "Objaviť" actually lead to the
destination browse from D-04.

---

## What to keep, unchanged

Worth stating explicitly so the rebuild doesn't lose it:

- The **green palette** — `#319a7a` primary, `#1e4636` dark (counted from
  `globals.css`: 64 and 36 uses)
- The **serif display type** for titles against clean sans body
- The **"Cena, ktorú vidíte, je cena, ktorú zaplatíte"** positioning and the
  `€0 servisný poplatok` / `Finálna cena · bez poplatkov` badges — this is a
  real, defensible differentiator against Booking.com's fee structure, and it
  is the best thing about the brand
- The **lynx mascot** (sized down per D-05)
- The **listing card** composition — photo carousel, heart, verification badge,
  price, rating
- The **listing detail page layout** almost in its entirety
- The **collapsing sticky header** (`footer-desktop-after.png` shows the
  scrolled state: search collapses to `Kam idete?` + `Hľadať`)

---

## Suggested order of work

Sequenced by value per unit of effort, not by page:

| # | Work | Addresses |
|---|---|---|
| 1 | Real counts everywhere; delete or substantiate the 1433/7250 claims | D-01 |
| 2 | Destination + region browse: home section, footer block, destination pages | D-02, D-03, D-04, D-19, D-22 |
| 3 | Search page: no default filters, fix or remove the map | D-07, D-08 |
| 4 | Listing page: real total price, landmark distances, host-type badge | D-10, D-12, D-13 |
| 5 | One booking route, instant-vs-request distinction, age field | D-14, D-15, D-16 |
| 6 | Host listing wizard, money explainer | D-17, D-18 |

Items 1 and 2 together turn the site from a search box into something you can
walk into — and they're also what makes it findable at all.
