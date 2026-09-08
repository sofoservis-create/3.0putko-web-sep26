import React, { useState, useEffect } from "react";
import ClientPage from "./ClientPage";
import ListingsLayout from "./layout";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api";
const MAX_SIMILAR_ACCOMMODATIONS = 4;

const normalizeText = (value) => String(value || "").trim().toLocaleLowerCase();
const getPrice = (accommodation) =>
  Number(accommodation?.pricePerNight || accommodation?.priceMonThus) || 0;
const getPropertyType = (accommodation) => {
  const propertyType = accommodation?.propertyType;
  if (typeof propertyType === "string") return propertyType;
  return propertyType?.en || propertyType?.sk || propertyType?.name || "";
};

const rankSimilarAccommodations = (current, candidates) => {
  const currentId = String(current?._id || "");
  const city = normalizeText(current?.locationDetails?.city);
  const propertyType = normalizeText(getPropertyType(current));
  const capacity = Number(current?.person) || 0;
  const price = getPrice(current);
  const uniqueCandidates = new Map();

  candidates.forEach((candidate) => {
    const id = String(candidate?._id || "");
    if (id && id !== currentId && !uniqueCandidates.has(id)) {
      uniqueCandidates.set(id, candidate);
    }
  });

  return [...uniqueCandidates.values()]
    .map((candidate, index) => {
      const candidateCity = normalizeText(candidate?.locationDetails?.city);
      const candidateType = normalizeText(getPropertyType(candidate));
      const candidateCapacity = Number(candidate?.person) || 0;
      const candidatePrice = getPrice(candidate);
      const capacityDifference =
        capacity && candidateCapacity ? Math.abs(candidateCapacity - capacity) : Number.POSITIVE_INFINITY;
      const priceDifference =
        price && candidatePrice ? Math.abs(candidatePrice - price) / price : Number.POSITIVE_INFINITY;

      return {
        candidate,
        index,
        score:
          (city && candidateCity === city ? 100 : 0) +
          (propertyType && candidateType === propertyType ? 40 : 0) +
          (Number.isFinite(capacityDifference) ? Math.max(0, 25 - capacityDifference * 8) : 0) +
          (Number.isFinite(priceDifference) ? Math.max(0, 20 - priceDifference * 20) : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_SIMILAR_ACCOMMODATIONS)
    .map(({ candidate }) => candidate);
};

const fetchSimilarAccommodations = async (accommodation) => {
  const city = accommodation?.locationDetails?.city || "";
  const propertyType = getPropertyType(accommodation);
  const capacity = Number(accommodation?.person) || 0;
  const price = getPrice(accommodation);
  const minPrice = price ? Math.max(0, Math.floor(price * 0.7)) : "";
  const maxPrice = price ? Math.ceil(price * 1.3) : "";
  const queryStages = [
    { city, propertyType, person: capacity || "", minPrice, maxPrice },
    { city, propertyType, person: capacity || "" },
    { city, person: capacity || "" },
    { city },
    { propertyType, person: capacity || "" },
  ];
  const candidates = [];
  let successfulRequest = false;

  for (const filters of queryStages) {
    const params = new URLSearchParams({ page: "1", limit: "12", ...filters });
    const response = await fetch(`${API_BASE_URL}/accommodations/searching?${params}`);
    if (!response.ok) continue;

    successfulRequest = true;
    const payload = await response.json();
    if (Array.isArray(payload?.accommodations)) candidates.push(...payload.accommodations);

    if (rankSimilarAccommodations(accommodation, candidates).length >= MAX_SIMILAR_ACCOMMODATIONS) {
      break;
    }
  }

  if (!successfulRequest) throw new Error("similar-accommodations-unavailable");
  return rankSimilarAccommodations(accommodation, candidates);
};

export default function Page({ slug: requestedSlug }) {
  const [data, setData] = useState({
    accommodation: null,
    userAccommodations: [],
    similarAccommodations: [],
    host: null,
    reviewsRating: [],
    loading: true,
    secondaryLoading: false,
    similarError: false,
    error: false,
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [requestedSlug]);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const slug = requestedSlug || "umbierky-chata-5ka";
        if (isMounted) setData((current) => ({ ...current, loading: true, error: false }));
        
        const res = await fetch(`${API_BASE_URL}/accommodation/slug/${slug}`);
        if (!res.ok) throw new Error("listing-not-found");
        const accommodation = await res.json();
        if (!accommodation?._id) throw new Error("listing-not-found");
        const userId = accommodation?.userId?._id;
        const accommodationId = accommodation?._id;

        if (isMounted) {
          setData({
            accommodation,
            userAccommodations: [],
            similarAccommodations: [],
            host: null,
            reviewsRating: [],
            loading: false,
            secondaryLoading: true,
            similarError: false,
            error: false,
          });
        }

        const loadSecondary = async () => {
          const [userAccRes, hostRes, reviewsRes, similarResult] = await Promise.all([
          userId ? fetch(`${API_BASE_URL}/accommodation/user/${userId}`) : Promise.resolve({ ok: false }),
          userId ? fetch(`${API_BASE_URL}/hosts/${userId}`) : Promise.resolve({ ok: false }),
          accommodationId ? fetch(`${API_BASE_URL}/reviews/${accommodationId}`) : Promise.resolve({ ok: false }),
          fetchSimilarAccommodations(accommodation)
            .then((items) => ({ items, error: false }))
            .catch(() => ({ items: [], error: true })),
        ]);
          const [userAccommodations, host, reviewsRating] = await Promise.all([
            userAccRes.ok ? userAccRes.json() : [],
            hostRes.ok ? hostRes.json() : null,
            reviewsRes.ok ? reviewsRes.json() : [],
          ]);
          if (isMounted) setData((current) => ({
            ...current,
            userAccommodations,
            similarAccommodations: similarResult.items,
            similarError: similarResult.error,
            host,
            reviewsRating,
            secondaryLoading: false,
          }));
        };
        loadSecondary().catch(() => {
          if (isMounted) setData((current) => ({ ...current, secondaryLoading: false }));
        });
      } catch (error) {
        if (isMounted) {
          setData(prev => ({ ...prev, loading: false, error: true, accommodation: null }));
        }
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [requestedSlug, retryKey]);

  if (data.loading) {
    return <div className="flex h-[100vh] items-center justify-center">Loading...</div>;
  }
  if (data.error || !data.accommodation) {
    return (
      <main className="container flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-900">Ubytovanie sa nepodarilo načítať</h1>
          <p className="mt-2 text-sm text-neutral-600">Skontrolujte pripojenie a skúste to znova.</p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="rounded-xl bg-[#357965] px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#357965] focus:ring-offset-2">Skúsiť znova</button>
            <a href="/listing-stay-map" className="rounded-xl border border-neutral-300 px-4 py-2 font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#357965] focus:ring-offset-2">Späť na výsledky</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ListingsLayout>
      <ClientPage 
        accommodation={data.accommodation} 
        userAccommodations={data.userAccommodations} 
        similarAccommodations={data.similarAccommodations}
        host={data.host}
        reviewsRating={data.reviewsRating}
        secondaryLoading={data.secondaryLoading}
        similarError={data.similarError}
      />
    </ListingsLayout>
  );
}
