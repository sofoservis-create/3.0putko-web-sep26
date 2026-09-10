import {
  db,
  testHostAccommodationsTable,
  testHostCalendarBlocksTable,
  testHostReservationsTable,
  type TestHostAccommodation,
  type TestHostReservation,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireHostGuest } from "../lib/test-guest-auth";
import { calendarChoiceOf, addDays, utcToday } from "../lib/test-host-calendar";
import {
  availableActions,
  findStayConflicts,
  isReservationAction,
  isReservationStage,
  MAX_GUESTS,
  nightsBetween,
  resolveTransition,
  sampleFixtures,
  stageOf,
  stayToBlock,
  toCents,
  type ReservationAction,
  type StayConflict,
} from "../lib/test-host-reservation";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Reservation operations for the development Host workspace.
 *
 * Contract summary
 * - A reservation belongs to whoever owns its accommodation. Every route
 *   resolves that on the server and answers 404 (unknown) or 403 (another
 *   host's) before revealing anything.
 * - The stored status only changes through `POST /:id/:action` and only
 *   along `ALLOWED_TRANSITIONS`; anything else is 409 `invalidTransition`.
 * - Accepting writes the stay's nights into the availability calendar as a
 *   `reservation` block; declining/cancelling removes it. Both happen in the
 *   same transaction as the status change, under the accommodation row lock
 *   the calendar API also takes, so calendar and reservations can never
 *   disagree and two hosts' requests for the same property serialise.
 * - Accepting a stay whose nights are already taken (another accepted stay,
 *   a manual block, or an imported date while connected calendars are on)
 *   answers 409 `datesUnavailable` and lists the conflicts.
 * - `POST /fixtures` creates sample requests for one of the host's listings
 *   so the flows can be exercised without a traveller booking. Sample rows
 *   carry `source = fixture`.
 */

const router: IRouter = Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
});

const fail = (res: Response, status: number, code: string, message: string, extra?: object) =>
  res.status(status).json({ code, message, ...extra });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uuidParam = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && UUID_PATTERN.test(raw) ? raw : null;
};

const listingSummary = (accommodation: Pick<TestHostAccommodation, "id" | "data" | "status">) => {
  const name = accommodation.data?.name;
  return {
    id: accommodation.id,
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    status: accommodation.status,
  };
};

/** The reservation as every endpoint returns it (never the raw row). */
const publicReservation = (
  reservation: TestHostReservation,
  accommodation: Pick<TestHostAccommodation, "id" | "data" | "status">,
  today: string,
) => ({
  id: reservation.id,
  accommodationId: reservation.accommodationId,
  listing: listingSummary(accommodation),
  guest: {
    name: reservation.guestName,
    email: reservation.guestEmail,
    phone: reservation.guestPhone,
    message: reservation.guestMessage,
  },
  checkIn: reservation.checkIn,
  checkOut: reservation.checkOut,
  nights: nightsBetween(reservation.checkIn, reservation.checkOut),
  guests: reservation.guests,
  nightlyPriceCents: reservation.nightlyPriceCents,
  totalCents: reservation.totalCents,
  currency: reservation.currency,
  status: reservation.status,
  stage: stageOf(reservation, today),
  actions: availableActions(reservation, today),
  source: reservation.source,
  cancelledBy: reservation.cancelledBy,
  hostNote: reservation.hostNote,
  respondedAt: reservation.respondedAt,
  cancelledAt: reservation.cancelledAt,
  createdAt: reservation.createdAt,
  updatedAt: reservation.updatedAt,
});

export type PublicReservation = ReturnType<typeof publicReservation>;

/**
 * Loads a reservation together with its accommodation and enforces
 * ownership. Writes the error response itself so handlers return on null.
 */
