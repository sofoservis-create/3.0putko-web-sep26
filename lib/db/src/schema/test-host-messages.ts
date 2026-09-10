import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testGuestsTable } from "./test-guests";
import { testHostAccommodationsTable } from "./test-host-accommodations";
import { testHostReservationsTable } from "./test-host-reservations";

/**
 * Host ↔ guest messaging for the development Host workspace.
 *
 * A conversation is always about one listing and optionally about one
 * reservation of that listing. Its two participants are:
 * - the host: whoever owns the accommodation (never stored here, resolved on
 *   the server exactly like reservations), and
 * - the guest: `guestId` when the traveller has a Putko account; sample
 *   threads created by the development fixtures only carry a name.
 * Nobody else can read or write a thread.
 *
 * Read state is per participant and lives on the conversation
 * (`hostLastReadAt` / `guestLastReadAt`): a message is unread for a
 * participant when it was sent by the other side after that timestamp. That
 * keeps "mark as read" a single update and unread counts a single query.
 */
export const testHostMessageSender = pgEnum("putko_test_host_message_sender", [
  "host",
  "guest",
]);

export const testHostConversationsTable = pgTable(
  "putko_test_host_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accommodationId: uuid("accommodation_id")
      .notNull()
      .references(() => testHostAccommodationsTable.id, { onDelete: "cascade" }),
    // At most one thread per reservation; listing-only threads have none.
    reservationId: uuid("reservation_id").references(
      () => testHostReservationsTable.id,
      { onDelete: "set null" },
    ),
    guestId: uuid("guest_id").references(() => testGuestsTable.id, {
      onDelete: "set null",
    }),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email"),
    // "putko" for threads started through a booking flow, "fixture" for
    // development sample data so it can be told apart and cleaned up.
    source: text("source").notNull().default("putko"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    hostLastReadAt: timestamp("host_last_read_at", { withTimezone: true }),
    guestLastReadAt: timestamp("guest_last_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("putko_test_host_conversations_accommodation_idx").on(
      table.accommodationId,
      table.lastMessageAt,
    ),
    uniqueIndex("putko_test_host_conversations_reservation_idx").on(
      table.reservationId,
    ),
  ],
);

export const testHostMessagesTable = pgTable(
  "putko_test_host_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => testHostConversationsTable.id, { onDelete: "cascade" }),
    senderRole: testHostMessageSender("sender_role").notNull(),
    // The account that sent it; null for fixture guests without an account.
    senderId: uuid("sender_id").references(() => testGuestsTable.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    // Client-generated idempotency key: a retried send after a network
    // failure reuses it, so the same message can never be stored twice.
    clientKey: text("client_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("putko_test_host_messages_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    uniqueIndex("putko_test_host_messages_client_key_idx").on(
      table.conversationId,
      table.clientKey,
    ),
  ],
);

export const insertTestHostConversationSchema = createInsertSchema(
  testHostConversationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTestHostConversation = z.infer<
  typeof insertTestHostConversationSchema
>;
export type TestHostConversation = typeof testHostConversationsTable.$inferSelect;

export const insertTestHostMessageSchema = createInsertSchema(
  testHostMessagesTable,
).omit({ id: true, createdAt: true });
export type InsertTestHostMessage = z.infer<typeof insertTestHostMessageSchema>;
export type TestHostMessage = typeof testHostMessagesTable.$inferSelect;
