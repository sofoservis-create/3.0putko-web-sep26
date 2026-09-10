import { randomUUID } from "node:crypto";
import {
  db,
  testHostAccommodationsTable,
  testHostCalendarBlocksTable,
  testHostCalendarFeedsTable,
  type TestHostAccommodation,
  type TestHostCalendarBlock,
  type TestHostCalendarFeed,
} from "@workspace/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { accommodationIdParam, requireHostGuest } from "../lib/test-guest-auth";
import {
  nextAccommodationStatus,
  publicAccommodation,
  type AccommodationData,
} from "../lib/test-host-accommodation";
import {
  calendarChoiceOf,
  feedChoiceAfter,
  calendarFeedsNeedIds,
  calendarFeedsOf,
  fetchFeed,
  MAX_FEED_LABEL,
  MAX_FEEDS,
  mergeBlockIntoRanges,
  normalizeCalendarFeeds,
  attemptIsCurrent,
  importOutcome,
  subtractRangeFromBlocks,
  utcToday,
  validateDateRange,
  validateFeedUrl,
  validateUnblockRange,
  type CalendarFeedEntry,
} from "../lib/test-host-calendar";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Per-property availability for the development Host workspace.
 *
 * Contract summary
 * - Manual blocks and imported feed dates live in PostgreSQL; the feed
 *   definitions (label + URL) stay inside the accommodation payload's
 *   `calendarFeeds` so editor Step 8 and this API edit the same list.
 * - Every route resolves the accommodation first and answers 404 (unknown) or
 *   403 (owned by somebody else) before touching calendar data.
 * - Every mutation answers with the full calendar snapshot so the client can
 *   replace its state instead of patching it, and with the updated listing
 *   when the payload changed.
 * - Feeds are only fetched on demand (add / retry). Status reports exactly the
 *   outcome of that last attempt; nothing claims live synchronisation.
 * - Concurrency: every read-modify-write (blocks, feed list, fetch results,
 *   reconciliation) runs in a transaction that first locks the accommodation
 *   row `FOR UPDATE` and re-reads the payload, so two requests for the same
 *   property serialise and never act on a stale copy of the feed list. A
 *   fetch result is only stored if the feed still exists with the same URL
 *   once the network round-trip is over.
 */

const router: IRouter = Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
});

type Snapshot = {
  listing: ReturnType<typeof publicAccommodation>;
  calendarChoice: "none" | "connect" | null;
  today: string;
  blocks: Array<{
    id: string;
    startDate: string;
    endDate: string;
    source: "manual" | "feed";
    feedId: string | null;
    note: string | null;
  }>;
  feeds: Array<
    CalendarFeedEntry & {
      status: "never" | "ok" | "failed";
      lastAttemptAt: string | null;
      lastFetchedAt: string | null;
      lastError: string | null;
      importedCount: number;
    }
  >;
};

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ code, message });

/**
 * Loads the accommodation and enforces ownership. Writes the error response
 * itself so handlers can simply return on null.
 */
const loadOwnedAccommodation = async (
  req: Request,
  res: Response,
): Promise<TestHostAccommodation | null> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return null;
  const id = accommodationIdParam(req);
  if (!id) {
    fail(res, 400, "invalidId", "Invalid accommodation id");
    return null;
  }
  const [accommodation] = await db
    .select()
    .from(testHostAccommodationsTable)
    .where(eq(testHostAccommodationsTable.id, id))
    .limit(1);
  if (!accommodation) {
    fail(res, 404, "notFound", "Accommodation not found");
    return null;
  }
  if (accommodation.ownerId !== auth.guest.id) {
    fail(res, 403, "forbidden", "This accommodation belongs to another host");
    return null;
  }
  return accommodation;
};

const feedIdParam = (req: Request) => {
  const value = req.params.feedId;
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : null;
};

class AccommodationGone extends Error {}

/**
 * Re-reads the accommodation inside a transaction with a row lock. Every
 * mutation goes through this so concurrent requests queue behind each other
 * and always see the latest payload (including edits made in Step 8).
 */
