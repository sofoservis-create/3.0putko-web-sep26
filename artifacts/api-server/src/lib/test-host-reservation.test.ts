import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOWED_TRANSITIONS,
  availableActions,
  blockOverlapsStay,
  findStayConflicts,
  resolveTransition,
  stageOf,
  stayToBlock,
  staysOverlap,
  toCents,
  validateStayDates,
} from "./test-host-reservation.ts";

const TODAY = "2026-09-10";

describe("stage derivation", () => {
  it("keeps requests as requests regardless of dates", () => {
    assert.equal(stageOf({ status: "requested", checkIn: "2026-09-01", checkOut: "2026-09-03" }, TODAY), "request");
    assert.equal(stageOf({ status: "requested", checkIn: "2026-10-01", checkOut: "2026-10-03" }, TODAY), "request");
  });

  it("splits accepted stays by today's date", () => {
    assert.equal(stageOf({ status: "accepted", checkIn: "2026-09-11", checkOut: "2026-09-13" }, TODAY), "upcoming");
    assert.equal(stageOf({ status: "accepted", checkIn: "2026-09-10", checkOut: "2026-09-13" }, TODAY), "active");
    assert.equal(stageOf({ status: "accepted", checkIn: "2026-09-08", checkOut: "2026-09-11" }, TODAY), "active");
    assert.equal(stageOf({ status: "accepted", checkIn: "2026-09-08", checkOut: "2026-09-10" }, TODAY), "completed");
  });

  it("maps terminal statuses directly", () => {
    assert.equal(stageOf({ status: "declined", checkIn: "2026-09-11", checkOut: "2026-09-13" }, TODAY), "declined");
    assert.equal(stageOf({ status: "cancelled", checkIn: "2026-09-11", checkOut: "2026-09-13" }, TODAY), "cancelled");
  });
});

describe("transition map", () => {
  it("only allows accept/decline on requests and cancel on accepted stays", () => {
    assert.deepEqual(Object.keys(ALLOWED_TRANSITIONS.requested).sort(), ["accept", "decline"]);
    assert.deepEqual(Object.keys(ALLOWED_TRANSITIONS.accepted), ["cancel"]);
    assert.deepEqual(ALLOWED_TRANSITIONS.declined, {});
    assert.deepEqual(ALLOWED_TRANSITIONS.cancelled, {});
  });

  it("rejects transitions the map does not list", () => {
    const stay = { status: "accepted" as const, checkIn: "2026-09-20", checkOut: "2026-09-22" };
    assert.deepEqual(resolveTransition(stay, "accept", TODAY), { rejection: { code: "invalidTransition" } });
    assert.deepEqual(resolveTransition(stay, "decline", TODAY), { rejection: { code: "invalidTransition" } });
    const declined = { ...stay, status: "declined" as const };
    assert.deepEqual(resolveTransition(declined, "accept", TODAY), { rejection: { code: "invalidTransition" } });
    assert.deepEqual(resolveTransition(declined, "cancel", TODAY), { rejection: { code: "invalidTransition" } });
    const request = { ...stay, status: "requested" as const };
    assert.deepEqual(resolveTransition(request, "cancel", TODAY), { rejection: { code: "invalidTransition" } });
  });

  it("refuses to accept a request whose check-in has passed but still allows declining it", () => {
    const stale = { status: "requested" as const, checkIn: "2026-09-09", checkOut: "2026-09-12" };
    assert.deepEqual(resolveTransition(stale, "accept", TODAY), { rejection: { code: "checkInPassed" } });
    assert.deepEqual(resolveTransition(stale, "decline", TODAY), { next: "declined" });
    assert.deepEqual(availableActions(stale, TODAY), ["decline"]);
    const today = { ...stale, checkIn: "2026-09-10" };
    assert.deepEqual(resolveTransition(today, "accept", TODAY), { next: "accepted" });
    assert.deepEqual(availableActions(today, TODAY), ["accept", "decline"]);
  });

  it("allows cancelling upcoming and active stays but not completed ones", () => {
    const upcoming = { status: "accepted" as const, checkIn: "2026-09-20", checkOut: "2026-09-22" };
    const active = { status: "accepted" as const, checkIn: "2026-09-09", checkOut: "2026-09-12" };
    const completed = { status: "accepted" as const, checkIn: "2026-09-01", checkOut: "2026-09-10" };
    assert.deepEqual(resolveTransition(upcoming, "cancel", TODAY), { next: "cancelled" });
    assert.deepEqual(resolveTransition(active, "cancel", TODAY), { next: "cancelled" });
    assert.deepEqual(resolveTransition(completed, "cancel", TODAY), { rejection: { code: "invalidTransition" } });
    assert.deepEqual(availableActions(upcoming, TODAY), ["cancel"]);
    assert.deepEqual(availableActions(active, TODAY), ["cancel"]);
    assert.deepEqual(availableActions(completed, TODAY), []);
  });
});

