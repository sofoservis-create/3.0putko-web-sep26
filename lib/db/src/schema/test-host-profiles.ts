import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testGuestsTable } from "./test-guests";

/**
 * Public Host Profile: what travellers may one day see about a host. It is
 * deliberately separate from the shared account row (name, phone, password
 * stay on `putko_test_guests`) so a host can present a different public
 * name/photo without creating a second identity. One row per user, created
 * on first save; a host without a row simply has no public profile yet.
 */
export const testHostProfilesTable = pgTable("putko_test_host_profiles", {
  guestId: uuid("guest_id")
    .primaryKey()
    .references(() => testGuestsTable.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  about: text("about").notNull().default(""),
  // ISO 639-1 codes the host can communicate in, e.g. ["sk", "en"].
  languages: jsonb("languages").$type<string[]>().notNull().default([]),
  // How quickly the host commits to answering travellers; null = not stated.
  responseTime: text("response_time"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTestHostProfileSchema = createInsertSchema(
  testHostProfilesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertTestHostProfile = z.infer<typeof insertTestHostProfileSchema>;
export type TestHostProfile = typeof testHostProfilesTable.$inferSelect;