const lockAccommodation = async (
  tx: Tx,
  accommodationId: string,
  ownerId: string,
): Promise<TestHostAccommodation> => {
  const [row] = await tx
    .select()
    .from(testHostAccommodationsTable)
    .where(eq(testHostAccommodationsTable.id, accommodationId))
    .for("update");
  if (!row || row.ownerId !== ownerId) throw new AccommodationGone();
  if (!calendarFeedsNeedIds(row.data)) return row;
  // Feeds saved through Step 8 before ids existed: give them stable ids now,
  // under the lock, so they show up as "never fetched" instead of vanishing
  // and can never be dropped by a later feed mutation.
  const data = normalizeCalendarFeeds(row.data);
  await tx
    .update(testHostAccommodationsTable)
    .set({ data })
    .where(eq(testHostAccommodationsTable.id, accommodationId));
  return { ...row, data };
};

/** Connected calendars only count while Step 8 says "connect". */
const feedsConnected = (data: AccommodationData) => calendarChoiceOf(data) === "connect";

/**
 * Drops status rows and imported dates that no longer match the payload:
 * feeds removed in Step 8, feeds whose URL changed since the last fetch, and
 * — while the listing is on "manual only" — every feed, because paused links
 * must not keep dates blocked. Keeps what the host sees honest without any
 * background job. Must run under the accommodation lock with the payload
 * read in the same transaction.
 */
const reconcileFeedState = async (
  tx: Tx,
  accommodationId: string,
  feeds: CalendarFeedEntry[],
  connected: boolean,
) => {
  const rows = await tx
    .select()
    .from(testHostCalendarFeedsTable)
    .where(eq(testHostCalendarFeedsTable.accommodationId, accommodationId));
  const byId = new Map(connected ? feeds.map((feed) => [feed.id, feed]) : []);
  const staleFeedIds = rows
    .filter((row) => byId.get(row.feedId)?.url !== row.url)
    .map((row) => row.feedId);

  const importedRows = await tx
    .select({ feedId: testHostCalendarBlocksTable.feedId })
    .from(testHostCalendarBlocksTable)
    .where(
      and(
        eq(testHostCalendarBlocksTable.accommodationId, accommodationId),
        eq(testHostCalendarBlocksTable.source, "feed"),
      ),
    );
  const orphanFeedIds = importedRows
    .map((row) => row.feedId)
    .filter((feedId): feedId is string => Boolean(feedId) && !byId.has(feedId as string));

  const toClear = Array.from(new Set([...staleFeedIds, ...orphanFeedIds]));
  if (toClear.length === 0) return;
  await tx
    .delete(testHostCalendarBlocksTable)
    .where(
      and(
        eq(testHostCalendarBlocksTable.accommodationId, accommodationId),
        eq(testHostCalendarBlocksTable.source, "feed"),
        inArray(testHostCalendarBlocksTable.feedId, toClear),
      ),
    );
  await tx
    .delete(testHostCalendarFeedsTable)
    .where(
      and(
        eq(testHostCalendarFeedsTable.accommodationId, accommodationId),
        inArray(testHostCalendarFeedsTable.feedId, toClear),
      ),
    );
};

/** Builds the snapshot from the freshest committed state, under the lock. */
const snapshotFor = (accommodationId: string, ownerId: string): Promise<Snapshot> =>
  db.transaction(async (tx) => {
    const accommodation = await lockAccommodation(tx, accommodationId, ownerId);
    const feeds = calendarFeedsOf(accommodation.data);
    await reconcileFeedState(tx, accommodation.id, feeds, feedsConnected(accommodation.data));
    const blocks = await tx
      .select()
      .from(testHostCalendarBlocksTable)
      .where(eq(testHostCalendarBlocksTable.accommodationId, accommodation.id))
      .orderBy(asc(testHostCalendarBlocksTable.startDate));
    const statusRows = await tx
      .select()
      .from(testHostCalendarFeedsTable)
      .where(eq(testHostCalendarFeedsTable.accommodationId, accommodation.id));
    const statusByFeed = new Map<string, TestHostCalendarFeed>(
      statusRows.map((row) => [row.feedId, row]),
    );
    return {
      listing: publicAccommodation(accommodation),
      calendarChoice: calendarChoiceOf(accommodation.data),
      today: utcToday(),
      blocks: blocks.map((block: TestHostCalendarBlock) => ({
        id: block.id,
        startDate: block.startDate,
        endDate: block.endDate,
        source: block.source,
        feedId: block.feedId,
        note: block.note,
      })),
      feeds: feeds.map((feed) => {
        const status = statusByFeed.get(feed.id);
        return {
          ...feed,
          status: status?.status ?? "never",
          lastAttemptAt: status?.lastAttemptAt?.toISOString() ?? null,
          lastFetchedAt: status?.lastFetchedAt?.toISOString() ?? null,
          lastError: status?.lastError ?? null,
          importedCount: status?.importedCount ?? 0,
        };
      }),
    };
  });

