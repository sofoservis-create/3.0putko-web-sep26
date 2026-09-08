// utils/calendarHold.js
//
// Dates used to be blocked only once payment settled, which left a window the
// whole length of a Stripe Checkout session during which two guests could pay
// for the same nights. The loser was not refunded or told: `finalizeReservation`
// silently filtered conflicting dates out and booked whatever was left, so
// somebody paid in full for a partial stay.
//
// A hold closes that window. It is taken when checkout starts, expires on its
// own if the guest walks away, and is converted to a real booking when the
// payment confirms.

import { eachDayOfInterval, format } from "date-fns";
import Accommodation from "../models/Accommodation.js";
import Reservation from "../models/Reservation.js";
import { alertAdmin } from "./mailer.js";

/** How long a checkout may hold dates before the hold lapses. */
export const HOLD_MINUTES = Number(process.env.CHECKOUT_HOLD_MINUTES || 30);

const dayKeys = (start, end) =>
  eachDayOfInterval({ start: new Date(start), end: new Date(end) }).map((d) =>
    format(d, "yyyy-MM-dd")
  );

/** True when a calendar row still occupies its dates. */
export function isActive(entry, now = new Date()) {
  if (entry.status !== "held") return true;
  return Boolean(entry.holdExpiresAt) && new Date(entry.holdExpiresAt) > now;
}

/**
 * Days that are already spoken for, ignoring lapsed holds and anything
 * belonging to `exceptReservationId` (so a booking does not conflict with its
 * own hold when it converts).
 */
export function occupiedDays(accommodation, { exceptReservationId = null, now = new Date() } = {}) {
  const taken = new Set();

  for (const entry of accommodation?.occupancyCalendar || []) {
    if (!entry.startDate || !entry.endDate) continue;
    if (!isActive(entry, now)) continue;
    if (
      exceptReservationId &&
      String(entry.reservationId || "") === String(exceptReservationId)
    ) {
      continue;
    }

    for (const day of dayKeys(entry.startDate, entry.endDate)) taken.add(day);
  }

  return taken;
}

/**
 * Drop holds that this guest's own earlier, unfinished attempt left behind.
 *
 * Checkout mints a NEW reservation on every attempt, so a guest who reaches
 * Stripe, presses Back and tries again arrives with a different reservation id
 * — and `exceptReservationId` therefore does not recognise the hold they took
 * sixty seconds ago as their own. The dates they are actively trying to book
 * appear taken, by them, for the whole HOLD_MINUTES window.
 *
 * A hold is only superseded when it is unmistakably the same guest resuming the
 * same purchase: same listing, same email, and a booking that never got paid.
 * Another guest's hold is never touched — that one is a real race and must still
 * win.
 *
 * Mutates `accommodation.occupancyCalendar`; the caller is responsible for
 * saving.
 *
 * @returns {number} how many stale holds were dropped
 */
async function dropSupersededHolds(accommodation, reservation, now) {
  const email = String(reservation.email || "").trim().toLowerCase();
  if (!email) return 0;

  const staleCandidates = (accommodation.occupancyCalendar || []).filter(
    (entry) =>
      entry.status === "held" &&
      entry.reservationId &&
      String(entry.reservationId) !== String(reservation._id) &&
      isActive(entry, now)
  );
  if (!staleCandidates.length) return 0;

  // Only the guest's own unpaid attempts qualify. A paid booking is a real
  // booking even if its row still says "held".
  const owners = await Reservation.find({
    _id: { $in: staleCandidates.map((entry) => entry.reservationId) },
    paymentStatus: { $ne: "paid" },
  })
    .select("_id email")
    .lean();

  const supersede = new Set(
    owners
      .filter((owner) => String(owner.email || "").trim().toLowerCase() === email)
      .map((owner) => String(owner._id))
  );
  if (!supersede.size) return 0;

  const before = accommodation.occupancyCalendar.length;
  accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter(
    (entry) =>
      !(entry.status === "held" && supersede.has(String(entry.reservationId || "")))
  );

  const dropped = before - accommodation.occupancyCalendar.length;
  if (dropped) {
    console.log(
      `[calendar-hold] superseded ${dropped} stale hold(s) from ${email}'s earlier ` +
        `checkout attempt on listing ${accommodation._id}`
    );
  }
  return dropped;
}

