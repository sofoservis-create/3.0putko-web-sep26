/**
 * Authenticated fetch for the money-handling endpoints.
 *
 * The payment, cancellation, receipt and DAC7 routes used to be open; they now
 * require either a bearer token (guest / host / admin) or the booking's own
 * capability token. This wrapper attaches whichever is available so callers do
 * not each reinvent it — and, more importantly, do not each forget it.
 *
 * Reservation tokens are issued once, when the booking is created, and are the
 * only proof an anonymous guest has that a booking is theirs.
 */

const TOKEN_STORE = "reservationTokens";

/** The logged-in user's bearer token, if there is one. */
export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

/** Remember the capability token handed back when a reservation is created. */
export const rememberReservationToken = (reservationId, token) => {
  if (typeof window === "undefined" || !reservationId || !token) return;

  try {
    const store = JSON.parse(localStorage.getItem(TOKEN_STORE) || "{}");
    store[reservationId] = token;
    localStorage.setItem(TOKEN_STORE, JSON.stringify(store));
  } catch {
    // A corrupted store must not break checkout — start a fresh one.
    localStorage.setItem(TOKEN_STORE, JSON.stringify({ [reservationId]: token }));
  }
};

/** The capability token for a booking, if this browser created it. */
export const getReservationToken = (reservationId) => {
  if (typeof window === "undefined" || !reservationId) return null;

  try {
    return JSON.parse(localStorage.getItem(TOKEN_STORE) || "{}")[reservationId] || null;
  } catch {
    return null;
  }
};

/**
 * fetch() with credentials attached.
 *
 * @param {string} url
 * @param {object} options            standard fetch options
 * @param {string} options.reservationId  attaches that booking's capability token
 */
export const apiFetch = async (url, options = {}) => {
  const { reservationId, headers = {}, ...rest } = options;

  const merged = { ...headers };

  const bearer = getAuthToken();
  if (bearer) merged.Authorization = `Bearer ${bearer}`;

  const reservationToken = getReservationToken(reservationId);
  if (reservationToken) merged["X-Reservation-Token"] = reservationToken;

  return fetch(url, { ...rest, headers: merged });
};

/**
 * A URL with the reservation token in the query string, for links the browser
 * follows directly (a PDF download cannot carry a custom header).
 */
export const withReservationToken = (url, reservationId) => {
  const token = getReservationToken(reservationId);
  if (!token) return url;

  return `${url}${url.includes("?") ? "&" : "?"}reservationToken=${encodeURIComponent(token)}`;
};

export default apiFetch;
