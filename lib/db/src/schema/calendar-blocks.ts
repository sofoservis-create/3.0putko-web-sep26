// lib/db/src/schema/calendar-blocks.ts
//
// THE table. Every source of unavailability — confirmed bookings, checkout
// holds, a host's manual block, an imported iCal event — lives here, in one
// place, so search and booking can never disagree about what "taken" means
// (audit finding H-03: they disagreed in the old system).
//
// Drizzle has no declarative support for `daterange` or `EXCLUDE USING gist`,
// so those two pieces — the actual double-booking guarantee — are added by a
// hand-written custom migration immediately after the one this file
// generates: drizzle/0001_calendar_blocks_exclusion.sql. That is Drizzle's
// documented pattern for a Postgres feature its schema builder doesn't model
// (`drizzle-kit generate --custom`), not a workaround.
//
// `stay` is declared here via customType purely so the TypeScript column
// exists and the generated CREATE TABLE has a placeholder type; the exclusion
// migration is what actually makes it a `daterange` with a working
// constraint. Query code should use raw `sql` for range operators (`&&`,
// `daterange(...)`) until Drizzle's range-type support matures — see
// src/queries/availability.ts.

import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { listingsTable } from "./listings";
import { bookingsTable } from "./bookings";

const daterange = customType<{ data: string }>({
  dataType() {
    return "daterange";
  },
});

export const blockSourceEnum = pgEnum("block_source", [
  "booking",
  "hold",
  "manual",
  "ical",
]);

export const calendarBlocksTable = pgTable(
  "calendar_blocks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listingsTable.id, { onDelete: "cascade" }),

    // Half-open: [check_in, check_out). See the CHECK constraint added in
    // the exclusion migration — audit finding H-08, the old system mixed a
    // closed convention for native bookings with an exclusive-minus-one
    // convention for iCal imports in the SAME array.
    stay: daterange("stay").notNull(),

    source: blockSourceEnum("source").notNull(),
    bookingId: uuid("booking_id").references(() => bookingsTable.id, {
      onDelete: "cascade",
    }),

    // iCal-sourced rows only. feedId has no FK yet — the ical_feeds table
    // is Phase 4 work (docs/REBUILD-PLAN.md); this column exists now so the
    // shape doesn't change later.
    feedId: uuid("feed_id"),
    icsUid: text("ics_uid"), // RFC 5545 UID — stable identity across syncs

    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("calendar_blocks_listing_id_idx").on(table.listingId),
    index("calendar_blocks_booking_id_idx").on(table.bookingId),
  ]
);

export type CalendarBlock = typeof calendarBlocksTable.$inferSelect;
export type NewCalendarBlock = typeof calendarBlocksTable.$inferInsert;
