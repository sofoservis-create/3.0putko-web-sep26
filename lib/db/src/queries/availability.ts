// lib/db/src/queries/availability.ts
//
// The only place application code should claim or release dates. Raw `sql`,
// not Drizzle's query builder — daterange/EXCLUDE are not something Drizzle
// models, so the safety here comes entirely from the database constraint in
// drizzle/0002_geography_and_exclusion.sql, proven by
// scripts/verify-exclusion-constraint.mjs. This module does not add any
// correctness of its own; it just gives the constraint a clean call site
// and turns its one failure mode into a typed result instead of a thrown
// Postgres error leaking into a route handler.

import { sql } from "drizzle-orm";
import type { db as Db } from "../index";

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: "dates_unavailable" };

/**
 * Atomically claim [checkIn, checkOut) on a listing for a hold or a booking.
 *
 * Safe under concurrency by construction: the exclusion constraint is
 * evaluated by Postgres inside this INSERT's own lock, so two callers racing
 * for the same dates cannot both succeed — the loser gets a real 23P01 from
 * the database, not a stale in-application read. There is no "check, then
 * insert" here for exactly that reason; a separate SELECT first would
 * reintroduce the race this function exists to close.
 *
 * Expired holds on THIS listing are cleared first, in the same transaction,
 * so a lapsed hold cannot block a legitimate new claim — but a still-live
 * hold blocks exactly like a confirmed booking does, which is the point.
 */
export async function claimDates(
  db: typeof Db,
  params: {
    listingId: string;
    checkIn: string; // 'YYYY-MM-DD'
    checkOut: string; // 'YYYY-MM-DD'
    source: "booking" | "hold" | "manual";
    bookingId?: string;
    holdExpiresAt?: Date;
  }
): Promise<ClaimResult> {
  const { listingId, checkIn, checkOut, source, bookingId, holdExpiresAt } = params;

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM calendar_blocks
       WHERE listing_id = ${listingId}
         AND source = 'hold'
         AND released_at IS NULL
         AND hold_expires_at <= now()
    `);

    try {
      await tx.execute(sql`
        INSERT INTO calendar_blocks (listing_id, stay, source, booking_id, hold_expires_at)
        VALUES (
          ${listingId},
          daterange(${checkIn}::date, ${checkOut}::date, '[)'),
          ${source},
          ${bookingId ?? null},
          ${holdExpiresAt ?? null}
        )
      `);
      return { ok: true };
    } catch (err) {
      // 23P01 = exclusion_violation. Drizzle wraps the raw `pg` error in a
      // DrizzleQueryError and puts the ORIGINAL error on `.cause` — the
      // Postgres error code is not on `err.code` directly. Confirmed by
      // actually running this against the constraint (scripts had this
      // exact bug on the first pass: the conflict fired correctly in
      // Postgres but this function let the DrizzleQueryError propagate
      // uncaught instead of returning the typed result).
      //
      // Checked at both levels rather than assuming one: `.cause` is the
      // documented Drizzle wrapping today, but a raw pg error thrown
      // directly (a different code path, a future Drizzle version) would
      // carry the code at the top level instead.
      const code =
        (err as { code?: string }).code ??
        (err as { cause?: { code?: string } }).cause?.code;

      if (code === "23P01") {
        return { ok: false, reason: "dates_unavailable" };
      }
      throw err;
    }
  });
}

/** Release a block — a cancelled booking, an abandoned checkout, a lifted manual block. */
export async function releaseBlock(db: typeof Db, blockId: string): Promise<void> {
  await db.execute(sql`
    UPDATE calendar_blocks SET released_at = now()
     WHERE id = ${blockId} AND released_at IS NULL
  `);
}
