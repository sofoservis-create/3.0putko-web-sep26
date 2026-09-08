---
name: Putko rebuild data platform
description: Database and migration direction for the isolated Putko rebuild.
---

Use an externally managed PostgreSQL database with PostGIS for the Putko rebuild. Preserve compatibility with existing accommodation and reservation payloads through a versioned translation layer rather than designing the new schema around MongoDB document shapes.

**Why:** Booking availability, payments, host payouts, calendars, and related marketplace records need transactional integrity and relational constraints, while current accommodations still need to migrate without breaking existing screens.

**How to apply:** Normalize stable marketplace entities in PostgreSQL, retain legacy identifiers and aliases at API boundaries, and migrate public listing/search callers away from the Render backend only when equivalent endpoints are available.