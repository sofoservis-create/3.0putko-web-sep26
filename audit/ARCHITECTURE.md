# Putko.sk — Architecture

Diagrams of the system as it actually is at commit `018cfa0`, not as designed. Where a component is missing, unauthenticated or broken, the diagram says so — a picture that hides the holes is worse than no picture.

---

## 1. System components and data flow

Two codebases live in this repository. Only one is in production.

```mermaid
graph TB
    subgraph browser["Browser"]
        NX["Next.js 14 app<br/>.migration-backup/frontend<br/>329–436 kB gz first load"]
        PIX["Meta Pixel + MS Clarity + Crisp<br/>layout.js:44,60 — NO CONSENT GATE"]
    end

    subgraph render["Render — production"]
        API["Express 4 API<br/>.migration-backup/backend/index.js<br/>28 unauthenticated mutating routes"]
        SOCK["Socket.IO<br/>index.js:189 — io.emit broadcasts<br/>every message to every client"]
        CRON["node-cron, in-process<br/>no lock, no leader election"]
    end

    subgraph data["Data"]
        MONGO[("MongoDB / Mongoose<br/>Accommodation · Reservation · Host<br/>User · Invoice · Dac7Record")]
        REDIS[("Upstash Redis<br/>credential hardcoded<br/>utils/redis.js:5")]
    end

    subgraph ext["External"]
        STRIPE["Stripe Connect Express<br/>separate charges + transfers"]
        CLOUD["Cloudinary<br/>unsigned preset, browser-direct"]
        SF["SuperFaktúra<br/>monthly commission invoice"]
        ICAL["Host iCal feeds<br/>Airbnb / Booking.com"]
        META["Meta CAPI · Google Maps · SMTP · OpenAI"]
    end

    subgraph rebuild["Rebuild — not in production"]
        VITE["Vite + React SPA<br/>artifacts/putko"]
        APISRV["Express scaffold<br/>artifacts/api-server<br/>test-auth only"]
        PG[("Postgres + Drizzle<br/>lib/db<br/>guests · sessions · favourites<br/>NO listings, bookings or payments")]
    end

    NX -->|"REST, Bearer JWT<br/>30-day expiry, no refresh"| API
    NX -.->|"direct upload<br/>no server validation<br/>no EXIF strip"| CLOUD
    PIX -.->|"fires on first paint"| META
    NX <--> SOCK

    API --> MONGO
    API --> REDIS
    API -->|"charge · transfer · refund"| STRIPE
    API -->|"server-side, no consent check<br/>hashed email + raw IP"| META
    API --> SF
    CRON -->|"every 3 h — no timeout, no lock<br/>SSRF: host-supplied URL"| ICAL
    CRON -->|"every 5 s — 4 full scans<br/>deletes PAID bookings"| MONGO
    CRON -->|"daily 03:00 — payouts"| STRIPE
    CRON -->|"monthly — invoices"| SF
    STRIPE -->|"webhook, signature verified<br/>idempotency ledger"| API

    VITE -.-> APISRV
    APISRV -.-> PG
    VITE -.->|"still reads the legacy API"| API

    classDef bad fill:#7f1d1d,stroke:#dc2626,color:#fff
    classDef ok fill:#14532d,stroke:#16a34a,color:#fff
    classDef idle fill:#374151,stroke:#6b7280,color:#d1d5db
    class PIX,CRON,REDIS bad
    class STRIPE ok
    class VITE,APISRV,PG idle
```

**Read this diagram for what it says about ownership.** Every cron is in-process on a single Express instance with no lock and no leader election, so horizontal scaling on Render would run the payout sweep, the invoice job and the iCal import once per instance. The transfer idempotency key (`transfer_booking_<id>`) makes double payouts safe; nothing protects the iCal import or the 5-second cleanup the same way.

---

## 2. Booking state machine

There is no single status field. State is spread across `isApproved`, `paymentStatus`, `payoutStatus` and `bookingMode`, with no transition guard table anywhere. The diagram below composes them into the states the system actually occupies.

