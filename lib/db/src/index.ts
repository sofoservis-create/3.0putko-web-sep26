import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// The connection is created on FIRST USE, not when this module is imported.
//
// It used to throw at import time, which broke every deploy: `next build`
// imports each page to collect its config, that import reaches this file,
// and the build died with "DATABASE_URL must be set" before a single page
// was rendered — on Vercel, on Render, anywhere. Verified by running the
// build with the variable unset, which is what a fresh host looks like.
//
// A build does not need a database; a request does. So the check moves to
// the moment a query is actually attempted, where the error message can
// still be this clear.
let created: pg.Pool | undefined;

function ensurePool(): pg.Pool {
  if (!created) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    created = new Pool({ connectionString });
  }
  return created;
}

// A Proxy so `pool` stays a normal-looking value for every caller while the
// real Pool is constructed on the first property access. Methods are bound
// to the real pool — `pool.query(...)` must run with `this` as the Pool, not
// as the Proxy, or pg loses track of its own internals.
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    const real = ensurePool();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(ensurePool(), prop);
  },
});

// `db` is lazy for the same reason, and it needs its own Proxy rather than
// riding on the pool's: drizzle() reads a property off the client while
// CONSTRUCTING the database handle, which was enough to trigger the pool
// Proxy and throw during `next build` all over again. Found by running the
// build with DATABASE_URL unset a second time — the first fix moved the
// error rather than removing it.
let handle: ReturnType<typeof drizzle<typeof schema>> | undefined;

function ensureDb() {
  if (!handle) handle = drizzle(ensurePool(), { schema });
  return handle;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const real = ensureDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(ensureDb(), prop);
  },
});

export * from "./schema";
