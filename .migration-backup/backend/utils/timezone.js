// utils/timezone.js
// Every business date decision must resolve in Europe/Bratislava, not in the
// server's local zone. Storage stays UTC; only the interpretation is zoned.

import { fromZonedTime, toZonedTime, format as formatTz } from "date-fns-tz";
import { differenceInHours } from "date-fns";
import { BUSINESS_TIMEZONE } from "../config/payments.js";

/** `YYYY-MM-DD` for an INSTANT, as seen in the business timezone. */
export function toBusinessDateString(date) {
  return formatTz(toZonedTime(new Date(date), BUSINESS_TIMEZONE), "yyyy-MM-dd", {
    timeZone: BUSINESS_TIMEZONE,
  });
}

// ---------------------------------------------------------------------------
// Calendar dates
//
// Check-in and check-out are CALENDAR DATES, not instants. "10 September" is the
// same day whether you read it in Bratislava or Karachi — but Mongoose stores it
// as a Date, and a browser date picker serialises the guest's LOCAL midnight.
// A guest in Karachi (UTC+5) picking 10 September sends 2026-09-09T19:00:00Z;
// re-reading that instant in Bratislava (UTC+2) gives 9 September, a day early.
//
// That was not merely a display bug. `businessMidnightUtc` fed the same wrong
// day into cancellation deadlines and payout unlocking, so a guest east of the
// business timezone had every refund window shifted 24 hours.
//
// The fix is to recover the calendar day that was intended. A date-only value
// serialised from local midnight is always within ~14 hours of UTC midnight, so
// snapping to the NEAREST UTC midnight recovers the intended day for every
// timezone from UTC-11 to UTC+12. Ties (exactly 12:00) resolve to the same day,
// which keeps noon-anchored values on their own date.
// ---------------------------------------------------------------------------

const DAY_MS = 86400000;

/**
 * The calendar day a stored date-only value was meant to represent, as a UTC
 * midnight instant. Idempotent: a value already at UTC midnight is unchanged.
 */
export function calendarDateUtc(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const ms = parsed.getTime();
  const floor = Math.floor(ms / DAY_MS) * DAY_MS;
  const offset = ms - floor;

  // Strictly greater than half a day rounds up; exactly noon stays put.
  return new Date(offset > DAY_MS / 2 ? floor + DAY_MS : floor);
}

/** `YYYY-MM-DD` for a calendar date — the day the guest actually picked. */
export function toCalendarDateString(value) {
  const d = calendarDateUtc(value);
  return d ? d.toISOString().slice(0, 10) : "";
}

/**
 * A stored DATE (check-in / check-out) means local midnight in the business
 * timezone. Returns the corresponding UTC instant.
 *
 * Anchored on the CALENDAR day, not on however the instant happens to land in
 * the business timezone — otherwise the deadline moves with the guest's own
 * timezone rather than with the booking.
 */
export function businessMidnightUtc(date) {
  return fromZonedTime(`${toCalendarDateString(date)} 00:00:00`, BUSINESS_TIMEZONE);
}

/**
 * Whole hours from now until check-in, where check-in is local midnight in the
 * business timezone. Negative once check-in has passed.
 */
export function hoursUntilCheckIn(checkInDate, now = new Date()) {
  return differenceInHours(businessMidnightUtc(checkInDate), now);
}

/** Whole hours elapsed since check-in (local midnight, business timezone). */
export function hoursSinceCheckIn(checkInDate, now = new Date()) {
  return differenceInHours(now, businessMidnightUtc(checkInDate));
}

/** Start of the business-timezone year, as a UTC instant. */
export function startOfBusinessYearUtc(year) {
  return fromZonedTime(`${year}-01-01 00:00:00`, BUSINESS_TIMEZONE);
}

/** Start of the following business-timezone year, as a UTC instant. */
export function endOfBusinessYearUtc(year) {
  return fromZonedTime(`${Number(year) + 1}-01-01 00:00:00`, BUSINESS_TIMEZONE);
}

/** Calendar year of an instant, as seen in the business timezone. */
export function businessYearOf(date) {
  return Number(
    formatTz(toZonedTime(new Date(date), BUSINESS_TIMEZONE), "yyyy", {
      timeZone: BUSINESS_TIMEZONE,
    })
  );
}

export { BUSINESS_TIMEZONE };
