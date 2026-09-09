# Putko

Putko is a Slovak accommodation marketplace for discovering verified stays, booking trips, managing reservations, and hosting properties.

## Run & Operate

**The Run button starts `@workspace/web`** — the current app (Next.js 15).
`artifacts/putko` and `artifacts/api-server` are earlier work kept in the
repo; they are not what runs.

**To get it running, use the Shell, not the Run button:**

```sh
bash scripts/replit-start.sh
```

It checks the pull, the dependencies and the database in order, says which
one is missing, sets up the database if it is empty, and starts the app on
`0.0.0.0:5000`. Then open the webview.

Database only, if you want just that step:

```sh
DATABASE_URL=... bash scripts/setup-db.sh
```

That creates the extensions, applies migrations and seeds. It is idempotent.
**PostGIS is required** — the destination browse layer is built on
`ST_DWithin` and the script fails clearly if it is missing.

- `pnpm --filter @workspace/web run dev` — the app (port 3000 locally, 5000 on Replit)
- `pnpm --filter @workspace/web run build` — production build
- `bash scripts/setup-db.sh` — extensions + migrations + seed, idempotent
- `pnpm --filter @workspace/db run migrate` — apply migrations only
- `pnpm --filter @workspace/api-server run dev` — legacy API server scaffold
- `pnpm --filter @workspace/putko run dev` — legacy Vite app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- **Never `drizzle-kit push` on this project.** `listings.geog` and
  `destinations.centre` are PostGIS columns that drizzle-kit cannot emit, so
  they live in hand-written migrations. push diffs the TypeScript schema and
  would create every table without them — the schema would look complete and
  every geographic query would fail. Use `migrate`.
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Demo login (development only)

`demo-hostka@putko.example` (guest) / `demo-host@putko.example` (host),
password `putko-demo-2026`. Fictional accounts; the seed refuses
`NODE_ENV=production`.

## Where things live

- `artifacts/web/` — **the current app**: Next.js 15, App Router, Server
  Components reading Postgres directly. Design tokens in
  `app/globals.css` — no hex value belongs anywhere else.
- `lib/auth/` — password and session primitives (scrypt, timingSafeEqual)
- `artifacts/putko/` — legacy migrated React + Vite web app
- `artifacts/putko/src/AppRoutes.jsx` — browser route map converted from the original Next.js app directory
- `artifacts/putko/src/app/globals.css` — original Putko styles and theme utilities
- `artifacts/api-server/` — shared Replit API scaffold

## Architecture decisions

- The existing Putko production API remains the default data source; set `VITE_API_URL` to override it.
- Next.js navigation, image, script, and dynamic-import behavior is provided by small browser-native compatibility components.
- All original page routes are client-rendered through Wouter.

## Product

- Search and browse accommodation listings
- View listing and host details
- Complete booking, checkout, payment, and reservation flows
- Sign up, sign in, manage a profile, and onboard as a host
- Browse travel articles, FAQs, policies, and user guidance

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Artifact workflows supply `PORT` and `BASE_PATH`; local and CI builds fall back to port 5173 and the root path.
- `VITE_GOOGLE_MAPS_API_KEY` is optional but required for Google Maps and Places features.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

## Reference

- `CLAUDE.md` — architecture, binding business rules, gotchas that cost real time
- `docs/ACCOUNTS.md` — guest account and host area
- `docs/DESTINATIONS.md` — the destination catalogue
- `audit/REPORT.md` — 63 findings against the old system
