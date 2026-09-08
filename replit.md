# Putko

Putko is a Slovak accommodation marketplace for discovering verified stays, booking trips, managing reservations, and hosting properties.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/putko run dev` — run the Putko web app through its managed artifact workflow
- `pnpm --filter @workspace/putko run build` — create the production web bundle
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/putko/` — migrated React + Vite web app
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
