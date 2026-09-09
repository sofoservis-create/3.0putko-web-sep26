# Proof: double-booking is not possible on this schema

This is the headline technical claim in `docs/REBUILD-PLAN.md` — that the new
Postgres schema makes double-booking impossible at the database level,
rather than merely unlikely at the application level. This document is the
evidence for that claim, not an assertion of it.

## The old system, concretely

`.migration-backup/backend/utils/calendarHold.js` (audited in
`audit/REPORT.md`, finding C-14) read a listing's calendar into JavaScript,
decided in application code whether the requested dates were free, and then
saved the whole document back. Two concurrent requests can both read the
same "dates are free" snapshot, both decide to proceed, and both save —
because there is no database mechanism enforcing exclusivity between the
read and the write. Application-level "check, then insert" is not a
guarantee; it is a race with a small window.

## The new schema

`lib/db/drizzle/0002_geography_and_exclusion.sql`:

```sql
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "stay" WITH &&
  )
  WHERE ("released_at" IS NULL);
```

This is not read-then-check. Postgres evaluates the predicate as part of the
`INSERT`'s own index lock. A second writer racing for the same dates does
not get a stale read — its `INSERT` statement itself fails, atomically,
before anything is committed and before any external side effect (a Stripe
charge, a confirmation email) could have happened on the strength of a
snapshot that was already wrong.

## Reproducing this

Two independent proofs exist, both re-runnable, both actually run — not
described from memory.

**1. Direct SQL**, against a real Postgres 16.13 + PostGIS 3.4.2 instance,
extensions confirmed via `\dx`:

```
INSERT booking A: listing X, [2026-09-10, 2026-09-12)          → succeeds
INSERT back-to-back: listing X, [2026-09-12, 2026-09-14)       → succeeds  (half-open — no phantom conflict)
INSERT overlapping:  listing X, [2026-09-11, 2026-09-13)       → REJECTED (23P01 exclusion_violation)
INSERT same dates, DIFFERENT listing Y                          → succeeds  (per-listing, not global)
release A's block, then re-claim [2026-09-10, 2026-09-12)      → succeeds  (release actually frees it)
INSERT zero-night range, check_in = check_out                   → REJECTED (23514 check_violation)
```

Run it yourself: `lib/db/scripts/verify-exclusion-constraint.mjs` — six
assertions, exits 0 only if every one holds:

```sh
cd lib/db
export DATABASE_URL=postgresql://putko:putko@localhost:5432/putko
node scripts/verify-exclusion-constraint.mjs
```

```
  PASS  claim 10-12 Sep on listing A
  PASS  claim back-to-back 12-14 Sep, same listing (half-open — must not phantom-conflict)
  PASS  claim overlapping 11-13 Sep, same listing (THE double-booking guarantee) (rejected: 23P01 exclusion_violation)
  PASS  claim the identical 10-12 Sep range on a DIFFERENT listing (per-listing scope)
  PASS  re-claim the just-released 10-12 Sep range (release actually frees it)
  PASS  claim a zero-night range, check_in = check_out (must be rejected) (rejected: 23514 check_violation)

ALL PASS — the exclusion constraint enforces exactly what it claims to.
```

**2. Through the actual application code path** — `claimDates()` in
`lib/db/src/queries/availability.ts`, the function real booking code calls,
not raw SQL:

```
claim A (2026-11-01..03): { ok: true }
claim B, overlapping (2026-11-02..04): { ok: false, reason: 'dates_unavailable' }
claim C, back-to-back with A's neighbor, non-overlapping: { ok: true }
SMOKE TEST PASSED
```

This second proof mattered: the first version of `claimDates()` had a real
bug — Drizzle wraps the underlying Postgres error in a `DrizzleQueryError`
and puts the actual error code on `.cause`, not on the error directly, so
the naive `err.code === '23P01'` check never matched and the conflict
propagated as an uncaught exception instead of the typed
`{ ok: false, reason: 'dates_unavailable' }` result the caller expects. Only
running the code against the real constraint caught it; it would not have
been visible from reading the code. Fixed in the same commit — see
`src/queries/availability.ts`.

## What this does and does not cover

**Covers:** the actual overlap guarantee, half-open interval semantics
(fixing audit finding H-08 — the old system's checkout night was blocked
against itself), per-listing scoping, hold release, and zero-night rejection.

**Does not yet cover:** the full booking lifecycle (payment, confirmation,
cancellation), the payout/commission pipeline, or the search ranking that
reads from this same table. Those are later Phase 3 work per
`docs/REBUILD-PLAN.md`. What's proven here is specifically the foundation
those depend on: that once a booking's dates are claimed, nothing — not a
race, not a bug in the calling code, not a second host's manual block — can
put another confirmed stay on top of it.