```mermaid
stateDiagram-v2
    [*] --> Draft

    Draft --> RequestPending: bookingMode = request<br/>ReservationController.js:173<br/>NO dates held
    Draft --> Unpaid: bookingMode = instant<br/>ReservationController.js:179<br/>NO dates held

    RequestPending --> Unpaid: host approves<br/>:739 — holds dates, mails link
    RequestPending --> Cancelled: host declines :821
    RequestPending --> Cancelled: 48 h lapse :867

    Unpaid --> Held: checkout session created<br/>PaymentController.js:159 holdDates<br/>hold expires in 30 min
    Held --> Unpaid: guest abandons :1904<br/>or hold lapses
    Held --> Paid: checkout.session.completed<br/>:507 conditional update

    Paid --> Confirmed: finalizeReservation :1619<br/>confirmHold + emails, claim-guarded
    Paid --> DoubleBooked: confirmHold refuses :203<br/>guest HAS paid, admin alerted,<br/>NO automatic refund

    Confirmed --> Cancelled: cancelBooking<br/>refund from the SNAPSHOT
    Confirmed --> PayoutReleased: transfers.create :1410<br/>idempotency key transfer_booking_id

    PayoutReleased --> Invoiced: monthly SuperFaktúra run
    Cancelled --> [*]
    Invoiced --> [*]
    DoubleBooked --> [*]

    Confirmed --> Disputed: charge.dispute.created :442
    PayoutReleased --> Disputed
    Disputed --> [*]
```

### Illegal transitions the code permits

Drawn separately, because they are the point.

```mermaid
stateDiagram-v2
    direction LR

    state "Cancelled" as C
    state "Paid + Approved" as P
    state "Payout released" as R
    state "Any state" as A
    state "Checked out" as O

    C --> P: ① applyPaidCheckoutSession<br/>filters on paymentStatus only,<br/>never reads isApproved :507
    A --> P: ③ PUT /reservations/:id<br/>totalPriceCents = 0, then approve<br/>:556 — unauthenticated, no charge
    P --> P: ② PUT /reservations/:id<br/>rewrite totalPriceCents<br/>:670 — unauthenticated
    R --> R: ④ clear transferId via ②,<br/>booking becomes payable again<br/>:1263
    O --> C: ⑤ cancel after check-out<br/>:108 — no check-out guard;<br/>dates released, guest emailed
    P --> P: ⑧ two concurrent approvals<br/>both hold the same dates<br/>:739 → holdDates race
```

| | Transition | Blocked by patch |
|---|---|---|
| ① | `cancelled` → `paid` | — needs an `isApproved` guard in `applyPaidCheckoutSession` |
| ② | `paid` → `paid` at a different amount | `003`, `006` |
| ③ | any → `approved`+`paid` with no charge | `003`, `006` |
| ④ | `released` → payable again | `003`, `006` |
| ⑤ | cancel after check-out | — |
| ⑥ | `released` → cancelled with refund | **already correctly refused** (`CancellationController.js:119`) |
| ⑦ | hold → confirmed over another booking | detected post-payment only (`calendarHold.js:203`) |
| ⑧ | concurrent request approvals | `011` |

---

## 3. Payment lifecycle — checkout to payout