const loadOwnedReservation = async (
  req: Request,
  res: Response,
): Promise<{ reservation: TestHostReservation; accommodation: TestHostAccommodation; hostId: string } | null> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return null;
  const id = uuidParam(req.params.id);
  if (!id) {
    fail(res, 400, "invalidId", "Invalid reservation id");
    return null;
  }
  const [row] = await db
    .select({
      reservation: testHostReservationsTable,
      accommodation: testHostAccommodationsTable,
    })
    .from(testHostReservationsTable)
    .innerJoin(
      testHostAccommodationsTable,
      eq(testHostReservationsTable.accommodationId, testHostAccommodationsTable.id),
    )
    .where(eq(testHostReservationsTable.id, id))
    .limit(1);
  if (!row) {
    fail(res, 404, "notFound", "Reservation not found");
    return null;
  }
  if (row.accommodation.ownerId !== auth.guest.id) {
    fail(res, 403, "forbidden", "This reservation belongs to another host");
    return null;
  }
  return { reservation: row.reservation, accommodation: row.accommodation, hostId: auth.guest.id };
};

class AccommodationGone extends Error {}
class AccommodationForbidden extends Error {}
class ReservationGone extends Error {}
class PriceMissing extends Error {}
class DatesUnavailable extends Error {
  constructor(public conflicts: StayConflict[]) {
    super("datesUnavailable");
  }
}
class TransitionRejected extends Error {
  constructor(public code: "invalidTransition" | "checkInPassed", public current: TestHostReservation) {
    super(code);
  }
}

/** Same lock the calendar API takes, so both APIs queue on one row. */
const lockAccommodation = async (tx: Tx, accommodationId: string, ownerId: string) => {
  const [row] = await tx
    .select()
    .from(testHostAccommodationsTable)
    .where(eq(testHostAccommodationsTable.id, accommodationId))
    .for("update");
  if (!row || row.ownerId !== ownerId) throw new AccommodationGone();
  return row;
};

/**
 * Everything that already occupies nights of `stay` for this accommodation,
 * read under the lock so a concurrent accept cannot slip in between.
 */
const conflictsFor = async (
  tx: Tx,
  accommodation: TestHostAccommodation,
  stay: { id?: string; checkIn: string; checkOut: string },
) => {
  const accepted = await tx
    .select({
      id: testHostReservationsTable.id,
      checkIn: testHostReservationsTable.checkIn,
      checkOut: testHostReservationsTable.checkOut,
      guestName: testHostReservationsTable.guestName,
    })
    .from(testHostReservationsTable)
    .where(
      and(
        eq(testHostReservationsTable.accommodationId, accommodation.id),
        eq(testHostReservationsTable.status, "accepted"),
      ),
    );
  const blocks = await tx
    .select({
      startDate: testHostCalendarBlocksTable.startDate,
      endDate: testHostCalendarBlocksTable.endDate,
      source: testHostCalendarBlocksTable.source,
      note: testHostCalendarBlocksTable.note,
    })
    .from(testHostCalendarBlocksTable)
    .where(eq(testHostCalendarBlocksTable.accommodationId, accommodation.id));
  return findStayConflicts(stay, accepted, blocks, calendarChoiceOf(accommodation.data) === "connect");
};

const insertReservationBlock = (tx: Tx, reservation: TestHostReservation) =>
  tx.insert(testHostCalendarBlocksTable).values({
    accommodationId: reservation.accommodationId,
    ...stayToBlock(reservation.checkIn, reservation.checkOut),
    source: "reservation",
    reservationId: reservation.id,
    note: reservation.guestName,
  });

const deleteReservationBlock = (tx: Tx, reservationId: string) =>
  tx
    .delete(testHostCalendarBlocksTable)
    .where(eq(testHostCalendarBlocksTable.reservationId, reservationId));

/**
 * Runs one transition. Locks the accommodation, re-reads the reservation
 * under lock, validates the transition against the *current* status (so a
 * double tap or a second device cannot apply it twice), then writes the
 * status change and the matching calendar change together.
 */
