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
  createHostReservationFixtures,
  getHostReservation,
  listHostReservations,
  transitionHostReservation,
} from "../../utlis/guestAccountApi";
import { upsertReservation } from "./reservationModel";
import { createKeyedInFlight, isFresh, sameSnapshot } from "../hostStoreUtils";

// One shared reservations state for the Host workspace. The list, the detail
// screen and the navigation badge all read from here, so an accept/decline
// in one place is visible everywhere without a reload. The server owns the
// lifecycle: every transition stores the server's response (which carries
// the new `stage` and `actions`), and `refresh` re-fetches the full list.
const HostReservationsContext = createContext(null);

const fallbackError = (message) => {
  const error = new Error(message);
  return error;
};

export function HostReservationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [today, setToday] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  // reservation id → action currently being submitted (duplicate-submit guard).
  const [pendingActions, setPendingActions] = useState(() => new Map());
  const [fixturesPending, setFixturesPending] = useState(false);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(null);
  const loadedRef = useRef(false);
  const pendingRef = useRef(new Map());
  // Reservations returned by a transition while a list fetch was in flight.
  // They are replayed on top of the fetch result so an older snapshot cannot
  // undo a newer local state (e.g. show an accepted stay as a request again).
  const pendingUpsertsRef = useRef([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadedAtRef = useRef(0);
  const loadOneInFlight = useRef(createKeyedInFlight());

  /**
   * Re-fetch the list. `background` keeps the current items on screen;
   * `maxAge` (ms) skips the request when the last successful load is more
   * recent. A refresh already in flight is shared, never doubled.
   */
  const refresh = useCallback(({ background = false, maxAge = 0 } = {}) => {
    if (inFlightRef.current) return inFlightRef.current;
    if (background && isFresh(loadedAtRef.current, maxAge)) return Promise.resolve(null);
    const showAsBackground = background && loadedRef.current;
    if (showAsBackground) setRefreshing(true);
    else setLoading(true);
    setError(null);

    pendingUpsertsRef.current = [];
    const request = listHostReservations()
      .then((result) => {
        if (!mountedRef.current) return [];
        let next = Array.isArray(result?.reservations) ? result.reservations : [];
        for (const item of pendingUpsertsRef.current) next = upsertReservation(next, item);
        const snapshot = next;
        setItems((current) => sameSnapshot(current, snapshot));
        if (typeof result?.today === "string") setToday(result.today);
        loadedAtRef.current = Date.now();
        loadedRef.current = true;
        setLoaded(true);
        return next;
      })
      .catch((err) => {
        if (!mountedRef.current) return [];
        setError(err instanceof Error ? err : fallbackError("Failed to load reservations"));
        return null;
      })
      .finally(() => {
        inFlightRef.current = null;
        pendingUpsertsRef.current = [];
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

  const storeReservation = useCallback((reservation) => {
    if (!reservation?.id) return;
    if (inFlightRef.current) pendingUpsertsRef.current.push(reservation);
    setItems((current) => upsertReservation(current, reservation));
  }, []);

  /**
   * Fetch one reservation from the server (deep links open the detail before
   * the list has loaded; a 403/404 is surfaced through the error).
   */
  const loadOne = useCallback(
    async (id) => {
      try {
        // Detail + list mounting together (deep link) share one GET per id.
        const result = await loadOneInFlight.current(id, () => getHostReservation(id));
        if (!mountedRef.current) return { ok: false, ignored: true };
        if (typeof result?.today === "string") setToday(result.today);
        storeReservation(result?.reservation);
        return { ok: true, reservation: result?.reservation ?? null };
      } catch (err) {
        return { ok: false, error: err };
      }
    },
    [storeReservation],
  );

  const setPending = useCallback((id, action) => {
    if (action) pendingRef.current.set(id, action);
    else pendingRef.current.delete(id);
    setPendingActions(new Map(pendingRef.current));
  }, []);

  /**
   * Run accept | decline | cancel. Resolves to `{ ok: true, reservation }` or
   * `{ ok: false, error, conflicts?, reservation? }`; never throws. A second
   * call for the same reservation while one is in flight is ignored
   * (`{ ok: false, ignored: true }`). When the server reports that the
   * reservation already moved on (409 invalidTransition) its current state
   * is stored so the screen shows the truth instead of a stale button.
   */
  const transition = useCallback(
    async (id, action, { note } = {}) => {
      if (pendingRef.current.has(id)) return { ok: false, ignored: true };
      setPending(id, action);
      try {
        const result = await transitionHostReservation(id, action, { note });
        if (!mountedRef.current) return { ok: false, ignored: true };
        if (typeof result?.today === "string") setToday(result.today);
        storeReservation(result?.reservation);
        return { ok: true, reservation: result?.reservation ?? null };
      } catch (err) {
        if (!mountedRef.current) return { ok: false, ignored: true };
        const body = err?.data ?? {};
        if (body.reservation?.id) storeReservation(body.reservation);
        return {
          ok: false,
          error: err,
          conflicts: Array.isArray(body.conflicts) ? body.conflicts : [],
          reservation: body.reservation ?? null,
        };
      } finally {
        if (mountedRef.current) setPending(id, null);
      }
    },
    [setPending, storeReservation],
  );

  /** Development helper: create sample requests for one of the host's listings. */
  const createFixtures = useCallback(
    async (accommodationId) => {
      if (fixturesPending) return { ok: false, ignored: true };
      setFixturesPending(true);
      try {
        const result = await createHostReservationFixtures(accommodationId);
        if (!mountedRef.current) return { ok: false, ignored: true };
        if (typeof result?.today === "string") setToday(result.today);
        const created = Array.isArray(result?.reservations) ? result.reservations : [];
        for (const item of created) storeReservation(item);
        return { ok: true, created, skipped: Array.isArray(result?.skipped) ? result.skipped : [] };
      } catch (err) {
        return { ok: false, error: err };
      } finally {
        if (mountedRef.current) setFixturesPending(false);
      }
    },
    [fixturesPending, storeReservation],
  );

  const value = useMemo(
    () => ({
      reservations: items,
      today,
      loaded,
      loading,
      refreshing,
      error,
      pendingActions,
      fixturesPending,
      refresh,
      loadOne,
      transition,
      createFixtures,
    }),
    [items, today, loaded, loading, refreshing, error, pendingActions, fixturesPending, refresh, loadOne, transition, createFixtures],
  );

  return <HostReservationsContext.Provider value={value}>{children}</HostReservationsContext.Provider>;
}

export function useHostReservations() {
  const context = useContext(HostReservationsContext);
  if (!context) {
    throw new Error("useHostReservations must be used within a HostReservationsProvider");
  }
  return context;
}
