# Decisions needed from you

Ten items where the right fix depends on a business, legal or product call that an audit should not make on your behalf. Each states the finding, the options, and my recommendation. Nothing here has a patch — the rest do.

---

## 1. What is a "complaint", and what does an open one do?

**Finding H-06.** The payout rule you gave me is: transfer at check-in + 24 h *if and only if* there is no open complaint **and** the host has ≥3 completed bookings; otherwise check-out + 24 h.

Patch `016` implements the ≥3-completed-bookings condition and the check-out fallback. It **cannot** implement the complaint condition, because there is no complaint anywhere in this system — no model, no field, no endpoint, no admin screen. `grep -ri complaint` across the whole repository returns nothing. The nearest thing is a Stripe `charge.dispute.created` webhook (`PaymentController.js:442`), which is a chargeback: a bank-initiated event that arrives weeks later, not a guest saying "the heating was broken".

Until a complaint exists as data, money will keep going out on disputed stays and the rule stays unenforceable.

**Options**

| | Approach | Cost | Consequence |
|---|---|---|---|
| **A** | Minimal complaint record: guest opens one from their booking; a `Complaint` document with `reservationId`, `status: open/resolved`, and a payout block while open. | ~2 days | Rule becomes enforceable. Needs an admin resolution screen or complaints never close and hosts are never paid. |
| **B** | Reuse the existing dispute fields — treat `disputeStatus` as the complaint signal. | ~1 hour | Nearly worthless: a chargeback lands long after the payout window and only for card disputes. |
| **C** | Ship without it; rely on the check-out anchor plus the ≥3 rule. | 0 | The window narrows to check-out + 24 h for new hosts, which is where most complaints originate anyway. Established hosts are unprotected. |

**Recommendation: A, but launch on C.** The ≥3-completed-bookings gate already moves the risk to the population that matters. Build the complaint record before you have enough established hosts for the check-in window to be the common case — say, before month three.

**Also decide:** does an open complaint *hold* the payout indefinitely, or *delay* it to check-out + 7 days? An indefinite hold means one unresolved complaint strands a host's money with no deadline, which is its own problem.

---

## 2. VAT already charged on issued commission invoices

**Finding C-16.** Every monthly commission invoice issued so far carries a 23 % VAT line (`utils/superfaktura.js:112`), while Putko s. r. o. is not a VAT payer. Patch `015` stops it happening again. It does nothing about invoices already in SuperFaktúra.

Under **§ 69 ods. 5 zákona č. 222/2004 Z. z.**, whoever states VAT on an invoice is liable for it — whether or not it was collected, and whether or not they are registered. Hosts who *are* VAT payers may also have deducted that VAT on their own returns, which makes this their problem too.

**This is not a code decision.** It needs your accountant, and probably a tax advisor.

**What to establish first**, because it changes the answer completely:
* How many invoices were issued with a tax line, over what periods? (`db.invoices.find({ status: { $in: ["issued","emailed","paid"] } })` — `vatAmountCents` is stored per invoice.)
* Was `INVOICE_DRY_RUN` on for any of them? (`config/payments.js:172` — default is **false**, so live issuance is the default state.)
* Was `INVOICE_TEST_EMAIL_OVERRIDE` set? (`:190` — if so the documents exist in SuperFaktúra but hosts never received them, which is a materially better position.)

**Recommendation:** run those three queries before anything else. If the answer is "none issued", this is a near miss and patch `015` closes it. If invoices went out, corrective documents (opravné faktúry) and a conversation with the tax office are the path, and it should start this week rather than after launch.

---

## 3. Host cancellation: full refund, or the guest's policy tier?

**Finding H-07.** The code applies the *guest's* cancellation tier when a **host** cancels, and says so explicitly:

> `Controllers/CancellationController.js:135` — *"Note this differs from spec §7 ("host cancellation = full refund") and from the Booking/Airbnb convention, by explicit product decision on 2026-08-04."*

That is a deliberate decision by someone, recorded honestly. It also contradicts the rule you gave me, so I am flagging rather than silently overriding it — though patch `026` does implement the full refund, because that is what you specified.

The practical effect of the current code: a host cancels a Strict-policy booking three days before arrival and the guest gets **€0** and no accommodation. As an intermediary, Putko is the party the guest will complain to, and § 3 zákona č. 250/2007 Z. z. o ochrane spotrebiteľa is not friendly to it.

**Options**

