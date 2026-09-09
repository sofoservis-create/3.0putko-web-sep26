// Pure helpers shared by the Host workspace: editor step order, draft resume
// position, priority ordering when several properties need attention, and
// display copy for listing cards. The server remains the source of truth for
// completion and status; nothing here changes the accommodation contract.

// Order of the nine editor steps. `calendar` is a client-only step (its
// completion is derived from `data.calendarChoice`); all other ids match the
// server's `completedSteps` values.
export const EDITOR_STEP_IDS = [
  "basics",
  "location",
  "spaces",
  "amenities",
  "photos",
  "pricing",
  "availability",
  "calendar",
  "readiness",
];

export const EDITOR_STEP_TITLES = {
  basics: { en: "Basics", sk: "Základy" },
  location: { en: "Location", sk: "Lokalita" },
  spaces: { en: "Rooms & Guests", sk: "Izby a hostia" },
  amenities: { en: "Amenities", sk: "Vybavenie" },
  photos: { en: "Photos", sk: "Fotografie" },
  pricing: { en: "Pricing", sk: "Ceny" },
  availability: { en: "Policies", sk: "Pravidlá" },
  calendar: { en: "Calendar", sk: "Kalendár" },
  readiness: { en: "Payout Account", sk: "Výplatný účet" },
};

// Key inside the accommodation JSON payload that remembers where the host
// left off. Optional and ignored by the server's completion/publish checks.
export const LAST_VISITED_STEP_KEY = "lastVisitedStep";

export const isEditorStepComplete = (stepId, listing) => {
  if (!listing) return false;
  if (stepId === "calendar") return Boolean(listing.data?.calendarChoice);
  return Array.isArray(listing.completedSteps) && listing.completedSteps.includes(stepId);
};

/** Index of the first step that still has missing requirements, or -1. */
export const firstIncompleteStepIndex = (listing) =>
  EDITOR_STEP_IDS.findIndex((stepId) => !isEditorStepComplete(stepId, listing));

/** Step id of the first incomplete step, or null when everything is complete. */
export const firstIncompleteStepId = (listing) => {
  const index = firstIncompleteStepIndex(listing);
  return index === -1 ? null : EDITOR_STEP_IDS[index];
};

export const lastVisitedStepIndex = (listing) => {
  const stored = listing?.data?.[LAST_VISITED_STEP_KEY];
  return typeof stored === "string" ? EDITOR_STEP_IDS.indexOf(stored) : -1;
};

/**
 * Where the editor should open for a listing:
 * - DRAFT: last visited step when stored, otherwise the first incomplete step.
 * - READY / LIVE (or anything fully complete): the first step, so the host
 *   lands in management view; the review dialog is driven by the URL.
 */
export const resumeStepIndex = (listing) => {
  if (!listing || listing.status !== "DRAFT") return 0;
  const remembered = lastVisitedStepIndex(listing);
  if (remembered >= 0) return remembered;
  const incomplete = firstIncompleteStepIndex(listing);
  return incomplete >= 0 ? incomplete : 0;
};

const time = (value) => {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortByUpdatedDesc = (listings) =>
  [...listings].sort((a, b) => time(b.updatedAt) - time(a.updatedAt));

export const countByStatus = (listings) =>
  listings.reduce(
    (acc, item) => {
      if (item.status in acc) acc[item.status] += 1;
      return acc;
    },
    { DRAFT: 0, READY: 0, LIVE: 0 },
  );

/**
 * The single property that most needs the host's attention:
 * READY (publishable) first, then the oldest DRAFT, then the most recently
 * updated LIVE listing. Returns null when there are no listings.
 */
export const selectPriorityListing = (listings) => {
  if (!listings?.length) return null;
  const ready = listings.filter((item) => item.status === "READY");
  if (ready.length) {
    return ready.reduce((oldest, item) =>
      time(item.createdAt) < time(oldest.createdAt) ? item : oldest,
    );
  }
  const drafts = listings.filter((item) => item.status === "DRAFT");
  if (drafts.length) {
    return drafts.reduce((oldest, item) =>
      time(item.createdAt) < time(oldest.createdAt) ? item : oldest,
    );
  }
  return sortByUpdatedDesc(listings)[0];
};

/** How many other listings still need setup or publishing. */
export const countAttentionListings = (listings) =>
  listings.filter((item) => item.status === "DRAFT" || item.status === "READY").length;

export const listingName = (listing, language) =>
  (typeof listing?.data?.name === "string" && listing.data.name.trim()) ||
  (language === "en" ? "Unnamed listing" : "Ponuka bez názvu");

export const listingLocation = (listing, language) =>
  [listing?.data?.city, listing?.data?.country]
    .filter((part) => typeof part === "string" && part.trim())
    .join(", ") || (language === "en" ? "Location not set" : "Lokalita nenastavená");

export const listingCoverUrl = (listing) => {
  const first = Array.isArray(listing?.data?.photoUrls) ? listing.data.photoUrls[0] : null;
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof first.url === "string") return first.url;
  return null;
};