const manualBlocks = (tx: Tx, accommodationId: string) =>
  tx
    .select()
    .from(testHostCalendarBlocksTable)
    .where(
      and(
        eq(testHostCalendarBlocksTable.accommodationId, accommodationId),
        eq(testHostCalendarBlocksTable.source, "manual"),
      ),
    );

/** Persists a payload change with the same status rules as the editor PATCH. */
const saveAccommodationData = async (
  tx: Tx,
  accommodation: TestHostAccommodation,
  data: AccommodationData,
) => {
  await tx
    .update(testHostAccommodationsTable)
    .set({ data, status: nextAccommodationStatus(accommodation.status, data) })
    .where(eq(testHostAccommodationsTable.id, accommodation.id));
};

const withFeeds = (
  data: AccommodationData,
  feeds: CalendarFeedEntry[],
  change: "add" | "edit" | "remove",
): AccommodationData => {
  const choice = feedChoiceAfter(data, feeds.length, change);
  return { ...data, calendarFeeds: feeds, ...(choice ? { calendarChoice: choice } : {}) };
};

const rangeErrorMessage: Record<string, string> = {
  invalidDate: "Dates must be in YYYY-MM-DD format",
  endBeforeStart: "The end date must not be before the start date",
  inPast: "Past dates cannot be changed",
  tooLong: "A single range may cover at most 400 days",
  tooFarAhead: "Dates may be at most three years ahead",
};

const feedUrlErrorMessage: Record<string, string> = {
  empty: "Enter a calendar link",
  invalidUrl: "The calendar link is not a valid URL",
  unsupportedScheme: "The calendar link must start with http:// or https://",
  privateHost: "The calendar link must point to a public address",
};

/** Records a failed attempt without touching previously imported dates. */
const storeFailedAttempt = async (
  tx: Tx,
  accommodationId: string,
  feed: CalendarFeedEntry,
  attemptedAt: Date,
  error: string,
) => {
  await tx
    .insert(testHostCalendarFeedsTable)
    .values({
      accommodationId,
      feedId: feed.id,
      url: feed.url,
      status: "failed",
      lastAttemptAt: attemptedAt,
      lastError: error,
    })
    .onConflictDoUpdate({
      target: [testHostCalendarFeedsTable.accommodationId, testHostCalendarFeedsTable.feedId],
      set: { url: feed.url, status: "failed", lastAttemptAt: attemptedAt, lastError: error },
    });
};

/**
 * Runs one fetch for a feed and records the outcome plus imported dates. The
 * network call happens outside any transaction; the result is committed only
 * if, under the lock, the feed still exists with the same URL, calendars are
 * still connected and no later-started attempt has been recorded. Otherwise
 * the outcome is dropped (`stored: false`) so a slow fetch can never
 * overwrite state belonging to a newer definition or a newer import.
 */
