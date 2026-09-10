import { randomUUID } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import type { AccommodationData } from "./test-host-accommodation";

/* ------------------------------------------------------------------------ */
/* Calendar dates                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Availability is expressed in calendar dates (`YYYY-MM-DD`), never instants:
 * a blocked night is the same night for the host in Bratislava and the server
 * in UTC. All arithmetic below therefore runs on UTC-midnight timestamps so
 * daylight-saving changes cannot shift a date.
 */
export const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
};

export const dateToDayNumber = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
};

export const dayNumberToDate = (dayNumber: number) =>
  new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) =>
  dayNumberToDate(dateToDayNumber(iso) + days);

export const utcToday = () => new Date().toISOString().slice(0, 10);

/** Inclusive number of days covered by a range. */
export const rangeLength = (startDate: string, endDate: string) =>
  dateToDayNumber(endDate) - dateToDayNumber(startDate) + 1;

export const MAX_RANGE_DAYS = 400;
export const MAX_YEARS_AHEAD = 3;

export type DateRangeError =
  | "invalidDate"
  | "endBeforeStart"
  | "inPast"
  | "tooLong"
  | "tooFarAhead";

export type DateRange = { startDate: string; endDate: string };

/**
 * Validates a host-submitted range. Yesterday (UTC) is still accepted so a
 * host west of UTC can block "today" after the server's date has rolled over.
 */
export const validateDateRange = (
  input: unknown,
  today = utcToday(),
): { range: DateRange } | { error: DateRangeError } => {
  if (typeof input !== "object" || input === null) return { error: "invalidDate" };
  const { startDate, endDate } = input as Record<string, unknown>;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return { error: "invalidDate" };
  if (dateToDayNumber(endDate) < dateToDayNumber(startDate)) return { error: "endBeforeStart" };
  if (dateToDayNumber(endDate) < dateToDayNumber(today) - 1) return { error: "inPast" };
  if (rangeLength(startDate, endDate) > MAX_RANGE_DAYS) return { error: "tooLong" };
  const horizon = dateToDayNumber(today) + MAX_YEARS_AHEAD * 366;
  if (dateToDayNumber(startDate) > horizon) return { error: "tooFarAhead" };
  return { range: { startDate, endDate } };
};

/**
 * Validates a range submitted for *unblocking*. Existing blocks may be longer
 * than a single block request (adjacent blocks merge) and may have started in
 * the past, so there is no length limit and a start before yesterday is
 * clamped to yesterday: the past nights stay as they were, only the current
 * and future part opens up.
 */
export const validateUnblockRange = (
  input: unknown,
  today = utcToday(),
): { range: DateRange } | { error: DateRangeError } => {
  if (typeof input !== "object" || input === null) return { error: "invalidDate" };
  const { startDate, endDate } = input as Record<string, unknown>;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return { error: "invalidDate" };
  if (dateToDayNumber(endDate) < dateToDayNumber(startDate)) return { error: "endBeforeStart" };
  const floor = dateToDayNumber(today) - 1;
  if (dateToDayNumber(endDate) < floor) return { error: "inPast" };
  const horizon = dateToDayNumber(today) + MAX_YEARS_AHEAD * 366;
  if (dateToDayNumber(startDate) > horizon) return { error: "tooFarAhead" };
  const start = dateToDayNumber(startDate) < floor ? dayNumberToDate(floor) : startDate;
  return { range: { startDate: start, endDate } };
};

const overlapsOrTouches = (a: DateRange, b: DateRange) =>
  dateToDayNumber(a.startDate) <= dateToDayNumber(b.endDate) + 1 &&
  dateToDayNumber(b.startDate) <= dateToDayNumber(a.endDate) + 1;

const overlaps = (a: DateRange, b: DateRange) =>
  dateToDayNumber(a.startDate) <= dateToDayNumber(b.endDate) &&
  dateToDayNumber(b.startDate) <= dateToDayNumber(a.endDate);

/**
 * Blocking a range merges it with every manual block it overlaps or touches,
 * so the stored list never contains fragments. Returns the blocks to delete
 * and the single block that replaces them.
 */
