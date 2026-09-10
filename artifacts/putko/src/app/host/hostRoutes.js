// Canonical Host workspace URLs. Every Host screen is addressable so refresh,
// browser Back, and deep links all land on the same section.
import { EDITOR_STEP_IDS } from "./hostListingModel";

export const HOST_ROOT = "/host";

// Operational stages a reservation can be filtered by (mirrors the server).
export const RESERVATION_STAGES = ["request", "upcoming", "active", "completed", "declined", "cancelled"];

export const hostPaths = {
  today: HOST_ROOT,
  listings: `${HOST_ROOT}/listings`,
  newListing: `${HOST_ROOT}/listings/new`,
  listing: (id, { review = false, step = null } = {}) => {
    const params = new URLSearchParams();
    if (review) params.set("review", "1");
    if (step && EDITOR_STEP_IDS.includes(step)) params.set("step", step);
    const query = params.toString();
    return `${HOST_ROOT}/listings/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
  },
  // Global Calendar entry: picks (or remembers) the property to show.
  calendar: `${HOST_ROOT}/calendar`,
  // Property-scoped calendar; the id in the URL is the only property context.
  listingCalendar: (id) => `${HOST_ROOT}/listings/${encodeURIComponent(id)}/calendar`,
  // Reservations list; filters live in the URL so refresh and Back keep them.
  reservations: ({ property = null, stage = null } = {}) => {
    const params = new URLSearchParams();
    if (property) params.set("property", property);
    if (stage && RESERVATION_STAGES.includes(stage)) params.set("stage", stage);
    const query = params.toString();
    return `${HOST_ROOT}/reservations${query ? `?${query}` : ""}`;
  },
  reservation: (id) => `${HOST_ROOT}/reservations/${encodeURIComponent(id)}`,
  menu: `${HOST_ROOT}/menu`,
};


// Legacy flag written by older traveler screens before host activation.
export const START_ONBOARDING_FLAG = "putko:start-host-onboarding";

const decodeId = (raw) => {
  let id;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return id.trim() ? id : null;
};

/**
 * Resolve the current Host location.
 * Returns `{ section, listingId, review, step, reservationId, filters }` or
 * `null` when the path is not a known Host screen so the workspace can
 * redirect to the Today view. `section` is one of today | listings | listing
 * | calendar | reservations | reservation | menu; the calendar section
 * carries `listingId` when it is property-scoped, the reservations list
 * carries its `filters` and a reservation detail its `reservationId`.
 */
export function resolveHostLocation(pathname, search = "") {
  const path = (pathname || "").replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const review = params.get("review") === "1";
  const requestedStep = params.get("step");
  const step = requestedStep && EDITOR_STEP_IDS.includes(requestedStep) ? requestedStep : null;
  const base = { listingId: null, review: false, step: null, reservationId: null, filters: null };

  if (path === HOST_ROOT) return { ...base, section: "today" };
  if (path === hostPaths.listings) return { ...base, section: "listings" };
  if (path === hostPaths.newListing) return { ...base, section: "listing" };
  if (path === hostPaths.calendar) return { ...base, section: "calendar" };
  if (path === hostPaths.menu) return { ...base, section: "menu" };
  if (path === `${HOST_ROOT}/reservations`) {
    const stage = params.get("stage");
    return {
      ...base,
      section: "reservations",
      filters: {
        property: params.get("property")?.trim() || null,
        stage: stage && RESERVATION_STAGES.includes(stage) ? stage : null,
      },
    };
  }

  const reservationMatch = path.match(/^\/host\/reservations\/([^/]+)$/);
  if (reservationMatch) {
    const reservationId = decodeId(reservationMatch[1]);
    return reservationId ? { ...base, section: "reservation", reservationId } : null;
  }

  const calendarMatch = path.match(/^\/host\/listings\/([^/]+)\/calendar$/);
  if (calendarMatch) {
    const listingId = decodeId(calendarMatch[1]);
    return listingId ? { ...base, section: "calendar", listingId } : null;
  }

  const listingMatch = path.match(/^\/host\/listings\/([^/]+)$/);
  if (listingMatch) {
    const listingId = decodeId(listingMatch[1]);
    return listingId ? { ...base, section: "listing", listingId, review, step } : null;
  }

  return null;
}
