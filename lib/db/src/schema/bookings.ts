// lib/db/src/schema/bookings.ts
//
// One status column, not the old system's three-fields-with-no-guard
// (isApproved / paymentStatus / payoutStatus). See audit/ARCHITECTURE.md
// section 2 for the eight illegal transitions that spread state made
// possible — a single enum with application-enforced transitions closes
// all of them at once, by construction rather than by discipline.
//
// checkIn/checkOut are `date`, not `timestamptz` — audit finding H-09: the
// old system's timezone handling drifted between subsystems because a
// calendar date was sometimes stored as an instant. A stay is a pair of
// calendar dates, full stop; there is no timezone to get wrong if the column
// itself cannot hold one.

import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { listingsTable } from "./listings";

export const bookingStatusEnum = pgEnum("booking_status", [
  "draft",
  "request_pending", // host has not yet approved a "request to book"
  "awaiting_payment", // dates are held, Stripe Checkout session open
  "confirmed", // paid and finalized
  "cancelled",
  "completed", // check-out has passed with no cancellation
]);

export const bookingsTable = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listingsTable.id, { onDelete: "restrict" }),

    // Guests can book without an account (matches the current product);
    // identity is the booking's own fields, not a foreign key.
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone"),
    // Guest minimum age 18 (audit finding M-04 — unenforced in the old
    // system). One of these two is required at booking time; enforced in
    // application code, checked here so the evidence is on the row.
    guestDateOfBirth: date("guest_date_of_birth"),
    guestConfirmedAdultAt: timestamp("guest_confirmed_adult_at", {
      withTimezone: true,
    }),

    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    guestCount: integer("guest_count").notNull(),

    status: bookingStatusEnum("status").notNull().default("draft"),

    // Integer cents throughout. totalCents is server-computed from the
    // listing at booking time, never accepted from a client.
    totalCents: integer("total_cents").notNull(),
    commissionCents: integer("commission_cents").notNull(),
    hostPayoutCents: integer("host_payout_cents").notNull(),

    // The cancellation policy tiers, snapshotted at booking time — the one
    // piece of the old system's design that was CORRECT (audit: no refund
    // path ever JOINed back to the listing) and is carried over unchanged.
    // Shape: [{ hoursBefore: number, refundPercent: number }, ...]
    cancellationPolicySnapshot: jsonb("cancellation_policy_snapshot").notNull(),

    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id"),
    stripeTransferId: text("stripe_transfer_id"),
    stripeRefundId: text("stripe_refund_id"),
    refundedCents: integer("refunded_cents").notNull().default(0),

    cancelledBy: text("cancelled_by"), // 'guest' | 'host' | 'admin'
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),

    // legacy_mongo_id makes the ETL from the old MongoDB idempotent — see
    // docs/REBUILD-PLAN.md Phase 2. Nullable: only rows created by the ETL
    // carry one; bookings made natively on the new platform have none.
    legacyMongoId: text("legacy_mongo_id").unique(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bookings_listing_id_idx").on(table.listingId),
    index("bookings_status_idx").on(table.status),
    index("bookings_guest_email_idx").on(table.guestEmail),
  ]
);

export type Booking = typeof bookingsTable.$inferSelect;
export type NewBooking = typeof bookingsTable.$inferInsert;