export const listingDisplayPercent = (listing) =>
  listing?.status === "LIVE" || listing?.status === "READY"
    ? 100
    : Math.max(0, Math.min(100, Number(listing?.completionPercent) || 0));

export const formatSavedAt = (value, language) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sk-SK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

/**
 * Status badge copy + tone used by cards and the delete dialog. `label` is
 * kept short so it fits next to the name at phone width; `description`
 * carries the longer meaning where there is room.
 */
export const statusPresentation = (status, language) => {
  switch (status) {
    case "LIVE":
      return {
        label: language === "en" ? "Live" : "Zverejnené",
        description: language === "en" ? "Visible to travellers" : "Viditeľné pre cestovateľov",
        badge: "bg-green-600 text-white",
        tone: "text-green-700",
      };
    case "READY":
      return {
        label: language === "en" ? "Ready" : "Pripravené",
        description: language === "en" ? "Ready to publish" : "Pripravené na zverejnenie",
        badge: "bg-green-50 text-green-700 border border-green-200",
        tone: "text-green-700",
      };
    default:
      return {
        label: language === "en" ? "Draft" : "Koncept",
        description: language === "en" ? "Setup in progress" : "Nastavenie prebieha",
        badge: "bg-amber-50 text-amber-700 border border-amber-200",
        tone: "text-amber-700",
      };
  }
};

/**
 * Primary action for a listing card / CTA. `review` tells the caller to open
 * the listing with the publish review dialog.
 */
export const primaryActionFor = (listing, language) => {
  switch (listing?.status) {
    case "READY":
      return {
        label: language === "en" ? "Review and publish" : "Skontrolovať a zverejniť",
        review: true,
      };
    case "LIVE":
      return { label: language === "en" ? "Manage" : "Spravovať", review: false };
    default:
      return { label: language === "en" ? "Continue setup" : "Pokračovať v nastavení", review: false };
  }
};

/** Localized title of the step the host should work on next, or null. */
export const nextStepTitle = (listing, language) => {
  if (listing?.status !== "DRAFT") return null;
  const index = resumeStepIndex(listing);
  const stepId = EDITOR_STEP_IDS[index];
  return stepId ? EDITOR_STEP_TITLES[stepId][language === "en" ? "en" : "sk"] : null;
};

/* ------------------------------------------------------------------------ */
/* Store reconciliation                                                      */
/* ------------------------------------------------------------------------ */

/**
 * Apply one local mutation (the server's response to a create/save/publish,
 * or a confirmed delete) to a list of listings.
 */
export const applyListingMutation = (listings, mutation) => {
  if (!mutation) return listings;
  if (mutation.type === "remove") {
    return listings.filter((item) => item.id !== mutation.id);
  }
  const next = mutation.listing;
  if (!next?.id) return listings;
  return sortByUpdatedDesc([...listings.filter((item) => item.id !== next.id), next]);
};

/**
 * Merge a list snapshot with mutations that completed after the snapshot's
 * request started. A mutation response always reflects server state at least
 * as new as a fetch that was already in flight, so replaying the mutations on
 * top of the snapshot yields the newest known state and an older snapshot can
 * never resurrect a deleted card or undo a save.
 */
export const reconcileListingsSnapshot = (snapshot, pendingMutations = []) =>
  pendingMutations.reduce(applyListingMutation, sortByUpdatedDesc(snapshot || []));
