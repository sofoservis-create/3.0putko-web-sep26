import type { TestHostConversation, TestHostMessage } from "@workspace/db";
import { and, eq, gt, inArray, isNull, or, type AnyColumn, type SQL } from "drizzle-orm";

/**
 * Pure rules for host ↔ guest messaging. Persistence and authorization live
 * in the route; everything here is deterministic so it can be unit tested.
 */

export type ParticipantRole = "host" | "guest";

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CLIENT_KEY_LENGTH = 80;

/** Messages are plain text; leading/trailing whitespace is not content. */
export const validateMessageBody = (
  value: unknown,
): { ok: true; value: string } | { ok: false; code: "empty" | "tooLong" } => {
  const text = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
  if (!text) return { ok: false, code: "empty" };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, code: "tooLong" };
  return { ok: true, value: text };
};

/**
 * The idempotency key a client attaches to a send so a retry after a lost
 * response cannot store the message twice. Optional; when present it must be
 * a short opaque token.
 */
export const validateClientKey = (value: unknown): { ok: true; value: string | null } | { ok: false } => {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const key = value.trim();
  if (!key || key.length > MAX_CLIENT_KEY_LENGTH || !/^[A-Za-z0-9_.:-]+$/.test(key)) return { ok: false };
  return { ok: true, value: key };
};

/**
 * Which side of the thread the caller is on. The host is whoever owns the
 * accommodation; the guest is the account the thread was opened for. Anyone
 * else gets null and must be refused before any content is revealed.
 */
export const participantRole = (
  conversation: Pick<TestHostConversation, "guestId">,
  accommodationOwnerId: string,
  userId: string,
): ParticipantRole | null => {
  if (userId === accommodationOwnerId) return "host";
  if (conversation.guestId && userId === conversation.guestId) return "guest";
  return null;
};

export const otherRole = (role: ParticipantRole): ParticipantRole => (role === "host" ? "guest" : "host");

const lastReadAtOf = (
  conversation: Pick<TestHostConversation, "hostLastReadAt" | "guestLastReadAt">,
  role: ParticipantRole,
) => (role === "host" ? conversation.hostLastReadAt : conversation.guestLastReadAt);

/** Unread for `role`: sent by the other side after `role` last read the thread. */
export const isUnreadFor = (
  message: Pick<TestHostMessage, "senderRole" | "createdAt">,
  conversation: Pick<TestHostConversation, "hostLastReadAt" | "guestLastReadAt">,
  role: ParticipantRole,
) => {
  if (message.senderRole === role) return false;
  const lastRead = lastReadAtOf(conversation, role);
  return !lastRead || message.createdAt.getTime() > lastRead.getTime();
};

export const unreadCountFor = (
  messages: Array<Pick<TestHostMessage, "senderRole" | "createdAt">>,
  conversation: Pick<TestHostConversation, "hostLastReadAt" | "guestLastReadAt">,
  role: ParticipantRole,
) => messages.reduce((count, message) => count + (isUnreadFor(message, conversation, role) ? 1 : 0), 0);

export type DeliveryState = "sent" | "read";

/**
 * Delivery state of a stored message: it is `sent` the moment the server
 * persisted it and `read` once the recipient opened the thread after it.
 * (A message that never reached the server is not stored, so the client
 * alone knows about `sending` and `failed`.)
 */
export const deliveryStateOf = (
  message: Pick<TestHostMessage, "senderRole" | "createdAt">,
  conversation: Pick<TestHostConversation, "hostLastReadAt" | "guestLastReadAt">,
): DeliveryState => {
  const recipientRead = lastReadAtOf(conversation, otherRole(message.senderRole));
  return recipientRead && recipientRead.getTime() >= message.createdAt.getTime() ? "read" : "sent";
};

export type GuestFixture = { guestName: string; guestEmail: string; body: string };

/**
 * Development sample: a guest opening a thread about a listing or a stay.
 * The seed only varies the sample e-mail so repeated seeding is distinct.
 */
export const sampleGuestFixture = (seed: number, index = 0): GuestFixture => {
  const tag = `${seed}`.slice(-4);
  const samples = [
    {
      guestName: "Jana Nováková",
      guestEmail: `jana.novakova.${tag}@example.test`,
      body: "Dobrý deň, o koľkej je možný check-in? Prídeme autom okolo 15:00.",
    },
    {
      guestName: "Tomáš Horváth",
      guestEmail: `tomas.horvath.${tag}@example.test`,
      body: "Hi! Is there parking at the property, and is late check-in around 22:00 possible?",
    },
    {
      guestName: "Lucia Kováčová",
      guestEmail: `lucia.kovacova.${tag}@example.test`,
      body: "Dobrý deň, je v okolí nejaký obchod s potravinami v pešej vzdialenosti?",
    },
  ];
  return samples[Math.abs(index) % samples.length];
};

/** A follow-up the sample guest sends into an existing thread. */
export const sampleGuestReply = (index = 0): string => {
  const replies = [
    "Ďakujem! Ešte jedna otázka – dá sa u vás platiť kartou?",
    "Thanks a lot. Could you also share the Wi‑Fi details before we arrive?",
    "Super, ďakujeme. Tešíme sa!",
  ];
  return replies[Math.abs(index) % replies.length];
};

/**
 * WHERE clause selecting the guest messages a host has not read yet, for a
 * set of conversations. Columns are injected so the rule stays testable
 * without a database module. The "unread" branch is an explicit `or(...)` so
 * it is parenthesised inside the surrounding AND; a raw "a or b" fragment
 * would let the timestamp comparison escape the conversation and sender
 * filters.
 */
export const unreadGuestMessagesWhere = (
  conversationIds: string[],
  columns: {
    conversationId: AnyColumn;
    senderRole: AnyColumn;
    createdAt: AnyColumn;
    hostLastReadAt: AnyColumn;
  },
): SQL | undefined =>
  and(
    inArray(columns.conversationId, conversationIds),
    eq(columns.senderRole, "guest"),
    or(isNull(columns.hostLastReadAt), gt(columns.createdAt, columns.hostLastReadAt)),
  );