export const mergeBlockIntoRanges = <T extends DateRange>(
  existing: T[],
  range: DateRange,
): { remove: T[]; merged: DateRange } => {
  const remove = existing.filter((block) => overlapsOrTouches(block, range));
  let start = dateToDayNumber(range.startDate);
  let end = dateToDayNumber(range.endDate);
  for (const block of remove) {
    start = Math.min(start, dateToDayNumber(block.startDate));
    end = Math.max(end, dateToDayNumber(block.endDate));
  }
  return {
    remove,
    merged: { startDate: dayNumberToDate(start), endDate: dayNumberToDate(end) },
  };
};

/**
 * Unblocking a range trims, splits, or removes every manual block that
 * overlaps it. Returns the blocks to delete and the fragments to re-insert.
 */
export const subtractRangeFromBlocks = <T extends DateRange>(
  existing: T[],
  range: DateRange,
): { remove: T[]; insert: DateRange[] } => {
  const remove: T[] = [];
  const insert: DateRange[] = [];
  const cutStart = dateToDayNumber(range.startDate);
  const cutEnd = dateToDayNumber(range.endDate);
  for (const block of existing) {
    if (!overlaps(block, range)) continue;
    remove.push(block);
    const blockStart = dateToDayNumber(block.startDate);
    const blockEnd = dateToDayNumber(block.endDate);
    if (blockStart < cutStart) {
      insert.push({ startDate: block.startDate, endDate: dayNumberToDate(cutStart - 1) });
    }
    if (blockEnd > cutEnd) {
      insert.push({ startDate: dayNumberToDate(cutEnd + 1), endDate: block.endDate });
    }
  }
  return { remove, insert };
};

/* ------------------------------------------------------------------------ */
/* Feed definitions inside the accommodation payload                         */
/* ------------------------------------------------------------------------ */

export type CalendarFeedEntry = { id: string; label: string; url: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Editor Step 8 stores feeds as `[{ label, url }]`. Every persisted entry gets
 * a stable `id` so fetch status and imported dates can follow it through
 * label edits and reordering. Entries without a usable shape are dropped.
 */
export const normalizeCalendarFeeds = (data: AccommodationData): AccommodationData => {
  if (!Array.isArray(data.calendarFeeds)) return data;
  const seen = new Set<string>();
  const calendarFeeds = data.calendarFeeds
    .filter(isObject)
    .map((entry) => {
      let id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : randomUUID();
      while (seen.has(id)) id = randomUUID();
      seen.add(id);
      return {
        ...entry,
        id,
        label: typeof entry.label === "string" ? entry.label : "",
        url: typeof entry.url === "string" ? entry.url : "",
      };
    });
  return { ...data, calendarFeeds };
};

/**
 * True when the payload still holds feed entries without a stable `id`
 * (written by Step 8 before ids existed, or by any client that strips them).
 * Callers backfill with `normalizeCalendarFeeds` before reading feeds so no
 * definition is ever hidden or dropped.
 */
export const calendarFeedsNeedIds = (data: AccommodationData): boolean =>
  Array.isArray(data.calendarFeeds) &&
  data.calendarFeeds.some(
    (entry) => !isObject(entry) || typeof entry.id !== "string" || !entry.id.trim(),
  );

export const calendarFeedsOf = (data: AccommodationData): CalendarFeedEntry[] =>
  Array.isArray(data.calendarFeeds)
    ? data.calendarFeeds
        .filter(isObject)
        .filter((entry) => typeof entry.id === "string" && entry.id)
        .map((entry) => ({
          id: entry.id as string,
          label: typeof entry.label === "string" ? entry.label : "",
          url: typeof entry.url === "string" ? entry.url : "",
        }))
    : [];

export const calendarChoiceOf = (data: AccommodationData): "none" | "connect" | null =>
  data.calendarChoice === "none" || data.calendarChoice === "connect"
    ? data.calendarChoice
    : null;

export type FeedUrlError = "empty" | "invalidUrl" | "unsupportedScheme" | "privateHost";

/* ------------------------------------------------------------------------ */
/* Outbound address policy                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Feed URLs are fetched by the server on behalf of a host, so every address
 * the request could reach must be public: no loopback, link-local, private or
 * carrier-grade NAT ranges, no IPv4-mapped/compatible/6to4/Teredo tunnels to
 * such ranges, no multicast, no metadata endpoints. `isPublicIp` is the single
 * decision point; it is applied to literal hosts at validation time and to
 * every resolved address (and every redirect hop) at fetch time.
 */
const parseIpv4 = (value: string): number[] | null => {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  return octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) ? octets : null;
};

