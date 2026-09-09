---
name: Putko rebuild data platform
description: Database and migration direction for the isolated Putko rebuild.
---

Use an externally managed PostgreSQL database with PostGIS for the Putko rebuild. Preserve compatibility with existing accommodation and reservation payloads through a versioned translation layer rather than designing the new schema around MongoDB document shapes.

**Why:** Booking availability, payments, host payouts, calendars, and related marketplace records need transactional integrity and relational constraints, while current accommodations still need to migrate without breaking existing screens.

**How to apply:** Normalize stable marketplace entities in PostgreSQL, retain legacy identifiers and aliases at API boundaries, and migrate public listing/search callers away from the Render backend only when equivalent endpoints are available.

Legacy public listings can contain a shared placeholder coordinate near central Slovakia. Do not treat every legacy latitude/longitude pair as a trustworthy geographic position.

**Why:** Radius-based destination membership over the uncleaned legacy feed can assign hundreds of unrelated listings to mountain and regional destinations.

**How to apply:** Until PostGIS receives validated coordinates, prefer normalized locality membership from `locationDetails.city`; use coordinates only when the locality is absent and reject known placeholder values.