describe("dates and overlap", () => {
  it("validates stay dates", () => {
    assert.deepEqual(validateStayDates("2026-09-10", "2026-09-12"), { checkIn: "2026-09-10", checkOut: "2026-09-12", nights: 2 });
    assert.deepEqual(validateStayDates("2026-09-10", "2026-09-10"), { code: "endBeforeStart" });
    assert.deepEqual(validateStayDates("2026-09-12", "2026-09-10"), { code: "endBeforeStart" });
    assert.deepEqual(validateStayDates("2026-13-01", "2026-09-10"), { code: "invalidDate" });
    assert.deepEqual(validateStayDates("2026-01-01", "2026-06-01"), { code: "tooLong" });
  });

  it("turns a stay into an inclusive block that leaves check-out day free", () => {
    assert.deepEqual(stayToBlock("2026-09-10", "2026-09-13"), { startDate: "2026-09-10", endDate: "2026-09-12" });
    assert.deepEqual(stayToBlock("2026-09-10", "2026-09-11"), { startDate: "2026-09-10", endDate: "2026-09-10" });
  });

  it("treats back-to-back stays as non-overlapping", () => {
    const a = { checkIn: "2026-09-10", checkOut: "2026-09-13" };
    assert.equal(staysOverlap(a, { checkIn: "2026-09-13", checkOut: "2026-09-15" }), false);
    assert.equal(staysOverlap(a, { checkIn: "2026-09-08", checkOut: "2026-09-10" }), false);
    assert.equal(staysOverlap(a, { checkIn: "2026-09-12", checkOut: "2026-09-15" }), true);
    assert.equal(staysOverlap(a, { checkIn: "2026-09-08", checkOut: "2026-09-11" }), true);
    assert.equal(staysOverlap(a, { checkIn: "2026-09-11", checkOut: "2026-09-12" }), true);
  });

  it("compares inclusive blocks against half-open stays", () => {
    const stay = { checkIn: "2026-09-10", checkOut: "2026-09-13" };
    assert.equal(blockOverlapsStay({ startDate: "2026-09-13", endDate: "2026-09-14" }, stay), false);
    assert.equal(blockOverlapsStay({ startDate: "2026-09-12", endDate: "2026-09-12" }, stay), true);
    assert.equal(blockOverlapsStay({ startDate: "2026-09-05", endDate: "2026-09-09" }, stay), false);
    assert.equal(blockOverlapsStay({ startDate: "2026-09-05", endDate: "2026-09-10" }, stay), true);
  });

  it("lists every conflict and ignores paused feeds and the stay itself", () => {
    const stay = { id: "self", checkIn: "2026-09-10", checkOut: "2026-09-14" };
    const accepted = [
      { id: "self", checkIn: "2026-09-10", checkOut: "2026-09-14", guestName: "Me" },
      { id: "other", checkIn: "2026-09-12", checkOut: "2026-09-16", guestName: "Anna" },
      { id: "far", checkIn: "2026-10-12", checkOut: "2026-10-16", guestName: "Far" },
    ];
    const blocks = [
      { startDate: "2026-09-13", endDate: "2026-09-13", source: "manual" as const, note: "Painting" },
      { startDate: "2026-09-11", endDate: "2026-09-11", source: "feed" as const, note: "Airbnb" },
      { startDate: "2026-09-10", endDate: "2026-09-13", source: "reservation" as const, note: "Me" },
    ];
    assert.deepEqual(findStayConflicts(stay, accepted, blocks, false), [
      { kind: "reservation", startDate: "2026-09-12", endDate: "2026-09-15", label: "Anna" },
      { kind: "manual", startDate: "2026-09-13", endDate: "2026-09-13", label: "Painting" },
    ]);
    assert.equal(findStayConflicts(stay, accepted, blocks, true).length, 3);
    assert.deepEqual(findStayConflicts({ checkIn: "2026-09-20", checkOut: "2026-09-22" }, accepted, blocks, true), []);
  });

  it("converts listing prices to cents", () => {
    assert.equal(toCents(80), 8000);
    assert.equal(toCents("89.99"), 8999);
    assert.equal(toCents(0), null);
    assert.equal(toCents("abc"), null);
  });
});
