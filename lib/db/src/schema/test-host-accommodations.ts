import {
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testGuestsTable } from "./test-guests";

export const testHostAccommodationStatus = pgEnum(
  "putko_test_host_accommodation_status",
  ["DRAFT", "READY", "LIVE"],
);

export const testHostAccommodationsTable = pgTable(
  "putko_test_host_accommodations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => testGuestsTable.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    status: testHostAccommodationStatus("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
);

export const insertTestHostAccommodationSchema = createInsertSchema(
  testHostAccommodationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertTestHostAccommodation = z.infer<
  typeof insertTestHostAccommodationSchema
>;
export type TestHostAccommodation =
  typeof testHostAccommodationsTable.$inferSelect;