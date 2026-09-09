#!/usr/bin/env node
// lib/db/scripts/migrate.mjs
//
// Applies the migrations and, when one fails, SAYS WHY.
//
// Why not `drizzle-kit migrate`: it swallows the Postgres error. A failing
// migration prints "applying migrations..." and exits 1 — no error code, no
// message, no indication of which file or which statement. That is not a
// theoretical complaint: the first real deploy hit it, and the visible
// output was a spinner followed by `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`,
// which sent us looking for a PostGIS problem that did not exist.
//
// Fully interchangeable with drizzle-kit. The ledger format is identical —
// verified against a database drizzle-kit had migrated: `hash` is the
// SHA-256 of the migration file and `created_at` is the journal's `when`.
// So you can run either tool, in any order, on the same database.
//
//   DATABASE_URL=... node scripts/migrate.mjs

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(here, "..", "drizzle");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const journal = JSON.parse(
  readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8")
);

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
await client.query(`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`);

const applied = new Set(
  (await client.query(`SELECT hash FROM drizzle.__drizzle_migrations`)).rows.map(
    (r) => r.hash
  )
);

let ran = 0;

for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
  const file = join(drizzleDir, `${entry.tag}.sql`);
  const sqlText = readFileSync(file, "utf8");
  const hash = createHash("sha256").update(sqlText).digest("hex");

  if (applied.has(hash)) {
    console.log(`  = ${entry.tag} (already applied)`);
    continue;
  }

  // Each migration is one transaction: it applies completely or not at all,
  // so a failure halfway cannot leave the schema in a state no migration
  // describes.
  const statements = sqlText
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  await client.query("BEGIN");
  try {
    for (const [i, statement] of statements.entries()) {
      try {
        await client.query(statement);
      } catch (err) {
        // The whole point of this script.
        console.error(`\n  ✗ ${entry.tag} failed on statement ${i + 1}/${statements.length}\n`);
        console.error(`    Postgres says: ${err.code ?? "?"} ${err.message}`);
        if (err.detail) console.error(`    Detail: ${err.detail}`);
        if (err.hint) console.error(`    Hint: ${err.hint}`);
        console.error(`\n    The statement:\n`);
        console.error(
          statement.split("\n").slice(0, 20).map((l) => `      ${l}`).join("\n")
        );
        console.error(`\n    File: lib/db/drizzle/${entry.tag}.sql\n`);
        throw err;
      }
    }
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when]
    );
    await client.query("COMMIT");
    console.log(`  + ${entry.tag}`);
    ran++;
  } catch {
    await client.query("ROLLBACK");
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log(
  ran === 0 ? "\nAlready up to date." : `\n${ran} migration(s) applied.`
);
