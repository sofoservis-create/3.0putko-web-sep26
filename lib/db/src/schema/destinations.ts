// lib/db/src/schema/destinations.ts
//
// Curated travel destinations — the "Obľúbené miesta na Slovensku" browse
// layer. This is the editorial counterpart to the administrative kraje/okresy
// in regions.ts: Liptov, Orava and Slovenský raj are how people actually
// decide where to go, and none of them is an administrative unit.
//
// HOW A LISTING BELONGS TO A DESTINATION
//
// By geography, not by a foreign key: each destination is a centre point plus
// a radius, and a listing belongs to it if it falls inside
// (ST_DWithin against listings.geog, which is GiST-indexed). Three reasons:
//
//   1. It cannot go stale. Add a listing anywhere in Slovakia and it appears
//      in the right destinations immediately, with no tagging step and no
//      admin action. That is what makes this "compatible with our
//      accommodations" by construction rather than by discipline.
//   2. Overlap is correct here. A chata near Štrbské pleso genuinely is in
//      both Vysoké Tatry and the wider Tatry — a listing belonging to several
//      destinations is the truth, not a data error.
//   3. It needs no okres data. The 79 okresy still aren't seeded (real ŠÚ SR
//      codes required, see regions.ts); this works without them.
//
// The counts that appear on the tiles are therefore always live COUNT(*) —
// never a stored number that can drift from reality, which is exactly the
// failure the current site ships (audit/DESIGN-AUDIT.md D-01: a hero claiming
// "1433+ ubytovaní" above a page listing 6).

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const destinationKindEnum = pgEnum("destination_kind", [
  "region", // Liptov, Orava, Spiš — historical/travel regions
  "mountains", // Vysoké Tatry, Nízke Tatry, Malá Fatra
  "city", // Bratislava, Košice
  "thermal", // Bešeňová, Piešťany — spa & aquapark destinations
  "heritage", // Banská Štiavnica, Spišský hrad — UNESCO & castles
  "nature", // Slovenský raj, Pieniny
]);

export const destinationsTable = pgTable(
  "destinations",
  {
    // Slug is the primary key: it's the URL (/miesta/vysoke-tatry) and it's
    // stable, which a generated uuid would not be for editorial content.
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    kind: destinationKindEnum("kind").notNull(),

    // Nesting, for disambiguating what Mega Ubytovanie gets wrong — they show
    // "Tatry", "Vysoké Tatry" and "Nízke Tatry" as three sibling tiles, which
    // reads as three separate places when one contains the other two. A
    // parent lets the UI show one level at a time and drill in.
    //
    // Self-referencing FK, so a typo'd or deleted parent cannot leave an
    // orphan tile pointing at nothing. ON DELETE SET NULL rather than
    // CASCADE: removing "Tatry" should promote its children to top level,
    // not delete Vysoké and Nízke Tatry along with it.
    parentSlug: text("parent_slug").references(
      (): AnyPgColumn => destinationsTable.slug,
      { onDelete: "set null", onUpdate: "cascade" }
    ),

    // centre geography(Point, 4326) + radiusM define membership.
    // The column itself is added in the custom migration — PostGIS geography
    // columns cannot be declared through Drizzle's customType(); see the note
    // in listings.ts and CLAUDE.md.
    radiusM: integer("radius_m").notNull(),

    heroImageUrl: text("hero_image_url"),
    // One honest sentence, shown on the destination page. Not marketing copy.
    description: text("description"),

    // Editorial ordering for equal-footing destinations; the home page still
    // ranks primarily by live listing count, so an empty destination cannot
    // occupy a prominent slot however this is set.
    sortOrder: integer("sort_order").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("destinations_kind_idx").on(table.kind),
    index("destinations_parent_idx").on(table.parentSlug),
    index("destinations_active_idx").on(table.isActive),
    // A zero or negative radius would make ST_DWithin match nothing and the
    // tile silently show "0 možností" forever — a data error that looks
    // exactly like "no listings here yet". Reject it at write time instead.
    check("destinations_radius_positive", sql`${table.radiusM} > 0`),
    // No destination is its own parent. Postgres won't catch this with a
    // self-FK (a row can reference itself), and it would make any recursive
    // walk of the tree loop.
    check(
      "destinations_parent_not_self",
      sql`${table.parentSlug} IS NULL OR ${table.parentSlug} <> ${table.slug}`
    ),
  ]
);

export type Destination = typeof destinationsTable.$inferSelect;
export type NewDestination = typeof destinationsTable.$inferInsert;