```mermaid
sequenceDiagram
    autonumber
    participant G as Guest
    participant FE as Next.js
    participant API as Express API
    participant DB as MongoDB
    participant S as Stripe (platform)
    participant H as Host acct_

    G->>FE: pick dates, guests
    FE->>API: POST /api/reservation
    Note over API: price computed SERVER-SIDE from the listing<br/>client totalPrice stripped (:88)<br/>⚠ but guest COUNT is client-supplied (H-02)
    API->>DB: save + snapshot policy tiers (:116)
    Note over DB: cancellation terms frozen as an expanded array.<br/>Refunds read ONLY this — never the listing. ✓
    API-->>FE: reservation + accessToken (once)

    FE->>API: POST /payments/create-checkout-session
    Note over API: requireReservationAccess ✓<br/>host payout-readiness re-checked (:137)
    API->>DB: holdDates (:159)
    Note over DB: ⚠ read-modify-write, no transaction.<br/>Two concurrent guests can both hold. (C-14)
    API->>S: checkout.sessions.create
    Note over S: ⚠ no idempotency key (M-13)
    S-->>G: hosted checkout
    G->>S: pays €100

    S-->>API: checkout.session.completed
    Note over API: signature verified ✓<br/>claimed against a unique index ✓<br/>released on failure so retries work ✓
    API->>S: paymentIntents.retrieve (expand balance_transaction)
    Note over API: amounts read FROM STRIPE, never the client ✓<br/>calculateFees — integer cents throughout ✓<br/>⚠ 1.722% + €0.31 = €2.03, not 6% = €6.00 (C-15)
    API->>DB: conditional update, paymentStatus ≠ paid
    API->>DB: finalizeReservation → confirmHold + emails
    Note over API: ⚠ chargeId written but not on the schema —<br/>silently dropped, breaks dispute matching (M-01)

    Note over API,S: ⏳ nightly sweep, 03:00 Europe/Bratislava
    API->>DB: paid, not released, no transferId, checkIn ≤ now−24h
    Note over API: ⚠ releases at check-in+24h for EVERY host.<br/>No ≥3-completed-bookings gate, no check-out<br/>fallback, and no complaint record exists. (H-06)
    API->>S: transfers.create €97.97 → acct_
    Note over S: separate charges + transfers ✓<br/>no application_fee — commission implicit ✓<br/>idempotencyKey transfer_booking_id ✓
    S->>H: €97.97
    S-->>API: transfer.created → payoutStatus released

    Note over API: ⏳ monthly, 1st at 03:00
    API->>API: aggregate platformFeeCents by host<br/>where transferredAt in period
    API->>API: SuperFaktúra invoice
    Note over API: ⚠ 23% VAT line on every invoice —<br/>Putko is not a VAT payer (C-16)
```

### Money, per €100 booking

| | Now | Per the business rules |
|---|---|---|
| Guest pays | €100.00 | €100.00 |
| Stripe cost (≈1.4 % + €0.25) | €1.65 | €1.65 |
| Transferred to host | **€97.97** | **€94.00** |
| Platform retains | €2.03 | €6.00 |
| VAT booked on the fee | €0.38 | **€0.00** — not a VAT payer |
| Platform net | **€0.00** | **€4.35** |

The current configuration is calibrated to break even by design (`config/payments.js:16–28`). Patch `014` sets the commission to 6 % and the VAT rate to 0.

### Refund path

```mermaid
flowchart TD
    A["POST /api/cancellation/:reservationId"] --> B{requireReservationAccess}
    B -->|"actor from the verified grant,<br/>never from the body ✓"| C{transferId set?}
    C -->|yes| D["REFUSED — already_paid_out.<br/>Needs transfer reversal. ✓"]
    C -->|no| E{who cancelled?}
    E -->|admin + override| F["clamp to 0…gross"]
    E -->|host| G["⚠ guest's policy tier applied.<br/>Stated rule: FULL refund. (H-07)"]
    E -->|guest| H["calculateRefundCents<br/>from cancellationTiersSnapshot ✓<br/>NEVER re-reads the listing ✓"]
    F --> I["refunds.create<br/>key refund_booking_id<br/>⚠ fixed key blocks a 2nd refund (M-11)"]
    G --> I
    H --> I
    I --> J["releaseCalendarForReservation"]
    J --> K["recordRefundForDac7"]
    K --> L["emails to guest + host"]

    style D fill:#14532d,stroke:#16a34a,color:#fff
    style H fill:#14532d,stroke:#16a34a,color:#fff
    style G fill:#7f1d1d,stroke:#dc2626,color:#fff
    style I fill:#78350f,stroke:#d97706,color:#fff
```

The snapshot mechanism works exactly as it should: `cancellationTiersSnapshot` is written at booking time and `calculateRefundCents` reads only from it. **No refund path JOINs back to the listing** — the CRITICAL failure the audit brief anticipated is not present here.

---

## 4. Availability model

One array, three writers, two interval conventions, four readers that disagree.

