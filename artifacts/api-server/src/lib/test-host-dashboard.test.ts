import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDashboardSummary, type DashboardInputs } from "./test-host-dashboard.ts";

const TODAY = "2026-09-10";
const at = (iso: string) => new Date(iso);

const liveData = {
  name: "Chata Lúčky",
  calendarChoice: "connect",
  calendarFeeds: [{ id: "feed-1", label: "Airbnb", url: "https://airbnb.example/cal.ics" }],
};

const base = (): DashboardInputs => ({
  today: TODAY,
  listings: [
    { id: "live-1", status: "LIVE", data: liveData, updatedAt: at("2026-09-01T00:00:00Z") },
    { id: "draft-1", status: "DRAFT", data: { name: "Byt v centre" }, updatedAt: at("2026-09-08T00:00:00Z") },
    { id: "ready-1", status: "READY", data: { name: "Apartmán Sever" }, updatedAt: at("2026-09-02T00:00:00Z") },
  ],
  reservations: [],
  blocks: [],
  feedStatuses: [],
  conversations: [],
});

describe("setup", () => {
  it("counts statuses and lists non-live listings with READY first", () => {
    const summary = buildDashboardSummary(base());
    assert.deepEqual(summary.setup.counts, { total: 3, draft: 1, ready: 1, live: 1 });
    assert.deepEqual(
      summary.setup.items.map((item) => [item.listing.id, item.kind]),
      [["ready-1", "ready"], ["draft-1", "draft"]],
    );
    assert.equal(summary.setup.items[1].completionPercent < 100, true);
    assert.equal(summary.setup.items[1].missingRequirements.length > 0, true);
  });
});

describe("requests and conflicts", () => {
  it("lists open requests oldest first and flags ones whose nights are taken", () => {
    const inputs = base();
    inputs.reservations = [
      { id: "r-new", accommodationId: "live-1", guestName: "Nová", checkIn: "2026-10-01", checkOut: "2026-10-03", status: "requested", createdAt: at("2026-09-09T10:00:00Z") },
      { id: "r-old", accommodationId: "live-1", guestName: "Stará", checkIn: "2026-09-20", checkOut: "2026-09-22", status: "requested", createdAt: at("2026-09-05T10:00:00Z") },
      { id: "r-acc", accommodationId: "live-1", guestName: "Prijatá", checkIn: "2026-09-21", checkOut: "2026-09-23", status: "accepted", createdAt: at("2026-09-01T10:00:00Z") },
      { id: "r-declined", accommodationId: "live-1", guestName: "X", checkIn: "2026-09-21", checkOut: "2026-09-23", status: "declined", createdAt: at("2026-09-01T10:00:00Z") },
    ];
    inputs.blocks = [
      { accommodationId: "live-1", startDate: "2026-09-21", endDate: "2026-09-22", source: "reservation", note: "Prijatá" },
    ];
    const summary = buildDashboardSummary(inputs);
    assert.equal(summary.requests.count, 2);
    assert.deepEqual(summary.requests.items.map((item) => item.id), ["r-old", "r-new"]);
    assert.equal(summary.requests.items[0].conflicts.length, 1);
    assert.equal(summary.requests.items[0].conflicts[0].kind, "reservation");
    assert.equal(summary.requests.items[1].conflicts.length, 0);
    // An accepted stay only conflicting with its own calendar block is fine.
    assert.equal(summary.calendar.conflicts.length, 0);
  });

  it("reports accepted stays overlapped by manual blocks or connected imports", () => {
    const inputs = base();
    inputs.reservations = [
      { id: "r-acc", accommodationId: "live-1", guestName: "Prijatá", checkIn: "2026-09-21", checkOut: "2026-09-24", status: "accepted", createdAt: at("2026-09-01T10:00:00Z") },
      { id: "r-past", accommodationId: "live-1", guestName: "Minulá", checkIn: "2026-09-01", checkOut: "2026-09-03", status: "accepted", createdAt: at("2026-08-01T10:00:00Z") },
    ];
    inputs.blocks = [
      { accommodationId: "live-1", startDate: "2026-09-21", endDate: "2026-09-23", source: "reservation", note: "Prijatá" },
      { accommodationId: "live-1", startDate: "2026-09-22", endDate: "2026-09-22", source: "feed", note: "Airbnb" },
      { accommodationId: "live-1", startDate: "2026-09-01", endDate: "2026-09-02", source: "manual", note: null },
    ];
    const summary = buildDashboardSummary(inputs);
    assert.equal(summary.calendar.conflicts.length, 1);
    assert.equal(summary.calendar.conflicts[0].reservationId, "r-acc");
    assert.equal(summary.calendar.conflicts[0].conflicts[0].kind, "feed");
  });

  it("ignores imported dates while connected calendars are paused", () => {
    const inputs = base();
    inputs.listings[0] = { ...inputs.listings[0], data: { ...liveData, calendarChoice: "none" } };
    inputs.reservations = [
      { id: "r-acc", accommodationId: "live-1", guestName: "Prijatá", checkIn: "2026-09-21", checkOut: "2026-09-24", status: "accepted", createdAt: at("2026-09-01T10:00:00Z") },
    ];
    inputs.blocks = [{ accommodationId: "live-1", startDate: "2026-09-22", endDate: "2026-09-22", source: "feed", note: "Airbnb" }];
    assert.equal(buildDashboardSummary(inputs).calendar.conflicts.length, 0);
  });
});

