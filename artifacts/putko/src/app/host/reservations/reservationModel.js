// Pure helpers for the Reservations section: grouping and filtering of the
// server's reservation list, display copy per stage/action, money and date
// formatting. The server owns the lifecycle (allowed transitions, calendar
// side effects); nothing here decides what a host may do — it only renders
// the `stage` and `actions` the server sent.
import { RESERVATION_STAGES } from "../hostRoutes";
import { compareDates, formatDay, formatDayLong } from "../calendar/calendarModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

export { RESERVATION_STAGES };

/* ------------------------------------------------------------------------ */
/* Copy                                                                      */
/* ------------------------------------------------------------------------ */

const STAGE_COPY = {
  request: { en: "Request", sk: "Žiadosť", plural: { en: "Requests", sk: "Žiadosti" } },
  upcoming: { en: "Upcoming", sk: "Nadchádzajúce", plural: { en: "Upcoming", sk: "Nadchádzajúce" } },
  active: { en: "Staying now", sk: "Práve ubytovaní", plural: { en: "Staying now", sk: "Práve ubytovaní" } },
  completed: { en: "Completed", sk: "Ukončené", plural: { en: "Completed", sk: "Ukončené" } },
  declined: { en: "Declined", sk: "Zamietnuté", plural: { en: "Declined", sk: "Zamietnuté" } },
  cancelled: { en: "Cancelled", sk: "Zrušené", plural: { en: "Cancelled", sk: "Zrušené" } },
};

export const stageLabel = (stage, language, { plural = false } = {}) => {
  const copy = STAGE_COPY[stage];
  if (!copy) return "";
  const source = plural ? copy.plural : copy;
  return source[language === "en" ? "en" : "sk"];
};

/** Badge tone per stage; kept short so it fits next to a name on a phone. */
export const stagePresentation = (stage, language) => {
  const label = stageLabel(stage, language);
  switch (stage) {
    case "request":
      return { label, badge: "bg-amber-50 text-amber-800 border border-amber-200", dot: "bg-amber-500" };
    case "upcoming":
      return { label, badge: "bg-green-50 text-green-700 border border-green-200", dot: "bg-green-600" };
    case "active":
      return { label, badge: "bg-[#DFBA73] text-[#1E3E2B]", dot: "bg-[#DFBA73]" };
    case "completed":
      return { label, badge: "bg-neutral-100 text-neutral-700 border border-neutral-200", dot: "bg-neutral-400" };
    case "declined":
      return { label, badge: "bg-neutral-100 text-neutral-600 border border-neutral-200", dot: "bg-neutral-400" };
    case "cancelled":
    default:
      return { label, badge: "bg-red-50 text-red-700 border border-red-200", dot: "bg-red-500" };
  }
};

