// lib/db/src/schema/listings.ts
//
// One listing = one bookable property. `host_id` points at the existing
// guest/host identity table (test_guests) rather than a new one — that table
// already models the dual guest/host account the product needs
// (hostActivatedAt), and duplicating identity was the mistake to avoid here.
//
// Money is integer cents throughout (audit finding: floats touching money are
// CRITICAL). Region taxonomy (okres_code) and the geography column are
// declared now so search (M-07/M-08/M-09 in the audit) has somewhere to land
// without a later migration — they're nullable until listings are geocoded
// and the kraje/okresy reference tables are seeded with real ŠÚ SR data,
// which is separate follow-up work, not fabricated here.

import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { testGuestsTable } from "./test-guests";
import { okresyTable } from "./regions";

// `geog geography(Point, 4326)` is NOT declared as a Drizzle column below.
// drizzle-kit's generator quotes a customType dataType() containing a type
// modifier — `"geography(Point, 4326)"` — as if it were a single identifier,
// which Postgres then rejects outright ("type ... does not exist"; verified
// against a real database, not assumed). PostGIS geography/geometry columns
// with a modifier are a known gap in drizzle-kit's SQL generation.
//
// The column is added by the same hand-written migration that adds
// calendar_blocks' daterange exclusion constraint —
// drizzle/0002_geography_and_exclusion.sql — where it can be written as
// plain, correct SQL. Query code reaches it via raw `sql` (search already
// needs that for ST_DWithin), so there is no ORM-level cost to keeping it
// out of the generated DDL.

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending",
  "published",
]);

// Exactly three fixed tiers, per the business rule — no 'custom'. The old
// system's 'custom' option (audit finding L-01) does not exist here.
export const cancellationPolicyEnum = pgEnum("cancellation_policy", [
  "flexible",
  "standard",
  "strict",
]);

export const rentalFormEnum = pgEnum("rental_form", [
  "entire_place",
  "private_room",
  "shared_room",
]);

export const listingsTable = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    hostId: uuid("host_id")
      .notNull()
      .references(() => testGuestsTable.id, { onDelete: "cascade" }),

    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    propertyType: text("property_type"),
    rentalForm: rentalFormEnum("rental_form"),

    // Every guest count / capacity figure the search and booking gate need.
    maxGuests: integer("max_guests").notNull().default(1),
    minNights: integer("min_nights").notNull().default(1),
    maxNights: integer("max_nights"),

    basePriceCents: integer("base_price_cents").notNull(),
    perPersonPriceCents: integer("per_person_price_cents"),

    status: listingStatusEnum("status").notNull().default("draft"),
    cancellationPolicy: cancellationPolicyEnum("cancellation_policy")
      .notNull()
      .default("standard"),

    // podnikateľ / nepodnikateľ — read from the host's own billing subject
    // type, not duplicated here; kept off this table on purpose so it can
    // never drift from the host record it describes.

    // Address / region. okresCode nullable until the region tables are
    // seeded; geog nullable until the listing is geocoded.
    streetAddress: text("street_address"),
    city: text("city"),
    okresCode: text("okres_code").references(() => okresyTable.code),
    // geog geography(Point, 4326) — see the note above; added by
    // drizzle/0002_geography_and_exclusion.sql, not here.

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("listings_host_id_idx").on(table.hostId),
    index("listings_status_idx").on(table.status),
    index("listings_okres_idx").on(table.okresCode),
    // The GiST spatial index on `geog` is created in
    // drizzle/0002_geography_and_exclusion.sql, alongside the column itself.
  ]
);

export type Listing = typeof listingsTable.$inferSelect;
export type NewListing = typeof listingsTable.$inferInsert;
