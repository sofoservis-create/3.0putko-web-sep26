// Helpers shared by the Host workspace stores (listings, reservations,
// messages). They keep list refreshes cheap and side-effect free:
//
// - `isFresh` lets a background refresh be skipped when the last successful
//   load is recent, so switching between Today / Listings / Reservations /
//   Messages does not re-download the same lists every time.
// - `sameSnapshot` keeps the previous array identity when the server returned
//   identical data, so downstream effects (Today's dashboard re-aggregation,
//   memoised selectors) do not fire for a no-op refresh.

/** Default freshness window for background refreshes triggered by navigation. */
export const DEFAULT_MAX_AGE_MS = 15_000;

export const isFresh = (loadedAt, maxAge, now = Date.now()) => {
  if (!loadedAt || !Number.isFinite(maxAge) || maxAge <= 0) return false;
  return now - loadedAt < maxAge;
};

const stableStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

/**
 * Returns `previous` when `next` serialises to the same JSON, otherwise
 * `next`. Arrays of plain server objects only; anything unserialisable is
 * treated as changed.
 */
export const sameSnapshot = (previous, next) => {
  if (previous === next) return previous;
  if (!Array.isArray(previous) || !Array.isArray(next)) return next;
  if (previous.length !== next.length) return next;
  const a = stableStringify(previous);
  const b = stableStringify(next);
  if (a === null || b === null) return next;
  return a === b ? previous : next;
};

/**
 * Deduplicates concurrent loads of the same keyed resource (one reservation,
 * one conversation, one property calendar). The first caller starts the
 * request; every caller that arrives while it is in flight receives the same
 * promise. Rejections propagate to every caller.
 */
export const createKeyedInFlight = () => {
  const inFlight = new Map();
  return (key, start) => {
    const existing = inFlight.get(key);
    if (existing) return existing;
    let started;
    try {
      started = Promise.resolve(start());
    } catch (error) {
      started = Promise.reject(error);
    }
    const request = started.finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
    inFlight.set(key, request);
    return request;
  };
};
