// Pure helpers for the property calendar. Dates are `YYYY-MM-DD` strings so a
// blocked night is the same night on every device; all arithmetic runs on
// UTC-midnight timestamps so daylight-saving changes never shift a day.

export const CALENDAR_LISTING_STORAGE_KEY = "putko:host-calendar-listing";

const DAY_MS = 86_400_000;

const pad = (value) => String(value).padStart(2, "0");

export const isIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** Local calendar date of a Date instance (what the host sees on their clock). */
export const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayIso = (now = new Date()) => toIsoDate(now);

export const dayNumber = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
};

export const fromDayNumber = (value) => new Date(value * DAY_MS).toISOString().slice(0, 10);

export const addDays = (iso, days) => fromDayNumber(dayNumber(iso) + days);

export const compareDates = (a, b) => dayNumber(a) - dayNumber(b);

/** Inclusive day count of a range. */
export const rangeDays = (range) => dayNumber(range.endDate) - dayNumber(range.startDate) + 1;

/** `{ year, month }` (month 1–12) of a date. */
export const monthOf = (iso) => {
  const [year, month] = iso.split("-").map(Number);
  return { year, month };
};

export const monthKey = ({ year, month }) => `${year}-${pad(month)}`;

export const shiftMonth = ({ year, month }, delta) => {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

export const isSameMonth = (a, b) => a.year === b.year && a.month === b.month;

/**
 * Weeks of a month, Monday first, padded with the neighbouring months' days
 * so the grid is always complete rows. Each cell: `{ iso, inMonth, day }`.
 */
export const monthGrid = ({ year, month }) => {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // JS: 0 = Sunday. Monday-first offset: Mon 0 … Sun 6.
  const offset = (first.getUTCDay() + 6) % 7;
  const start = dayNumber(first.toISOString().slice(0, 10)) - offset;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const weeks = [];
  for (let row = 0; row < rows; row += 1) {
    const week = [];
    for (let column = 0; column < 7; column += 1) {
      const iso = fromDayNumber(start + row * 7 + column);
      const [cellYear, cellMonth, cellDay] = iso.split("-").map(Number);
      week.push({
        iso,
        day: cellDay,
        inMonth: cellYear === year && cellMonth === month,
      });
    }
    weeks.push(week);
  }
  return weeks;
};

const overlapsDay = (block, iso) =>
  compareDates(block.startDate, iso) <= 0 && compareDates(block.endDate, iso) >= 0;

/**
 * What covers one day: the manual block (if any) and the feed blocks (if any).
 * Feed-imported dates cannot be changed here, so the UI needs both separately.
 */
export const dayCoverage = (blocks, iso) => {
  let manual = null;
  const feeds = [];
  for (const block of blocks) {
    if (!overlapsDay(block, iso)) continue;
    if (block.source === "manual") manual = manual ?? block;
    else feeds.push(block);
  }
  return { manual, feeds };
};

/** Range from the tap sequence: first tap anchors, second tap closes. */
export const rangeFromTaps = (anchor, tap) => {
  if (!anchor) return { startDate: tap, endDate: tap, complete: false };
  if (compareDates(tap, anchor) < 0) return { startDate: tap, endDate: anchor, complete: true };
  return { startDate: anchor, endDate: tap, complete: true };
};

export const isInRange = (iso, range) =>
  Boolean(range) && compareDates(iso, range.startDate) >= 0 && compareDates(iso, range.endDate) <= 0;

/**
 * Which actions a selected range allows. "Block" needs at least one day that
 * is not manually blocked yet; "Unblock" needs at least one manually blocked
 * day. Feed-imported days count as neither: they come from the other calendar.
 */
export const selectionSummary = (blocks, range) => {
  if (!range) return { days: 0, canBlock: false, canUnblock: false, feedDays: 0 };
  let manualDays = 0;
  let feedDays = 0;
  const total = rangeDays(range);
  for (let offset = 0; offset < total; offset += 1) {
    const iso = addDays(range.startDate, offset);
    const coverage = dayCoverage(blocks, iso);
    if (coverage.manual) manualDays += 1;
    if (coverage.feeds.length > 0) feedDays += 1;
  }
  return {
    days: total,
    canBlock: manualDays < total,
    canUnblock: manualDays > 0,
    feedDays,
  };
};

/** Blocks that still matter, soonest first: ending today or later. */
export const upcomingBlocks = (blocks, today) =>
  blocks
    .filter((block) => compareDates(block.endDate, today) >= 0)
    .sort((a, b) => compareDates(a.startDate, b.startDate) || compareDates(a.endDate, b.endDate));

/* ------------------------------------------------------------------------ */
/* Formatting                                                                */
/* ------------------------------------------------------------------------ */

const locale = (language) => (language === "en" ? "en-GB" : "sk-SK");

const utcDate = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const formatDay = (iso, language, options = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat(locale(language), { ...options, timeZone: "UTC" }).format(utcDate(iso));

export const formatDayLong = (iso, language) =>
  formatDay(iso, language, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export const formatRange = (range, language) => {
  if (!range) return "";
  if (range.startDate === range.endDate) return formatDayLong(range.startDate, language);
  const sameYear = range.startDate.slice(0, 4) === range.endDate.slice(0, 4);
  const start = formatDay(range.startDate, language, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  const end = formatDay(range.endDate, language, { day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${end}`;
};

export const formatMonthTitle = ({ year, month }, language) => {
  const text = new Intl.DateTimeFormat(locale(language), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const weekdayLabels = (language) => {
  const formatter = new Intl.DateTimeFormat(locale(language), { weekday: "short", timeZone: "UTC" });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, index) => {
    const label = formatter.format(new Date(Date.UTC(2024, 0, 1 + index)));
    return label.replace(/\.$/, "");
  });
};

export const formatTimestamp = (value, language) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
};

/* ------------------------------------------------------------------------ */
/* Copy                                                                      */
/* ------------------------------------------------------------------------ */

const t = (language, en, sk) => (language === "en" ? en : sk);

const FEED_ERRORS = {
  timeout: { en: "The other calendar did not answer in time.", sk: "Druhý kalendár neodpovedal včas." },
  unreachable: { en: "The link could not be reached.", sk: "Odkaz sa nepodarilo načítať." },
  notCalendar: { en: "The link did not return a calendar (.ics) file.", sk: "Odkaz nevrátil súbor kalendára (.ics)." },
  tooLarge: { en: "The calendar file is too large.", sk: "Súbor kalendára je príliš veľký." },
  unreadable: { en: "The calendar file could not be read.", sk: "Súbor kalendára sa nepodarilo prečítať." },
  empty: { en: "The link is empty.", sk: "Odkaz je prázdny." },
  invalidUrl: { en: "The link is not a valid web address.", sk: "Odkaz nie je platná webová adresa." },
  unsupportedScheme: { en: "The link must start with http:// or https://.", sk: "Odkaz musí začínať http:// alebo https://." },
  privateHost: { en: "The link must point to a public address.", sk: "Odkaz musí smerovať na verejnú adresu." },
  tooManyRedirects: { en: "The link redirects too many times.", sk: "Odkaz sa presmerúva príliš veľakrát." },
  tooManyEvents: { en: "This calendar has more upcoming events than Putko can store, so nothing was changed.", sk: "Tento kalendár má viac budúcich udalostí, než Putko dokáže uložiť, preto sa nič nezmenilo." },
  incomplete: { en: "The calendar file arrived incomplete, so nothing was changed.", sk: "Súbor kalendára prišiel neúplný, preto sa nič nezmenilo." },
  unsupportedRecurrence: {
    en: "This calendar uses repeating events, which Putko cannot import yet, so nothing was changed.",
    sk: "Tento kalendár používa opakujúce sa udalosti, ktoré Putko zatiaľ nevie importovať, preto sa nič nezmenilo.",
  },
};

export const feedErrorText = (code, language) => {
  if (!code) return "";
  if (FEED_ERRORS[code]) return FEED_ERRORS[code][language === "en" ? "en" : "sk"];
  const http = /^http_(\d{3})$/.exec(code);
  if (http) return t(language, `The other calendar answered with error ${http[1]}.`, `Druhý kalendár odpovedal chybou ${http[1]}.`);
  return t(language, "The last attempt failed.", "Posledný pokus zlyhal.");
};

/** Human status line for one feed. Never implies live synchronisation. */
export const feedStatusText = (feed, language) => {
  if (feed.status === "ok") {
    const when = formatTimestamp(feed.lastFetchedAt, language);
    const count = feed.importedCount ?? 0;
    return t(
      language,
      `Fetched ${when} · ${count} ${count === 1 ? "blocked range" : "blocked ranges"} imported`,
      `Načítané ${when} · importované ${count} ${count === 1 ? "blokovaný termín" : count >= 2 && count <= 4 ? "blokované termíny" : "blokovaných termínov"}`,
    );
  }
  if (feed.status === "failed") {
    const when = formatTimestamp(feed.lastAttemptAt, language);
    const base = t(language, `Failed ${when}`, `Zlyhalo ${when}`);
    const fetched = feed.lastFetchedAt
      ? t(language, ` · showing dates from ${formatTimestamp(feed.lastFetchedAt, language)}`, ` · zobrazené termíny z ${formatTimestamp(feed.lastFetchedAt, language)}`)
      : "";
    return `${base}${fetched}`;
  }
  return t(language, "Not fetched yet", "Zatiaľ nenačítané");
};

const CALENDAR_ERRORS = {
  calendarsPaused: { en: "Connected calendars are paused. Reconnect them first.", sk: "Pripojené kalendáre sú pozastavené. Najprv ich znova pripojte." },
  invalidDate: { en: "Choose valid dates.", sk: "Vyberte platné dátumy." },
  endBeforeStart: { en: "The end date is before the start date.", sk: "Koncový dátum je pred začiatočným." },
  inPast: { en: "Past dates cannot be changed.", sk: "Minulé dátumy sa nedajú meniť." },
  tooLong: { en: "One range can cover at most 400 days.", sk: "Jeden termín môže pokrývať najviac 400 dní." },
  tooFarAhead: { en: "Dates can be at most three years ahead.", sk: "Dátumy môžu byť najviac tri roky dopredu." },
  tooManyFeeds: { en: "A listing can have at most 10 calendar links.", sk: "Ponuka môže mať najviac 10 odkazov na kalendár." },
  duplicateFeed: { en: "This calendar link is already connected.", sk: "Tento odkaz na kalendár je už pripojený." },
  feedNotFound: { en: "This calendar link no longer exists. Refresh to see the current list.", sk: "Tento odkaz už neexistuje. Obnovte stránku pre aktuálny zoznam." },
  forbidden: { en: "This listing belongs to another host.", sk: "Táto ponuka patrí inému hostiteľovi." },
  notFound: { en: "This listing no longer exists.", sk: "Táto ponuka už neexistuje." },
};

/** Localized text for an API error; falls back to a generic retry message. */
export const calendarErrorText = (error, language) => {
  const code = error?.code;
  if (code && CALENDAR_ERRORS[code]) return CALENDAR_ERRORS[code][language === "en" ? "en" : "sk"];
  if (code && FEED_ERRORS[code]) return FEED_ERRORS[code][language === "en" ? "en" : "sk"];
  if (error?.status === 401) return t(language, "Your session has expired. Please log in again.", "Platnosť relácie vypršala. Prihláste sa znova.");
  return t(language, "Something went wrong. Please try again.", "Niečo sa pokazilo. Skúste to znova.");
};
