# Getting a public link

The app is `artifacts/web` (Next.js 15). It needs **Postgres with PostGIS** —
the whole browse layer is `ST_DWithin`, so a Postgres without PostGIS cannot
run this.

Whatever you pick, it is two things: a database, and somewhere to run the app.

---

## Option A — Replit

Pull `main`, then in the **Shell** (not the Run button):

```sh
bash scripts/replit-start.sh
```

That is the whole thing. It checks four prerequisites in order and tells
you which one is missing rather than failing quietly:

1. **Is the new code here?** If `artifacts/web` is absent the pull did not
   land, and it prints the git commands to check why.
2. **Dependencies** — runs `pnpm install` if `node_modules` is missing.
3. **Database** — if `DATABASE_URL` is unset it says to create one in the
   Database tab; if the database is empty it runs `setup-db.sh` itself.
4. **Starts the app** on `0.0.0.0:5000`.

Then open the webview, or the `*.replit.dev` URL.

### Why not the Run button

The Run button reads a workflow that Replit may also manage in its UI, so
editing `.replit` does not reliably change what Run does — you press it,
the old thing starts, and nothing tells you why. The script does not depend
on it. (`.replit` does define the workflow, so Run may well work; the
script is what to use when it does not.)

### `-H 0.0.0.0` is not optional

Replit proxies in from outside the container. A server bound to `localhost`
is running perfectly and unreachable — which looks exactly like "nothing
happened".

### If PostGIS is missing

Use Replit's **Database** tab (its Postgres supports PostGIS) rather than a
local Nix `postgresql-16`, which does not ship it. Or point `DATABASE_URL`
at the Render database from Option B and keep running the app on Replit —
set it in Replit **Secrets**, never in a file.

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
