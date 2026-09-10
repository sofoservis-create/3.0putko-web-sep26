---
name: OpenAPI Zod v3 compatibility
description: Generator constraints when the OpenAPI toolchain emits schemas for the workspace's Zod v3 package.
---

Avoid OpenAPI integer, URI, and UUID formats when this workspace's generated Zod output turns them into top-level `zod.int()`, `zod.url()`, or `zod.uuid()` calls. Express equivalent bounds as plain number/string schemas unless the generated package is upgraded in lockstep.

**Why:** Orval currently emits those helpers as Zod v4 APIs, but the generated package resolves Zod v3, causing library typecheck failures immediately after otherwise valid contract generation.

**How to apply:** After adding formatted OpenAPI fields, run codegen before relying on generated clients. If generated code uses unavailable top-level helpers, preserve runtime validation in the route and use generator-compatible schema primitives.