describe("feed failures", () => {
  it("reports failed connected feeds and skips stale, paused or unknown ones", () => {
    const inputs = base();
    inputs.listings.push({
      id: "paused-1",
      status: "LIVE",
      data: { ...liveData, name: "Paused", calendarChoice: "none" },
      updatedAt: at("2026-09-01T00:00:00Z"),
    });
    inputs.feedStatuses = [
      { accommodationId: "live-1", feedId: "feed-1", url: "https://airbnb.example/cal.ics", status: "failed", lastError: "timeout", lastAttemptAt: at("2026-09-10T08:00:00Z"), lastFetchedAt: at("2026-09-09T08:00:00Z") },
      { accommodationId: "live-1", feedId: "feed-1", url: "https://old.example/cal.ics", status: "failed", lastError: "stale", lastAttemptAt: null, lastFetchedAt: null },
      { accommodationId: "live-1", feedId: "feed-gone", url: "https://x.example/cal.ics", status: "failed", lastError: "gone", lastAttemptAt: null, lastFetchedAt: null },
      { accommodationId: "paused-1", feedId: "feed-1", url: "https://airbnb.example/cal.ics", status: "failed", lastError: "paused", lastAttemptAt: null, lastFetchedAt: null },
      { accommodationId: "live-1", feedId: "feed-1", url: "https://airbnb.example/cal.ics", status: "ok", lastError: null, lastAttemptAt: null, lastFetchedAt: null },
    ];
    const summary = buildDashboardSummary(inputs);
    assert.equal(summary.calendar.feedFailures.length, 1);
    assert.deepEqual(
      { id: summary.calendar.feedFailures[0].listing.id, label: summary.calendar.feedFailures[0].label, imported: summary.calendar.feedFailures[0].hasImportedDates },
      { id: "live-1", label: "Airbnb", imported: true },
    );
  });
});

describe("messages and payouts", () => {
  it("surfaces only threads with unread guest messages, newest first", () => {
    const inputs = base();
    inputs.conversations = [
      { id: "c-read", accommodationId: "live-1", reservationId: null, guestName: "A", lastMessageAt: at("2026-09-10T09:00:00Z"), unreadCount: 0 },
      { id: "c-old", accommodationId: "live-1", reservationId: "r-1", guestName: "B", lastMessageAt: at("2026-09-09T09:00:00Z"), unreadCount: 2 },
      { id: "c-new", accommodationId: "draft-1", reservationId: null, guestName: "C", lastMessageAt: at("2026-09-10T10:00:00Z"), unreadCount: 1 },
    ];
    const summary = buildDashboardSummary(inputs);
    assert.equal(summary.messages.unreadConversations, 2);
    assert.equal(summary.messages.unreadMessages, 3);
    assert.deepEqual(summary.messages.items.map((item) => item.id), ["c-new", "c-old"]);
  });

  it("raises the payout blocker only when live listings exist", () => {
    assert.deepEqual(buildDashboardSummary(base()).payouts.blocker, { liveListings: 1 });
    const inputs = base();
    inputs.listings = inputs.listings.filter((listing) => listing.status !== "LIVE");
    assert.equal(buildDashboardSummary(inputs).payouts.blocker, null);
  });

  it("is empty for a host without listings", () => {
    const summary = buildDashboardSummary({ ...base(), listings: [] });
    assert.deepEqual(summary.setup.counts, { total: 0, draft: 0, ready: 0, live: 0 });
    assert.equal(summary.requests.count, 0);
    assert.equal(summary.payouts.blocker, null);
  });
});
