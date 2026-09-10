import {
  db,
  testHostAccommodationsTable,
  testHostConversationsTable,
  testHostMessagesTable,
  testHostReservationsTable,
  type TestHostAccommodation,
  type TestHostConversation,
  type TestHostMessage,
  type TestHostReservation,
} from "@workspace/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { getAuthenticatedGuest, requireHostGuest, type AuthenticatedGuest } from "../lib/test-guest-auth";
import { utcToday } from "../lib/test-host-calendar";
import {
  deliveryStateOf,
  participantRole,
  sampleGuestFixture,
  sampleGuestReply,
  unreadCountFor,
  unreadGuestMessagesWhere,
  validateClientKey,
  validateMessageBody,
  type ParticipantRole,
} from "../lib/test-host-messages";
import { stageOf } from "../lib/test-host-reservation";

/**
 * Host ↔ guest messaging for the development Host workspace.
 *
 * Contract summary
 * - A thread has exactly two participants: the accommodation's owner (host)
 *   and the guest account it was opened for. Every route resolves the caller's
 *   role on the server and answers 404 (unknown) or 403 (not a participant)
 *   before revealing anything. Sample threads have no guest account, so only
 *   the host can open them.
 * - Sending stores the message and stamps the sender's own read marker; a
 *   client `clientKey` makes the send idempotent so a retry after a lost
 *   response returns the already stored message instead of a duplicate.
 * - Delivery state is derived: `sent` once stored, `read` once the other
 *   participant marked the thread read after it. Unread counts are computed
 *   from the same markers, so the list, the thread and the dashboard agree.
 * - There is no push transport. Clients poll; the thread endpoint is cheap.
 * - `POST /fixtures` seeds a guest message (new thread or a reply) for one of
 *   the host's listings so the host flow can be exercised without a
 *   traveller UI. Sample rows carry `source = fixture`.
 */

const router: IRouter = Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
});

const fail = (res: Response, status: number, code: string, message: string, extra?: object) =>
  res.status(status).json({ code, message, ...extra });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uuidParam = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && UUID_PATTERN.test(raw) ? raw : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type ListingRow = Pick<TestHostAccommodation, "id" | "data" | "status" | "ownerId">;

const listingSummary = (accommodation: Pick<TestHostAccommodation, "id" | "data" | "status">) => {
  const name = accommodation.data?.name;
  return {
    id: accommodation.id,
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    status: accommodation.status,
  };
};

const reservationSummary = (
  reservation: Pick<TestHostReservation, "id" | "checkIn" | "checkOut" | "status"> | null,
  today: string,
) =>
  reservation
    ? {
        id: reservation.id,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        stage: stageOf(reservation, today),
      }
    : null;

/** A message as every endpoint returns it (viewer-relative `mine`). */
const publicMessage = (
  message: TestHostMessage,
  conversation: TestHostConversation,
  viewer: ParticipantRole,
) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderRole: message.senderRole,
  mine: message.senderRole === viewer,
  body: message.body,
  clientKey: message.clientKey,
  createdAt: message.createdAt.toISOString(),
  state: deliveryStateOf(message, conversation),
});

type ConversationBundle = {
  conversation: TestHostConversation;
  accommodation: ListingRow;
  reservation: Pick<TestHostReservation, "id" | "checkIn" | "checkOut" | "status"> | null;
};

/** The thread header as the list and the detail return it. */
const publicConversation = (
  bundle: ConversationBundle,
  viewer: ParticipantRole,
  unreadCount: number,
  lastMessage: TestHostMessage | null,
  today: string,
) => ({
  id: bundle.conversation.id,
  accommodationId: bundle.conversation.accommodationId,
  listing: listingSummary(bundle.accommodation),
  reservation: reservationSummary(bundle.reservation, today),
  guest: { name: bundle.conversation.guestName, hasAccount: Boolean(bundle.conversation.guestId) },
  viewerRole: viewer,
  source: bundle.conversation.source,
  unreadCount,
  lastMessage: lastMessage ? publicMessage(lastMessage, bundle.conversation, viewer) : null,
  lastMessageAt: bundle.conversation.lastMessageAt.toISOString(),
  lastReadAt:
    (viewer === "host" ? bundle.conversation.hostLastReadAt : bundle.conversation.guestLastReadAt)?.toISOString() ??
    null,
  createdAt: bundle.conversation.createdAt.toISOString(),
});