| | Approach | Consequence |
|---|---|---|
| **A** | Full refund on host cancellation (patch `026`). | Matches every comparable platform and your stated rule. Hosts bear the cost of their own cancellations, which is the point. |
| **B** | Keep the current behaviour. | Whoever made the 2026-08-04 decision had a reason I cannot see from the code. If it was "hosts will not accept the risk", that is a real constraint — but it is being paid for by guests. |
| **C** | Full refund plus a fee charged to the host. | Airbnb's model. Needs a mechanism to charge a host, which does not exist here. |

**Recommendation: A.** If B was chosen for a reason, that reason should be written down somewhere other than a code comment, and the cancellation terms shown to guests must state it plainly before they pay.

Patch `026` also adds the **3 cancellations in 12 months → deactivation** rule, which is absent entirely. Decide whether deactivation should also unpublish existing listings (the patch sets `stripeEnabled: false`, which does) and whether it is reversible by an admin (it is — `deactivatedAt` is a field, not a deletion).

---

## 4. The date interval is closed, not half-open — and fixing it needs a migration

**Findings H-08 and H-09.** Two related problems in one place.

`dayKeys` (`utils/calendarHold.js:21`) uses `eachDayOfInterval`, which **includes the end date**, and native bookings store `endDate = checkOutDate`. So a stay from 10 to 12 September occupies the nights of the 10th, 11th **and 12th** — but the guest leaves on the 12th, and that night is sellable. Back-to-back bookings are impossible. This is pure lost inventory, on every listing, permanently.

Worse, the iCal importer uses the **opposite** convention: `rawEnd.setDate(rawEnd.getDate() - 1)` at `AccommodationController.js:1445` converts the exclusive `DTEND` into an inclusive last night. So `occupancyCalendar` holds rows written under two different interval conventions, and a single query cannot be correct for both.

Separately (H-09), availability keys are built from the raw stored instant in server-local time, while cancellation deadlines and payouts go through `calendarDateUtc` (`utils/timezone.js:42`), which snaps to the intended calendar day. The two subsystems can disagree about which day a booking falls on.

**I did not patch this**, because the correct fix rewrites the meaning of every `endDate` already in the database, and getting it wrong frees dates that are genuinely booked.

**Options**

| | Approach | Migration | Risk |
|---|---|---|---|
| **A** | Half-open `[checkIn, checkOut)` everywhere. Native rows already store the checkout date, so they need no change; ICS rows need `endDate += 1 day`; `dayKeys` drops the last day. | One pass over `occupancyCalendar` rows where `source === 'ics'`. | Medium. Reversible. Correct end state. |
| **B** | Closed `[checkIn, lastNight]` everywhere. ICS rows are already right; native rows need `endDate -= 1 day`. | One pass over `source === 'reservation'` rows. | Same size. But every other system in the world — iCal, Stripe, Postgres `daterange` — is half-open, so this fights the grain forever. |
| **C** | Leave it. | None | You keep losing one sellable night per booking and cannot do back-to-back stays. On a 40-listing catalogue at 50 % occupancy that is roughly 7,000 lost room-nights a year. |

**Recommendation: A.** Run it as: (1) add a `intervalConvention: 'half-open'` marker to migrated rows, (2) migrate ICS rows, (3) switch `dayKeys`, (4) verify against a snapshot that no currently-booked night became free. Do it in the same change as the H-09 timezone normalisation, since both touch the same function, and do it **before** patch `011` goes live — `011` encodes the current convention deliberately so it stays a pure atomicity fix.

---

## 5. Meta Conversions API and consent

**Finding C-12.** Patch `008` gates the browser-side Meta Pixel and Microsoft Clarity behind consent. It does **not** gate the server-side Conversions API (`ReservationController.js:252`, `PaymentController.js:564`), which fires on every booking and payment and sends hashed email plus the **raw client IP**.

A cookie banner cannot stop a server-side call. The consent decision has to travel with the booking, and that is a schema and flow change, not a component change.

**Options**

| | Approach | Effect on ad measurement |
|---|---|---|
| **A** | Persist the visitor's consent on the reservation; skip `sendEvent` without it. | Conversions drop by however many visitors decline — typically 30–60 % in the EU. Honest. |
| **B** | Keep sending, drop the IP, rely on hashed email as a "contractual necessity". | Not defensible. The purpose is advertising measurement, not performing the contract; there is no legitimate-interest basis for ad targeting after *Meta v. Bundeskartellamt* (C-252/21). |
| **C** | Turn CAPI off until A is built. | Zero server-side conversions in the interim. |

