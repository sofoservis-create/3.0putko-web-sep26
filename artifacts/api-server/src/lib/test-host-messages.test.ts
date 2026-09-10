import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PgDialect, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import {
  deliveryStateOf,
  isUnreadFor,
  participantRole,
  unreadCountFor,
  unreadGuestMessagesWhere,
  validateClientKey,
  validateMessageBody,
  MAX_MESSAGE_LENGTH,
} from "./test-host-messages.ts";

const at = (iso: string) => new Date(iso);

describe("message body validation", () => {
  it("trims and normalises line endings", () => {
    const result = validateMessageBody("  Hello\r\nthere  ");
    assert.deepEqual(result, { ok: true, value: "Hello\nthere" });
  });

  it("rejects empty and whitespace-only bodies", () => {
    assert.deepEqual(validateMessageBody(""), { ok: false, code: "empty" });
    assert.deepEqual(validateMessageBody("   \n "), { ok: false, code: "empty" });
    assert.deepEqual(validateMessageBody(undefined), { ok: false, code: "empty" });
    assert.deepEqual(validateMessageBody(42), { ok: false, code: "empty" });
  });

  it("rejects bodies over the limit", () => {
    assert.equal(validateMessageBody("x".repeat(MAX_MESSAGE_LENGTH)).ok, true);
    assert.deepEqual(validateMessageBody("x".repeat(MAX_MESSAGE_LENGTH + 1)), { ok: false, code: "tooLong" });
  });
});

describe("client key validation", () => {
  it("is optional", () => {
    assert.deepEqual(validateClientKey(undefined), { ok: true, value: null });
    assert.deepEqual(validateClientKey(""), { ok: true, value: null });
  });

  it("accepts opaque tokens and rejects anything else", () => {
    assert.deepEqual(validateClientKey("msg_1726000000000-ab12"), { ok: true, value: "msg_1726000000000-ab12" });
    assert.deepEqual(validateClientKey("has space"), { ok: false });
    assert.deepEqual(validateClientKey(123), { ok: false });
    assert.deepEqual(validateClientKey("k".repeat(81)), { ok: false });
  });
});

describe("participants", () => {
  it("resolves host by accommodation ownership and guest by account", () => {
    const conversation = { guestId: "guest-1" };
    assert.equal(participantRole(conversation, "host-1", "host-1"), "host");
    assert.equal(participantRole(conversation, "host-1", "guest-1"), "guest");
    assert.equal(participantRole(conversation, "host-1", "someone-else"), null);
  });

  it("never lets a stranger into a sample thread without a guest account", () => {
    assert.equal(participantRole({ guestId: null }, "host-1", "someone-else"), null);
    assert.equal(participantRole({ guestId: null }, "host-1", "host-1"), "host");
  });
});

describe("read state", () => {
  const conversation = {
    hostLastReadAt: at("2026-09-10T10:00:00Z"),
    guestLastReadAt: null,
  };

  it("counts only the other side's messages sent after the last read", () => {
    const messages = [
      { senderRole: "guest" as const, createdAt: at("2026-09-10T09:00:00Z") }, // read
      { senderRole: "guest" as const, createdAt: at("2026-09-10T10:00:00Z") }, // read (same instant)
      { senderRole: "guest" as const, createdAt: at("2026-09-10T10:00:01Z") }, // unread
      { senderRole: "host" as const, createdAt: at("2026-09-10T11:00:00Z") }, // own
    ];
    assert.equal(unreadCountFor(messages, conversation, "host"), 1);
    assert.equal(isUnreadFor(messages[3], conversation, "host"), false);
    // The guest never opened the thread, so every host message is unread.
    assert.equal(unreadCountFor(messages, conversation, "guest"), 1);
  });

  it("derives delivery state from the recipient's marker", () => {
    const hostMessage = { senderRole: "host" as const, createdAt: at("2026-09-10T11:00:00Z") };
    assert.equal(deliveryStateOf(hostMessage, conversation), "sent");
    assert.equal(
      deliveryStateOf(hostMessage, { ...conversation, guestLastReadAt: at("2026-09-10T11:00:00Z") }),
      "read",
    );
    const guestMessage = { senderRole: "guest" as const, createdAt: at("2026-09-10T09:00:00Z") };
    assert.equal(deliveryStateOf(guestMessage, conversation), "read");
  });
});

describe("unreadGuestMessagesWhere", () => {
  it("keeps the unread-or-never-read branch grouped inside the AND", () => {
    const messages = pgTable("m", {
      conversationId: text("conversation_id").notNull(),
      senderRole: text("sender_role").notNull(),
      createdAt: timestamp("created_at").notNull(),
    });
    const conversations = pgTable("c", { hostLastReadAt: timestamp("host_last_read_at") });
    const where = unreadGuestMessagesWhere(["c1", "c2"], {
      conversationId: messages.conversationId,
      senderRole: messages.senderRole,
      createdAt: messages.createdAt,
      hostLastReadAt: conversations.hostLastReadAt,
    });
    assert.ok(where);
    const { sql, params } = new PgDialect().sqlToQuery(where);
    assert.deepEqual(params, ["c1", "c2", "guest"]);
    // "(<in> and <sender> and (<null> or <newer>))" — the OR must be parenthesised,
    // otherwise "createdAt > hostLastReadAt" would match messages of every
    // conversation and sender.
    assert.match(sql, /^\(.*"conversation_id" in \(\$1, \$2\) and .*"sender_role" = \$3 and \(.*"host_last_read_at" is null or .*"created_at" > .*"host_last_read_at"\)\)$/);
  });
});
