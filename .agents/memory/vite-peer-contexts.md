---
name: Workspace Vite peer contexts
description: How optional Vite peer dependencies can affect type identity across pnpm workspace artifacts.
---

Adding an optional Vite peer such as Sass to one artifact can cause pnpm to resolve Vite plugins through different peer contexts. TypeScript may then report structurally incompatible `Plugin` types in another artifact even though every package uses the same Vite version.

**Why:** This appeared only after installing the imported app's dependencies and caused the root workspace typecheck to fail in an otherwise unchanged scaffold artifact.

**How to apply:** After dependency changes in any Vite artifact, run the root workspace typecheck. If plugin types split across peer contexts, align the peer set or use a narrow compatibility cast at the plugin boundary rather than weakening application typechecking.