```mermaid
flowchart LR
    subgraph writers["Writers"]
        W1["Host manual block<br/>addToOccupancyCalendar :571<br/>source: manual"]
        W2["iCal import<br/>syncBookings :1391<br/>source: ics · DTEND−1"]
        W3["Checkout hold<br/>holdDates :125<br/>status: held, 30 min TTL"]
        W4["Confirmed booking<br/>confirmHold :193<br/>endDate = checkOutDate"]
    end

    ARR[("Accommodation.occupancyCalendar<br/>models/Accommodation.js:528<br/>embedded array, no constraint")]

    subgraph readers["Readers"]
        R1["occupiedDays :37<br/>ALL non-held rows + live holds"]
        R2["search filter :1148<br/>booked + live held ONLY<br/>⚠ ignores blocked"]
        R3["iCal export :1254<br/>⚠ public, leaks guest names"]
        R4["deleteOccupancyEntry :652<br/>⚠ drops every held row"]
    end

    W1 --> ARR
    W2 --> ARR
    W3 --> ARR
    W4 --> ARR
    ARR --> R1
    ARR --> R2
    ARR --> R3
    ARR --> R4

    classDef bad fill:#7f1d1d,stroke:#dc2626,color:#fff
    class R2,R3,R4,W2 bad
```

**The contradictions, concretely.**

* `W2` writes `endDate` = the **last blocked night** (`DTEND − 1`, `:1445`). `W4` writes `endDate` = the **checkout date**. `R1` treats both as inclusive, so every native booking over-blocks the checkout night and back-to-back stays are impossible (H-08).
* `R2` counts `booked` and live `held`. `R1` counts **everything** that is not an expired hold, `blocked` included — and, through an inverted condition, rows explicitly marked `available` too. So a host's manual block leaves the listing in search results and refuses the guest at checkout (H-03).
* `R4` filters the array to `['booked','blocked','available']`, so deleting one block destroys every in-flight checkout hold on the listing (H-19).
* There is **no database-level guarantee** against overlap. In Postgres this would be `EXCLUDE USING gist (listing_id WITH =, daterange(check_in, check_out, '[)') WITH &&)`. MongoDB has no equivalent, so the only atomic guard available is a conditional `findOneAndUpdate` whose *filter* asserts no overlap — which is what patch `011` does, and what the code did not do.

### The double-booking race

```mermaid
sequenceDiagram
    participant A as Guest A
    participant B as Guest B
    participant API as API
    participant DB as MongoDB

    A->>API: create-checkout-session (10–12 Sep)
    API->>DB: findById(listing)
    DB-->>API: snapshot, calendar empty
    B->>API: create-checkout-session (10–12 Sep)
    API->>DB: findById(listing)
    DB-->>API: same snapshot, still empty
    Note over API: both evaluate occupiedDays in JS.<br/>Both conclude the dates are free.
    API->>DB: save() — A's hold written
    API->>DB: save() — B's hold overwrites the array
    Note over DB: last write wins. No transaction,<br/>no version guard on this delta, no constraint.
    API-->>A: Stripe URL
    API-->>B: Stripe URL
    A->>API: pays
    B->>API: pays
    Note over API: confirmHold refuses the second (:203)<br/>and alerts an admin — AFTER both charges.<br/>No automatic refund.
```

The window is the round trip between `findById` and `save()` — milliseconds, but every listing on a popular weekend is being hit by more than one guest at a time. Patch `011` closes it by making the database, not the application, evaluate the overlap predicate at write time.

---

## 5. iCal synchronisation

