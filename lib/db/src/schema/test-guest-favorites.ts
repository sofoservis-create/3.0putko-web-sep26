import {
  primaryKey,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testGuestsTable } from "./test-guests";

export const testGuestFavoritesTable = pgTable(
  "putko_test_guest_favorites",
  {
    guestId: uuid("guest_id")
      .notNull()
      .references(() => testGuestsTable.id, { onDelete: "cascade" }),
    accommodationId: text("accommodation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.guestId, table.accommodationId] }),
  ],
);

export const insertTestGuestFavoriteSchema = createInsertSchema(
  testGuestFavoritesTable,
).omit({ createdAt: true });
export type InsertTestGuestFavorite = z.infer<
  typeof insertTestGuestFavoriteSchema
>;
export type TestGuestFavorite = typeof testGuestFavoritesTable.$inferSelect;