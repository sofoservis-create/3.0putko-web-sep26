import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utlis/guestAccountApi", () => ({
  createHostMessageFixture: vi.fn(),
  getHostConversation: vi.fn(),
  listHostConversations: vi.fn(),
  markHostConversationRead: vi.fn(),
  sendHostMessage: vi.fn(),
}));

import { getHostConversation, listHostConversations, sendHostMessage } from "../../utlis/guestAccountApi";
import { HostMessagesProvider, useHostMessages } from "./HostMessagesContext";

const CONVERSATION = "c-1";
const OUTBOX_KEY = `putko:host-outbox:${CONVERSATION}`;

const apiError = (status, code) => Object.assign(new Error(code || `HTTP ${status}`), { status, code });
const networkError = () => Object.assign(new TypeError("Failed to fetch"), { status: 0 });

let store;
function Probe() {
  store = useHostMessages();
  return null;
}

const mountProvider = async () => {
  listHostConversations.mockResolvedValue({ conversations: [], today: "2026-09-10" });
  const view = render(
    <HostMessagesProvider>
      <Probe />
    </HostMessagesProvider>,
  );
  await act(async () => {});
  return view;
};

const entries = () => store.outbox.get(CONVERSATION) ?? [];
const stored = () => JSON.parse(window.localStorage.getItem(OUTBOX_KEY) || "[]");

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  store = null;
});
afterEach(cleanup);

describe("HostMessagesProvider outbox", () => {
  it("keeps a message that failed on the network and still has it after a remount", async () => {
    sendHostMessage.mockRejectedValueOnce(networkError());
    const view = await mountProvider();

    await act(async () => {
      await store.send(CONVERSATION, "Hello from the host");
    });
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ status: "failed", permanent: false, body: "Hello from the host" });
    const { clientKey } = entries()[0];
    expect(stored()).toEqual([expect.objectContaining({ clientKey, body: "Hello from the host", status: "failed" })]);

    // Simulate a reload: a brand-new provider must restore the unsent text.
    view.unmount();
    await mountProvider();
    expect(entries()).toEqual([expect.objectContaining({ clientKey, body: "Hello from the host", status: "failed" })]);

    // Retry re-uses the identical clientKey so the server can de-duplicate.
    sendHostMessage.mockResolvedValueOnce({
      message: { id: "m-1", clientKey, body: "Hello from the host", senderRole: "host", createdAt: "2026-09-10T10:00:00.000Z" },
      conversation: { id: CONVERSATION, unreadCount: 0, lastMessageAt: "2026-09-10T10:00:00.000Z" },
    });
    await act(async () => {
      await store.retry(CONVERSATION, clientKey);
    });
    expect(sendHostMessage).toHaveBeenLastCalledWith(CONVERSATION, { body: "Hello from the host", clientKey });
    expect(entries()).toHaveLength(0);
    expect(window.localStorage.getItem(OUTBOX_KEY)).toBeNull();
    expect(store.threads.get(CONVERSATION).messages.map((m) => m.id)).toEqual(["m-1"]);
  });

  it("keeps a permanently rejected message with its reason instead of dropping the text", async () => {
    sendHostMessage.mockRejectedValueOnce(apiError(400, "messageTooLong"));
    await mountProvider();

    let result;
    await act(async () => {
      result = await store.send(CONVERSATION, "x".repeat(10));
    });
    expect(result).toMatchObject({ ok: false, permanent: true });
    expect(entries()).toEqual([
      expect.objectContaining({ status: "failed", permanent: true, body: "x".repeat(10), error: expect.objectContaining({ code: "messageTooLong" }) }),
    ]);
    expect(stored()).toEqual([expect.objectContaining({ permanent: true, error: expect.objectContaining({ code: "messageTooLong", status: 400 }) })]);

    // A retry that is rejected again must not lose the entry either.
    const { clientKey } = entries()[0];
    sendHostMessage.mockRejectedValueOnce(apiError(403, "forbidden"));
    await act(async () => {
      await store.retry(CONVERSATION, clientKey);
    });
    expect(entries()).toEqual([expect.objectContaining({ clientKey, status: "failed", permanent: true, error: expect.objectContaining({ code: "forbidden" }) })]);

    // Only an explicit discard removes it, handing the text back.
    let text;
    act(() => {
      text = store.discard(CONVERSATION, clientKey);
    });
    expect(text).toBe("x".repeat(10));
    expect(entries()).toHaveLength(0);
    expect(window.localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it("drops a restored entry once the server shows the message already arrived", async () => {
    window.localStorage.setItem(
      OUTBOX_KEY,
      JSON.stringify([{ clientKey: "k-arrived", body: "Made it", createdAt: "2026-09-10T09:00:00.000Z", status: "failed" }]),
    );
    await mountProvider();
    expect(entries()).toHaveLength(1);

    getHostConversation.mockResolvedValueOnce({
      conversation: { id: CONVERSATION, unreadCount: 0, lastMessageAt: "2026-09-10T09:00:01.000Z" },
      messages: [{ id: "m-9", clientKey: "k-arrived", body: "Made it", senderRole: "host", createdAt: "2026-09-10T09:00:01.000Z" }],
    });
    await act(async () => {
      await store.loadThread(CONVERSATION);
    });
    expect(entries()).toHaveLength(0);
    expect(window.localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it("ignores malformed stored outboxes", async () => {
    window.localStorage.setItem(OUTBOX_KEY, "{not json");
    window.localStorage.setItem("putko:host-outbox:c-2", JSON.stringify([{ clientKey: 1 }, { clientKey: "k", body: "   " }]));
    await mountProvider();
    expect(store.outbox.size).toBe(0);
  });
});
