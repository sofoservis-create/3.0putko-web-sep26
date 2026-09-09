# Getting a public link

The app is `artifacts/web` (Next.js 15). It needs **Postgres with PostGIS** —
the whole browse layer is `ST_DWithin`, so a Postgres without PostGIS cannot
run this.

Whatever you pick, it is two things: a database, and somewhere to run the app.

---

## Option A — Replit (simplest; already wired)

Everything is configured: `.replit` has the Run workflow, bound to
`0.0.0.0:5000` because Replit proxies from outside the container.

1. Open the Repl and pull `main`.
2. In the Shell, once:
   ```sh
   bash scripts/setup-db.sh
   ```
   Extensions → migrations → seed. Idempotent, safe to re-run.
3. Press **Run**. The link is the `*.replit.dev` URL in the webview.

**The one risk:** Replit's Postgres may not have PostGIS. The script checks
and stops with a clear sentence if it is missing rather than dying halfway
through a migration. If it does stop, use the database from Option B and
keep running the app on Replit — set `DATABASE_URL` in Replit **Secrets**
(not in a file) and re-run the script.

---

## Option B — Render Postgres + Vercel

Better for showing someone: a real domain, and it stays up.

**Database** — `putko-db` already exists in Frankfurt from `render.yaml`, and
Render Postgres supports PostGIS. It is empty; nothing has ever been migrated
into it. Take its **External Database URL** from the Render dashboard and, on
any machine with `psql` and this repo:

```sh
DATABASE_URL='<external url from Render>' bash scripts/setup-db.sh
```

**App** — import the GitHub repo into Vercel:

| Setting | Value |
|---|---|
| Root Directory | `artifacts/web` |
| Framework | Next.js (detected) |
| Install Command | `pnpm install` |
| Environment variable | `DATABASE_URL` = the same Render external URL |

Vercel gives you `*.vercel.app` immediately, and a custom domain later.

---

## Option C — everything on Render

One provider, one bill. Add a web service to `render.yaml` pointing at
`artifacts/web`, with `DATABASE_URL` wired from `putko-db` via
`fromDatabase`. Slower cold starts on the free tier than Vercel, but the
database connection is internal rather than crossing the public internet.

---

## Things that will bite you, already handled

**The build must work without a database.** Every host builds before it runs,
and `next build` imports each page to collect its config. `lib/db/src/index.ts`
used to throw `DATABASE_URL must be set` at import time, so the build died
before rendering anything — on any host. The pool and the Drizzle handle are
now created on first use instead. Verified by building with the variable
unset, twice: the first fix moved the error rather than removing it, because
`drizzle()` reads a property off the client while constructing.

**Never run `drizzle-kit push` against a deployed database.** `listings.geog`
and `destinations.centre` are PostGIS columns drizzle-kit cannot express, so
they live in hand-written migrations. push diffs the TypeScript schema and
would create every table without them: the schema would look complete and
every geographic query would fail. `scripts/setup-db.sh` and
`scripts/post-merge.sh` both use `migrate`.

**Demo data is dev-only.** `setup-db.sh` skips the demo listings and accounts
when `NODE_ENV=production`, and the seed scripts refuse to run under it. A
production deploy gets the 35 destinations and nothing else — which means an
empty home page grid until real listings exist. That is correct: the grid
never shows a destination with nothing in it.

**Demo login**, where the demo data is seeded:
`demo-hostka@putko.example` (guest), `demo-host@putko.example` (host),
password `putko-demo-2026`.
