import { describe, expect, it } from "vitest";
import { buildTodayTasks, filterTasks, groupTasks, summaryFigures } from "./hostDashboardModel";

const emptySummary = () => ({
  setup: { counts: { total: 0, draft: 0, ready: 0, live: 0 }, items: [] },
  requests: { count: 0, items: [] },
  calendar: { conflicts: [], feedFailures: [] },
  messages: { unreadConversations: 0, unreadMessages: 0, items: [] },
  payouts: { readiness: "notConnected", blocker: null },
});

const fullSummary = () => ({
  setup: {
    counts: { total: 3, draft: 1, ready: 1, live: 1 },
    items: [
      { listing: { id: "l-draft", name: "Chata", status: "DRAFT" }, kind: "draft", completionPercent: 40, missingRequirements: ["photos", "price"] },
      { listing: { id: "l-ready", name: "Apartmán", status: "READY" }, kind: "ready", completionPercent: 100, missingRequirements: [] },
    ],
  },
  requests: {
    count: 1,
    items: [{ id: "r1", listing: { id: "l-live", name: "Vila" }, guestName: "Eva", checkIn: "2026-09-20", checkOut: "2026-09-22", createdAt: "2026-09-09T10:00:00Z", conflicts: [] }],
  },
  calendar: {
    conflicts: [{ listing: { id: "l-live", name: "Vila" }, reservationId: "r2", guestName: "Jan", checkIn: "2026-10-01", checkOut: "2026-10-03", conflicts: [{ kind: "manual" }] }],
    feedFailures: [{ listing: { id: "l-draft", name: "Chata" }, feedId: "f1", label: "Airbnb", lastError: "timeout", lastAttemptAt: "2026-09-10T00:00:00Z", hasImportedDates: true }],
  },
  messages: { unreadConversations: 1, unreadMessages: 3, items: [{ id: "c1", listing: { id: "l-live", name: "Vila" }, reservationId: null, guestName: "Eva", unreadCount: 3, lastMessageAt: "2026-09-10T07:00:00Z" }] },
  payouts: { readiness: "notConnected", blocker: { liveListings: 1 } },
});

const now = new Date("2026-09-10T12:00:00Z");

describe("buildTodayTasks", () => {
  it("returns tasks in the plan's priority order with exact deep links", () => {
    const tasks = buildTodayTasks(fullSummary(), { language: "en", now });
    expect(tasks.map((task) => task.group)).toEqual(["setup", "setup", "requests", "calendar", "calendar", "messages", "payouts"]);
    expect(tasks.find((task) => task.id === "setup:l-ready").href).toBe("/host/listings/l-ready?review=1");
    expect(tasks.find((task) => task.id === "request:r1").href).toBe("/host/reservations/r1");
    expect(tasks.find((task) => task.id === "conflict:r2").href).toBe("/host/listings/l-live/calendar");
    expect(tasks.find((task) => task.id === "feed:l-draft:f1").href).toBe("/host/listings/l-draft/calendar");
    expect(tasks.find((task) => task.id === "message:c1").href).toBe("/host/messages/c1");
    expect(tasks.find((task) => task.id === "payouts:not-connected").href).toBe("/host/payouts");
  });

  it("opens a draft at its first incomplete step when the listing is known", () => {
    const listingsById = new Map([["l-draft", { id: "l-draft", status: "DRAFT", completedSteps: ["basics"], data: {} }]]);
    const tasks = buildTodayTasks(fullSummary(), { language: "sk", listingsById, now });
    const draft = tasks.find((task) => task.id === "setup:l-draft");
    expect(draft.href).toMatch(/^\/host\/listings\/l-draft\?step=/);
    expect(draft.href).not.toContain("step=basics");
    expect(draft.detail).toContain("40 %");
    expect(draft.detail).toContain("zostávajú 2 položky");
  });

  it("asks for a first listing when the host has none, and stays quiet otherwise", () => {
    const tasks = buildTodayTasks(emptySummary(), { language: "en", now });
    expect(tasks).toEqual([expect.objectContaining({ id: "setup:first", href: "/host/listings/new", propertyId: null })]);
    const summary = emptySummary();
    summary.setup.counts.total = 1;
    expect(buildTodayTasks(summary, { language: "en", now })).toEqual([]);
  });

  it("flags requests whose dates are no longer free as urgent", () => {
    const summary = fullSummary();
    summary.requests.items[0].conflicts = [{ kind: "reservation" }];
    const task = buildTodayTasks(summary, { language: "en", now }).find((item) => item.id === "request:r1");
    expect(task.tone).toBe("urgent");
    expect(task.detail).toContain("dates no longer free");
    expect(task.detail).toContain("1 day ago");
  });

  it("returns nothing without a summary", () => {
    expect(buildTodayTasks(null)).toEqual([]);
  });
});

describe("filterTasks / groupTasks", () => {
  it("narrows property-specific tasks but keeps host-level ones", () => {
    const tasks = buildTodayTasks(fullSummary(), { language: "en", now });
    const filtered = filterTasks(tasks, { property: "l-live" });
    expect(filtered.map((task) => task.id)).toEqual(["request:r1", "conflict:r2", "message:c1", "payouts:not-connected"]);
    expect(filterTasks(tasks, {})).toHaveLength(tasks.length);
  });

  it("groups in priority order and omits empty groups", () => {
    const tasks = buildTodayTasks(fullSummary(), { language: "sk", now });
    const groups = groupTasks(filterTasks(tasks, { property: "l-ready" }), "sk");
    expect(groups.map((group) => [group.group, group.tasks.length])).toEqual([["setup", 1], ["payouts", 1]]);
    expect(groups[0].title).toBe("Dokončite nastavenie");
  });
});

describe("summaryFigures", () => {
  it("exposes the three traceable counts with their source screens", () => {
    const figures = summaryFigures(fullSummary(), "en");
    expect(figures.map((figure) => [figure.id, figure.value])).toEqual([["live", 1], ["requests", 1], ["unread", 3]]);
    expect(figures[1].href).toBe("/host/reservations?stage=request");
    expect(figures[2].href).toBe("/host/messages");
    expect(summaryFigures(null, "en")).toEqual([]);
  });
});
