---
name: Putko Host rebuild phases
description: Where the nine-phase Host (hostiteľ) rebuild plan lives, which phases are done, and the navigation rules later phases must keep.
---

The plan of record is `.local/tasks/host-product-architecture-audit.md` (nine phases, each with a status block once done). Phases 0 (baseline) and 1 (URL-addressable Host shell) were completed on 2026-09-09; continue from Phase 2 (listings hub + draft resume at first incomplete step).

Rules to keep:
- Host navigation is URL-driven (`/host`, `/host/listings`, `/host/listings/new`, `/host/listings/:id?review=1`, `/host/menu`, helpers in `src/app/host/hostRoutes.js`). Never reintroduce transient `activePage`-style state.
- A destination only enters primary nav (mobile tabs, sidebar, quick actions) once its full flow works end-to-end; Reservations, Calendar, Messages, Profile, Security, Payments were removed and must return only with their phase.
- The listing editor must not be remounted (no `key` from the URL id): the first save replaces `/new` with the created id and the current step must survive; late responses are dropped via an editing-session counter.

**Why:** the user asked for a seamless mobile-first flow where "each section must be working"; the earlier shell showed placeholder tabs and lost position on refresh.

**How to apply:** before adding any Host screen, add its route to `hostRoutes.js`, keep phone/tablet/desktop verification, and update the status block in the plan file.