const loadBundle = async (conversationId: string): Promise<ConversationBundle | null> => {
  const [row] = await db
    .select({
      conversation: testHostConversationsTable,
      accommodation: {
        id: testHostAccommodationsTable.id,
        data: testHostAccommodationsTable.data,
        status: testHostAccommodationsTable.status,
        ownerId: testHostAccommodationsTable.ownerId,
      },
      reservation: {
        id: testHostReservationsTable.id,
        checkIn: testHostReservationsTable.checkIn,
        checkOut: testHostReservationsTable.checkOut,
        status: testHostReservationsTable.status,
      },
    })
    .from(testHostConversationsTable)
    .innerJoin(
      testHostAccommodationsTable,
      eq(testHostConversationsTable.accommodationId, testHostAccommodationsTable.id),
    )
    .leftJoin(
      testHostReservationsTable,
      eq(testHostConversationsTable.reservationId, testHostReservationsTable.id),
    )
    .where(eq(testHostConversationsTable.id, conversationId))
    .limit(1);
  if (!row) return null;
  return {
    conversation: row.conversation,
    accommodation: row.accommodation,
    reservation: row.reservation?.id ? row.reservation : null,
  };
};

/**
 * Resolves the thread and the caller's role in it, or writes the error
 * response and returns null. Any signed-in account may call; only the two
 * participants get through.
 */
const loadParticipantThread = async (
  req: Request,
  res: Response,
): Promise<{ auth: AuthenticatedGuest; bundle: ConversationBundle; role: ParticipantRole } | null> => {
  const auth = await getAuthenticatedGuest(req);
  if (!auth) {
    fail(res, 401, "unauthorized", "Platnosť relácie vypršala. Prihláste sa znova.");
    return null;
  }
  const id = uuidParam(req.params.id);
  if (!id) {
    fail(res, 400, "invalidId", "Invalid conversation id");
    return null;
  }
  const bundle = await loadBundle(id);
  if (!bundle) {
    fail(res, 404, "notFound", "Conversation not found");
    return null;
  }
  const role = participantRole(bundle.conversation, bundle.accommodation.ownerId, auth.guest.id);
  if (!role) {
    fail(res, 403, "forbidden", "You are not a participant of this conversation");
    return null;
  }
  return { auth, bundle, role };
};

const messagesOf = (conversationId: string) =>
  db
    .select()
    .from(testHostMessagesTable)
    .where(eq(testHostMessagesTable.conversationId, conversationId))
    .orderBy(asc(testHostMessagesTable.createdAt), asc(testHostMessagesTable.id));

/**
 * Unread guest messages per thread for a host, in one query. Exported for
 * the dashboard aggregation so both surfaces count the same way.
 */
export const hostUnreadCounts = async (conversationIds: string[]) => {
  if (conversationIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({
      conversationId: testHostMessagesTable.conversationId,
      unread: sql<number>`count(*)::int`,
    })
    .from(testHostMessagesTable)
    .innerJoin(
      testHostConversationsTable,
      eq(testHostMessagesTable.conversationId, testHostConversationsTable.id),
    )
    .where(
      unreadGuestMessagesWhere(conversationIds, {
        conversationId: testHostMessagesTable.conversationId,
        senderRole: testHostMessagesTable.senderRole,
        createdAt: testHostMessagesTable.createdAt,
        hostLastReadAt: testHostConversationsTable.hostLastReadAt,
      }),
    )
    .groupBy(testHostMessagesTable.conversationId);
  return new Map(rows.map((row) => [row.conversationId, row.unread]));
};

/** Every thread of the host's listings with unread counts and last message. */
export const hostConversationRows = async (hostId: string, accommodationId?: string) => {
  const conditions = [eq(testHostAccommodationsTable.ownerId, hostId)];
  if (accommodationId) conditions.push(eq(testHostConversationsTable.accommodationId, accommodationId));
  const rows = await db
    .select({
      conversation: testHostConversationsTable,
      accommodation: {
        id: testHostAccommodationsTable.id,
        data: testHostAccommodationsTable.data,
        status: testHostAccommodationsTable.status,
        ownerId: testHostAccommodationsTable.ownerId,
      },
      reservation: {
        id: testHostReservationsTable.id,
        checkIn: testHostReservationsTable.checkIn,
        checkOut: testHostReservationsTable.checkOut,
        status: testHostReservationsTable.status,
      },
    })
    .from(testHostConversationsTable)
    .innerJoin(
      testHostAccommodationsTable,
      eq(testHostConversationsTable.accommodationId, testHostAccommodationsTable.id),
    )
    .leftJoin(
      testHostReservationsTable,
      eq(testHostConversationsTable.reservationId, testHostReservationsTable.id),
    )
    .where(and(...conditions))
    .orderBy(desc(testHostConversationsTable.lastMessageAt));
  const ids = rows.map((row) => row.conversation.id);
  const unread = await hostUnreadCounts(ids);
  const lastMessages =
    ids.length === 0
      ? []
      : await db
          .selectDistinctOn([testHostMessagesTable.conversationId])
          .from(testHostMessagesTable)
          .where(inArray(testHostMessagesTable.conversationId, ids))
          .orderBy(
            testHostMessagesTable.conversationId,
            desc(testHostMessagesTable.createdAt),
            desc(testHostMessagesTable.id),
          );
  const lastByConversation = new Map(lastMessages.map((message) => [message.conversationId, message]));
  return rows.map((row) => ({
    bundle: {
      conversation: row.conversation,
      accommodation: row.accommodation,
      reservation: row.reservation?.id ? row.reservation : null,
    } as ConversationBundle,
    unreadCount: unread.get(row.conversation.id) ?? 0,
    lastMessage: lastByConversation.get(row.conversation.id) ?? null,
  }));
};

router.get("/test-auth/host-conversations", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const accommodationId = req.query.accommodationId;
  if (accommodationId !== undefined && !uuidParam(accommodationId)) {
    fail(res, 400, "invalidId", "Invalid accommodation id");
    return;
  }
  const today = utcToday();
  const rows = await hostConversationRows(
    auth.guest.id,
    typeof accommodationId === "string" ? accommodationId : undefined,
  );
  res.json({
    today,
    conversations: rows.map((row) =>
      publicConversation(row.bundle, "host", row.unreadCount, row.lastMessage, today),
    ),
  });
});

