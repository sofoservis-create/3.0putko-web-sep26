---
name: Putko pricing boundaries
description: Product constraint for accommodation special-price date ranges and pricing changes.
---

Treat the final configured date of a special-price period as the checkout boundary, so the night starting on that date does not receive the special price. Do not redesign the existing pricing architecture as part of unrelated listing-page work.

**Why:** The user explicitly confirmed the exclusive end-date rule and asked that the current pricing architecture remain unchanged.

**How to apply:** When adjusting listing calendars, reservation validation, or mobile/desktop booking UI, preserve this boundary and limit changes to consistency fixes unless the user explicitly requests pricing architecture work.