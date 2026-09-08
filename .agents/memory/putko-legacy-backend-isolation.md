---
name: Putko legacy backend isolation
description: How to prepare backend-only fixes without including unrelated migrated workspace changes.
---

The Render backend source belongs to the legacy GitHub `origin/main` tree and is not part of the active artifact worktree. Prepare backend fixes from an isolated worktree based directly on `origin/main`, and generate the patch with Git rather than reconstructing it manually.

**Why:** Pushing the active migrated branch could include unrelated frontend and workspace changes. The legacy backend also uses CRLF line endings, so manually reconstructed diffs can become malformed.

**How to apply:** Create a detached or dedicated backend branch from `origin/main`, apply and test only the backend patch there, inspect the resulting commit, and ask for explicit permission immediately before any push or live Render deployment.