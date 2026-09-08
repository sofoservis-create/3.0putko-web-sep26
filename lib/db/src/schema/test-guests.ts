import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testGuestsTable = pgTable("putko_test_guests", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  gender: text("gender").notNull(),
  language: text("language").notNull().default("Slovak"),
  role: text("role").notNull().default("guest"),
  hostActivatedAt: timestamp("host_activated_at", { withTimezone: true }),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationTokenHash: text("verification_token_hash"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTestGuestSchema = createInsertSchema(testGuestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTestGuest = z.infer<typeof insertTestGuestSchema>;
export type TestGuest = typeof testGuestsTable.$inferSelect;