```mermaid
flowchart TD
    START["cron 0 */3 * * *<br/>index.js:127"] --> FIND["find listings with a feed"]
    FIND --> LOOP{"for each listing<br/>SEQUENTIAL — no lock,<br/>no concurrency"}
    LOOP --> FETCH["axios.get(feed.url)<br/>:1427"]

    FETCH --> SSRF["⚠ no https check<br/>⚠ no IP filtering<br/>⚠ NO TIMEOUT — one hung feed<br/>stalls every later listing<br/>⚠ no size cap, no redirect limit"]

    FETCH -->|HTTP error| ERR["record lastSyncError,<br/>continue.<br/>FAILS CLOSED ✓ — old blocks kept"]
    FETCH -->|ok| PARSE["ical.parseICS"]

    PARSE --> RRULE["⚠ event.rrule never read.<br/>Recurring blocks import as ONE<br/>occurrence; the rest are dropped<br/>→ those nights stay bookable here"]
    PARSE --> NORM["DTEND − 1 day :1445 ✓<br/>⚠ setHours(12) local + toISOString UTC<br/>⚠ VALUE=DATE / TZID / floating<br/>all flattened"]

    NORM --> DEDUP{"exists already?"}
    DEDUP -->|"⚠ matched on<br/>(start,end,summary,status).<br/>UID NEVER READ"| ADD["push new row"]
    DEDUP -->|match| SKIP["skip"]

    ADD --> DEL["⚠ NO DELETION PASS.<br/>An event removed upstream keeps<br/>its block FOREVER — every external<br/>cancellation permanently destroys<br/>sellable inventory"]

    ERR --> LOOP
    SKIP --> LOOP
    DEL --> LOOP

    classDef bad fill:#7f1d1d,stroke:#dc2626,color:#fff
    classDef ok fill:#14532d,stroke:#16a34a,color:#fff
    class SSRF,RRULE,DEDUP,DEL bad
    class ERR ok
```

**Failure mode: fails closed.** An HTTP error, timeout or malformed feed records `lastSyncStatus: 'error'` and moves on, leaving existing blocks intact (`:1518–1528`). That is the safe direction, and it is what the code does. The problem is the opposite one — blocks are never released, so failure-closed compounds into permanent inventory loss.

**Realistic double-booking window against an external channel:** the 3-hour interval, and **unbounded** if any feed hangs, because there is no timeout and the loop is sequential. There is also no lock between runs; two overlapping runs both `save()` the same document.

Patch `005` adds the SSRF guard, timeout and size cap. Patch `017` adds UID-keyed dedup, move-on-change and per-feed deletion reconciliation, and detects-and-logs recurring events (expanding them needs a recurrence library — see `DECISIONS-NEEDED.md`).

---

## 6. Authorization map

```mermaid
flowchart LR
    subgraph good["Properly guarded — auth/authorize.js"]
        G1["/api/payments/*<br/>requireReservationAccess<br/>requireHostSelf"]
        G2["/api/cancellation/*<br/>actor from the verified grant"]
        G3["/api/receipts/*"]
        G4["/api/invoices/*<br/>requireAdmin / requireHostSelf"]
        G5["/api/dac7/*<br/>requireAdmin"]
        G6["/api/admin/*<br/>requireAdmin, re-checked<br/>against the collection"]
        G7["PUT /accommodation/:id/payout-account<br/>owner + account-belongs-to-host"]
    end

    subgraph broken["Present but broken"]
        B1["restrict()<br/>verifyToken.js:29<br/>FAILS OPEN on an unknown id"]
        B2["/api/hosts/:id + /api/users/:id<br/>guarded routes SHADOWED by<br/>an earlier /:userId"]
    end

    subgraph none["No authentication at all"]
        N1["ALL listing CRUD<br/>create · update · delete · calendar · feeds"]
        N2["ALL reservation writes<br/>except approve/decline"]
        N3["/api/users/:id · /api/hosts/:id<br/>PUT and DELETE"]
        N4["/api/send — open mail relay"]
        N5["/api/upload-excel → xlsx CVE"]
        N6["/api/chat → OpenAI billing"]
        N7["/api/calendar?url= → SSRF"]
        N8["/api/blog/* · /api/favorite/*<br/>/api/getmsg · /api/addmsg"]
    end

    classDef ok fill:#14532d,stroke:#16a34a,color:#fff
    classDef warn fill:#78350f,stroke:#d97706,color:#fff
    classDef bad fill:#7f1d1d,stroke:#dc2626,color:#fff
    class G1,G2,G3,G4,G5,G6,G7 ok
    class B1,B2 warn
    class N1,N2,N3,N4,N5,N6,N7,N8 bad
```