**Recommendation: C now, A next sprint.** `FB_ACCESS_TOKEN` is read at `utils/FacebookCAPI.js:15` and the whole path no-ops without it, so C is an environment change you can make today. Also note Meta requires a lawful basis attestation for CAPI data; sending without consent puts that attestation in question.

**While you are there:** Microsoft Clarity is session recording, and it is not in the list of analytics you told me about. Someone should decide whether it stays at all — it is the highest-risk item on the page and it was not on your radar.

---

## 6. Listing image uploads go straight to Cloudinary

**Finding H-13.** `frontend/src/app/utlis/uploadCloudinary.js:1` — the browser uploads directly to Cloudinary with an unsigned preset (`Putkoproject`, cloud `dekgv22nb`), both hardcoded in shipped JavaScript. The server never sees the file.

Consequences: no server-side MIME or size validation (the 10 MB check at `:3` is client-side and trivially skipped), **no EXIF GPS stripping** — the stored `secure_url` is the original asset, so a host's home coordinates are readable from their listing photos — and `/auto/upload` accepts any file type, so anyone on the internet can host arbitrary content under Putko's Cloudinary account and bill Putko for the bandwidth.

**I did not patch this** because the cheapest correct fix is a change in the Cloudinary console, not in this repository, and I should not guess at your account settings.

**Options**

| | Approach | Cost | Covers |
|---|---|---|---|
| **A** | Set the preset to signed; add a `POST /api/uploads/sign` endpoint that requires auth and returns a signature. | ~half a day | Everything. The upload still goes browser→Cloudinary, so no bandwidth through Render. |
| **B** | Keep it unsigned; restrict the preset to `allowed_formats: jpg,png,webp`, enable `strip_metadata`, set `max_file_size`, and add an incoming transformation. | ~1 hour, console only | EXIF, file type, size. Not the "anyone can upload" problem. |
| **C** | Proxy uploads through the API. | ~1 day | Everything, but Render pays for the bandwidth and the request timeout becomes your problem. |

**Recommendation: B today, A this quarter.** B removes the privacy exposure — which is the part with a data-protection consequence — within the hour. A closes the abuse vector.

**Note:** whichever you pick, existing images keep their EXIF. Decide whether to re-derive them (`strip_metadata` on a bulk explicit transformation) or leave the exposure in place for listings already published.

---

## 7. Slovak market fit: three related gaps, one schema decision

**Findings M-07, M-08, M-09.** Grouped because they share a root cause and one migration would address all three.

* **No proximity search of any kind.** `models/Accommodation.js:128–131` stores bare `latitude`/`longitude` numbers. No `2dsphere` index, no `$near`, no haversine, no PostGIS. Landmark/POI search does not exist and distance ranking is not possible without a schema change — which is why the default ranking (M-06) cannot be "availability → distance → price" today.
* **"Kosice" does not find "Košice".** City is an exact match on a lowercased string (`:1069`); name search is an unfolded regex. This is MongoDB, so there is no `unaccent` extension to install.
* **No kraj / okres taxonomy.** `locationDetails.state` and `.city` are free-text. The 8 kraje and 79 okresy are not modelled, so regional browse, per-obec local tax rates and clean city facets are all unavailable.

**Options**

| | Approach | Cost | Gets you |
|---|---|---|---|
| **A** | Migrate `location` to GeoJSON `Point` + `2dsphere`; add a folded `searchText` field written on save; add `kraj`/`okres`/`obec` reference collections resolved from the geocode. | ~1 week + a backfill | All three. Distance ranking, "chaty do 20 km od Štrbského plesa", diacritics-insensitive search on an index, regional pages. |
| **B** | Diacritics only: a `searchName`/`searchCity` folded field, indexed. | ~1 day | M-08 alone. The commonest user-visible failure, cheapest to fix. |
| **C** | Do it in the Postgres rebuild instead, where PostGIS and `unaccent` are one extension each. | Deferred | Nothing until the rebuild lands — and today the rebuild has no listings table at all. |

**Recommendation: B now, A when the catalogue justifies it.** A Slovak user typing "Kosice" and getting nothing is a conversion loss you are paying for every day; distance ranking matters more at 400 listings than at 40.

