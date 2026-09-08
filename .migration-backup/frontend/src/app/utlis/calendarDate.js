/**
 * Rendering calendar dates (check-in / check-out).
 *
 * These are calendar DATES, not instants: "10 September" is the same day for
 * everyone looking at the booking. The backend stores them anchored to UTC
 * midnight for exactly that reason.
 *
 * `new Date(value).toLocaleDateString()` re-reads that instant in the VIEWER's
 * timezone, so a host in New York opening a booking stored as
 * 2026-09-10T00:00:00Z sees 9 September — the same off-by-one the receipt PDF
 * used to have, just moved into the browser. Reading the UTC fields instead
 * keeps every viewer, and the PDF, showing the day the guest actually picked.
 */

const DAY_MS = 86400000;

/** The calendar day a stored value represents, as a UTC-midnight Date. */
export function calendarDate(value) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  // Legacy rows predate the backend normalisation and still carry the guest's
  // local midnight, so snap to the nearest UTC midnight the same way the server
  // does. Values already at UTC midnight pass through untouched.
  const ms = parsed.getTime();
  const floor = Math.floor(ms / DAY_MS) * DAY_MS;
  return new Date(ms - floor > DAY_MS / 2 ? floor + DAY_MS : floor);
}

/**
 * Locale-formatted calendar date, immune to the viewer's timezone.
 *
 * @param {*} value  stored date
 * @param {string} locale  e.g. "sk-SK"; omit for the browser default
 * @param {object} options Intl options (timeZone is forced to UTC)
 */
export function formatCalendarDate(value, locale = undefined, options = {}) {
  const d = calendarDate(value);
  if (!d) return "—";

  return d.toLocaleDateString(locale, { ...options, timeZone: "UTC" });
}

/** `YYYY-MM-DD`, for keys and comparisons. */
export function calendarDateKey(value) {
  const d = calendarDate(value);
  return d ? d.toISOString().slice(0, 10) : "";
}

export default formatCalendarDate;