/**
 * The MongoDB filter fragment matching "some ACTIVE calendar row overlaps this
 * range", expressed so the database evaluates it — not the application.
 *
 * Mirrors `isActive` and `occupiedDays` exactly: every row that is not a hold
 * occupies its dates, and a hold occupies its dates until it expires. Intervals
 * are compared with the same inclusive-end convention `dayKeys` uses, so this
 * predicate and the in-memory one cannot disagree.
 */
function overlapFilter({ start, end, exceptReservationId, now }) {
  const conditions = [
    { startDate: { $lte: end } },
    { endDate: { $gte: start } },
    { $or: [{ status: { $ne: "held" } }, { status: "held", holdExpiresAt: { $gt: now } }] },
  ];

  if (exceptReservationId) {
    conditions.push({
      $or: [
        { reservationId: { $exists: false } },
        { reservationId: { $ne: exceptReservationId } },
      ],
    });
  }

  return { $elemMatch: { $and: conditions } };
}

/**
 * Try to hold a date range for a booking.
 *
 * ATOMICITY. This used to read the listing, decide in JavaScript that the dates
 * were free, and then save the document back. Between the read and the save
 * there is a window — a network round trip plus however long the event loop
 * takes — in which a second request can run the identical check against the
 * identical snapshot, also conclude the dates are free, and also save. Both
 * guests then hold the same nights, both are sent to Stripe, and both pay.
 *
 * There is no transaction here and no unique index that could catch it: the
 * calendar is an array embedded in the listing document, so the second save is
 * a last-write-wins overwrite of the whole array. MongoDB cannot express a
 * range-exclusion constraint the way Postgres can with
 * `EXCLUDE USING gist (... daterange ... WITH &&)`, so the guarantee has to come
 * from the update itself.
 *
 * A single `findOneAndUpdate` is atomic on one document. Putting the
 * no-overlap requirement in the FILTER means the database re-evaluates it at
 * write time under its own document lock: whichever writer arrives second no
 * longer matches, gets null back, and is told the dates are taken. That is what
 * makes "first one confirmed wins" actually true.
 *
 * @returns {{ ok: boolean, conflictDays?: string[], expiresAt?: Date }}
 */
export async function holdDates(reservation) {
  const listingId = reservation.accommodationId?._id || reservation.accommodationId;
  const accommodation = await Accommodation.findById(listingId);
  if (!accommodation) return { ok: false, conflictDays: [], reason: "listing_not_found" };

  const now = new Date();
  const start = new Date(reservation.checkInDate);
  const end = new Date(reservation.checkOutDate);

  // Clear the guest's own abandoned attempt first — otherwise their previous
  // hold reads as somebody else's booking and refuses them their own dates.
  await dropSupersededHolds(accommodation, reservation, now);
  if (accommodation.isModified("occupancyCalendar")) await accommodation.save();

  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60000);

  // Drop this booking's own previous hold, so a guest who returns to checkout
  // does not accumulate rows. Separate from the claim below because $pull and
  // $push on the same array in one update are not allowed.
  await Accommodation.updateOne(
    { _id: listingId },
    { $pull: { occupancyCalendar: { status: "held", reservationId: reservation._id } } }
  );

  const claimed = await Accommodation.findOneAndUpdate(
    {
      _id: listingId,
      occupancyCalendar: {
        $not: overlapFilter({ start, end, exceptReservationId: reservation._id, now }),
      },
    },
    {
      $push: {
        occupancyCalendar: {
          startDate: reservation.checkInDate,
          endDate: reservation.checkOutDate,
          guestName: reservation.name || "N/A",
          status: "held",
          holdExpiresAt: expiresAt,
          reservationId: reservation._id,
        },
      },
    },
    { new: true }
  );

  if (!claimed) {
    // Lost the race, or the dates were already taken. Re-read to report WHICH
    // days conflict, so the client can offer alternatives.
    const current = await Accommodation.findById(listingId);
    const taken = occupiedDays(current, { exceptReservationId: reservation._id });
    const conflictDays = dayKeys(reservation.checkInDate, reservation.checkOutDate).filter((d) =>
      taken.has(d)
    );

    return {
      ok: false,
      conflictDays,
      reason: "dates_unavailable",
    };
  }

  return { ok: true, expiresAt };
}

