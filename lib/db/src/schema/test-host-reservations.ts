import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testGuestsTable } from "./test-guests";
import { testHostAccommodationsTable } from "./test-host-accommodations";

/**
 * Booking requests for the development Host workspace.
 *
 * Ownership is never stored here: a reservation belongs to whoever owns its
 * accommodation, and every host endpoint resolves that on the server.
 *
 * `status` is the stored lifecycle (what the host or guest decided); the
 * operational stage a host sees (request / upcoming / active / completed /
 * declined / cancelled) is derived from `status` plus today's date, so it
 * never needs a background job to stay correct.
 *
 * Stays are stored as check-in and check-out calendar dates (check-out is
 * exclusive, like every booking system), so the blocked nights are
 * `checkIn .. checkOut - 1` in the availability calendar.
 */
export const testHostReservationStatus = pgEnum(
  "putko_test_host_reservation_status",
  ["requested", "accepted", "declined", "cancelled"],
);

export const testHostReservationsTable = pgTable(
  "putko_test_host_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accommodationId: uuid("accommodation_id")
      .notNull()
      .references(() => testHostAccommodationsTable.id, { onDelete: "cascade" }),
    // The travelling guest when they have a Putko account; sample requests
    // created by the development fixtures have none.
    guestId: uuid("guest_id").references(() => testGuestsTable.id, {
      onDelete: "set null",
    }),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email"),
    guestPhone: text("guest_phone"),
    guestMessage: text("guest_message"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    guests: integer("guests").notNull().default(1),
    // Money is stored in minor units at request time so a later price edit
    // on the listing never rewrites what the guest was quoted.
    nightlyPriceCents: integer("nightly_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    status: testHostReservationStatus("status").notNull().default("requested"),
    // "putko" for requests that came through a booking flow, "fixture" for
    // development sample data so it can be told apart and cleaned up.
    source: text("source").notNull().default("putko"),
    // Who ended an accepted stay: "host" | "guest".
    cancelledBy: text("cancelled_by"),
    hostNote: text("host_note"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("putko_test_host_reservations_accommodation_idx").on(
      table.accommodationId,
      table.checkIn,
    ),
  ],
);

export const insertTestHostReservationSchema = createInsertSchema(
  testHostReservationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTestHostReservation = z.infer<
  typeof insertTestHostReservationSchema
>;
export type TestHostReservation = typeof testHostReservationsTable.$inferSelect;