const ACTION_COPY = {
  accept: {
    label: { en: "Accept", sk: "Prijať" },
    pending: { en: "Accepting…", sk: "Prijíma sa…" },
    title: { en: "Accept this request?", sk: "Prijať túto žiadosť?" },
    body: {
      en: "The nights will be blocked in this property's calendar and the guest's stay becomes confirmed. You can still cancel it later.",
      sk: "Noci sa zablokujú v kalendári tejto ponuky a pobyt hosťa bude potvrdený. Neskôr ho môžete zrušiť.",
    },
    confirm: { en: "Accept request", sk: "Prijať žiadosť" },
    failed: { en: "The request wasn't accepted.", sk: "Žiadosť nebola prijatá." },
    done: { en: "Request accepted. The nights are now blocked in the calendar.", sk: "Žiadosť prijatá. Noci sú teraz zablokované v kalendári." },
    irreversible: false,
  },
  decline: {
    label: { en: "Decline", sk: "Zamietnuť" },
    pending: { en: "Declining…", sk: "Zamieta sa…" },
    title: { en: "Decline this request?", sk: "Zamietnuť túto žiadosť?" },
    body: {
      en: "The guest will not be able to stay on these dates. A declined request cannot be reopened.",
      sk: "Hosť sa v týchto termínoch nebude môcť ubytovať. Zamietnutú žiadosť už nie je možné znova otvoriť.",
    },
    confirm: { en: "Decline request", sk: "Zamietnuť žiadosť" },
    failed: { en: "The request wasn't declined.", sk: "Žiadosť nebola zamietnutá." },
    done: { en: "Request declined.", sk: "Žiadosť zamietnutá." },
    irreversible: true,
  },
  cancel: {
    label: { en: "Cancel stay", sk: "Zrušiť pobyt" },
    pending: { en: "Cancelling…", sk: "Ruší sa…" },
    title: { en: "Cancel this stay?", sk: "Zrušiť tento pobyt?" },
    body: {
      en: "The nights will be released in the calendar and the guest's stay is cancelled. This cannot be undone.",
      sk: "Noci sa v kalendári uvoľnia a pobyt hosťa bude zrušený. Túto akciu nie je možné vrátiť späť.",
    },
    confirm: { en: "Cancel stay", sk: "Zrušiť pobyt" },
    failed: { en: "The stay wasn't cancelled.", sk: "Pobyt nebol zrušený." },
    done: { en: "Stay cancelled. The nights are open again.", sk: "Pobyt zrušený. Noci sú opäť voľné." },
    irreversible: true,
  },
};

export const actionCopy = (action, language) => {
  const copy = ACTION_COPY[action];
  if (!copy) return null;
  const pick = (entry) => entry[language === "en" ? "en" : "sk"];
  return {
    label: pick(copy.label),
    pending: pick(copy.pending),
    title: pick(copy.title),
    body: pick(copy.body),
    confirm: pick(copy.confirm),
    failed: pick(copy.failed),
    done: pick(copy.done),
    irreversible: copy.irreversible,
  };
};

const RESERVATION_ERRORS = {
  invalidTransition: {
    en: "This reservation has changed in the meantime. Its current state is shown below.",
    sk: "Táto rezervácia sa medzitým zmenila. Nižšie je jej aktuálny stav.",
  },
  checkInPassed: {
    en: "The check-in date has already passed, so this request can only be declined.",
    sk: "Dátum príchodu už uplynul, túto žiadosť je možné iba zamietnuť.",
  },
  datesUnavailable: {
    en: "These nights are no longer free in the calendar.",
    sk: "Tieto noci už nie sú v kalendári voľné.",
  },
  priceMissing: {
    en: "Set a nightly price on this listing before creating sample requests.",
    sk: "Pred vytvorením ukážkových žiadostí nastavte pri ponuke cenu za noc.",
  },
  forbidden: { en: "This reservation belongs to another host.", sk: "Táto rezervácia patrí inému hostiteľovi." },
  notFound: { en: "This reservation no longer exists.", sk: "Táto rezervácia už neexistuje." },
};

/** Localized text for an API error; falls back to a generic retry message. */
export const reservationErrorText = (error, language) => {
  const code = error?.code;
  if (code && RESERVATION_ERRORS[code]) return RESERVATION_ERRORS[code][language === "en" ? "en" : "sk"];
  if (error?.status === 401) return t(language, "Your session has expired. Please log in again.", "Platnosť relácie vypršala. Prihláste sa znova.");
  return t(language, "Something went wrong. Please try again.", "Niečo sa pokazilo. Skúste to znova.");
};

const CONFLICT_KIND = {
  reservation: { en: "another accepted stay", sk: "iný prijatý pobyt" },
  manual: { en: "blocked by you", sk: "blokované vami" },
  feed: { en: "a connected calendar", sk: "pripojený kalendár" },
};

/** One line per conflicting range, e.g. "22 – 24 Sep 2026 · another accepted stay (Jana)". */
export const conflictLines = (conflicts, language) =>
  (Array.isArray(conflicts) ? conflicts : []).map((conflict) => {
    const kind = CONFLICT_KIND[conflict.kind]?.[language === "en" ? "en" : "sk"] ?? conflict.kind;
    const label = conflict.label ? ` (${conflict.label})` : "";
    return `${formatStayRange({ startDate: conflict.startDate, endDate: conflict.endDate }, language)} · ${kind}${label}`;
  });