**Decide also:** is the rebuild (`lib/db`, `artifacts/api-server`) actually the plan? It currently has guests, sessions, favourites and a `jsonb` blob — no listings, bookings, availability or payments. If the answer is yes, do A there and not in Mongo. If it is stalled, say so, because several findings in this report ("fix it properly in Postgres") assume a Postgres that does not exist.

---

## 8. Refund and payout edge cases after a partial refund

**Findings M-11 and M-12.** Two small decisions with real money attached.

**M-12:** `payoutReservation` refuses whenever `refundAmountCents > 0` (`PaymentController.js:1269`). After **any** partial refund the host is never paid the remainder — not by the cron, not by the Withdraw button. The money sits on the platform balance indefinitely.

**M-11:** the refund idempotency key is `refund_booking_<id>` (`CancellationController.js:172`), fixed per booking. A second refund on the same booking silently returns the first refund object instead of issuing a new one — so an admin issuing a goodwill top-up gets a success response and no money moves.

**Options for M-12**

| | Approach |
|---|---|
| **A** | Pay out `hostAmountCents` minus the host's share of the refund. Needs a rule for who absorbs the commission on the refunded portion. |
| **B** | Keep blocking, and handle partial refunds manually through Stripe. |

**Recommendation: A**, with the commission refunded pro rata — if the guest gets 50 % back, Putko's commission on that half goes back too. The alternative (Putko keeps full commission on a half-delivered stay) is hard to defend and will show up in a host dispute eventually.

**M-11 is a one-line fix** (`refund_booking_<id>_<amountCents>` or a sequence counter) but I have left it here rather than patching, because it interacts with A: the right key depends on whether partial refunds become a normal flow or stay an admin escape hatch.

---

## 9. Custom cancellation policies exist

**Finding L-01.** You specified exactly three fixed tiers — Flexible, Standard, Strict — and no custom policies. The schema has a fourth: `cancellationPolicyType` includes `'custom'` (`models/Accommodation.js:26`) with host-defined tiers (`:36`), validated by `validateCustomTiers` (max 3 tiers, monotonically decreasing, final tier must be 0/0).

The risk is contained: tiers are re-validated when snapshotted onto a booking (`utils/cancellationPolicy.js:99–103`) and fall back to Standard if invalid, so refunds cannot be widened arbitrarily. But hosts can still author terms that are not one of your three.

**Decide:** was `custom` deliberate (a host request that got built), or drift? If drift, remove it from the enum and migrate the listings using it. **Check first how many there are** — `db.accommodations.countDocuments({ cancellationPolicyType: "custom" })`. If the answer is zero, this is a five-minute cleanup. If hosts are relying on it, removing it changes terms they have agreed to.

**Recommendation:** run the count, then remove if zero. I have not patched it because migrating live listings onto different cancellation terms is a decision with contractual weight.

---

## 10. Off-platform circumvention

**Finding L-04.** Prohibited on a conduct basis with no time limit, per your rules. Nothing in the code detects, signals or enforces it — no contact-detail scanning in messaging, no flagging, no metric. Messaging itself is barely functional: `index.js:202` has the message save commented out, so the Socket.IO path does not persist anything.

Enforcement on a conduct basis is a policy and moderation question before it is a code one, and detection has real costs — false positives on a host legitimately sending check-in instructions are worse than the leakage, and scanning private messages needs its own GDPR basis and a line in the privacy policy.

**Options**

| | Approach |
|---|---|
| **A** | Nothing technical. Enforce on report, through terms. |
| **B** | Flag messages containing phone numbers, emails or IBANs for review — not blocking, just a queue. |
| **C** | Block sending contact details before a booking is confirmed. |

**Recommendation: A at this scale.** With a catalogue this size, moderation on report costs less than the false positives from B and far less than the guest friction from C. Revisit when you can measure the leakage — which needs the messaging system to work first (it does not; see H-14 and `index.js:202`).

---

## One more thing, which is not a decision

The brief describes a **Next.js + React + Node + Postgres** system. Production is **Express 4 + MongoDB + Mongoose**, with a Next.js 14 front end. The Postgres work (`lib/db`, `artifacts/api-server`, `artifacts/putko`) is a separate, incomplete rebuild with no listings, bookings or payments in it.

Several of your questions — Server Actions, route handlers, `EXCLUDE USING gist`, `unaccent`, PostGIS, ORM escape hatches — do not apply to the system that is actually running. I have answered each against what is there and said so explicitly rather than reporting them as absent-and-therefore-fine.

If the mental model in the brief is what the team believes it is running on, that gap is worth closing before the next planning round.