const fetchAndStore = async (
  accommodationId: string,
  ownerId: string,
  feed: CalendarFeedEntry,
) => {
  const attemptedAt = new Date();
  const result = await fetchFeed(feed.url);
  const stored = await db.transaction(async (tx) => {
    const accommodation = await lockAccommodation(tx, accommodationId, ownerId);
    const current = calendarFeedsOf(accommodation.data).find((entry) => entry.id === feed.id);
    if (!current || current.url !== feed.url || !feedsConnected(accommodation.data)) return false;
    // A fetch that started later may already have been recorded (two tabs,
    // or a retry racing a slow first attempt); an older result must not
    // replace it.
    const [recorded] = await tx
      .select({ lastAttemptAt: testHostCalendarFeedsTable.lastAttemptAt })
      .from(testHostCalendarFeedsTable)
      .where(
        and(
          eq(testHostCalendarFeedsTable.accommodationId, accommodationId),
          eq(testHostCalendarFeedsTable.feedId, feed.id),
        ),
      );
    if (!attemptIsCurrent(attemptedAt, recorded?.lastAttemptAt)) return false;
    const outcome = importOutcome(result);
    if (outcome.kind === "failed") {
      // A failed attempt keeps the dates from the last successful fetch (they
      // are still the most recent truth) and records why this attempt failed.
      await storeFailedAttempt(tx, accommodationId, feed, attemptedAt, outcome.error);
      return true;
    }
    const { ranges } = outcome;
    await tx
      .delete(testHostCalendarBlocksTable)
      .where(
        and(
          eq(testHostCalendarBlocksTable.accommodationId, accommodationId),
          eq(testHostCalendarBlocksTable.source, "feed"),
          eq(testHostCalendarBlocksTable.feedId, feed.id),
        ),
      );
    if (ranges.length > 0) {
      await tx.insert(testHostCalendarBlocksTable).values(
        ranges.map((range) => ({
          accommodationId,
          startDate: range.startDate,
          endDate: range.endDate,
          source: "feed" as const,
          feedId: feed.id,
          note: range.summary,
        })),
      );
    }
    await tx
      .insert(testHostCalendarFeedsTable)
      .values({
        accommodationId,
        feedId: feed.id,
        url: feed.url,
        status: "ok",
        lastAttemptAt: attemptedAt,
        lastFetchedAt: attemptedAt,
        lastError: null,
        importedCount: ranges.length,
      })
      .onConflictDoUpdate({
        target: [testHostCalendarFeedsTable.accommodationId, testHostCalendarFeedsTable.feedId],
        set: {
          url: feed.url,
          status: "ok",
          lastAttemptAt: attemptedAt,
          lastFetchedAt: attemptedAt,
          lastError: null,
          importedCount: ranges.length,
        },
      });
    return true;
  });
  return { result, stored };
};

/**
 * Runs a handler and maps a vanished/re-owned accommodation to 404 so a race
 * with a delete never surfaces as a 500.
 */
const guarded = (
  handler: (req: Request, res: Response, accommodation: TestHostAccommodation) => Promise<void>,
) =>
  async (req: Request, res: Response): Promise<void> => {
    const accommodation = await loadOwnedAccommodation(req, res);
    if (!accommodation) return;
    try {
      await handler(req, res, accommodation);
    } catch (error) {
      if (error instanceof AccommodationGone) {
        fail(res, 404, "notFound", "Accommodation not found");
        return;
      }
      throw error;
    }
  };

const BASE = "/test-auth/host-accommodations/:id/calendar";

router.get(BASE, guarded(async (_req, res, accommodation) => {
  res.json(await snapshotFor(accommodation.id, accommodation.ownerId));
}));

router.post(`${BASE}/blocks`, guarded(async (req, res, accommodation) => {
  const validated = validateDateRange(req.body);
  if ("error" in validated) {
    fail(res, 400, validated.error, rangeErrorMessage[validated.error]);
    return;
  }
  const rawNote = req.body?.note;
  const note = typeof rawNote === "string" && rawNote.trim() ? rawNote.trim().slice(0, 200) : null;
  await db.transaction(async (tx) => {
    await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
    const existing = await manualBlocks(tx, accommodation.id);
    const { remove, merged } = mergeBlockIntoRanges(existing, validated.range);
    if (remove.length > 0) {
      await tx
        .delete(testHostCalendarBlocksTable)
        .where(inArray(testHostCalendarBlocksTable.id, remove.map((block) => block.id)));
    }
    await tx.insert(testHostCalendarBlocksTable).values({
      accommodationId: accommodation.id,
      startDate: merged.startDate,
      endDate: merged.endDate,
      source: "manual",
      // Keep the newest note; merged fragments lose theirs.
      note,
    });
  });
  res.status(201).json(await snapshotFor(accommodation.id, accommodation.ownerId));
}));

