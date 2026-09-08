/**
 * Which occupancy-calendar rows actually make a date unavailable.
 *
 * `occupancyCalendar` mixes two very different things:
 *
 *   - real unavailability — a paid booking, a host's manual block, a night
 *     pulled in from a synced iCal feed;
 *   - a `held` row, which is a soft 30-minute claim taken while a guest is
 *     inside Stripe Checkout.
 *
 * Every calendar in the app used to grey out both. A guest who opened checkout
 * and pressed Back therefore watched the dates they were trying to book turn
 * unavailable, and they stayed that way until the hold lapsed.
 *
 * Holds no longer block anything in the browser: dates go grey when the stay is
 * PAID FOR, not while somebody is thinking about paying. Nothing is lost by
 * this — `holdDates` on the server still refuses a second checkout over held
 * dates, so the calendar is permissive while the money path stays strict. The
 * worst case is a guest being told at the Pay click that the dates were taken
 * moments ago, instead of never being offered them; the previous behaviour's
 * worst case was a guest locked out of their own abandoned booking.
 *
 * Expired rows are dropped too, so a stale payload can never block a date that
 * the server already considers free.
 */

/** True when this row should make its dates unselectable. */
export const isBlockingEntry = (entry, now = Date.now()) => {
  if (!entry?.startDate || !entry?.endDate) return false;

  // Soft claims never block the UI — see the note above.
  if (entry.status === "held") return false;

  // Defensive: a hold that somehow lost its status but kept its expiry.
  if (entry.holdExpiresAt && new Date(entry.holdExpiresAt).getTime() <= now) return false;

  return entry.status !== "available";
};

/**
 * The occupancy rows that genuinely block dates.
 * Safe on undefined/null, so callers can pass a half-loaded listing.
 */
export const blockingEntries = (occupancyCalendar, now = Date.now()) =>
  (Array.isArray(occupancyCalendar) ? occupancyCalendar : []).filter((entry) =>
    isBlockingEntry(entry, now)
  );
