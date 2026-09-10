import { Base_URL, TestGuestAuth_URL } from "../config";

export const isTestGuestToken = (token) =>
  Boolean(TestGuestAuth_URL && token?.startsWith("test_session_"));

const testGuestRequest = async (path, options = {}) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const response = await fetch(`${TestGuestAuth_URL}/test-auth${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed");
    error.status = response.status;
    // Machine-readable reason (calendar routes) so the UI can localize it.
    if (typeof data.code === "string") error.code = data.code;
    // Full error body: 409s from the reservations routes carry the calendar
    // conflicts or the reservation's current state so the UI can show them.
    error.data = data;
    throw error;
  }
  return data;
};

export const getGuestProfile = () => testGuestRequest("/me");
export const activateGuestHostMode = () =>
  testGuestRequest("/host-activation", { method: "POST" });
export const switchGuestMode = (mode) =>
  testGuestRequest("/mode", {
    method: "PATCH",
    body: JSON.stringify({ mode }),
  });
export const updateGuestProfile = (profile) =>
  testGuestRequest("/me", { method: "PATCH", body: JSON.stringify(profile) });
export const changeGuestPassword = (payload) =>
  testGuestRequest("/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const logoutTestGuest = (token) =>
  fetch(`${TestGuestAuth_URL}/test-auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
export const getGuestFavorites = () => testGuestRequest("/favorites");
export const addGuestFavorite = (accommodationId) =>
  testGuestRequest("/favorites", {
    method: "POST",
    body: JSON.stringify({ accommodationId }),
  });
export const removeGuestFavorite = (accommodationId) =>
  testGuestRequest(`/favorites/${encodeURIComponent(accommodationId)}`, {
    method: "DELETE",
  });
export const getAccommodation = async (accommodationId) => {
  const response = await fetch(
    `${Base_URL}/accommodation/${encodeURIComponent(accommodationId)}`,
  );
  if (!response.ok) throw new Error("Accommodation unavailable");
  return response.json();
};

export const listHostAccommodations = () => testGuestRequest("/host-accommodations");
export const createHostAccommodation = () => testGuestRequest("/host-accommodations", { method: "POST" });
export const getHostAccommodation = (id) => testGuestRequest(`/host-accommodations/${encodeURIComponent(id)}`);
export const updateHostAccommodation = (id, data) => testGuestRequest(`/host-accommodations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ data }) });
export const deleteHostAccommodation = (id) => testGuestRequest(`/host-accommodations/${encodeURIComponent(id)}`, { method: "DELETE" });
export const publishHostAccommodation = (id) => testGuestRequest(`/host-accommodations/${encodeURIComponent(id)}/publish`, { method: "POST" });

export const announceFavoritesChanged = (favorites) => {
  window.dispatchEvent(
    new CustomEvent("putko:favorites-changed", { detail: favorites }),
  );
};
// Per-property availability (manual blocks + iCal feed status). Every
// mutation returns the full calendar snapshot for that property.
const calendarPath = (id, suffix = "") =>
  `/host-accommodations/${encodeURIComponent(id)}/calendar${suffix}`;
export const getHostCalendar = (id) => testGuestRequest(calendarPath(id));
export const blockHostCalendarRange = (id, range) =>
  testGuestRequest(calendarPath(id, "/blocks"), { method: "POST", body: JSON.stringify(range) });
export const unblockHostCalendarRange = (id, range) =>
  testGuestRequest(calendarPath(id, "/unblock"), { method: "POST", body: JSON.stringify(range) });
export const addHostCalendarFeed = (id, feed) =>
  testGuestRequest(calendarPath(id, "/feeds"), { method: "POST", body: JSON.stringify(feed) });
export const updateHostCalendarFeed = (id, feedId, patch) =>
  testGuestRequest(calendarPath(id, `/feeds/${encodeURIComponent(feedId)}`), {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
export const removeHostCalendarFeed = (id, feedId) =>
  testGuestRequest(calendarPath(id, `/feeds/${encodeURIComponent(feedId)}`), { method: "DELETE" });
export const setHostCalendarMode = (id, calendarChoice) =>
  testGuestRequest(`${calendarPath(id)}/mode`, { method: "POST", body: JSON.stringify({ calendarChoice }) });
export const fetchHostCalendarFeed = (id, feedId) =>
  testGuestRequest(calendarPath(id, `/feeds/${encodeURIComponent(feedId)}/fetch`), { method: "POST" });

// Reservations (development Host workspace). Every call is scoped to the
// authenticated host on the server; ids are never trusted for ownership.
export const listHostReservations = () => testGuestRequest("/host-reservations");
export const getHostReservation = (id) =>
  testGuestRequest(`/host-reservations/${encodeURIComponent(id)}`);
// `action` is accept | decline | cancel; the server rejects anything else and
// any transition its allowed-transition map does not list.
export const transitionHostReservation = (id, action, { note } = {}) =>
  testGuestRequest(`/host-reservations/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
  });
export const createHostReservationFixtures = (accommodationId) =>
  testGuestRequest("/host-reservations/fixtures", {
    method: "POST",
    body: JSON.stringify({ accommodationId }),
  });
