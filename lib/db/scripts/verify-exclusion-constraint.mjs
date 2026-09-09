#!/usr/bin/env node
// lib/db/scripts/verify-exclusion-constraint.mjs
//
// Re-runnable proof that calendar_blocks_no_overlap actually does what it
// claims. Run this against a throwaway database after every migration
// change that touches calendar_blocks — it is the gate
// docs/REBUILD-PLAN.md Phase 1 calls for: "write this test first and watch
// it fail before the constraint exists."
//
// Usage:
//   DATABASE_URL=postgresql://putko:putko@localhost:5432/putko \
//     node scripts/verify-exclusion-constraint.mjs
//
// Exits 0 and prints "ALL PASS" only if every assertion held. Any single
// unexpected result exits 1 with the mismatch printed — this is meant to be
// wired into CI once one exists, not just read by a human.

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required — point it at a throwaway database, never production.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

let failures = 0;

/**
 * Run a query, expecting either success or a specific Postgres error code.
 *
 * Wrapped in its own SAVEPOINT: a Postgres transaction aborts ENTIRELY after
 * any error and refuses every subsequent query until it is rolled back (error
 * 25P02) — SAVEPOINT/ROLLBACK TO is what lets a deliberately-failing
 * assertion not poison every assertion that runs after it in the same outer
 * transaction. (Found by actually running this the first time, without
 * savepoints — every assertion after the first expected failure came back
 * 25P02 regardless of merit. The fix belongs here, not in the schema.)
 */
let savepointCounter = 0;
async function expect(label, sqlText, params, expected) {
  const sp = `sp_${savepointCounter++}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    await client.query(sqlText, params);
    if (expected.ok) {
      console.log(`  PASS  ${label}`);
    } else {
      console.error(`  FAIL  ${label} — expected error ${expected.code}, but it succeeded`);
      failures++;
    }
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    if (!expected.ok && err.code === expected.code) {
      console.log(`  PASS  ${label} (rejected: ${err.code} ${expected.code === "23P01" ? "exclusion_violation" : "check_violation"})`);
      return;
    } else if (expected.ok) {
      console.error(`  FAIL  ${label} — expected success, got ${err.code}: ${err.message}`);
    } else {
      console.error(`  FAIL  ${label} — expected ${expected.code}, got ${err.code}: ${err.message}`);
    }
    failures++;
    return;
  }
  await client.query(`RELEASE SAVEPOINT ${sp}`);
}

async function run() {
  console.log("Setting up: one host, two listings, on a fresh schema...");
  await client.query("BEGIN");
  await client.query(`
    INSERT INTO putko_test_guests (email, password_hash, name, last_name, phone_number, gender)
    VALUES ('verify-script@example.test', 'x', 'Test', 'Host', '+421900000000', 'other')
  `);
  await client.query(`
    INSERT INTO listings (host_id, slug, name, base_price_cents, max_guests, min_nights)
    SELECT id, 'verify-listing-a', 'A', 8000, 4, 1 FROM putko_test_guests
    WHERE email = 'verify-script@example.test'
  `);
  await client.query(`
    INSERT INTO listings (host_id, slug, name, base_price_cents, max_guests, min_nights)
    SELECT id, 'verify-listing-b', 'B', 5000, 2, 1 FROM putko_test_guests
    WHERE email = 'verify-script@example.test'
  `);

  const claim = (slug, start, end) => [
    `INSERT INTO calendar_blocks (listing_id, stay, source)
     SELECT id, daterange($2, $3, '[)'), 'booking' FROM listings WHERE slug = $1`,
    [slug, start, end],
  ];

  console.log("\nRunning assertions:");

  await expect(
    "claim 10-12 Sep on listing A",
    ...claim("verify-listing-a", "2026-09-10", "2026-09-12"),
    { ok: true }
  );
  await expect(
    "claim back-to-back 12-14 Sep, same listing (half-open — must not phantom-conflict)",
    ...claim("verify-listing-a", "2026-09-12", "2026-09-14"),
    { ok: true }
  );
  await expect(
    "claim overlapping 11-13 Sep, same listing (THE double-booking guarantee)",
    ...claim("verify-listing-a", "2026-09-11", "2026-09-13"),
    { ok: false, code: "23P01" } // exclusion_violation
  );
  await expect(
    "claim the identical 10-12 Sep range on a DIFFERENT listing (per-listing scope)",
    ...claim("verify-listing-b", "2026-09-10", "2026-09-12"),
    { ok: true }
  );

  await client.query(`
    UPDATE calendar_blocks SET released_at = now()
    WHERE listing_id = (SELECT id FROM listings WHERE slug = 'verify-listing-a')
      AND stay = daterange('2026-09-10', '2026-09-12', '[)')
  `);
  await expect(
    "re-claim the just-released 10-12 Sep range (release actually frees it)",
    ...claim("verify-listing-a", "2026-09-10", "2026-09-12"),
    { ok: true }
  );
  await expect(
    "claim a zero-night range, check_in = check_out (must be rejected)",
    ...claim("verify-listing-b", "2026-09-20", "2026-09-20"),
    { ok: false, code: "23514" } // check_violation
  );

  // Always roll back — this script must never leave data behind, in a
  // throwaway database or (despite the warning above) anywhere else.
  await client.query("ROLLBACK");

  console.log("");
  if (failures === 0) {
    console.log("ALL PASS — the exclusion constraint enforces exactly what it claims to.");
    process.exit(0);
  } else {
    console.error(`${failures} assertion(s) FAILED.`);
    process.exit(1);
  }
}

try {
  await run();
} catch (err) {
  console.error("Script error:", err);
  try {
    await client.query("ROLLBACK");
  } catch {}
  process.exit(1);
} finally {
  await client.end();
}
