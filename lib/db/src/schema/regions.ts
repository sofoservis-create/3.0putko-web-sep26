// lib/db/src/schema/regions.ts
//
// The 8 kraje and 79 okresy, as real reference tables — audit finding M-09.
// The old system stored region as a free-text, lowercased string with no
// taxonomy at all, which is why "Kosice" and "Košice" were two different
// values and no regional browse page was possible.
//
// Deliberately NOT seeded here. The official codes come from ŠÚ SR (the
// Statistical Office of the Slovak Republic); fabricating 79 rows from memory
// would violate the same "evidence over assumption" rule the audit itself was
// built on. Seed this from the real source before Phase 2 ships regional
// search — see docs/REBUILD-PLAN.md Phase 1.

import { pgTable, text } from "drizzle-orm/pg-core";

export const krajeTable = pgTable("kraje", {
  code: text("code").primaryKey(), // e.g. "SK010" (Bratislavský kraj, NUTS 3)
  name: text("name").notNull(),
});

export const okresyTable = pgTable("okresy", {
  code: text("code").primaryKey(), // LAU code
  name: text("name").notNull(),
  krajCode: text("kraj_code")
    .notNull()
    .references(() => krajeTable.code),
});

export type Kraj = typeof krajeTable.$inferSelect;
export type Okres = typeof okresyTable.$inferSelect;
