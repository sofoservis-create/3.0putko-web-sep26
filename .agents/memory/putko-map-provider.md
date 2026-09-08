---
name: Putko map provider
description: Provider decision for the required accommodation-results map.
---

Keep Google Maps as Putko's map provider. If the browser API key is absent, preserve the clear unavailable state rather than replacing Google Maps with another provider.

**Why:** The user explicitly chose to retain Google Maps and add the required key later instead of migrating to OpenStreetMap/Leaflet.

**How to apply:** Map improvements should remain compatible with the existing Google Maps JavaScript and Places APIs. Request the key securely as `VITE_GOOGLE_MAPS_API_KEY` when the user is ready.