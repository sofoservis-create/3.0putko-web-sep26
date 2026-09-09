import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createHostAccommodation,
  deleteHostAccommodation,
  listHostAccommodations,
  publishHostAccommodation,
  updateHostAccommodation,
} from "../utlis/guestAccountApi";
import { applyListingMutation, reconcileListingsSnapshot } from "./hostListingModel";

// One shared listings state for the whole Host workspace. Today, Listings,
// the sidebar setup card, the menu, and the editor all read from here, so a
// create/save/delete/publish in one place is visible everywhere without a
// reload. The server stays the source of truth: every mutation stores the
// server's response, and `refresh` re-fetches the full list.
const HostListingsContext = createContext(null);

const stripListing = (item) => {
  if (!item || typeof item !== "object") return item;
  // Publish responses carry extra fields (`simulated`, `message`); keep only
  // the accommodation shape shared by every endpoint.
  const { simulated, message, ...listing } = item;
  return listing;
};

export function HostListingsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const mountedRef = useRef(true);
  const inFlightRef = useRef(null);
  const loadedRef = useRef(false);
  // Mutations that completed while a list fetch was in flight. They are
  // replayed on top of the fetch result so an older snapshot cannot overwrite
  // newer local state (e.g. bring back a card that was deleted meanwhile).
  const pendingMutationsRef = useRef([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(({ background = false } = {}) => {
    if (inFlightRef.current) return inFlightRef.current;
    const showAsBackground = background && loadedRef.current;
    if (showAsBackground) setRefreshing(true);
    else setLoading(true);
    setError(null);

    pendingMutationsRef.current = [];
    const request = listHostAccommodations()
      .then((result) => {
        if (!mountedRef.current) return [];
        const next = reconcileListingsSnapshot(
          result?.accommodations || [],
          pendingMutationsRef.current,
        );
        setItems(next);
        loadedRef.current = true;
        setLoaded(true);
        return next;
      })
      .catch((err) => {
        if (!mountedRef.current) return [];
        setError(err instanceof Error ? err : new Error("Failed to load listings"));
        return null;
      })
      .finally(() => {
        inFlightRef.current = null;
        pendingMutationsRef.current = [];
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      });
    inFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const applyMutation = useCallback((mutation) => {
    if (inFlightRef.current) pendingMutationsRef.current.push(mutation);
    setItems((current) => applyListingMutation(current, mutation));
  }, []);

  const upsertListing = useCallback(
    (listing) => {
      const next = stripListing(listing);
      if (!next?.id) return;
      applyMutation({ type: "upsert", listing: next });
    },
    [applyMutation],
  );

  const removeListing = useCallback(
    (id) => {
      applyMutation({ type: "remove", id });
    },
    [applyMutation],
  );

  const createListing = useCallback(async () => {
    const created = await createHostAccommodation();
    upsertListing(created);
    return created;
  }, [upsertListing]);

  const saveListing = useCallback(
    async (id, data) => {
      const saved = await updateHostAccommodation(id, data);
      upsertListing(saved);
      return saved;
    },
    [upsertListing],
  );

  const publishListing = useCallback(
    async (id) => {
      const published = await publishHostAccommodation(id);
      upsertListing(published);
      return published;
    },
    [upsertListing],
  );

  const deleteListing = useCallback(
    async (id) => {
      let alreadyDeleting = false;
      setDeletingIds((current) => {
        if (current.has(id)) {
          alreadyDeleting = true;
          return current;
        }
        const next = new Set(current);
        next.add(id);
        return next;
      });
      if (alreadyDeleting) return;
      try {
        await deleteHostAccommodation(id);
        if (mountedRef.current) removeListing(id);
      } catch (err) {
        // A 404 means the listing is already gone (deleted elsewhere); treat
        // it as success so the card disappears instead of getting stuck.
        if (err?.status === 404) {
          if (mountedRef.current) removeListing(id);
          return;
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setDeletingIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }
      }
    },
    [removeListing],
  );

  const value = useMemo(
    () => ({
      listings: items,
      loaded,
      loading,
      refreshing,
      error,
      deletingIds,
      refresh,
      upsertListing,
      removeListing,
      createListing,
      saveListing,
      publishListing,
      deleteListing,
    }),
    [
      items,
      loaded,
      loading,
      refreshing,
      error,
      deletingIds,
      refresh,
      upsertListing,
      removeListing,
      createListing,
      saveListing,
      publishListing,
      deleteListing,
    ],
  );

  return <HostListingsContext.Provider value={value}>{children}</HostListingsContext.Provider>;
}

export function useHostListings() {
  const context = useContext(HostListingsContext);
  if (!context) {
    throw new Error("useHostListings must be used inside HostListingsProvider");
  }
  return context;
}
