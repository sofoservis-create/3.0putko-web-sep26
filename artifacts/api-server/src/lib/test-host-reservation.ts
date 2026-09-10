import { addDays, dateToDayNumber, isIsoDate } from "./test-host-calendar.ts";

/**
 * Pure reservation rules shared by the routes and their tests. Nothing here
 * touches the database; the routes wrap these in a transaction that locks
 * the accommodation row so the checks and the writes see the same state.
 */

export type ReservationStatus = "requested" | "accepted" | "declined" | "cancelled";

/** What a host sees: the stored status combined with today's date. */
export type ReservationStage =
  | "request"
  | "upcoming"
  | "active"
  | "completed"
  | "declined"
  | "cancelled";

export const RESERVATION_STAGES: ReservationStage[] = [
  "request",
  "upcoming",
  "active",
  "completed",
  "declined",
  "cancelled",
];

export type ReservationAction = "accept" | "decline" | "cancel";

export const RESERVATION_ACTIONS: ReservationAction[] = ["accept", "decline", "cancel"];

/**
 * The only status changes the server will persist. Anything not listed here
 * (accepting an already declined request, cancelling a request instead of
 * declining it, touching a terminal state) answers 409 `invalidTransition`.
 */
export const ALLOWED_TRANSITIONS: Record<
  ReservationStatus,
  Partial<Record<ReservationAction, ReservationStatus>>
> = {
  requested: { accept: "accepted", decline: "declined" },
  accepted: { cancel: "cancelled" },
  declined: {},
  cancelled: {},
};

export const isReservationAction = (value: unknown): value is ReservationAction =>
  typeof value === "string" && (RESERVATION_ACTIONS as string[]).includes(value);

export const isReservationStage = (value: unknown): value is ReservationStage =>
  typeof value === "string" && (RESERVATION_STAGES as string[]).includes(value);

type StayLike = { status: ReservationStatus; checkIn: string; checkOut: string };

/**
 * Derives the operational stage. An accepted stay is `upcoming` until the
 * guest arrives, `active` from check-in day until the night before
 * check-out, `completed` from check-out day on. Requests never expire on
 * their own: a request whose check-in already passed still shows under
 * "requests" so the host answers it explicitly (only decline is offered).
 */
export const stageOf = (stay: StayLike, today: string): ReservationStage => {
  switch (stay.status) {
    case "requested":
      return "request";
    case "declined":
      return "declined";
    case "cancelled":
      return "cancelled";
    case "accepted":
    default: {
      const todayNumber = dateToDayNumber(today);
      if (dateToDayNumber(stay.checkOut) <= todayNumber) return "completed";
      if (dateToDayNumber(stay.checkIn) <= todayNumber) return "active";
      return "upcoming";
    }
  }
};

/**
 * Actions the host may take right now. Mirrors `ALLOWED_TRANSITIONS` and
 * adds the date rules the transition endpoint enforces:
 * - a request can only be accepted while its check-in is today or later;
 * - an accepted stay can be cancelled until check-out day (an active stay
 *   can still be ended early; a completed one is history).
 */
export const availableActions = (stay: StayLike, today: string): ReservationAction[] => {
  const stage = stageOf(stay, today);
  const todayNumber = dateToDayNumber(today);
  const actions: ReservationAction[] = [];
  if (stage === "request") {
    if (dateToDayNumber(stay.checkIn) >= todayNumber) actions.push("accept");
    actions.push("decline");
  }
  if (stage === "upcoming" || stage === "active") actions.push("cancel");
  return actions;
};

export type TransitionRejection =
  | { code: "invalidTransition" }
  | { code: "checkInPassed" };

/**
 * Decides whether `action` may run against a reservation in its current
 * state. Returns the next status, or the rejection to answer with.
 */
export const resolveTransition = (
  stay: StayLike,
  action: ReservationAction,
  today: string,
): { next: ReservationStatus } | { rejection: TransitionRejection } => {
  const next = ALLOWED_TRANSITIONS[stay.status][action];
  if (!next) return { rejection: { code: "invalidTransition" } };
  if (action === "accept" && dateToDayNumber(stay.checkIn) < dateToDayNumber(today)) {
    return { rejection: { code: "checkInPassed" } };
  }
  if (action === "cancel" && dateToDayNumber(stay.checkOut) <= dateToDayNumber(today)) {
    // The stay is over; there is nothing left to release.
    return { rejection: { code: "invalidTransition" } };
  }
  return { next };
};

/* ------------------------------------------------------------------------ */
/* Dates and money                                                           */
/* ------------------------------------------------------------------------ */

export const MAX_STAY_NIGHTS = 90;
export const MAX_GUESTS = 50;

export const nightsBetween = (checkIn: string, checkOut: string) =>
  dateToDayNumber(checkOut) - dateToDayNumber(checkIn);

export const validateStayDates = (
  checkIn: unknown,
  checkOut: unknown,
): { checkIn: string; checkOut: string; nights: number } | { code: string } => {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return { code: "invalidDate" };
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return { code: "endBeforeStart" };
  if (nights > MAX_STAY_NIGHTS) return { code: "tooLong" };
  return { checkIn, checkOut, nights };
};

/**
 * Nights of a stay as an inclusive calendar block (check-out day itself is
 * free for the next guest), which is how the availability calendar stores
 * every blocked range.
 */