const applyTransition = (
  reservationId: string,
  accommodationId: string,
  hostId: string,
  action: ReservationAction,
  note: string | null,
  today: string,
) =>
  db.transaction(async (tx) => {
    const accommodation = await lockAccommodation(tx, accommodationId, hostId);
    const [current] = await tx
      .select()
      .from(testHostReservationsTable)
      .where(eq(testHostReservationsTable.id, reservationId))
      .for("update");
    if (!current || current.accommodationId !== accommodation.id) throw new ReservationGone();

    const resolved = resolveTransition(current, action, today);
    if ("rejection" in resolved) throw new TransitionRejected(resolved.rejection.code, current);

    if (action === "accept") {
      const conflicts = await conflictsFor(tx, accommodation, current);
      if (conflicts.length > 0) throw new DatesUnavailable(conflicts);
    }

    const now = new Date();
    const [updated] = await tx
      .update(testHostReservationsTable)
      .set({
        status: resolved.next,
        hostNote: note ?? current.hostNote,
        respondedAt: action === "cancel" ? current.respondedAt : now,
        cancelledAt: action === "cancel" ? now : current.cancelledAt,
        cancelledBy: action === "cancel" ? "host" : current.cancelledBy,
      })
      .where(eq(testHostReservationsTable.id, reservationId))
      .returning();

    if (action === "accept") await insertReservationBlock(tx, updated);
    else await deleteReservationBlock(tx, reservationId);

    return { reservation: updated, accommodation };
  });

/* ------------------------------------------------------------------------ */
/* Routes                                                                    */
/* ------------------------------------------------------------------------ */

router.get("/test-auth/host-reservations", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const accommodationId = req.query.accommodationId;
  const stage = req.query.stage;
  if (accommodationId !== undefined && !uuidParam(accommodationId)) {
    fail(res, 400, "invalidId", "Invalid accommodation id");
    return;
  }
  if (stage !== undefined && !isReservationStage(stage)) {
    fail(res, 400, "invalidStage", "Unknown reservation stage");
    return;
  }
  const today = utcToday();
  const conditions = [eq(testHostAccommodationsTable.ownerId, auth.guest.id)];
  if (typeof accommodationId === "string") {
    conditions.push(eq(testHostReservationsTable.accommodationId, accommodationId));
  }
  const rows = await db
    .select({
      reservation: testHostReservationsTable,
      accommodation: {
        id: testHostAccommodationsTable.id,
        data: testHostAccommodationsTable.data,
        status: testHostAccommodationsTable.status,
      },
    })
    .from(testHostReservationsTable)
    .innerJoin(
      testHostAccommodationsTable,
      eq(testHostReservationsTable.accommodationId, testHostAccommodationsTable.id),
    )
    .where(and(...conditions))
    .orderBy(asc(testHostReservationsTable.checkIn), desc(testHostReservationsTable.createdAt));
  const reservations = rows
    .map((row) => publicReservation(row.reservation, row.accommodation, today))
    .filter((item) => (typeof stage === "string" ? item.stage === stage : true));
  res.json({ today, reservations });
});

router.get("/test-auth/host-reservations/:id", async (req, res): Promise<void> => {
  const owned = await loadOwnedReservation(req, res);
  if (!owned) return;
  const today = utcToday();
  res.json({ today, reservation: publicReservation(owned.reservation, owned.accommodation, today) });
});

