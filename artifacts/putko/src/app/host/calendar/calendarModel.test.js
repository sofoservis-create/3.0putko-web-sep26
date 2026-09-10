import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarErrorText,
  dayCoverage,
  feedStatusText,
  formatRange,
  monthGrid,
  rangeDays,
  rangeFromTaps,
  selectionSummary,
  shiftMonth,
  upcomingBlocks,
  weekdayLabels,
} from "./calendarModel";
import { hostPaths, resolveHostLocation } from "../hostRoutes";

const manual = (startDate, endDate, extra = {}) => ({ id: `${startDate}/${endDate}`, source: "manual", startDate, endDate, ...extra });
const feed = (startDate, endDate) => ({ id: `f-${startDate}`, source: "feed", feedId: "feed-1", startDate, endDate });

describe("monthGrid", () => {
  it("starts weeks on Monday and pads with neighbouring days", () => {
    // September 2026 starts on a Tuesday.
    const weeks = monthGrid({ year: 2026, month: 9 });
    expect(weeks[0][0]).toEqual({ iso: "2026-08-31", day: 31, inMonth: false });
    expect(weeks[0][1]).toEqual({ iso: "2026-09-01", day: 1, inMonth: true });
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    const last = weeks[weeks.length - 1];
    expect(last.some((cell) => cell.iso === "2026-09-30")).toBe(true);
  });

  it("handles a month starting on Sunday without dropping days", () => {
    // November 2026 starts on a Sunday → six leading padding days.
    const weeks = monthGrid({ year: 2026, month: 11 });
    expect(weeks[0][6].iso).toBe("2026-11-01");
    expect(weeks.flat().filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("labels weekdays Monday-first in both languages", () => {
    expect(weekdayLabels("en")[0]).toBe("Mon");
    expect(weekdayLabels("sk")[0].toLowerCase()).toBe("po");
  });
});

describe("date arithmetic", () => {
  it("adds days across DST and month ends", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(rangeDays({ startDate: "2026-09-20", endDate: "2026-09-20" })).toBe(1);
    expect(rangeDays({ startDate: "2026-09-20", endDate: "2026-09-25" })).toBe(6);
  });
});

describe("selection", () => {
  it("anchors on the first tap and closes on the second, in either order", () => {
    expect(rangeFromTaps(null, "2026-09-10")).toEqual({ startDate: "2026-09-10", endDate: "2026-09-10", complete: false });
    expect(rangeFromTaps("2026-09-10", "2026-09-12")).toEqual({ startDate: "2026-09-10", endDate: "2026-09-12", complete: true });
    expect(rangeFromTaps("2026-09-12", "2026-09-10")).toEqual({ startDate: "2026-09-10", endDate: "2026-09-12", complete: true });
    expect(rangeFromTaps("2026-09-10", "2026-09-10").complete).toBe(true);
  });

  it("offers Block only when some day is still free and Unblock only when some day is manually blocked", () => {
    const blocks = [manual("2026-09-20", "2026-09-22"), feed("2026-09-25", "2026-09-25")];
    expect(selectionSummary(blocks, { startDate: "2026-09-20", endDate: "2026-09-22" })).toMatchObject({ days: 3, canBlock: false, canUnblock: true });
    expect(selectionSummary(blocks, { startDate: "2026-09-21", endDate: "2026-09-24" })).toMatchObject({ days: 4, canBlock: true, canUnblock: true });
    expect(selectionSummary(blocks, { startDate: "2026-09-25", endDate: "2026-09-25" })).toMatchObject({ canBlock: true, canUnblock: false, feedDays: 1 });
    expect(selectionSummary(blocks, null)).toMatchObject({ days: 0, canBlock: false, canUnblock: false });
  });

  it("separates manual from feed coverage for a day", () => {
    const blocks = [manual("2026-09-20", "2026-09-22"), feed("2026-09-22", "2026-09-23")];
    expect(dayCoverage(blocks, "2026-09-22")).toMatchObject({ manual: blocks[0], feeds: [blocks[1]] });
    expect(dayCoverage(blocks, "2026-09-23")).toMatchObject({ manual: null });
    expect(dayCoverage(blocks, "2026-09-19")).toEqual({ manual: null, feeds: [], reservation: null });
  });

  it("keeps reserved nights apart from manual and feed blocks", () => {
    const reserved = { id: "r", startDate: "2026-09-22", endDate: "2026-09-24", source: "reservation", reservationId: "res-1", note: "Jana" };
    const manual = { id: "m", startDate: "2026-09-24", endDate: "2026-09-25", source: "manual" };
    expect(dayCoverage([reserved, manual], "2026-09-23")).toMatchObject({ manual: null, reservation: reserved });
    expect(dayCoverage([reserved, manual], "2026-09-24")).toMatchObject({ manual, reservation: reserved });
    // Reserved nights cannot be blocked again nor released from here.
    expect(selectionSummary([reserved, manual], { startDate: "2026-09-22", endDate: "2026-09-23" })).toMatchObject({ canBlock: false, canUnblock: false, reservedDays: 2 });
    expect(selectionSummary([reserved, manual], { startDate: "2026-09-23", endDate: "2026-09-26" })).toMatchObject({ canBlock: true, canUnblock: true, reservedDays: 2 });
  });
});

describe("list view", () => {
  it("keeps only blocks that have not ended, soonest first", () => {
    const blocks = [manual("2026-10-01", "2026-10-03"), manual("2026-09-01", "2026-09-08"), feed("2026-09-09", "2026-09-09")];
    expect(upcomingBlocks(blocks, "2026-09-09").map((b) => b.startDate)).toEqual(["2026-09-09", "2026-10-01"]);
  });
});

describe("copy", () => {
  it("formats ranges per language", () => {
    expect(formatRange({ startDate: "2026-09-20", endDate: "2026-09-25" }, "en")).toMatch(/20 Sept? – 25 Sept? 2026/);
    expect(formatRange({ startDate: "2026-09-20", endDate: "2026-09-25" }, "sk")).toContain("2026");
  });

  it("describes feed status honestly", () => {
    expect(feedStatusText({ status: "never" }, "en")).toBe("Not fetched yet");
    expect(feedStatusText({ status: "never" }, "sk")).toBe("Zatiaľ nenačítané");
    expect(feedStatusText({ status: "ok", lastFetchedAt: "2026-09-09T10:00:00Z", importedCount: 3 }, "en")).toMatch(/^Fetched .* 3 blocked ranges imported$/);
    expect(feedStatusText({ status: "failed", lastAttemptAt: "2026-09-09T10:00:00Z", lastFetchedAt: null }, "en")).toMatch(/^Failed /);
    expect(feedStatusText({ status: "failed", lastAttemptAt: "2026-09-09T10:00:00Z", lastFetchedAt: "2026-09-01T10:00:00Z" }, "sk")).toContain("zobrazené termíny z");
  });

  it("localizes API error codes and falls back to a generic message", () => {
    expect(calendarErrorText({ code: "inPast" }, "sk")).toBe("Minulé dátumy sa nedajú meniť.");
    expect(calendarErrorText({ code: "unsupportedScheme" }, "en")).toBe("The link must start with http:// or https://.");
    expect(calendarErrorText({ code: "somethingNew" }, "en")).toBe("Something went wrong. Please try again.");
    expect(calendarErrorText({ status: 401 }, "sk")).toContain("Prihláste sa");
  });
});

describe("routes", () => {
  it("resolves the global and property-scoped calendar paths", () => {
    expect(resolveHostLocation("/host/calendar")).toMatchObject({ section: "calendar", listingId: null });
    expect(resolveHostLocation("/host/listings/abc-1/calendar")).toMatchObject({ section: "calendar", listingId: "abc-1" });
    expect(hostPaths.listingCalendar("a b")).toBe("/host/listings/a%20b/calendar");
  });

  it("carries a requested editor step only for known steps", () => {
    expect(resolveHostLocation("/host/listings/abc-1", "?step=calendar")).toMatchObject({ section: "listing", listingId: "abc-1", step: "calendar" });
    expect(resolveHostLocation("/host/listings/abc-1", "?step=bogus").step).toBeNull();
    expect(hostPaths.listing("abc-1", { step: "calendar" })).toBe("/host/listings/abc-1?step=calendar");
    expect(hostPaths.listing("abc-1", { review: true, step: "calendar" })).toBe("/host/listings/abc-1?review=1&step=calendar");
  });
});
