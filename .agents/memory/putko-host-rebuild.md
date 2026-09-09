---
name: Putko Host rebuild rules
description: Where the phased Host (hostiteľ) rebuild plan lives and the non-obvious constraints later Host work must keep (navigation, shared listings state, draft resume metadata, async isolation).
---

The plan of record is `.local/tasks/host-product-architecture-audit.md`; each phase gets a "Status" block when it ships, so read that file to see which phase is next.

Rules to keep:
- Host navigation is URL-driven. Never reintroduce transient `activePage`-style state.
- A destination enters primary nav only once its full flow works end-to-end; placeholder tabs return only with their phase.
- The listing editor is never remounted on the `/new` → id URL swap. Every async editor action must bind the editing session and listing id before awaiting and drop its continuation (state updates *and* navigation callbacks) if the session changed or the editor unmounted.
- All Host screens read and mutate accommodations through the single listings store; never add a per-component fetch. Mutations that complete during an in-flight list fetch must win over that fetch's snapshot.
- Draft resume metadata is the `lastVisitedStep` key inside the accommodation JSON payload, not a new API field or column, and it must not affect completion or publishing. The editor's "calendar" step has no server counterpart; it counts as complete when `calendarChoice` is set.
- The Host shell does not render the public header, so it must restore `appLanguage` from localStorage itself or English resets to Slovak on reload.

**Why:** the user wants a seamless mobile-first Host flow where each visible section works on phone, tablet, and desktop in SK and EN; earlier shells showed placeholder tabs, lost position on refresh, and stale async responses corrupted other listings.

**How to apply:** before adding a Host screen, add its route, read from the shared store, verify at phone/tablet/desktop widths in both languages, run the Host unit tests, and update the plan's status block.
