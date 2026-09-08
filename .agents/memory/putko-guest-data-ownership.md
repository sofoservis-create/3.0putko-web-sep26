---
name: Putko guest data ownership
description: Security boundary for guest profile, favorites, and reservation history against the external backend.
---

Only expose guest profile updates, favorites, and stay history through authenticated current-user endpoints that enforce ownership on the server. Do not filter broad reservation collections, trust email or client-supplied user IDs, or reuse browser checkout access tokens as account authorization.

**Why:** The external backend does not currently expose confirmed current-user contracts for these features. Its favorites contract accepts a user ID, its reservation routes are not scoped to the authenticated guest, and profile-current-user behavior is unconfirmed. Frontend-only filtering would risk exposing or mutating another guest's data.

**How to apply:** Keep these guest account areas explicitly unavailable until the backend provides bearer-authenticated current-user read/write contracts. After those exist, wire the UI to those contracts and verify cross-account isolation before enabling data or actions.