router.post(`${BASE}/unblock`, guarded(async (req, res, accommodation) => {
  const validated = validateUnblockRange(req.body);
  if ("error" in validated) {
    fail(res, 400, validated.error, rangeErrorMessage[validated.error]);
    return;
  }
  await db.transaction(async (tx) => {
    await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
    const existing = await manualBlocks(tx, accommodation.id);
    const { remove, insert } = subtractRangeFromBlocks(existing, validated.range);
    if (remove.length === 0) return;
    await tx
      .delete(testHostCalendarBlocksTable)
      .where(inArray(testHostCalendarBlocksTable.id, remove.map((block) => block.id)));
    if (insert.length > 0) {
      await tx.insert(testHostCalendarBlocksTable).values(
        insert.map((range) => ({
          accommodationId: accommodation.id,
          startDate: range.startDate,
          endDate: range.endDate,
          source: "manual" as const,
        })),
      );
    }
  });
  res.json(await snapshotFor(accommodation.id, accommodation.ownerId));
}));

const parseLabel = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, MAX_FEED_LABEL) : "";

/** Mutation outcome carrying either an HTTP error or the value to continue with. */
type Outcome<T> = { error: { status: number; code: string; message: string } } | { value: T };

router.post(`${BASE}/feeds`, guarded(async (req, res, accommodation) => {
  const validated = validateFeedUrl(req.body?.url);
  if ("error" in validated) {
    fail(res, 400, validated.error, feedUrlErrorMessage[validated.error]);
    return;
  }
  const entry: CalendarFeedEntry = {
    id: randomUUID(),
    label: parseLabel(req.body?.label),
    url: validated.url,
  };
  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    const fresh = await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
    const feeds = calendarFeedsOf(fresh.data);
    if (feeds.length >= MAX_FEEDS) {
      return { error: { status: 400, code: "tooManyFeeds", message: `At most ${MAX_FEEDS} calendar links per listing` } };
    }
    if (feeds.some((feed) => feed.url === entry.url)) {
      return { error: { status: 409, code: "duplicateFeed", message: "This calendar link is already connected" } };
    }
    await saveAccommodationData(tx, fresh, withFeeds(fresh.data, [...feeds, entry], "add"));
    await tx.insert(testHostCalendarFeedsTable).values({
      accommodationId: accommodation.id,
      feedId: entry.id,
      url: entry.url,
      status: "never",
    });
    return { value: null };
  });
  if ("error" in outcome) {
    fail(res, outcome.error.status, outcome.error.code, outcome.error.message);
    return;
  }
  res.status(201).json({ ...(await snapshotFor(accommodation.id, accommodation.ownerId)), feedId: entry.id });
}));

router.patch(`${BASE}/feeds/:feedId`, guarded(async (req, res, accommodation) => {
  const feedId = feedIdParam(req);
  let nextUrl: string | null = null;
  if (req.body && "url" in req.body) {
    const validated = validateFeedUrl(req.body.url);
    if ("error" in validated) {
      fail(res, 400, validated.error, feedUrlErrorMessage[validated.error]);
      return;
    }
    nextUrl = validated.url;
  }
  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    const fresh = await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
    const feeds = calendarFeedsOf(fresh.data);
    const current = feedId ? feeds.find((feed) => feed.id === feedId) : undefined;
    if (!current) return { error: { status: 404, code: "feedNotFound", message: "Calendar link not found" } };
    const next: CalendarFeedEntry = { ...current };
    if (req.body && "label" in req.body) next.label = parseLabel(req.body.label);
    if (nextUrl !== null) {
      if (feeds.some((feed) => feed.id !== current.id && feed.url === nextUrl)) {
        return { error: { status: 409, code: "duplicateFeed", message: "This calendar link is already connected" } };
      }
      next.url = nextUrl;
    }
    await saveAccommodationData(
      tx,
      fresh,
      withFeeds(fresh.data, feeds.map((feed) => (feed.id === current.id ? next : feed)), "edit"),
    );
    return { value: null };
  });
  if ("error" in outcome) {
    fail(res, outcome.error.status, outcome.error.code, outcome.error.message);
    return;
  }
  // A changed URL has never been fetched: snapshotFor's reconciliation drops
  // the old status and imported dates, so the feed reads "never fetched".
  res.json(await snapshotFor(accommodation.id, accommodation.ownerId));
}));

