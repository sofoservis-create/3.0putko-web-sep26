# Implementation prompt — Putko listing detail page restructure

Copy everything below the line into Claude Code / Replit.

---

You are working on the Putko listing detail page (Next.js 15, TypeScript, Tailwind, shadcn/ui).

This is a **restructure of an existing page**, not a rewrite. Reorder and merge existing sections, fix the specific defects listed, and change nothing else.

## Do not change

- The photo gallery component on any breakpoint. Layout, aspect ratios, thumbnail count, "Viac fotky" button, back button, virtual tour button — all stay exactly as they are.
- The global navigation header and the footer.
- The mobile sticky reservation bar and the desktop sticky reservation sidebar as components. Their contents change (see §3) but their position and behaviour do not.
- Database schema. `drizzle-kit push` is forbidden in this project — if a change appears to need a schema modification, stop and report it instead of altering the schema.

## 1. New section order

The main content column currently renders 10 sections. Reorder to the following. Two merges reduce the count to 8.

| New # | Section | Was | Action |
|---|---|---|---|
| 1 | Prehľad (listing overview) | 1 | Add highlights row (§2) |
| 2 | Dostupnosť a cena | 5 + 6 | **Merge** Ceny izieb + Dostupnosť; render inline on mobile (§3) |
| 3 | Informácie o pobyte | 2 | Remove duplicated identity block (§4) |
| 4 | Vybavenie | 3 | Group by category (§5) |
| 5 | Recenzie | 8 | **Move up**, now before host (§6) |
| 6 | Miesto | 9 | **Move up**, approximate location only (§7) |
| 7 | Informácie o hostiteľovi | 7 | Unchanged content, now after reviews |
| 8 | Veci, ktoré by ste mali vedieť | 4 + 10 | **Merge** Pravidlá ubytovania into this section (§8) |

Below the main column, replace the "Preskúmajte iné ubytovania podľa typu" carousel with a **Podobné ubytovania** carousel (§9).

Apply the same order on mobile, tablet and desktop.

## 2. Highlights row (new, inside Prehľad)

Directly under the title/rating/location line, render a row of exactly three highlights, generated from data that already exists on the listing. Priority order, take the first three that apply:

1. Overený hostiteľ — if the listing is verified
2. Vysoko hodnotené — if rating ≥ 4.8 and review count ≥ 5
3. Rýchla odpoveď — if host response time is under a few hours
4. 100 % miera odpovede — if host response rate is 100 %
5. Klimatizácia / Práčka / Parkovanie / Wi-Fi — first matching high-value amenity

Each is an icon + one short label. No card borders, no background fills. If fewer than three apply, render only those that do; do not pad.

## 3. Dostupnosť a cena (merged section)

Merge the current `Ceny izieb` and `Dostupnosť` sections into one, positioned second.

Contents, in this order:

1. Two-month availability calendar with the existing available / occupied / selected states and legend.
2. Price breakdown, live-updating when dates are selected:
   - `€60 × 3 noci — €180`
   - Per-person or seasonal adjustments as separate lines, only when they apply
   - `Poplatky Putko — €0`
   - `Spolu — €180` in bold
3. Before dates are selected: show the base nightly rate and the text `Vyberte dátumy a uvidíte celkovú cenu`.
4. Keep the existing seasonal-period, per-person and min/max-stay tier rows — they render below the breakdown, unchanged.

**The calendar must render inline on mobile and tablet.** Remove the `hidden md:block` (or equivalent) that currently restricts it to desktop. The reservation sheet opened from the sticky bar stays as a secondary path; both must read from the same selected-dates state so a date picked in one is reflected in the other.

On desktop, keep the inline calendar and keep the sidebar. The sidebar gains the same price breakdown described above.

Remove the sentence `Pozrite si to a zavolajte majiteľovi hneď teraz.` entirely. Move the no-markup claim into the breakdown as the `Poplatky Putko — €0` line.

## 4. Informácie o pobyte

Remove from this section: the property photo, the property-type label, and the accommodation title. All three already appear in Prehľad directly above.

Keep: the description, bed-by-bed sleeping layout, room list, special-offer banner.

Split the capacity facts: guests / bedrooms / bathrooms stay in Prehľad; only the bed and room breakdown lives here.

Truncate the description to 4 lines with a `Zobraziť viac` expander.

## 5. Vybavenie

Group amenities by category with a small heading per group. Category order:

1. Kúpeľňa
2. Kuchyňa a jedáleň
3. Kúrenie a chladenie
4. Internet a pracovňa
5. Parkovanie
6. Vonkajšie priestory
7. Ostatné

Within the collapsed view, show the 8 highest-value amenities first, drawn from across all groups, in this priority: Wi-Fi, Parkovanie, Klimatizácia, Kuchyňa, Práčka, Umývačka riadu, Balkón/terasa, Výťah.

Also render amenities the property does **not** have, struck through and muted, in the expanded modal only. Limit to the same high-value list above.

Replace the bordered card per amenity with a plain icon + label row. Two columns on mobile, three on desktop.

## 6. Recenzie

Add above the existing review list:

- A keyword chip row, `Čo hostia najčastejšie spomínajú`, aggregating the existing per-review 👍/👎 tags across all reviews. Show the top 5 positive and top 3 negative, each with a count.
- The category rating bars, with Slovak labels (§10).

Reconcile the headline score with the category averages. If they are computed differently, either display the same value in both places or label the headline (`Celkové hodnotenie`) so the difference is explicit.

Standardise the load-more button to `Zobraziť ďalšie recenzie`.

## 7. Miesto

Do not render the exact street address before a booking is confirmed. Show:

- District and city (`Staré Mesto, Košice`)
- Distance to a recognisable anchor where computable (`900 m od Hlavnej ulice`)
- A map with an approximate-area circle (roughly 300 m radius) centred near, but not on, the property — not a precise pin

Reveal the exact address only in the confirmed-booking view.

Fix the map: the current fallback `Mapa momentálne nie je dostupná` is rendering in production because the browser API key is missing. Make the key available to the client build. Keep the fallback for genuine failures, but it must not be the normal state.

Also add the district to the location line in Prehľad, replacing the current `Košice, Slovensko`.

## 8. Veci, ktoré by ste mali vedieť (merged)

Absorb the current `Pravidlá ubytovania` section. Final contents, in order:

1. Čas prihlásenia / Čas odhlásenia
2. Pravidlá domu — pets, parties, smoking, pet fee, additional host rules
3. Storno podmienky
4. Poznámky od hostiteľa

Delete the standalone Pravidlá ubytovania section and its subtitle `Pravidlá domu platia v ubytovaní`.

Where a check-in or check-out time is a single value, render it as a single value. `10:00 – 10:00` is currently rendering for identical bounds.

## 9. Podobné ubytovania

Replace the property-type carousel with comparable listings: same city, capacity within ±1 guest, price within ±30 %, excluding the current listing. Show 4 cards on desktop, horizontally swipeable on mobile with a partial next-card preview (keep the existing carousel component and behaviour, change only the data source and the heading).

Heading: `Podobné ubytovania v okolí`.

## 10. Copy and localisation fixes

All of these are visible in production and must be fixed as part of this work.

| Location | Current | Fix |
|---|---|---|
| Review categories | `Location`, `Communication`, `Equipment`, `Cleanliness`, `ClientCare`, `WiFi`, `Activities`, `PriceQuality` | `Poloha`, `Komunikácia`, `Vybavenie`, `Čistota`, `Starostlivosť o hosťa`, `Wi-Fi`, `Aktivity`, `Pomer cena/kvalita` |
| Price section | `Base rate` | `Základná cena` |
| Host section | `March 2025` | `marec 2025` |
| Cancellation policy | `100% if cancelled at least 7 days before check-in` etc. | Slovak equivalents |
| Review dates | `7 Feb 2026` | `7. feb 2026` |
| Reviews | Test data: `Very good 2` | Remove from production data |
| Load-more buttons | `Ukáž mi viac` | `Zobraziť ďalšie recenzie` — all CTAs use `Zobraziť …` |

Audit for any other English strings reaching the Slovak UI. Raw camelCase database keys must never render as user-facing labels.

## 11. Layout and spacing

**Mobile / tablet:**
- Vertical spacing between major sections: 32px (currently 16px)
- Internal spacing within a section: 16px (unchanged)
- The current 16px between sections gives the same rhythm inside and between sections, so section boundaries are invisible

**Desktop:**
- Section spacing stays at 40px

**All breakpoints:**
- Remove the horizontal-scroll stat chip row in Prehľad. Replace with a single wrapping text line: `4 hostia · 1 spálňa · 2 postele · 1 kúpeľňa`. Core facts must never require a horizontal gesture or truncate mid-word.
- Reduce card-in-card nesting. A section containing cards which themselves contain cards (currently the host section) flattens to one level.

## 12. Bug fixes

1. **Modal z-index:** the mobile sticky reservation bar renders above open modals and covers the `Zavrieť` button of the full-amenities sheet. Hide the reservation bar whenever any sheet or modal is open.
2. **Sticky header on detail pages:** replace the global search pill with a compact contextual bar — back arrow, truncated title, rating, share, save — that appears only after the user scrolls past the gallery. The header plus reservation bar currently consume roughly 250px of vertical space permanently.
3. **Persistent back affordance:** the gallery's back button scrolls away and nothing replaces it. The contextual header in (2) covers this.

## Acceptance criteria

- [ ] Sections render in the §1 order on all three breakpoints
- [ ] Availability calendar is visible inline on mobile without opening a sheet
- [ ] Selecting dates updates a price breakdown showing nights, line items and total
- [ ] Property title, type label and photo each appear exactly once on the page
- [ ] Amenities are grouped, and the collapsed view leads with high-value items
- [ ] Reviews appear before host information
- [ ] No exact street address is rendered before booking confirmation
- [ ] Map renders; the fallback is not the default state
- [ ] Pravidlá ubytovania exists only inside Veci, ktoré by ste mali vedieť
- [ ] No English strings and no camelCase keys in the Slovak UI
- [ ] Reservation bar does not overlap any open modal
- [ ] Photo gallery is byte-for-byte unchanged
- [ ] No schema changes

Report anything that cannot be implemented without a schema change rather than working around it.