router.post("/test-auth/host-reservations/:id/:action", async (req, res): Promise<void> => {
  const action = Array.isArray(req.params.action) ? req.params.action[0] : req.params.action;
  if (!isReservationAction(action)) {
    fail(res, 404, "notFound", "Unknown action");
    return;
  }
  const owned = await loadOwnedReservation(req, res);
  if (!owned) return;
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const rawNote = body.note;
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== "string") {
    fail(res, 400, "invalidNote", "note must be a string");
    return;
  }
  const note = typeof rawNote === "string" ? rawNote.trim().slice(0, 500) || null : null;
  const today = utcToday();
  try {
    const result = await applyTransition(
      owned.reservation.id,
      owned.accommodation.id,
      owned.hostId,
      action,
      note,
      today,
    );
    res.json({ today, reservation: publicReservation(result.reservation, result.accommodation, today) });
  } catch (error) {
    if (error instanceof AccommodationGone) {
      fail(res, 404, "notFound", "Accommodation not found");
      return;
    }
    if (error instanceof ReservationGone) {
      fail(res, 404, "notFound", "Reservation not found");
      return;
    }
    if (error instanceof TransitionRejected) {
      fail(
        res,
        409,
        error.code,
        error.code === "checkInPassed"
          ? "The check-in date has already passed"
          : `Cannot ${action} a reservation that is ${error.current.status}`,
        { reservation: publicReservation(error.current, owned.accommodation, today) },
      );
      return;
    }
    if (error instanceof DatesUnavailable) {
      fail(res, 409, "datesUnavailable", "These nights are no longer available", {
        conflicts: error.conflicts,
      });
      return;
    }
    throw error;
  }
});

/**
 * Development fixtures: a representative set of sample stays for one of the
 * host's listings. Accepted samples are only created when their nights are
 * free, so the "no overlapping accepted stays" rule holds for sample data
 * too; anything skipped for that reason is reported.
 */
router.post("/test-auth/host-reservations/fixtures", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const accommodationId = uuidParam(body.accommodationId);
  if (!accommodationId) {
    fail(res, 400, "invalidId", "Invalid accommodation id");
    return;
  }
  const today = utcToday();
  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(testHostAccommodationsTable)
        .where(eq(testHostAccommodationsTable.id, accommodationId))
        .limit(1);
      if (!existing) throw new AccommodationGone();
      if (existing.ownerId !== auth.guest.id) throw new AccommodationForbidden();
      const accommodation = await lockAccommodation(tx, accommodationId, auth.guest.id);
      const nightlyPriceCents = toCents(accommodation.data.nightlyPrice);
      if (!nightlyPriceCents) throw new PriceMissing();
      const maxGuests = Math.min(
        MAX_GUESTS,
        Math.max(1, Math.floor(Number(accommodation.data.guests)) || MAX_GUESTS),
      );
      const created: TestHostReservation[] = [];
      let skipped = 0;
      for (const spec of sampleFixtures(Date.now(), maxGuests)) {
        const checkIn = addDays(today, spec.checkInOffset);
        const checkOut = addDays(checkIn, spec.nights);
        if (spec.status === "accepted") {
          const conflicts = await conflictsFor(tx, accommodation, { checkIn, checkOut });
          if (conflicts.length > 0) {
            skipped += 1;
            continue;
          }
        }
        const responded = spec.status === "requested" ? null : new Date();
        const [row] = await tx
          .insert(testHostReservationsTable)
          .values({
            accommodationId,
            guestName: spec.guestName,
            guestEmail: spec.guestEmail,
            guestPhone: spec.guestPhone,
            guestMessage: spec.guestMessage,
            checkIn,
            checkOut,
            guests: spec.guests,
            nightlyPriceCents,
            totalCents: nightlyPriceCents * spec.nights,
            currency: "EUR",
            status: spec.status,
            source: "fixture",
            cancelledBy: spec.cancelledBy,
            respondedAt: responded,
            cancelledAt: spec.status === "cancelled" ? responded : null,
          })
          .returning();
        if (row.status === "accepted") await insertReservationBlock(tx, row);
        created.push(row);
      }
      return { accommodation, created, skipped };
    });
    res.status(201).json({
      today,
      skipped: result.skipped,
      reservations: result.created.map((row) => publicReservation(row, result.accommodation, today)),
    });
  } catch (error) {
    if (error instanceof AccommodationGone) {
      fail(res, 404, "notFound", "Accommodation not found");
      return;
    }
    if (error instanceof AccommodationForbidden) {
      fail(res, 403, "forbidden", "This accommodation belongs to another host");
      return;
    }
    if (error instanceof PriceMissing) {
      fail(res, 409, "priceMissing", "Set a nightly price on this listing before creating sample requests");
      return;
    }
    throw error;
  }
});

export default router;