router.delete(`${BASE}/feeds/:feedId`, guarded(async (req, res, accommodation) => {
  const feedId = feedIdParam(req);
  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    const fresh = await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
    const feeds = calendarFeedsOf(fresh.data);
    if (!feedId || !feeds.some((feed) => feed.id === feedId)) {
      return { error: { status: 404, code: "feedNotFound", message: "Calendar link not found" } };
    }
    await saveAccommodationData(tx, fresh, withFeeds(fresh.data, feeds.filter((feed) => feed.id !== feedId), "remove"));
    return { value: null };
  });
  if ("error" in outcome) {
    fail(res, outcome.error.status, outcome.error.code, outcome.error.message);
    return;
  }
  res.json(await snapshotFor(accommodation.id, accommodation.ownerId));
}));

router.post(`${BASE}/feeds/:feedId/fetch`, guarded(async (req, res, accommodation) => {
  const feedId = feedIdParam(req);
  // Resolve the feed from the locked, id-backfilled payload so a legacy link
  // can be retried right after its first appearance in the snapshot.
  const { feed, connected } = await db.transaction(async (tx) => {
    const fresh = await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
    return {
      feed: feedId ? calendarFeedsOf(fresh.data).find((entry) => entry.id === feedId) : undefined,
      connected: feedsConnected(fresh.data),
    };
  });
  if (!feed) {
    fail(res, 404, "feedNotFound", "Calendar link not found");
    return;
  }
  if (!connected) {
    fail(res, 409, "calendarsPaused", "Connected calendars are paused while availability is manual only");
    return;
  }
  const validated = validateFeedUrl(feed.url);
  if ("error" in validated) {
    // A link saved through Step 8 can be malformed; report it the same way
    // an invalid add would instead of attempting a fetch.
    await db.transaction(async (tx) => {
      const fresh = await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
      const current = calendarFeedsOf(fresh.data).find((entry) => entry.id === feed.id);
      if (!current || current.url !== feed.url) return;
      await storeFailedAttempt(tx, accommodation.id, feed, new Date(), validated.error);
    });
    res.json(await snapshotFor(accommodation.id, accommodation.ownerId));
    return;
  }
  const { stored } = await fetchAndStore(accommodation.id, accommodation.ownerId, feed);
  // When the link was removed or changed while fetching, the snapshot already
  // reflects the newer definition; `stale` tells the client its result was
  // discarded rather than applied.
  res.json({ ...(await snapshotFor(accommodation.id, accommodation.ownerId)), stale: !stored });
}));

/**
 * Switches between "manual only" and "connected calendars" — the same choice
 * as Step 8, so both screens can pause or reconnect. Pausing keeps the link
 * definitions but clears every imported date on the next reconciliation.
 */
router.post(`${BASE}/mode`, guarded(async (req, res, accommodation) => {
  const choice = req.body?.calendarChoice;
  if (choice !== "none" && choice !== "connect") {
    fail(res, 400, "invalidChoice", "calendarChoice must be \"none\" or \"connect\"");
    return;
  }
  await db.transaction(async (tx) => {
    const fresh = await lockAccommodation(tx, accommodation.id, accommodation.ownerId);
    if (calendarChoiceOf(fresh.data) === choice) return;
    await saveAccommodationData(tx, fresh, { ...fresh.data, calendarChoice: choice });
  });
  res.json(await snapshotFor(accommodation.id, accommodation.ownerId));
}));

export default router;