/** Drop a booking's hold — payment failed, or the guest abandoned checkout. */
export async function releaseHold(reservation) {
  const listingId = reservation.accommodationId?._id || reservation.accommodationId;
  const accommodation = await Accommodation.findById(listingId);
  if (!accommodation?.occupancyCalendar?.length) return;

  const before = accommodation.occupancyCalendar.length;

  accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter(
    (entry) =>
      !(entry.status === "held" && String(entry.reservationId || "") === String(reservation._id))
  );

  if (accommodation.occupancyCalendar.length !== before) {
    await accommodation.save();
  }
}

/**
 * Turn this booking's hold into a confirmed booking.
 *
 * Returns the conflicting days if the dates were taken in the meantime — which
 * should now be impossible via the normal flow, but a payment that arrives
 * without a hold (a stale session, a manually created booking) must not
 * silently overwrite someone else's stay.
 */
export async function confirmHold(reservation) {
  const listingId = reservation.accommodationId?._id || reservation.accommodationId;
  const accommodation = await Accommodation.findById(listingId);
  if (!accommodation) return { ok: false, reason: "listing_not_found" };

  const now = new Date();
  const wanted = dayKeys(reservation.checkInDate, reservation.checkOutDate);
  const taken = occupiedDays(accommodation, { exceptReservationId: reservation._id, now });
  const conflictDays = wanted.filter((d) => taken.has(d));

  // Read-then-check is fine HERE and not in holdDates: by this point the guest
  // has already paid, so the only useful outcome of a conflict is an alert to a
  // human — there is nothing to serialise against.
  if (conflictDays.length) {
    // The guest has already paid, so this needs a human: either a refund or a
    // move. Silently booking the non-conflicting nights is what used to happen
    // and is the worse outcome.
    await alertAdmin("Double booking — guest paid for dates already taken", {
      reservationId: String(reservation._id),
      listingId: String(listingId),
      conflictDays,
    });
    return { ok: false, reason: "double_booked", conflictDays };
  }

  // Replace this booking's hold with a confirmed row.
  accommodation.occupancyCalendar = (accommodation.occupancyCalendar || []).filter(
    (entry) => String(entry.reservationId || "") !== String(reservation._id)
  );

  accommodation.occupancyCalendar.push({
    startDate: reservation.checkInDate,
    endDate: reservation.checkOutDate,
    guestName: reservation.name || "N/A",
    status: "booked",
    reservationId: reservation._id,
  });

  await accommodation.save();

  return { ok: true };
}

/**
 * Remove lapsed holds across all listings. Holds expire logically the moment
 * `holdExpiresAt` passes — `isActive` already ignores them — so this is
 * housekeeping, not correctness.
 */
export async function sweepExpiredHolds() {
  const result = await Accommodation.updateMany(
    { "occupancyCalendar.status": "held", "occupancyCalendar.holdExpiresAt": { $lt: new Date() } },
    { $pull: { occupancyCalendar: { status: "held", holdExpiresAt: { $lt: new Date() } } } }
  );

  if (result.modifiedCount) {
    console.log(`[calendar-hold] swept expired holds from ${result.modifiedCount} listings`);
  }
  return result.modifiedCount || 0;
}
