import { describe, expect, it } from "vitest";
import {
  conversationContext,
  filterConversations,
  formatDayLabel,
  groupByDay,
  mergeThread,
  messageErrorText,
  sortConversations,
  unreadLabel,
  unreadTotal,
  upsertConversation,
  upsertMessage,
} from "./messagesModel";

const conv = (id, extra = {}) => ({ id, accommodationId: "acc-1", unreadCount: 0, lastMessageAt: "2026-09-10T08:00:00.000Z", ...extra });

describe("conversation list", () => {
  it("orders by latest activity and upserts in place", () => {
    const list = sortConversations([conv("a", { lastMessageAt: "2026-09-01T00:00:00Z" }), conv("b", { lastMessageAt: "2026-09-09T00:00:00Z" })]);
    expect(list.map((item) => item.id)).toEqual(["b", "a"]);
    const next = upsertConversation(list, conv("a", { lastMessageAt: "2026-09-10T00:00:00Z", unreadCount: 2 }));
    expect(next.map((item) => item.id)).toEqual(["a", "b"]);
    expect(next).toHaveLength(2);
    expect(unreadTotal(next)).toBe(2);
  });

  it("narrows by property but keeps everything when no property is chosen", () => {
    const list = [conv("a"), conv("b", { accommodationId: "acc-2" })];
    expect(filterConversations(list, { property: "acc-2" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterConversations(list, {})).toHaveLength(2);
  });
});

describe("thread merging", () => {
  const stored = [
    { id: "m1", clientKey: "k1", mine: true, body: "Hi", createdAt: "2026-09-10T08:00:00Z", state: "read" },
    { id: "m2", clientKey: null, mine: false, body: "Hello", createdAt: "2026-09-10T08:05:00Z", state: "sent" },
  ];

  it("appends unconfirmed outbox entries after stored messages", () => {
    const merged = mergeThread(stored, [
      { clientKey: "k2", body: "Sending", createdAt: "2026-09-10T08:06:00Z", status: "sending" },
      { clientKey: "k3", body: "Failed", createdAt: "2026-09-10T08:07:00Z", status: "failed", error: { status: 0 } },
    ]);
    expect(merged.map((item) => item.id)).toEqual(["m1", "m2", "local:k2", "local:k3"]);
    expect(merged[2]).toMatchObject({ mine: true, state: "sending", local: true });
    expect(merged[3]).toMatchObject({ state: "failed", body: "Failed" });
  });

  it("drops an outbox entry the server already confirmed (retry that succeeded)", () => {
    const merged = mergeThread(stored, [{ clientKey: "k1", body: "Hi", createdAt: "2026-09-10T08:00:00Z", status: "failed" }]);
    expect(merged).toHaveLength(2);
  });

  it("replaces a message by clientKey when the server echoes it back", () => {
    const next = upsertMessage(stored, { id: "m9", clientKey: "k1", body: "Hi", state: "sent" });
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe("m9");
    expect(upsertMessage(stored, { id: "m3", body: "New" })).toHaveLength(3);
  });

  it("groups by calendar day with Today / Yesterday labels", () => {
    const now = new Date("2026-09-10T12:00:00");
    const groups = groupByDay(
      [
        { id: "a", createdAt: "2026-09-09T10:00:00" },
        { id: "b", createdAt: "2026-09-09T11:00:00" },
        { id: "c", createdAt: "2026-09-10T09:00:00" },
      ],
      "en",
      now,
    );
    expect(groups.map((group) => [group.label, group.messages.length])).toEqual([["Yesterday", 2], ["Today", 1]]);
    expect(formatDayLabel("2026-09-10T09:00:00", "sk", now)).toBe("Dnes");
  });
});

describe("copy", () => {
  it("uses Slovak plural forms for unread counts", () => {
    expect(unreadLabel(1, "sk")).toBe("1 nová správa");
    expect(unreadLabel(3, "sk")).toBe("3 nové správy");
    expect(unreadLabel(7, "sk")).toBe("7 nových správ");
    expect(unreadLabel(2, "en")).toBe("2 new messages");
  });

  it("describes the thread by listing and stay", () => {
    expect(conversationContext({ listing: { name: "Chata" }, reservation: null }, "en")).toBe("Chata");
    expect(conversationContext({ listing: { name: "Chata" }, reservation: { checkIn: "2026-09-21", checkOut: "2026-09-24" } }, "en")).toMatch(/^Chata · 21 – 24 Sep/);
  });

  it("maps server codes and network failures to readable text", () => {
    expect(messageErrorText({ status: 400, code: "messageTooLong" }, "en")).toMatch(/long/i);
    expect(messageErrorText({ status: 0 }, "sk")).toMatch(/pripojenia/);
    expect(messageErrorText({ status: 500 }, "en")).toMatch(/try again/i);
  });
});
