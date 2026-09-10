import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utlis/guestAccountApi", () => ({
  createHostMessageFixture: vi.fn(),
  getHostConversation: vi.fn(),
  listHostConversations: vi.fn(),
  markHostConversationRead: vi.fn(),
  sendHostMessage: vi.fn(),
}));
vi.mock("../HostNavigationGuard", () => ({
  useHostNavigation: () => ({ linkProps: (href) => ({ href }) }),
}));

import {
  getHostConversation,
  listHostConversations,
  markHostConversationRead,
  sendHostMessage,
} from "../../utlis/guestAccountApi";
import { HostMessagesProvider } from "./HostMessagesContext";
import ConversationPage from "./ConversationPage";

const CONVERSATION = "c-1";
const conversation = (overrides = {}) => ({
  id: CONVERSATION,
  accommodationId: "a-1",
  guest: { name: "Jana" },
  listing: { name: "Chata" },
  reservation: null,
  unreadCount: 0,
  lastMessageAt: "2026-09-10T08:00:00.000Z",
  ...overrides,
});
const guestMessage = { id: "g-1", senderRole: "guest", body: "Hi", createdAt: "2026-09-10T08:00:00.000Z", state: "sent" };

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderPage = async () => {
  listHostConversations.mockResolvedValue({ conversations: [] });
  render(
    <HostMessagesProvider>
      <ConversationPage conversationId={CONVERSATION} language="en" />
    </HostMessagesProvider>,
  );
  return screen.findByLabelText("Message");
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ConversationPage failure recovery", () => {
  it("keeps text typed during a rejected send and appends the rejected message on Edit", async () => {
    getHostConversation.mockResolvedValue({ conversation: conversation(), messages: [] });
    const pending = deferred();
    sendHostMessage.mockReturnValueOnce(pending.promise);
    const textarea = await renderPage();

    fireEvent.change(textarea, { target: { value: "First message" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(textarea.value).toBe("");
    expect(screen.getByText("Sending…")).toBeTruthy();

    // The host keeps typing while the request is in flight…
    fireEvent.change(textarea, { target: { value: "Second thought" } });

    // …and the server rejects the first message for good.
    await act(async () => {
      pending.reject(Object.assign(new Error("forbidden"), { status: 403, code: "forbidden" }));
      await pending.promise.catch(() => {});
    });

    // Newer text is untouched; the rejected text is still on screen with its reason.
    expect(textarea.value).toBe("Second thought");
    expect(screen.getByText("First message")).toBeTruthy();
    expect(screen.getByText("Not sent")).toBeTruthy();
    expect(screen.getByText("You are not a participant of this conversation.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();

    // Edit puts the rejected text back after what the host typed meanwhile.
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(textarea.value).toBe("Second thought\nFirst message");
    expect(screen.queryByText("Not sent")).toBeNull();
  });

  it("offers Retry for a network failure and sends the identical message again", async () => {
    getHostConversation.mockResolvedValue({ conversation: conversation(), messages: [] });
    sendHostMessage.mockRejectedValueOnce(Object.assign(new TypeError("Failed to fetch"), { status: 0 }));
    const textarea = await renderPage();

    fireEvent.change(textarea, { target: { value: "Are you there?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Not sent");
    const [, first] = sendHostMessage.mock.calls[0];

    sendHostMessage.mockResolvedValueOnce({
      message: { id: "m-1", clientKey: first.clientKey, senderRole: "host", body: "Are you there?", createdAt: "2026-09-10T09:00:00.000Z", state: "sent" },
      conversation: conversation({ lastMessageAt: "2026-09-10T09:00:00.000Z" }),
    });
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    await waitFor(() => expect(screen.queryByText("Not sent")).toBeNull());
    expect(sendHostMessage).toHaveBeenCalledTimes(2);
    expect(sendHostMessage.mock.calls[1][1]).toEqual(first);
    expect(screen.getAllByText("Are you there?")).toHaveLength(1);
  });

  it("retries a failed read acknowledgment and stops once it succeeds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getHostConversation.mockResolvedValue({
      conversation: conversation({ unreadCount: 1 }),
      messages: [guestMessage],
    });
    markHostConversationRead
      .mockRejectedValueOnce(Object.assign(new Error("HTTP 500"), { status: 500 }))
      .mockResolvedValue({ conversation: conversation({ unreadCount: 0 }), messages: [guestMessage] });
    await renderPage();

    await waitFor(() => expect(markHostConversationRead).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(markHostConversationRead).toHaveBeenCalledTimes(2));

    // Acknowledged: no further attempts for the same activity.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(markHostConversationRead).toHaveBeenCalledTimes(2);
  });

  it("does not keep retrying a read acknowledgment the server forbids", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getHostConversation.mockResolvedValue({ conversation: conversation({ unreadCount: 1 }), messages: [guestMessage] });
    markHostConversationRead.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));
    await renderPage();

    await waitFor(() => expect(markHostConversationRead).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(markHostConversationRead).toHaveBeenCalledTimes(1);
  });
});