export const stayToBlock = (checkIn: string, checkOut: string) => ({
  startDate: checkIn,
  endDate: addDays(checkOut, -1),
});

/** Whether two half-open stays [checkIn, checkOut) share a night. */
export const staysOverlap = (
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
) =>
  dateToDayNumber(a.checkIn) < dateToDayNumber(b.checkOut) &&
  dateToDayNumber(b.checkIn) < dateToDayNumber(a.checkOut);

/** Whether an inclusive calendar block shares a night with a stay. */
export const blockOverlapsStay = (
  block: { startDate: string; endDate: string },
  stay: { checkIn: string; checkOut: string },
) =>
  dateToDayNumber(block.startDate) < dateToDayNumber(stay.checkOut) &&
  dateToDayNumber(stay.checkIn) <= dateToDayNumber(block.endDate);

export type StayConflict = {
  kind: "reservation" | "manual" | "feed";
  startDate: string;
  endDate: string;
  label: string | null;
};

/**
 * Everything already occupying the nights of a stay. Accepted stays and the
 * host's own manual blocks always count; imported feed dates only while the
 * listing is set to use connected calendars (paused links must not refuse a
 * booking). Requests never conflict with each other: two guests may ask for
 * the same nights and the host picks one.
 */
export const findStayConflicts = (
  stay: { id?: string; checkIn: string; checkOut: string },
  acceptedStays: Array<{ id: string; checkIn: string; checkOut: string; guestName: string }>,
  blocks: Array<{
    startDate: string;
    endDate: string;
    source: "manual" | "feed" | "reservation";
    note: string | null;
  }>,
  feedsConnected: boolean,
): StayConflict[] => {
  const conflicts: StayConflict[] = [];
  for (const other of acceptedStays) {
    if (other.id === stay.id) continue;
    if (staysOverlap(stay, other)) {
      const block = stayToBlock(other.checkIn, other.checkOut);
      conflicts.push({ kind: "reservation", ...block, label: other.guestName });
    }
  }
  for (const block of blocks) {
    // Reservation blocks are already covered through `acceptedStays`.
    if (block.source === "reservation") continue;
    if (block.source === "feed" && !feedsConnected) continue;
    if (blockOverlapsStay(block, stay)) {
      conflicts.push({
        kind: block.source,
        startDate: block.startDate,
        endDate: block.endDate,
        label: block.note,
      });
    }
  }
  return conflicts;
};

/** Whole euros (or any unit) from the listing payload to minor units. */
export const toCents = (value: unknown): number | null => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
};

/* ------------------------------------------------------------------------ */
/* Development fixtures                                                      */
/* ------------------------------------------------------------------------ */

export type FixtureSpec = {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestMessage: string | null;
  checkInOffset: number;
  nights: number;
  guests: number;
  status: ReservationStatus;
  cancelledBy: "host" | "guest" | null;
};

/**
 * A representative set of sample stays for one listing, relative to today:
 * two open requests (one on nights that clash with the other so the overlap
 * rule can be seen), an accepted upcoming stay, an active stay, a completed
 * one and a declined one. Names are invented; addresses use the reserved
 * `.test` domain so nothing can reach a real mailbox.
 */
export const sampleFixtures = (seed: number, maxGuests: number): FixtureSpec[] => {
  const cap = (n: number) => Math.max(1, Math.min(n, maxGuests));
  const tag = `${seed}`.slice(-4);
  return [
    {
      guestName: "Jana Nováková",
      guestEmail: `jana.novakova.${tag}@example.test`,
      guestPhone: "+421 900 000 001",
      guestMessage: "Dobrý deň, prídeme dvaja dospelí a malý pes. Je to v poriadku?",
      checkInOffset: 12,
      nights: 3,
      guests: cap(2),
      status: "requested",
      cancelledBy: null,
    },
    {
      guestName: "Tomáš Horváth",
      guestEmail: `tomas.horvath.${tag}@example.test`,
      guestPhone: null,
      guestMessage: "Hi! Is late check-in around 22:00 possible?",
      checkInOffset: 13,
      nights: 4,
      guests: cap(3),
      status: "requested",
      cancelledBy: null,
    },
    {
      guestName: "Lucia Kováčová",
      guestEmail: `lucia.kovacova.${tag}@example.test`,
      guestPhone: "+421 900 000 003",
      guestMessage: null,
      checkInOffset: 25,
      nights: 2,
      guests: cap(2),
      status: "accepted",
      cancelledBy: null,
    },
    {
      guestName: "Peter Baláž",
      guestEmail: `peter.balaz.${tag}@example.test`,
      guestPhone: "+421 900 000 004",
      guestMessage: "Ďakujeme za potvrdenie, tešíme sa.",
      checkInOffset: -1,
      nights: 3,
      guests: cap(4),
      status: "accepted",
      cancelledBy: null,
    },
    {
      guestName: "Eva Šimková",
      guestEmail: `eva.simkova.${tag}@example.test`,
      guestPhone: null,
      guestMessage: null,
      checkInOffset: -20,
      nights: 5,
      guests: cap(2),
      status: "accepted",
      cancelledBy: null,
    },
    {
      guestName: "Martin Urban",
      guestEmail: `martin.urban.${tag}@example.test`,
      guestPhone: null,
      guestMessage: "Would you take a one-night stay?",
      checkInOffset: 6,
      nights: 1,
      guests: cap(1),
      status: "declined",
      cancelledBy: null,
    },
  ];
};
