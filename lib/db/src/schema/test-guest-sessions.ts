import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testGuestsTable } from "./test-guests";

export const testGuestSessionsTable = pgTable("putko_test_guest_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  guestId: uuid("guest_id")
    .notNull()
    .references(() => testGuestsTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  activeMode: text("active_mode").notNull().default("guest"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTestGuestSessionSchema = createInsertSchema(
  testGuestSessionsTable,
).omit({ id: true, createdAt: true });
export type InsertTestGuestSession = z.infer<
  typeof insertTestGuestSessionSchema
>;
export type TestGuestSession = typeof testGuestSessionsTable.$inferSelect;