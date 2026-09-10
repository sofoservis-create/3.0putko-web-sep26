import {
  db,
  testHostAccommodationsTable,
  testHostCalendarBlocksTable,
  testHostCalendarFeedsTable,
  testHostConversationsTable,
  testHostReservationsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { requireHostGuest } from "../lib/test-guest-auth";
import { utcToday } from "../lib/test-host-calendar";
import { buildDashboardSummary } from "../lib/test-host-dashboard";
import { hostUnreadCounts } from "./test-host-messages";

/**
 * Today dashboard summary for the development Host workspace.
 *
 * One read-only endpoint that aggregates the host's modules — listings,
 * reservations, calendar (blocks + feed status), messages and payout
 * readiness — into prioritised task lists. It stores nothing and reuses the
 * modules' own derivation rules (`stageOf`, `accommodationCompletion`,
 * `findStayConflicts`, `payoutReadiness`, host unread counts), so a number
 * shown on Today always equals what the owning module shows.
 */

const router: IRouter = Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
});

router.get("/test-auth/host-dashboard", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const today = utcToday();

  const listings = await db
    .select({
      id: testHostAccommodationsTable.id,
      status: testHostAccommodationsTable.status,
      data: testHostAccommodationsTable.data,
      updatedAt: testHostAccommodationsTable.updatedAt,
    })
    .from(testHostAccommodationsTable)
    .where(eq(testHostAccommodationsTable.ownerId, auth.guest.id));
  const listingIds = listings.map((listing) => listing.id);

  if (listingIds.length === 0) {
    res.json(
      buildDashboardSummary({
        today,
        listings: [],
        reservations: [],
        blocks: [],
        feedStatuses: [],
        conversations: [],
      }),
    );
    return;
  }

  const [reservations, blocks, feedStatuses, conversations] = await Promise.all([
    db
      .select({
        id: testHostReservationsTable.id,
        accommodationId: testHostReservationsTable.accommodationId,
        guestName: testHostReservationsTable.guestName,
        checkIn: testHostReservationsTable.checkIn,
        checkOut: testHostReservationsTable.checkOut,
        status: testHostReservationsTable.status,
        createdAt: testHostReservationsTable.createdAt,
      })
      .from(testHostReservationsTable)
      .where(inArray(testHostReservationsTable.accommodationId, listingIds)),
    db
      .select({
        accommodationId: testHostCalendarBlocksTable.accommodationId,
        startDate: testHostCalendarBlocksTable.startDate,
        endDate: testHostCalendarBlocksTable.endDate,
        source: testHostCalendarBlocksTable.source,
        note: testHostCalendarBlocksTable.note,
      })
      .from(testHostCalendarBlocksTable)
      .where(inArray(testHostCalendarBlocksTable.accommodationId, listingIds)),
    db
      .select({
        accommodationId: testHostCalendarFeedsTable.accommodationId,
        feedId: testHostCalendarFeedsTable.feedId,
        url: testHostCalendarFeedsTable.url,
        status: testHostCalendarFeedsTable.status,
        lastError: testHostCalendarFeedsTable.lastError,
        lastAttemptAt: testHostCalendarFeedsTable.lastAttemptAt,
        lastFetchedAt: testHostCalendarFeedsTable.lastFetchedAt,
      })
      .from(testHostCalendarFeedsTable)
      .where(inArray(testHostCalendarFeedsTable.accommodationId, listingIds)),
    db
      .select({
        id: testHostConversationsTable.id,
        accommodationId: testHostConversationsTable.accommodationId,
        reservationId: testHostConversationsTable.reservationId,
        guestName: testHostConversationsTable.guestName,
        lastMessageAt: testHostConversationsTable.lastMessageAt,
      })
      .from(testHostConversationsTable)
      .where(inArray(testHostConversationsTable.accommodationId, listingIds)),
  ]);
  const unread = await hostUnreadCounts(conversations.map((conversation) => conversation.id));

  res.json(
    buildDashboardSummary({
      today,
      listings,
      reservations,
      blocks,
      feedStatuses,
      conversations: conversations.map((conversation) => ({
        ...conversation,
        unreadCount: unread.get(conversation.id) ?? 0,
      })),
    }),
  );
});

export default router;