router.get("/test-auth/host-conversations/:id", async (req, res): Promise<void> => {
  const thread = await loadParticipantThread(req, res);
  if (!thread) return;
  const today = utcToday();
  const messages = await messagesOf(thread.bundle.conversation.id);
  const unreadCount = unreadCountFor(messages, thread.bundle.conversation, thread.role);
  res.json({
    today,
    conversation: publicConversation(
      thread.bundle,
      thread.role,
      unreadCount,
      messages[messages.length - 1] ?? null,
      today,
    ),
    messages: messages.map((message) => publicMessage(message, thread.bundle.conversation, thread.role)),
  });
});

/** Marks everything the other side sent so far as read for the caller. */
router.post("/test-auth/host-conversations/:id/read", async (req, res): Promise<void> => {
  const thread = await loadParticipantThread(req, res);
  if (!thread) return;
  const now = new Date();
  const column = thread.role === "host" ? { hostLastReadAt: now } : { guestLastReadAt: now };
  const [updated] = await db
    .update(testHostConversationsTable)
    .set(column)
    .where(eq(testHostConversationsTable.id, thread.bundle.conversation.id))
    .returning();
  const bundle = { ...thread.bundle, conversation: updated };
  const messages = await messagesOf(updated.id);
  const today = utcToday();
  res.json({
    today,
    conversation: publicConversation(bundle, thread.role, 0, messages[messages.length - 1] ?? null, today),
  });
});

router.post("/test-auth/host-conversations/:id/messages", async (req, res): Promise<void> => {
  const thread = await loadParticipantThread(req, res);
  if (!thread) return;
  const body = isRecord(req.body) ? req.body : {};
  const text = validateMessageBody(body.body);
  if (!text.ok) {
    fail(res, 400, text.code === "empty" ? "emptyMessage" : "messageTooLong", "Invalid message");
    return;
  }
  const clientKey = validateClientKey(body.clientKey);
  if (!clientKey.ok) {
    fail(res, 400, "invalidClientKey", "Invalid client key");
    return;
  }
  const conversationId = thread.bundle.conversation.id;
  const today = utcToday();

  const result = await db.transaction(async (tx) => {
    // Serialise sends per thread so the idempotency check and the insert
    // cannot interleave with a concurrent retry of the same clientKey.
    await tx
      .select({ id: testHostConversationsTable.id })
      .from(testHostConversationsTable)
      .where(eq(testHostConversationsTable.id, conversationId))
      .for("update");
    if (clientKey.value) {
      const [existing] = await tx
        .select()
        .from(testHostMessagesTable)
        .where(
          and(
            eq(testHostMessagesTable.conversationId, conversationId),
            eq(testHostMessagesTable.clientKey, clientKey.value),
          ),
        )
        .limit(1);
      if (existing) return { message: existing, duplicate: true };
    }
    const now = new Date();
    const [message] = await tx
      .insert(testHostMessagesTable)
      .values({
        conversationId,
        senderRole: thread.role,
        senderId: thread.auth.guest.id,
        body: text.value,
        clientKey: clientKey.value,
        createdAt: now,
      })
      .returning();
    // Sending implies the sender has seen everything before their message.
    await tx
      .update(testHostConversationsTable)
      .set({
        lastMessageAt: now,
        ...(thread.role === "host" ? { hostLastReadAt: now } : { guestLastReadAt: now }),
      })
      .where(eq(testHostConversationsTable.id, conversationId));
    return { message, duplicate: false };
  });

  const bundle = (await loadBundle(conversationId)) ?? thread.bundle;
  const messages = await messagesOf(conversationId);
  res.status(result.duplicate ? 200 : 201).json({
    today,
    duplicate: result.duplicate,
    message: publicMessage(result.message, bundle.conversation, thread.role),
    conversation: publicConversation(
      bundle,
      thread.role,
      unreadCountFor(messages, bundle.conversation, thread.role),
      messages[messages.length - 1] ?? null,
      today,
    ),
  });
});

