import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { testHostAccommodationsTable } from "./test-host-accommodations";

/**
 * Per-property availability. Blocked ranges are stored as inclusive calendar
 * dates (no time component) so the same block reads identically regardless of
 * the host's or the server's timezone. Manual blocks are owned by the host;
 * `feed` blocks are what the last successful fetch of an iCal feed imported
 * and are replaced wholesale on every fetch.
 */
export const testHostCalendarBlockSource = pgEnum(
  "putko_test_host_calendar_block_source",
  ["manual", "feed"],
);

export const testHostCalendarBlocksTable = pgTable(
  "putko_test_host_calendar_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accommodationId: uuid("accommodation_id")
      .notNull()
      .references(() => testHostAccommodationsTable.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    source: testHostCalendarBlockSource("source").notNull().default("manual"),
    // Identifier of the feed entry inside the accommodation payload's
    // `calendarFeeds` array; null for manual blocks.
    feedId: text("feed_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("putko_test_host_calendar_blocks_accommodation_idx").on(
      table.accommodationId,
      table.startDate,
    ),
  ],
);

/**
 * Fetch status of one iCal feed. The feed definition (label + URL) lives in
 * the accommodation payload so editor Step 8 and the calendar page share one
 * source of truth; this row only records what the server last did with it.
 * `url` is the URL that was fetched: when it no longer matches the payload the
 * status is stale and is discarded on the next read.
 */
export const testHostCalendarFeedFetchStatus = pgEnum(
  "putko_test_host_calendar_feed_status",
  ["never", "ok", "failed"],
);

export const testHostCalendarFeedsTable = pgTable(
  "putko_test_host_calendar_feeds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accommodationId: uuid("accommodation_id")
      .notNull()
      .references(() => testHostAccommodationsTable.id, { onDelete: "cascade" }),
    feedId: text("feed_id").notNull(),
    url: text("url").notNull(),
    status: testHostCalendarFeedFetchStatus("status").notNull().default("never"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastError: text("last_error"),
    importedCount: integer("imported_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("putko_test_host_calendar_feeds_accommodation_feed_idx").on(
      table.accommodationId,
      table.feedId,
    ),
  ],
);

export const insertTestHostCalendarBlockSchema = createInsertSchema(
  testHostCalendarBlocksTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTestHostCalendarBlock = z.infer<
  typeof insertTestHostCalendarBlockSchema
>;
export type TestHostCalendarBlock = typeof testHostCalendarBlocksTable.$inferSelect;

export const insertTestHostCalendarFeedSchema = createInsertSchema(
  testHostCalendarFeedsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTestHostCalendarFeed = z.infer<
  typeof insertTestHostCalendarFeedSchema
>;
export type TestHostCalendarFeed = typeof testHostCalendarFeedsTable.$inferSelect;