The pattern is worth naming: **everything that touches Stripe was secured properly, and everything else was not.** `auth/authorize.js` is careful work — it derives the actor from whichever grant actually passed rather than from the token's claim (`:308`), it re-checks admin status against the collection rather than trusting the JWT (`:147`), and it fails closed on a lookup error (`:391`). That module was written by someone who understood the problem.

It was then applied to five routers out of twenty-three.

---

## 7. Data model

```mermaid
erDiagram
    HOST ||--o{ ACCOMMODATION : owns
    HOST ||--o{ INVOICE : "billed monthly"
    HOST ||--o{ DAC7RECORD : "reported annually"
    HOST ||--o{ LOGINHISTORY : "no TTL"
    ACCOMMODATION ||--o{ RESERVATION : "booked as"
    ACCOMMODATION ||--o{ REVIEW : has
    ACCOMMODATION ||--|| OCCUPANCY : "EMBEDDED ARRAY"
    RESERVATION ||--o| OCCUPANCY : "held / booked row"
    USER ||--o{ RESERVATION : "matched BY EMAIL only"
    INVOICE ||--o{ RESERVATION : aggregates

    HOST {
        string email UK
        string password "leaked by GET /api/hosts/:id"
        string resetPasswordToken "leaked by the same route"
        string stripeAccountId "default connected account"
        array stripeAccounts "per-account capability flags"
        string billingSubjectType "business|individual — no listing badge"
        string ico_dic_icDph "Slovak invoicing identity"
        bool isVatPayer
        date deactivatedAt "MISSING — added by patch 026"
    }

    ACCOMMODATION {
        string slug UK
        string cancellationPolicyType "flexible|standard|strict|CUSTOM"
        array customPolicyTiers "contradicts 'three fixed tiers'"
        object location "bare lat/lng — NO 2dsphere index"
        object locationDetails "free text — NO kraj/okres"
        string listingStatus "DRAFT|PENDING|PUBLISHED, Stripe-driven"
        string payoutStripeAccountId "per-listing destination"
        array calendarSync "host iCal feeds — SSRF source"
        string icalExportUrl "public, no token"
        array occupancyCalendar "THE availability model"
    }

    RESERVATION {
        string accessToken "capability token, select:false ✓"
        date checkInDate "closed interval — see H-08"
        date checkOutDate
        int totalPriceCents "server-computed ✓"
        string cancellationPolicySnapshot "frozen at booking ✓"
        array cancellationTiersSnapshot "expanded array ✓"
        int platformFeeCents "1.722%+31c — should be 6%"
        int hostAmountCents
        string paymentStatus "unpaid|paid|refunded|partially_refunded|failed"
        string payoutStatus "pending|released|failed"
        string transferId "no unique index; idempotency key covers it"
        string chargeId "WRITTEN BUT NOT ON THE SCHEMA — dropped"
        date guestDateOfBirth "MISSING — added by patch 027"
    }

    OCCUPANCY {
        date startDate
        date endDate "INCLUSIVE for bookings, EXCLUSIVE-1 for ICS"
        string status "booked|available|blocked|held"
        date holdExpiresAt "30 min"
        string source "manual|ics|reservation"
        string icsUid "MISSING — added by patch 017"
    }
```

**Three structural notes.**

1. **`Reservation` has no `userId`.** Guests book without an account, so a booking is tied to its guest only by email (`auth/authorize.js:217`) plus a per-booking capability token. That is a deliberate and reasonable design for anonymous booking — but it means "all my bookings" cannot be answered reliably, and the commented-out `userId` field at `models/Reservation.js:85` is a trap for the next person who tries.

2. **Availability is an embedded array, not a collection.** That makes a single-document atomic update possible (patch `011` relies on it) but it also means the array grows without bound per listing, there is no index on the date ranges inside it, and the whole array is rewritten on every change.

3. **The Postgres rebuild models none of this.** `lib/db/drizzle/0000_zippy_eternals.sql` has four tables: guests, sessions, favourites, and `putko_test_host_accommodations` — whose entire listing payload is a single `jsonb` column. There is no bookings table, no availability, no payments. Any plan that says "we will fix this properly in Postgres" is describing work that has not started.
