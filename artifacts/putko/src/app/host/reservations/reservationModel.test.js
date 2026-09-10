import { describe, expect, it } from "vitest";
import {
  conflictLines,
  countByStage,
  filterReservations,
  formatMoney,
  formatStay,
  guestsLabel,
  nightsLabel,
  pendingRequests,
  reservationErrorText,
  sortReservations,
  stageLabel,
  upsertReservation,
} from "./reservationModel";
import { hostPaths, resolveHostLocation } from "../hostRoutes";

const make = (id, stage, extra = {}) => ({
  id,
  accommodationId: "acc-1",
  stage,
  checkIn: "2026-10-01",
  checkOut: "2026-10-04",
  createdAt: "2026-09-01T10:00:00.000Z",
  ...extra,
});

describe("reservation routes", () => {
  it("round-trips list filters through the URL and drops unknown stages", () => {
    const url = hostPaths.reservations({ property: "acc 1", stage: "request" });
    const [path, search] = url.split("?");
    expect(resolveHostLocation(path, `?${search}`)).toMatchObject({
      section: "reservations",
      filters: { property: "acc 1", stage: "request" },
    });
    expect(resolveHostLocation("/host/reservations", "?stage=bogus&property=")).toMatchObject({
      filters: { property: null, stage: null },
    });
    expect(hostPaths.reservations()).toBe("/host/reservations");
  });

  it("resolves a reservation detail and rejects an empty id", () => {
    expect(resolveHostLocation(hostPaths.reservation("res 1"))).toMatchObject({ section: "reservation", reservationId: "res 1" });
    expect(resolveHostLocation("/host/reservations/%20")).toBeNull();
  });
});

describe("filtering and ordering", () => {
  const list = [
    make("done", "completed", { checkIn: "2026-08-01", checkOut: "2026-08-05" }),
    make("late-request", "request", { createdAt: "2026-09-02T10:00:00.000Z" }),
    make("upcoming-far", "upcoming", { checkIn: "2026-11-01", checkOut: "2026-11-03" }),
    make("early-request", "request", { createdAt: "2026-09-01T10:00:00.000Z", accommodationId: "acc-2" }),
    make("now", "active", { checkIn: "2026-09-09", checkOut: "2026-09-12" }),
    make("upcoming-near", "upcoming", { checkIn: "2026-10-10", checkOut: "2026-10-12" }),
    make("gone", "cancelled", { checkIn: "2026-09-20", checkOut: "2026-09-22" }),
  ];

  it("puts what needs the host first: oldest requests, current stay, upcoming by arrival, then history", () => {
    expect(sortReservations(list).map((item) => item.id)).toEqual([
      "early-request",
      "late-request",
      "now",
      "upcoming-near",
      "upcoming-far",
      "done",
      "gone",
    ]);
  });

  it("filters by property and stage independently", () => {
    expect(filterReservations(list, { property: "acc-2" }).map((item) => item.id)).toEqual(["early-request"]);
    expect(filterReservations(list, { stage: "upcoming" })).toHaveLength(2);
    expect(filterReservations(list, { property: "acc-1", stage: "request" }).map((item) => item.id)).toEqual(["late-request"]);
    expect(filterReservations(list, {})).toHaveLength(list.length);
  });

  it("counts every stage, including empty ones", () => {
    expect(countByStage(list)).toEqual({ request: 2, upcoming: 2, active: 1, completed: 1, declined: 0, cancelled: 1 });
  });

  it("lists open requests oldest first", () => {
    expect(pendingRequests(list).map((item) => item.id)).toEqual(["early-request", "late-request"]);
  });

  it("replaces a reservation in place and appends unknown ones", () => {
    const next = upsertReservation(list, { ...list[1], stage: "upcoming" });
    expect(next).toHaveLength(list.length);
    expect(next[1].stage).toBe("upcoming");
    expect(upsertReservation(list, make("new", "request"))).toHaveLength(list.length + 1);
    expect(upsertReservation(list, null)).toBe(list);
  });
});

describe("copy and formatting", () => {
  it("formats money from cents in both languages", () => {
    expect(formatMoney(24000, "EUR", "en").replace(/\u00a0/g, " ")).toBe("€240");
    expect(formatMoney(24050, "EUR", "sk").replace(/\u00a0/g, " ")).toBe("240,50 €");
  });

  it("pluralizes nights and guests in Slovak", () => {
    expect(nightsLabel(1, "sk")).toBe("1 noc");
    expect(nightsLabel(3, "sk")).toBe("3 noci");
    expect(nightsLabel(5, "sk")).toBe("5 nocí");
    expect(guestsLabel(2, "sk")).toBe("2 hostia");
    expect(guestsLabel(2, "en")).toBe("2 guests");
  });

  it("shows a stay as check-in – check-out", () => {
    expect(formatStay({ checkIn: "2026-10-01", checkOut: "2026-10-04" }, "en")).toMatch(/^1 – 4 Oct 2026$/);
    expect(formatStay({ checkIn: "2026-12-30", checkOut: "2027-01-02" }, "en")).toMatch(/30 Dec 2026 – 2 Jan 2027/);
  });

  it("localizes stage labels and API error codes", () => {
    expect(stageLabel("request", "sk")).toBe("Žiadosť");
    expect(stageLabel("request", "en", { plural: true })).toBe("Requests");
    expect(reservationErrorText({ code: "datesUnavailable" }, "en")).toMatch(/no longer free/);
    expect(reservationErrorText({ code: "checkInPassed" }, "sk")).toMatch(/zamietnuť/);
    expect(reservationErrorText({ status: 500 }, "en")).toMatch(/try again/i);
  });

  it("describes calendar conflicts one per line", () => {
    const lines = conflictLines(
      [
        { kind: "reservation", startDate: "2026-10-02", endDate: "2026-10-03", label: "Jana" },
        { kind: "manual", startDate: "2026-10-03", endDate: "2026-10-03" },
      ],
      "en",
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/another accepted stay \(Jana\)/);
    expect(lines[1]).toMatch(/blocked by you/);
  });
});
