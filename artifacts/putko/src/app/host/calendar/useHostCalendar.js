import { useCallback, useEffect, useRef, useState } from "react";
import {
  addHostCalendarFeed,
  blockHostCalendarRange,
  fetchHostCalendarFeed,
  getHostCalendar,
  removeHostCalendarFeed,
  setHostCalendarMode,
  unblockHostCalendarRange,
  updateHostCalendarFeed,
} from "../../utlis/guestAccountApi";
import { useHostListings } from "../HostListingsContext";
import { createKeyedInFlight } from "../hostStoreUtils";

// Module-level: a calendar page remounting (or two instances) for the same
// property while its GET is still running shares that one request.
const calendarLoads = createKeyedInFlight();

/**
 * Availability state for exactly one property. The hook is bound to the
 * `listingId` it was created with: every async continuation checks that the
 * page still shows that property and is still mounted before touching state,
 * so switching properties can never paint one property's dates into another.
 *
 * Phases: loading → ready | error | forbidden | notFound. Mutations keep the
 * last snapshot on screen and replace it with the server's answer.
 */
export function useHostCalendar(listingId) {
  const { upsertListing } = useHostListings();
  const [phase, setPhase] = useState("loading");
  const [snapshot, setSnapshot] = useState(null);
  const [loadError, setLoadError] = useState(null);
  // Range action in flight: "block" | "unblock" | null.
  const [rangeAction, setRangeAction] = useState(null);
  const [addingFeed, setAddingFeed] = useState(false);
  // feedId → "fetch" | "save" | "remove"
  const [feedActions, setFeedActions] = useState({});
  // Mode switch in flight: "none" | "connect" | null.
  const [modeAction, setModeAction] = useState(null);

  const boundIdRef = useRef(listingId);
  const mountedRef = useRef(true);
  useEffect(() => {
    boundIdRef.current = listingId;
    return () => {
      mountedRef.current = false;
    };
  }, [listingId]);

  const isCurrent = useCallback((id) => mountedRef.current && boundIdRef.current === id, []);

  const applySnapshot = useCallback(
    (id, next, { syncListing = false } = {}) => {
      if (!isCurrent(id)) return;
      setSnapshot(next);
      setPhase("ready");
      // Feed changes rewrite the accommodation payload; hand the server copy
      // to the shared store so Listings and the editor stay aligned.
      if (syncListing && next?.listing) upsertListing(next.listing);
    },
    [isCurrent, upsertListing],
  );

  const load = useCallback(async () => {
    const id = listingId;
    if (!id) return;
    setPhase("loading");
    setLoadError(null);
    try {
      const next = await calendarLoads(id, () => getHostCalendar(id));
      applySnapshot(id, next);
    } catch (error) {
      if (!isCurrent(id)) return;
      setLoadError(error);
      setPhase(error?.status === 403 ? "forbidden" : error?.status === 404 ? "notFound" : "error");
    }
  }, [listingId, applySnapshot, isCurrent]);

  useEffect(() => {
    load();
  }, [load]);

  const setFeedAction = useCallback((feedId, action) => {
    setFeedActions((current) => {
      const next = { ...current };
      if (action) next[feedId] = action;
      else delete next[feedId];
      return next;
    });
  }, []);

  /**
   * Runs one mutation with duplicate-submit protection. `lock` / `unlock`
   * flip the pending flag; the caller receives the error to show inline.
   */
  const runRangeAction = useCallback(
    async (kind, request) => {
      const id = listingId;
      if (rangeAction) return { ok: false, ignored: true };
      setRangeAction(kind);
      try {
        const next = await request(id);
        applySnapshot(id, next);
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      } finally {
        if (isCurrent(id)) setRangeAction(null);
      }
    },
    [listingId, rangeAction, applySnapshot, isCurrent],
  );

  const blockRange = useCallback(
    (range, note) =>
      runRangeAction("block", (id) =>
        blockHostCalendarRange(id, { startDate: range.startDate, endDate: range.endDate, ...(note ? { note } : {}) }),
      ),
    [runRangeAction],
  );

  const unblockRange = useCallback(
    (range) =>
      runRangeAction("unblock", (id) =>
        unblockHostCalendarRange(id, { startDate: range.startDate, endDate: range.endDate }),
      ),
    [runRangeAction],
  );

  const fetchFeed = useCallback(
    async (feedId) => {
      const id = listingId;
      if (feedActions[feedId]) return { ok: false, ignored: true };
      setFeedAction(feedId, "fetch");
      try {
        const next = await fetchHostCalendarFeed(id, feedId);
        applySnapshot(id, next);
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      } finally {
        if (isCurrent(id)) setFeedAction(feedId, null);
      }
    },
    [listingId, feedActions, setFeedAction, applySnapshot, isCurrent],
  );

  /** Fetches the given feeds one after another; stops if the property changes. */
  const fetchEach = useCallback(
    async (feedIds) => {
      const id = listingId;
      for (const feedId of feedIds) {
        if (!isCurrent(id)) return;
        await fetchFeed(feedId);
      }
    },
    [listingId, isCurrent, fetchFeed],
  );

  const addFeed = useCallback(
    async (feed) => {
      const id = listingId;
      if (addingFeed) return { ok: false, ignored: true };
      setAddingFeed(true);
      let createdId = null;
      let reconnected = [];
      try {
        const wasPaused = snapshot?.calendarChoice !== "connect";
        const next = await addHostCalendarFeed(id, feed);
        createdId = next.feedId ?? null;
        // Adding a link reconnects a paused listing: its other links need a
        // fresh fetch too, since pausing cleared their imported dates.
        if (wasPaused) reconnected = (next.feeds ?? []).map((item) => item.id).filter((item) => item !== createdId);
        applySnapshot(id, next, { syncListing: true });
      } catch (error) {
        return { ok: false, error };
      } finally {
        if (isCurrent(id)) setAddingFeed(false);
      }
      // First fetch right away so the host sees a real status, not "never".
      if (createdId && isCurrent(id)) await fetchEach([createdId, ...reconnected]);
      return { ok: true, feedId: createdId };
    },
    [listingId, addingFeed, snapshot, applySnapshot, isCurrent, fetchEach],
  );

  /**
   * "Manual only" pauses connected calendars: links stay saved, imported
   * dates are released. "Connect" restores the links and fetches each one so
   * the calendar shows real, current dates instead of stale ones.
   */
  const setMode = useCallback(
    async (choice) => {
      const id = listingId;
      if (modeAction) return { ok: false, ignored: true };
      setModeAction(choice);
      let toFetch = [];
      try {
        const next = await setHostCalendarMode(id, choice);
        if (choice === "connect") toFetch = (next.feeds ?? []).map((feed) => feed.id);
        applySnapshot(id, next, { syncListing: true });
      } catch (error) {
        return { ok: false, error };
      } finally {
        if (isCurrent(id)) setModeAction(null);
      }
      if (isCurrent(id)) await fetchEach(toFetch);
      return { ok: true };
    },
    [listingId, modeAction, applySnapshot, isCurrent, fetchEach],
  );

  const updateFeed = useCallback(
    async (feedId, patch) => {
      const id = listingId;
      if (feedActions[feedId]) return { ok: false, ignored: true };
      setFeedAction(feedId, "save");
      let urlChanged = false;
      try {
        const before = snapshot?.feeds?.find((feed) => feed.id === feedId);
        const next = await updateHostCalendarFeed(id, feedId, patch);
        const after = next.feeds?.find((feed) => feed.id === feedId);
        urlChanged = Boolean(before && after && before.url !== after.url);
        applySnapshot(id, next, { syncListing: true });
      } catch (error) {
        return { ok: false, error };
      } finally {
        if (isCurrent(id)) setFeedAction(feedId, null);
      }
      if (urlChanged && isCurrent(id)) await fetchFeed(feedId);
      return { ok: true };
    },
    [listingId, feedActions, snapshot, setFeedAction, applySnapshot, isCurrent, fetchFeed],
  );

  const removeFeed = useCallback(
    async (feedId) => {
      const id = listingId;
      if (feedActions[feedId]) return { ok: false, ignored: true };
      setFeedAction(feedId, "remove");
      try {
        const next = await removeHostCalendarFeed(id, feedId);
        applySnapshot(id, next, { syncListing: true });
        return { ok: true };
      } catch (error) {
        // Already gone elsewhere: reload rather than leave a phantom card.
        if (error?.status === 404 && error?.code === "feedNotFound") {
          load();
          return { ok: true };
        }
        return { ok: false, error };
      } finally {
        if (isCurrent(id)) setFeedAction(feedId, null);
      }
    },
    [listingId, feedActions, setFeedAction, applySnapshot, isCurrent, load],
  );

  return {
    phase,
    snapshot,
    loadError,
    reload: load,
    rangeAction,
    blockRange,
    unblockRange,
    addingFeed,
    feedActions,
    addFeed,
    updateFeed,
    removeFeed,
    fetchFeed,
    modeAction,
    setMode,
  };
}
