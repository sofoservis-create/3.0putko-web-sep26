// Canonical Host workspace URLs. Every Host screen is addressable so refresh,
// browser Back, and deep links all land on the same section.
export const HOST_ROOT = "/host";

export const hostPaths = {
  today: HOST_ROOT,
  listings: `${HOST_ROOT}/listings`,
  newListing: `${HOST_ROOT}/listings/new`,
  listing: (id, { review = false } = {}) =>
    `${HOST_ROOT}/listings/${encodeURIComponent(id)}${review ? "?review=1" : ""}`,
  menu: `${HOST_ROOT}/menu`,
};

// Legacy flag written by older traveler screens before host activation.
export const START_ONBOARDING_FLAG = "putko:start-host-onboarding";

/**
 * Resolve the current Host location.
 * Returns `{ section, listingId, review }` or `null` when the path is not a
 * known Host screen so the workspace can redirect to the Today view.
 */
export function resolveHostLocation(pathname, search = "") {
  const path = (pathname || "").replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const review = params.get("review") === "1";

  if (path === HOST_ROOT) return { section: "today", listingId: null, review: false };
  if (path === hostPaths.listings) return { section: "listings", listingId: null, review: false };
  if (path === hostPaths.newListing) return { section: "listing", listingId: null, review: false };
  if (path === hostPaths.menu) return { section: "menu", listingId: null, review: false };

  const listingMatch = path.match(/^\/host\/listings\/([^/]+)$/);
  if (listingMatch) {
    let listingId;
    try {
      listingId = decodeURIComponent(listingMatch[1]);
    } catch {
      return null;
    }
    if (!listingId.trim()) return null;
    return { section: "listing", listingId, review };
  }

  return null;
}
