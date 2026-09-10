// Canonical Host workspace URLs. Every Host screen is addressable so refresh,
// browser Back, and deep links all land on the same section.
import { EDITOR_STEP_IDS } from "./hostListingModel";

export const HOST_ROOT = "/host";

// Operational stages a reservation can be filtered by (mirrors the server).
export const RESERVATION_STAGES = ["request", "upcoming", "active", "completed", "declined", "cancelled"];

const withProperty = (path, property) =>
  property ? `${path}?${new URLSearchParams({ property }).toString()}` : path;

export const hostPaths = {
  // Today; an optional property filter narrows property-specific tasks.
  today: HOST_ROOT,
  todayFor: (property = null) => withProperty(HOST_ROOT, property),
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
  // Messages list (optional property filter) and one thread.
  messages: ({ property = null } = {}) => withProperty(`${HOST_ROOT}/messages`, property),
  conversation: (id) => `${HOST_ROOT}/messages/${encodeURIComponent(id)}`,
  // Host-level settings (not tied to a property).
  profile: `${HOST_ROOT}/profile`,
  payouts: `${HOST_ROOT}/payouts`,
  menu: `${HOST_ROOT}/menu`,
};

// Shared traveler/host identity (personal details, password) lives in the
// traveler account; the Host menu links there instead of duplicating forms.
export const ACCOUNT_PATH = "/account";


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
 * Returns `{ section, listingId, review, step, reservationId, conversationId,
 * filters }` or `null` when the path is not a known Host screen so the
 * workspace can redirect to the Today view. `section` is one of today |
 * listings | listing | calendar | reservations | reservation | messages |
 * conversation | profile | payouts | menu; the calendar section carries
 * `listingId` when it is property-scoped, Today / the reservations list / the
 * messages list carry their `filters`, a reservation detail its
 * `reservationId` and a thread its `conversationId`.
 */
export function resolveHostLocation(pathname, search = "") {
  const path = (pathname || "").replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const review = params.get("review") === "1";
  const requestedStep = params.get("step");
  const step = requestedStep && EDITOR_STEP_IDS.includes(requestedStep) ? requestedStep : null;
  const base = { listingId: null, review: false, step: null, reservationId: null, conversationId: null, filters: null };
  const propertyFilter = () => ({ property: params.get("property")?.trim() || null });

  if (path === HOST_ROOT) return { ...base, section: "today", filters: propertyFilter() };
  if (path === `${HOST_ROOT}/messages`) return { ...base, section: "messages", filters: propertyFilter() };
  if (path === hostPaths.listings) return { ...base, section: "listings" };
  if (path === hostPaths.newListing) return { ...base, section: "listing" };
  if (path === hostPaths.calendar) return { ...base, section: "calendar" };
  if (path === hostPaths.profile) return { ...base, section: "profile" };
  if (path === hostPaths.payouts) return { ...base, section: "payouts" };
  if (path === hostPaths.menu) return { ...base, section: "menu" };
  if (path === `${HOST_ROOT}/reservations`) {
    const stage = params.get("stage");
    return {
      ...base,
      section: "reservations",
      filters: {
        ...propertyFilter(),
        stage: stage && RESERVATION_STAGES.includes(stage) ? stage : null,
      },
    };
  }

  const conversationMatch = path.match(/^\/host\/messages\/([^/]+)$/);
  if (conversationMatch) {
    const conversationId = decodeId(conversationMatch[1]);
    return conversationId ? { ...base, section: "conversation", conversationId } : null;
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