/* ------------------------------------------------------------------------ */
/* Formatting                                                                */
/* ------------------------------------------------------------------------ */

const locale = (language) => (language === "en" ? "en-GB" : "sk-SK");

export const formatMoney = (cents, currency, language) => {
  const amount = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat(locale(language), {
      style: "currency",
      currency: currency || "EUR",
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || "EUR"}`;
  }
};

const skNights = (n) => `${n} ${n === 1 ? "noc" : n >= 2 && n <= 4 ? "noci" : "nocí"}`;
export const nightsLabel = (n, language) => (language === "en" ? `${n} ${n === 1 ? "night" : "nights"}` : skNights(n));

const skGuests = (n) => `${n} ${n === 1 ? "hosť" : n >= 2 && n <= 4 ? "hostia" : "hostí"}`;
export const guestsLabel = (n, language) => (language === "en" ? `${n} ${n === 1 ? "guest" : "guests"}` : skGuests(n));

/** "22 – 25 Sep 2026" for a check-in/check-out pair (check-out shown as the leaving day). */
export const formatStayRange = ({ startDate, endDate }, language) => {
  if (!startDate || !endDate) return "";
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const sameMonth = sameYear && startDate.slice(5, 7) === endDate.slice(5, 7);
  const start = sameMonth
    ? formatDay(startDate, language, { day: "numeric" })
    : formatDay(startDate, language, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  const end = formatDay(endDate, language, { day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${end}`;
};

export const formatStay = (reservation, language) =>
  formatStayRange({ startDate: reservation.checkIn, endDate: reservation.checkOut }, language);

export const formatCheckDay = (iso, language) => formatDayLong(iso, language);

export const formatRequestedAt = (value, language) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

/* ------------------------------------------------------------------------ */
/* Grouping and filtering                                                    */
/* ------------------------------------------------------------------------ */

export const isValidStage = (stage) => RESERVATION_STAGES.includes(stage);

/** Reservations matching the URL filters (property id and/or stage). */
export const filterReservations = (reservations, { property = null, stage = null } = {}) =>
  (reservations || []).filter(
    (item) => (!property || item.accommodationId === property) && (!stage || item.stage === stage),
  );

/** Count per stage for the filter chips, computed after the property filter. */
export const countByStage = (reservations) =>
  (reservations || []).reduce(
    (acc, item) => {
      if (item.stage in acc) acc[item.stage] += 1;
      return acc;
    },
    Object.fromEntries(RESERVATION_STAGES.map((stage) => [stage, 0])),
  );

const time = (value) => {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Order for the list: what needs the host now comes first — open requests
 * (oldest first, they have waited longest), then guests staying now, then
 * upcoming stays by arrival; history (completed/declined/cancelled) follows,
 * most recent first.
 */
const STAGE_ORDER = { request: 0, active: 1, upcoming: 2, completed: 3, cancelled: 4, declined: 5 };

export const sortReservations = (reservations) =>
  [...(reservations || [])].sort((a, b) => {
    const stageDiff = (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9);
    if (stageDiff !== 0) return stageDiff;
    if (a.stage === "request") return time(a.createdAt) - time(b.createdAt);
    if (a.stage === "active" || a.stage === "upcoming") return compareDates(a.checkIn, b.checkIn);
    return compareDates(b.checkIn, a.checkIn);
  });

/** Open requests only, oldest first: the "needs your reply" strip. */
export const pendingRequests = (reservations) =>
  sortReservations((reservations || []).filter((item) => item.stage === "request"));

/** Replace one reservation in a list (or append it when new). */
export const upsertReservation = (reservations, next) => {
  if (!next?.id) return reservations;
  const exists = (reservations || []).some((item) => item.id === next.id);
  return exists ? reservations.map((item) => (item.id === next.id ? next : item)) : [...(reservations || []), next];
};
