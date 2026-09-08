# Patches

30 patches, one per finding, in `git apply` format against commit `018cfa0`.
Minimal diffs: no refactoring, no reformatting, no dependency bumps.

## Applying

Each patch applies cleanly to HEAD **on its own**:

```sh
git apply audit/patches/001-unauthenticated-change-password.patch
```

Applied as a set, use three-way merge — patch `010` and patch `007` both touch
`Routes/AccommodationRoutes.js`:

```sh
for p in audit/patches/*.patch; do git apply --3way "$p" || echo "CONFLICT: $p"; done
```

Verified: all 30 apply individually, and all 30 apply in sequence with `--3way`.

## Order dependencies

* `011` (double-booking race) deliberately preserves the **current** closed-interval
  convention so that it stays a pure atomicity fix. Apply the interval migration
  described in `../DECISIONS-NEEDED.md` §4 **after** it, not before.
* `014` (6 % commission) and `015` (no VAT) are a pair. Applying `014` without `015`
  leaves a 6 % fee still invoiced with 23 % VAT on top.
* `004` requires the Redis credential to be **rotated first** — the patch makes the
  app refuse to start without `REDIS_URL`.

## New files introduced

| Patch | File | Why |
|---|---|---|
| `005` | `.migration-backup/backend/utils/safeFetchIcal.js` | SSRF-guarded fetcher: https only, DNS resolved and checked against private ranges, per-hop redirect re-validation, timeout and size cap |
| `008` | `.migration-backup/frontend/src/app/components/CookieConsent.js` | The consent record and banner — the single place that answers "may we track?" |
| `008` | `.migration-backup/frontend/src/app/components/ClarityAnalytics.js` | Microsoft Clarity, moved out of the root layout and behind the gate |
| `020` | `.migration-backup/backend/utils/rateLimit.js` | Redis-backed limiter, shared across instances, fails open |

## Migrations

Two patches change stored data shape and need a backfill before or after:

* `010` adds `Accommodation.icalExportToken`. Existing listings have none, so their
  export URL 401s until backfilled:
  ```js
  db.accommodations.find({ icalExportToken: { $exists: false } }).forEach(d =>
    db.accommodations.updateOne({ _id: d._id },
      { $set: { icalExportToken: require("crypto").randomBytes(32).toString("hex") } }))
  ```
  Then re-issue the subscription URLs to hosts — the old ones stop working, which
  is the point.

* `025` adds TTL indexes on `deletedreservations`, `deletedaccommodations` and
  `loginhistories`. **Mongo begins deleting within a minute of index creation.**
  Confirm the retention periods (3 years / 3 years / 12 months) before deploying,
  and take a backup first.

`017` adds `occupancyCalendar[].icsUid`, but no backfill is possible — rows imported
before UIDs were recorded cannot be matched to a feed event. The deletion
reconciliation deliberately skips them rather than guessing, so those legacy blocks
stay until a host removes them by hand.

## Not patched

Findings that need a decision rather than a diff are in `../DECISIONS-NEEDED.md`:
the complaint record (H-06), VAT already invoiced (C-16), host-cancellation refund
policy (H-07), the interval migration (H-08/H-09), server-side Meta CAPI consent
(C-12), Cloudinary upload settings (H-13), the Slovak search/geo schema
(M-07/M-08/M-09), partial-refund payouts (M-11/M-12), custom cancellation policies
(L-01), and off-platform circumvention (L-04).

Dependency upgrades (H-10, H-11) are deliberately not bundled — they need their own
test cycle.
