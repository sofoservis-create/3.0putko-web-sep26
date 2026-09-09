import {
  destinations,
  isAccommodationInDestination,
  type LegacyAccommodation,
} from "./destinations";

const LEGACY_API = "https://backend-9k3q.onrender.com/api";
const CACHE_MS = 5 * 60 * 1000;
let cache: { expiresAt: number; accommodations: LegacyAccommodation[] } | null = null;
let pending: Promise<LegacyAccommodation[]> | null = null;

const fetchLegacyAccommodations = async (query = new URLSearchParams()) => {
  const params = new URLSearchParams(query);
  params.delete("destination");
  params.delete("city");
  params.delete("page");
  params.delete("limit");
  params.set("page", "1");
  params.set("limit", "2000");

  const response = await fetch(`${LEGACY_API}/accommodations/searching?${params}`);
  if (!response.ok) throw new Error(`Legacy accommodation API returned ${response.status}`);
  const body = await response.json() as { accommodations?: LegacyAccommodation[] };
  return Array.isArray(body.accommodations) ? body.accommodations : [];
};

export const getPublishedAccommodations = async () => {
  if (cache && cache.expiresAt > Date.now()) return cache.accommodations;
  if (!pending) {
    pending = fetchLegacyAccommodations().then((accommodations) => {
      cache = { expiresAt: Date.now() + CACHE_MS, accommodations };
      return accommodations;
    }).finally(() => {
      pending = null;
    });
  }
  return pending;
};

export const getDestinationSummaries = async () => {
  const accommodations = await getPublishedAccommodations();
  return destinations
    .map((destination) => ({
      ...destination,
      count: accommodations.filter((item) =>
        isAccommodationInDestination(item, destination)).length,
    }))
    .filter((destination) => destination.count > 0)
    .sort((a, b) => b.count - a.count || a.editorialOrder - b.editorialOrder);
};

export const searchDestinationAccommodations = async (
  slug: string,
  query: URLSearchParams,
) => {
  const destination = destinations.find((item) => item.slug === slug);
  if (!destination) return null;

  const hasAdditionalFilters = [...query.keys()].some((key) =>
    !["destination", "city", "page", "limit", "sortOption", "mapOnly"].includes(key)
    && Boolean(query.get(key)));
  const source = hasAdditionalFilters
    ? await fetchLegacyAccommodations(query)
    : await getPublishedAccommodations();
  const matches = source.filter((item) => isAccommodationInDestination(item, destination));
  const mapOnly = query.get("mapOnly") === "true";
  const page = Math.max(1, Number(query.get("page")) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.get("limit")) || 12));
  const accommodations = mapOnly ? matches : matches.slice((page - 1) * limit, page * limit);

  return {
    destinationId: destination.id,
    accommodations,
    totalCount: matches.length,
    totalPages: mapOnly ? 1 : Math.ceil(matches.length / limit),
    currentPage: page,
  };
};