/**
 * Development fixtures. Body is either `{ accommodationId, reservationId? }`
 * to open a new guest thread about one of the host's listings (or the
 * reservation's existing thread when it already has one), or
 * `{ conversationId }` to drop a guest reply into an existing thread. Either
 * way the result is one unread guest message for the host.
 */
router.post("/test-auth/host-conversations/fixtures", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const body = isRecord(req.body) ? req.body : {};
  const conversationId = uuidParam(body.conversationId);
  const accommodationId = uuidParam(body.accommodationId);
  const reservationId = uuidParam(body.reservationId);
  if (!conversationId && !accommodationId) {
    fail(res, 400, "invalidId", "Provide accommodationId or conversationId");
    return;
  }
  const today = utcToday();
  const seed = Date.now();

  let targetId: string;
  if (conversationId) {
    const bundle = await loadBundle(conversationId);
    if (!bundle) {
      fail(res, 404, "notFound", "Conversation not found");
      return;
    }
    if (bundle.accommodation.ownerId !== auth.guest.id) {
      fail(res, 403, "forbidden", "This conversation belongs to another host");
      return;
    }
    targetId = bundle.conversation.id;
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(testHostMessagesTable)
      .where(eq(testHostMessagesTable.conversationId, targetId));
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(testHostMessagesTable).values({
        conversationId: targetId,
        senderRole: "guest",
        senderId: bundle.conversation.guestId,
        body: sampleGuestReply(count),
        createdAt: now,
      });
      await tx
        .update(testHostConversationsTable)
        .set({ lastMessageAt: now, guestLastReadAt: now })
        .where(eq(testHostConversationsTable.id, targetId));
    });
  } else {
    const [accommodation] = await db
      .select()
      .from(testHostAccommodationsTable)
      .where(eq(testHostAccommodationsTable.id, accommodationId as string))
      .limit(1);
    if (!accommodation) {
      fail(res, 404, "notFound", "Listing not found");
      return;
    }
    if (accommodation.ownerId !== auth.guest.id) {
      fail(res, 403, "forbidden", "This listing belongs to another host");
      return;
    }
    let reservation: TestHostReservation | null = null;
    if (reservationId) {
      const [row] = await db
        .select()
        .from(testHostReservationsTable)
        .where(eq(testHostReservationsTable.id, reservationId))
        .limit(1);
      if (!row || row.accommodationId !== accommodation.id) {
        fail(res, 404, "notFound", "Reservation not found for this listing");
        return;
      }
      reservation = row;
    }
    const [existingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(testHostConversationsTable)
      .where(eq(testHostConversationsTable.accommodationId, accommodation.id));
    const fixture = sampleGuestFixture(seed, existingCount?.count ?? 0);
    const now = new Date();
    targetId = await db.transaction(async (tx) => {
      let conversation: TestHostConversation | undefined;
      if (reservation) {
        [conversation] = await tx
          .select()
          .from(testHostConversationsTable)
          .where(eq(testHostConversationsTable.reservationId, reservation.id))
          .limit(1);
      }
      if (!conversation) {
        [conversation] = await tx
          .insert(testHostConversationsTable)
          .values({
            accommodationId: accommodation.id,
            reservationId: reservation?.id ?? null,
            guestId: reservation?.guestId ?? null,
            guestName: reservation?.guestName ?? fixture.guestName,
            guestEmail: reservation?.guestEmail ?? fixture.guestEmail,
            source: "fixture",
            lastMessageAt: now,
            guestLastReadAt: now,
          })
          .returning();
      }
      await tx.insert(testHostMessagesTable).values({
        conversationId: conversation.id,
        senderRole: "guest",
        senderId: conversation.guestId,
        body: reservation?.guestMessage?.trim() && !conversation.hostLastReadAt ? reservation.guestMessage.trim() : fixture.body,
        createdAt: now,
      });
      await tx
        .update(testHostConversationsTable)
        .set({ lastMessageAt: now, guestLastReadAt: now })
        .where(eq(testHostConversationsTable.id, conversation.id));
      return conversation.id;
    });
  }

  const bundle = await loadBundle(targetId);
  if (!bundle) {
    fail(res, 404, "notFound", "Conversation not found");
    return;
  }
  const messages = await messagesOf(targetId);
  res.status(201).json({
    today,
    conversation: publicConversation(
      bundle,
      "host",
      unreadCountFor(messages, bundle.conversation, "host"),
      messages[messages.length - 1] ?? null,
      today,
    ),
    messages: messages.map((message) => publicMessage(message, bundle.conversation, "host")),
  });
});

export default router;