const isPublicIpv4 = (octets: number[]) => {
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return false; // this-network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 192 && b === 0 && (octets[2] === 0 || octets[2] === 2)) return false; // IETF, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && octets[2] === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && octets[2] === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
};

/** Expands an IPv6 literal into eight 16-bit groups, or null if malformed. */
const parseIpv6 = (raw: string): number[] | null => {
  let value = raw.trim().toLowerCase();
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);
  // Embedded IPv4 tail (::ffff:127.0.0.1) → two hex groups.
  const tail = value.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (tail) {
    const octets = parseIpv4(tail[2]);
    if (!octets) return null;
    value = `${tail[1]}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const toGroups = (part: string) =>
    part === "" ? [] : part.split(":").map((group) => (/^[0-9a-f]{1,4}$/.test(group) ? parseInt(group, 16) : NaN));
  const head = toGroups(halves[0]);
  const rest = halves.length === 2 ? toGroups(halves[1]) : [];
  if ([...head, ...rest].some((group) => Number.isNaN(group))) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - rest.length;
  if (missing < 1) return null;
  return [...head, ...new Array(missing).fill(0), ...rest];
};

const isPublicIpv6 = (groups: number[]) => {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  const allZeroTo = (upto: number) => groups.slice(0, upto).every((group) => group === 0);
  if (allZeroTo(7) && (g7 === 0 || g7 === 1)) return false; // :: and ::1
  if (allZeroTo(5) && g5 === 0xffff) return isPublicIpv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]); // IPv4-mapped
  if (allZeroTo(6)) return isPublicIpv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]); // IPv4-compatible
  if (g0 === 0x64 && g1 === 0xff9b) return isPublicIpv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]); // NAT64
  if (g0 === 0x2002) return isPublicIpv4([g1 >> 8, g1 & 0xff, g2 >> 8, g2 & 0xff]); // 6to4
  if (g0 === 0x2001 && g1 === 0) {
    // Teredo: the client IPv4 is stored inverted in the last two groups.
    const hi = g6 ^ 0xffff;
    const lo = g7 ^ 0xffff;
    return isPublicIpv4([hi >> 8, hi & 0xff, lo >> 8, lo & 0xff]);
  }
  if (g0 === 0x2001 && g1 === 0xdb8) return false; // documentation
  if ((g0 & 0xfe00) === 0xfc00) return false; // unique local fc00::/7
  if ((g0 & 0xffc0) === 0xfe80) return false; // link-local
  if ((g0 & 0xffc0) === 0xfec0) return false; // site-local (deprecated)
  if ((g0 & 0xff00) === 0xff00) return false; // multicast
  return true;
};

/** True only for a syntactically valid, globally routable unicast address. */
export const isPublicIp = (address: string) => {
  const v4 = parseIpv4(address);
  if (v4) return isPublicIpv4(v4);
  const v6 = parseIpv6(address);
  if (v6) return isPublicIpv6(v6);
  return false;
};

const isIpLiteral = (hostname: string) =>
  parseIpv4(hostname) !== null || parseIpv6(hostname) !== null;

/** Host names that can never be a public calendar server, whatever DNS says. */
const isForbiddenHostname = (hostname: string) => {
  const name = hostname.toLowerCase().replace(/\.$/, "");
  if (!name.includes(".")) return true; // localhost and other single labels
  return /\.(local|localhost|internal|localdomain|home|lan|intranet|corp|arpa)$/.test(name);
};

/**
 * Feed URLs must be absolute http(s) links to a public host. The check is
 * deliberately strict about schemes (no `webcal:`) so what the host pastes is
 * exactly what the server will fetch. Literal addresses are policed here;
 * names are additionally policed once resolved (see `resolvePublicAddresses`).
 */
export const validateFeedUrl = (
  value: unknown,
): { url: string } | { error: FeedUrlError } => {
  if (typeof value !== "string" || !value.trim()) return { error: "empty" };
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { error: "invalidUrl" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "unsupportedScheme" };
  }
  if (parsed.username || parsed.password) return { error: "invalidUrl" };
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!hostname) return { error: "privateHost" };
  if (isIpLiteral(hostname) ? !isPublicIp(hostname) : isForbiddenHostname(hostname)) {
    return { error: "privateHost" };
  }
  return { url: parsed.toString() };
};

export type ResolvedAddress = { address: string; family: 4 | 6 };

/**
 * Resolves a host name and refuses it if *any* answer is non-public, so a
 * name that mixes public and private records cannot be used to pivot. The
 * returned addresses are the only ones the fetch is allowed to connect to
 * (pinned through the socket `lookup` hook), which closes DNS rebinding
 * between the check and the connection.
 */
export const resolvePublicAddresses = async (
  hostname: string,
  lookup: typeof dnsLookup = dnsLookup,
): Promise<ResolvedAddress[] | null> => {
  if (isIpLiteral(hostname)) {
    return isPublicIp(hostname) ? [{ address: hostname, family: hostname.includes(":") ? 6 : 4 }] : null;
  }
  if (isForbiddenHostname(hostname)) return null;
  let answers: Array<{ address: string; family: number }>;
  try {
    answers = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return null;
  }
  if (answers.length === 0 || answers.some((answer) => !isPublicIp(answer.address))) return null;
  return answers.map((answer) => ({ address: answer.address, family: answer.family === 6 ? 6 : 4 }));
};

/**
 * Step 8 choice after a link change. Adding a link is the host's explicit way
 * of connecting calendars; editing or removing one keeps whatever mode the
 * listing is in (a paused listing stays paused), except that a connected
 * listing with no links left returns to manual so Step 8 never shows
 * "connect" with nothing to connect.
 */
export const feedChoiceAfter = (
  data: AccommodationData,
  remaining: number,
  change: "add" | "edit" | "remove",
): "none" | "connect" | null => {
  const current = calendarChoiceOf(data);
  if (change === "add") return "connect";
  if (remaining === 0 && current === "connect") return "none";
  return current;
};

export const MAX_FEED_LABEL = 80;
export const MAX_FEEDS = 10;

/* ------------------------------------------------------------------------ */
/* iCal parsing                                                              */
/* ------------------------------------------------------------------------ */

export type ImportedRange = DateRange & { summary: string | null };

const unfoldIcs = (text: string) =>
  text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");

type IcsMoment = { date: string; secondsOfDay: number | null };

/**
 * `20260910` → all-day; `20260910T140000` / `20260910T120000Z` → timed.
 * Time zones are ignored on purpose: availability is kept at day granularity
 * and every export in scope (Airbnb, Booking.com, Google) uses whole days.
 */
const icsMoment = (value: string): IcsMoment | null => {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  if (!isIsoDate(date)) return null;
  if (match[4] === undefined) return { date, secondsOfDay: null };
  const [hours, minutes, seconds] = [Number(match[4]), Number(match[5]), Number(match[6])];
  if (hours > 23 || minutes > 59 || seconds > 60) return null;
  return { date, secondsOfDay: hours * 3600 + minutes * 60 + seconds };
};

/**
 * RFC 5545 DURATION → seconds. All-day starts only allow whole days/weeks,
 * as the RFC requires; negative durations are rejected because an event
 * cannot end before it starts.
 */
/** Longest event a feed may describe; anything longer is not a stay but a corrupt value. */
const MAX_EVENT_DAYS = 3660;

const icsDurationSeconds = (value: string, allDay: boolean): number | null => {
  // Each field is capped at 6 digits so the arithmetic below stays exact.
  const match = value
    .trim()
    .match(/^\+?P(?:(\d{1,6})W|(?:(\d{1,6})D)?(?:T(?:(\d{1,6})H)?(?:(\d{1,6})M)?(?:(\d{1,6})S)?)?)$/);
  if (!match) return null;
  const [, weeks, days, hours, minutes, seconds] = match.map((part) => (part === undefined ? 0 : Number(part)));
  const hasTime = hours > 0 || minutes > 0 || seconds > 0;
  if (/T$/.test(value.trim()) || (!weeks && !days && !hasTime)) return null;
  if (allDay && hasTime) return null;
  const total = weeks * 7 * 86_400 + days * 86_400 + hours * 3600 + minutes * 60 + seconds;
  return total > MAX_EVENT_DAYS * 86_400 ? null : total;
};

/** DTSTART plus DURATION as the exclusive end the same way DTEND states it. */
const momentPlusSeconds = (start: IcsMoment, seconds: number): IcsMoment => {
  const total = (start.secondsOfDay ?? 0) + seconds;
  const date = addDays(start.date, Math.floor(total / 86_400));
  return { date, secondsOfDay: start.secondsOfDay === null ? null : total % 86_400 };
};

export type IcsParseError = "notCalendar" | "incomplete" | "unsupportedRecurrence" | "unreadable";

export type IcsParseResult =
  | { ok: true; ranges: ImportedRange[] }
  | { ok: false; error: IcsParseError };

/** One unfolded content line: `NAME;PARAM=X:value` → name (upper-cased), value. */
const icsContentLine = (line: string): { name: string; value: string } | null => {
  const separator = line.indexOf(":");
  if (separator <= 0) return null;
  const name = line.slice(0, separator).split(";")[0].trim().toUpperCase();
  return name ? { name, value: line.slice(separator + 1) } : null;
};

/**
 * Minimal, strict iCalendar reader for availability exports (Airbnb,
 * Booking.com, Google, …). Every VEVENT becomes one inclusive date range;
 * DTEND is exclusive per RFC 5545, so a one-night stay 10→11 blocks the 10th.
 * Cancelled events are ignored.
 *
 * Strict on purpose: a successful parse replaces every date previously
 * imported from the feed, so anything this reader cannot fully understand is
 * an error (the caller then keeps the last successful import) rather than a
 * partial result that would silently reopen booked nights. The text is read
 * as a tree of components (names are case-insensitive, as the RFC says), and:
 * - `notCalendar`: the content does not start with BEGIN:VCALENDAR;
 * - `incomplete`: a component is never closed (a truncated download) — this
 *   is checked per component, so a complete calendar followed by a truncated
 *   one is still incomplete;
 * - `unsupportedRecurrence`: RRULE/RDATE (repeating events are not expanded);
 * - `unreadable`: a mismatched END, content outside any calendar, a line
 *   without a `NAME:` separator, or an event whose DTSTART, DTEND or
 *   DURATION cannot be read, that repeats one of the date/status properties
 *   with a second value, that carries both DTEND and DURATION, or that ends
 *   before it starts.
 */
export const parseIcsRanges = (text: string): IcsParseResult => {
  try {
    return parseIcsRangesStrict(text);
  } catch {
    // Anything the reader did not anticipate must still be a failed
    // attempt, never an escaped exception that skips recording the status.
    return { ok: false, error: "unreadable" };
  }
};

const parseIcsRangesStrict = (text: string): IcsParseResult => {
  const lines = unfoldIcs(text.replace(/^\uFEFF/, ""))
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.length > 0);
  if (lines.length === 0) return { ok: false, error: "notCalendar" };
  const first = icsContentLine(lines[0]);
  if (!first || first.name !== "BEGIN" || first.value.trim().toUpperCase() !== "VCALENDAR") {
    return { ok: false, error: "notCalendar" };
  }

  const ranges: ImportedRange[] = [];
  const stack: string[] = [];
  // Properties of the VEVENT being read (first occurrence wins); null outside one.
  let event: Map<string, string> | null = null;

  for (const line of lines) {
    const content = icsContentLine(line);
    // Every unfolded line must be `NAME:value`; a line without a separator is
    // a corrupt property (often a DTEND) and treating it as absent would
    // shorten a stay, so the whole calendar is refused.
    if (!content) return { ok: false, error: "unreadable" };
    const { name, value } = content;
    if (name === "BEGIN") {
      const component = value.trim().toUpperCase();
      if (stack.length === 0 && component !== "VCALENDAR") return { ok: false, error: "unreadable" };
      if (component === "VEVENT" && stack[stack.length - 1] === "VCALENDAR") event = new Map();
      stack.push(component);
      continue;
    }
    if (name === "END") {
      const component = value.trim().toUpperCase();
      if (stack.length === 0) return { ok: false, error: "unreadable" };
      if (stack[stack.length - 1] !== component) {
        // A missing END:VEVENT shows up as END:VCALENDAR closing a VEVENT.
        return { ok: false, error: stack.includes(component) ? "incomplete" : "unreadable" };
      }
      stack.pop();
      if (component === "VEVENT" && event && stack[stack.length - 1] === "VCALENDAR") {
        const outcome = eventRange(event);
        event = null;
        if (!outcome.ok) return outcome;
        if (outcome.range) ranges.push(outcome.range);
      }
      continue;
    }
    if (stack.length === 0) return { ok: false, error: "unreadable" };
    // Only direct VEVENT properties count; VALARM lines inside an event are skipped.
    if (event && stack[stack.length - 1] === "VEVENT") {
      // Properties that decide the blocked dates occur at most once per
      // event (RFC 5545). A repeat is a contradiction: picking either value
      // could shorten a stay, so the calendar is refused.
      if (SINGLETON_EVENT_PROPERTIES.has(name) && event.has(name)) return { ok: false, error: "unreadable" };
      if (!event.has(name)) event.set(name, value);
    }
  }
  if (stack.length > 0) return { ok: false, error: "incomplete" };
  return { ok: true, ranges };
};

/** Event properties that may appear once only and decide the imported dates. */
const SINGLETON_EVENT_PROPERTIES = new Set(["DTSTART", "DTEND", "DURATION", "STATUS", "RRULE", "RECURRENCE-ID"]);

/** One VEVENT's properties → its inclusive date range (null when cancelled). */
const eventRange = (
  props: Map<string, string>,
): { ok: true; range: ImportedRange | null } | { ok: false; error: IcsParseError } => {
  if (props.has("RRULE") || props.has("RDATE")) return { ok: false, error: "unsupportedRecurrence" };
  if ((props.get("STATUS") ?? "").trim().toUpperCase() === "CANCELLED") return { ok: true, range: null };
  const rawStart = props.get("DTSTART");
  const start = rawStart ? icsMoment(rawStart) : null;
  if (!start) return { ok: false, error: "unreadable" };
  const rawEnd = props.get("DTEND");
  const rawDuration = props.get("DURATION");
  if (rawEnd !== undefined && rawDuration !== undefined) return { ok: false, error: "unreadable" };
  let exclusiveEnd: IcsMoment | null = null;
  if (rawEnd !== undefined) {
    exclusiveEnd = icsMoment(rawEnd);
    if (!exclusiveEnd) return { ok: false, error: "unreadable" };
  } else if (rawDuration !== undefined) {
    const seconds = icsDurationSeconds(rawDuration, start.secondsOfDay === null);
    if (seconds === null) return { ok: false, error: "unreadable" };
    exclusiveEnd = momentPlusSeconds(start, seconds);
  }
  if (exclusiveEnd && !isIsoDate(exclusiveEnd.date)) return { ok: false, error: "unreadable" };
  if (exclusiveEnd && dateToDayNumber(exclusiveEnd.date) - dateToDayNumber(start.date) > MAX_EVENT_DAYS) {
    return { ok: false, error: "unreadable" };
  }
  let end = start.date;
  if (exclusiveEnd) {
    const endsBeforeStart =
      dateToDayNumber(exclusiveEnd.date) < dateToDayNumber(start.date) ||
      (exclusiveEnd.date === start.date &&
        exclusiveEnd.secondsOfDay !== null &&
        start.secondsOfDay !== null &&
        exclusiveEnd.secondsOfDay < start.secondsOfDay);
    if (endsBeforeStart) return { ok: false, error: "unreadable" };
    // Exclusive end: a checkout on the 12th (any time) frees the 12th.
    end = addDays(exclusiveEnd.date, -1);
    if (dateToDayNumber(end) < dateToDayNumber(start.date)) end = start.date;
  }
  const summary = (props.get("SUMMARY") ?? "").replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
  return { ok: true, range: { startDate: start.date, endDate: end, summary: summary ? summary.slice(0, 120) : null } };
};

export const FEED_FETCH_TIMEOUT_MS = 10_000;
export const FEED_MAX_BYTES = 5 * 1024 * 1024;
export const FEED_MAX_REDIRECTS = 3;

export type FeedFetchResult =
  | { ok: true; ranges: ImportedRange[] }
  | { ok: false; error: string };

type HopResult =
  | { kind: "body"; text: string }
  | { kind: "redirect"; location: string }
  | { kind: "error"; error: string };

/**
 * One HTTP hop. The socket connects only to the pre-validated addresses, so
 * a DNS answer that changes between validation and connect cannot redirect
 * the request to an internal host. Redirects are surfaced, not followed, so
 * the caller can validate the next destination.
 */
const requestHop = (
  target: URL,
  addresses: ResolvedAddress[],
  deadline: number,
): Promise<HopResult> =>
  new Promise((resolve) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      resolve({ kind: "error", error: "timeout" });
      return;
    }
    const transport = target.protocol === "https:" ? httpsRequest : httpRequest;
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      const wantAll = typeof options === "object" && options !== null && options.all === true;
      if (wantAll) {
        (callback as unknown as (err: null, result: ResolvedAddress[]) => void)(null, addresses);
      } else {
        callback(null, addresses[0].address, addresses[0].family);
      }
    };
    let settled = false;
    const finish = (result: HopResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const request = transport(
      target,
      {
        method: "GET",
        lookup: pinnedLookup,
        timeout: remaining,
        headers: {
          accept: "text/calendar, text/plain;q=0.9, */*;q=0.5",
          "user-agent": "Putko-Calendar/1.0",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          finish({ kind: "redirect", location: response.headers.location });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          finish({ kind: "error", error: `http_${status}` });
          return;
        }
        if (Number(response.headers["content-length"] ?? 0) > FEED_MAX_BYTES) {
          response.destroy();
          finish({ kind: "error", error: "tooLarge" });
          return;
        }
        const chunks: Buffer[] = [];
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > FEED_MAX_BYTES) {
            response.destroy();
            finish({ kind: "error", error: "tooLarge" });
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => finish({ kind: "body", text: Buffer.concat(chunks).toString("utf8") }));
        response.on("error", () => finish({ kind: "error", error: "unreadable" }));
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
      finish({ kind: "error", error: "timeout" });
    });
    request.on("error", (error: NodeJS.ErrnoException) => {
      finish({ kind: "error", error: error.message === "timeout" ? "timeout" : "unreachable" });
    });
    request.end();
  });

/**
 * One on-demand fetch of a feed. There is no background polling: the status a
 * host sees is exactly the outcome of the last time they (or the add action)
 * asked for a fetch. Errors are short, host-readable reasons.
 *
 * Security: the URL, every resolved address and every redirect hop must pass
 * the public-address policy; anything else ends the fetch with `privateHost`.
 */
export const fetchFeed = async (
  url: string,
  options: { lookup?: typeof dnsLookup; request?: typeof requestHop } = {},
): Promise<FeedFetchResult> => {
  const doRequest = options.request ?? requestHop;
  const deadline = Date.now() + FEED_FETCH_TIMEOUT_MS;
  let current = url;
  for (let hop = 0; hop <= FEED_MAX_REDIRECTS; hop += 1) {
    const validated = validateFeedUrl(current);
    if ("error" in validated) return { ok: false, error: "privateHost" };
    const target = new URL(validated.url);
    const addresses = await resolvePublicAddresses(target.hostname.replace(/^\[|\]$/g, ""), options.lookup);
    if (!addresses) return { ok: false, error: "privateHost" };
    const result = await doRequest(target, addresses, deadline);
    if (result.kind === "error") return { ok: false, error: result.error };
    if (result.kind === "redirect") {
      if (hop === FEED_MAX_REDIRECTS) return { ok: false, error: "tooManyRedirects" };
      try {
        current = new URL(result.location, target).toString();
      } catch {
        return { ok: false, error: "unreachable" };
      }
      continue;
    }
    return parseIcsRanges(result.text);
  }
  return { ok: false, error: "tooManyRedirects" };
};

/** Upper bound of stored ranges per feed; a real availability export is far below it. */
export const MAX_IMPORTED_RANGES = 2000;

/**
 * Whether a fetch that started at `attemptedAt` may still be applied, given
 * the start time of the attempt currently recorded for the feed. Two tabs can
 * fetch the same link at once; if the older request finishes last, applying
 * it would replace the newer import with older data. Attempts are therefore
 * applied only in start order — a later-started attempt wins, whatever order
 * the responses arrive in.
 */
export const attemptIsCurrent = (attemptedAt: Date, recordedAttemptAt: Date | null | undefined) =>
  !recordedAttemptAt || recordedAttemptAt.getTime() <= attemptedAt.getTime();

export type ImportOutcome =
  | { kind: "replace"; ranges: ImportedRange[] }
  | { kind: "failed"; error: string };

/**
 * Decides what a fetch attempt does to the stored import. Only a fully
 * understood calendar replaces the previous dates; every failure — including
 * an export too large to store — keeps them, because a partial replacement
 * would silently reopen booked nights. Past ranges are dropped from a
 * successful import since they cannot affect availability.
 */
export const importOutcome = (result: FeedFetchResult, today = utcToday()): ImportOutcome => {
  if (!result.ok) return { kind: "failed", error: result.error };
  const floor = dateToDayNumber(today) - 1;
  const ranges = result.ranges
    .filter((range) => dateToDayNumber(range.endDate) >= floor)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (ranges.length > MAX_IMPORTED_RANGES) return { kind: "failed", error: "tooManyEvents" };
  return { kind: "replace", ranges };
};
