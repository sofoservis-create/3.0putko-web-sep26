# Render dual-role account handoff

The Replit prototype proves a single verified traveler identity can gain a host capability while retaining traveler data. Port this contract to the legacy Render/MongoDB backend only from an isolated `origin/main` worktree.

## Proven contract

- The account identity is always derived from the authenticated session.
- Host activation accepts no user ID and is idempotent.
- Capabilities are additive: `guest` is retained and `host` is added.
- Active mode is session state, not proof of ownership.
- Switching to host mode is rejected until the authenticated identity has host capability.
- Authentication responses expose `capabilities`, `activeMode`, and a nullable activation timestamp while retaining the existing scalar `role` field for backward compatibility.
- Password changes revoke all sessions and apply to the one shared identity.

## Legacy model mapping

The live backend currently stores traveler identities in `User` and host identities in `Host`, and older clients expect a scalar role. Before implementation, choose and document one authoritative credential owner and a stable link between records. Never make two independently editable password hashes the long-term source of truth.

Existing guest-only and host-only accounts must remain valid. For an activated traveler, host authorization must resolve the linked `Host` record and traveler authorization must resolve the linked `User` record. A token claim by itself must never grant listing, reservation, payout, billing, or tax-data access.

## Migration checks

1. Detect case-insensitive duplicate emails across `User` and `Host`.
2. Classify guest-only, host-only, and already-duplicated identities before writing links.
3. Backfill links in a reversible batch and retain an audit count for every classification.
4. Verify login, password reset, account deletion, favorites, reservation access, listing ownership, billing, Stripe, and payouts for each account class.
5. Confirm older clients still receive the role shape they understand.
6. Prepare a rollback that removes only newly introduced links and capability metadata.

## Deployment boundary

Do not patch the migrated app branch directly. Prepare legacy backend changes in an isolated worktree based on `origin/main`, verify them there, and bring only the intended patch or commit back through the established reconciliation process. Production MongoDB migration and Render deployment require the user’s explicit approval immediately before each action.