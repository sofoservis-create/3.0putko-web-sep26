/**
 * Calendar sync client — shared by the sidebar Synchronization page and the
 * add-accommodation form.
 *
 * Both screens edit the same list of iCal feeds, so the row shape, the
 * validation and the save/sync calls live here rather than being written twice
 * and drifting apart.
 *
 * The two differ only in WHEN they can talk to the server. The Synchronization
 * page always has a listing id and saves on demand. The add form has no id
 * until the listing is created, so its rows are held locally, autosaved with
 * the rest of the page, and pushed immediately after the save — never before,
 * and never in a way that can fail the save.
 */

const BASE = () => process.env.NEXT_PUBLIC_BASE_URL;

// Rows are edited before they have a server _id, so the list needs a key that
// exists from the moment "add another calendar" is clicked. An array index
// would re-key every row on a delete and move focus to the wrong input.
let localRowSeq = 0;

export const makeRow = (feed = {}) => ({
  localId: `row-${++localRowSeq}`,
  _id: feed._id || null,
  label: feed.label || "",
  url: feed.url || "",
  // Server-recorded sync history. The Synchronization page renders it as the
  // row's status line; the add form ignores it. Carried on every row either
  // way, so a row that moves between the two screens keeps its history.
  lastSyncAt: feed.lastSyncAt || null,
  lastSyncStatus: feed.lastSyncStatus || "never",
  lastSyncError: feed.lastSyncError || "",
  lastImportedCount: feed.lastImportedCount || 0,
});

/**
 * Build the feed list for a listing being edited.
 * A listing connected before multi-calendar existed has only the legacy `url`,
 * so it is lifted into the list as a single unnamed row rather than being shown
 * as "no calendars connected".
 */
export const rowsForAccommodation = (accommodation) => {
  if (!accommodation) return [makeRow()];
  const feeds = accommodation.calendarSync || [];
  if (feeds.length) return feeds.map(makeRow);
  if (accommodation.url) return [makeRow({ url: accommodation.url })];
  return [makeRow()];
};

/**
 * The feeds actually stored on a listing, legacy `url` included.
 *
 * Distinct from the editable rows on purpose: the export panel, the import
 * cards and the "disconnect everything" button key off what the SERVER holds,
 * not off what the host is currently typing. Keying them off the rows made the
 * panel pop open on the first keystroke, offering links for a calendar that was
 * not connected yet.
 */
export const savedFeedsOf = (accommodation) => {
  if (!accommodation) return [];
  if ((accommodation.calendarSync || []).length) return accommodation.calendarSync;
  if (accommodation.url) return [{ _id: null, url: accommodation.url, label: "" }];
  return [];
};

export const withProtocol = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const isValidUrl = (value) => {
  const candidate = withProtocol(value);
  if (!candidate) return false;
  try {
    new URL(candidate);
    return true;
  } catch {
    return false;
  }
};

/** Rows the host actually filled in. A blank row left behind is not a feed. */
export const filledRows = (rows) => (rows || []).filter((row) => row.url.trim());

/**
 * Validate the filled rows in one pass, so the host fixes all of them together
 * rather than discovering them one save at a time.
 * @returns {{[localId: string]: string}}
 */
export const validateRows = (rows, message) => {
  const errors = {};
  filledRows(rows).forEach((row) => {
    if (!isValidUrl(row.url)) errors[row.localId] = message;
  });
  return errors;
};

/** Replace a listing's feed list. Returns the saved `calendarSync` array. */
export const saveFeeds = async (accommodationId, rows) => {
  const response = await fetch(`${BASE()}/accommodation/${accommodationId}/calendar-sync`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      feeds: filledRows(rows).map((row) => ({
        _id: row._id || undefined,
        label: row.label,
        url: withProtocol(row.url),
      })),
    }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to save calendars");
  return result.calendarSync || [];
};

const fetchAirbnbBookings = async (id, token) => {
  const response = await fetch(`${BASE()}/calendar/${id}/${token}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to fetch bookings");
  }
  const data = await response.json();
  return data.bookings || [];
};

const fetchGenericBookings = async (fullUrl) => {
  const response = await fetch(`${BASE()}/calendar?url=${encodeURIComponent(fullUrl)}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to fetch bookings");
  }
  const data = await response.json();
  return data.bookings || [];
};

const formatDate = (date) => {
  const d = new Date(date);
  let month = `${d.getMonth() + 1}`;
  let day = `${d.getDate()}`;
  const year = d.getFullYear();

  if (month.length < 2) month = `0${month}`;
  if (day.length < 2) day = `0${day}`;

  return [year, month, day].join("-");
};

/**
 * Push one feed's bookings onto the occupancy calendar.
 *
 * `calendarSyncId` tags every row with the feed it came from, so removing one
 * calendar later takes only its own dates and leaves the other feeds — and the
 * host's own manual blocks — untouched.
 */
const importBookings = async (accommodationId, bookings, calendarSyncId) => {
  const requests = bookings.map((booking) => {
    if (!booking.start || !booking.end) return null;

    const startDate = formatDate(booking.start);

    // ICS DTEND is exclusive → subtract 1 day to match the preview
    const endDateObj = new Date(booking.end);
    endDateObj.setDate(endDateObj.getDate() - 1);
    const endDate = formatDate(endDateObj);

    return fetch(`${BASE()}/accommodation/${accommodationId}/occupancyCalendar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        guestName: booking.summary || "Guest",
        status: "booked",
        source: "ics",
        calendarSyncId: calendarSyncId || undefined,
      }),
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      // A 409 means every night in that range was already occupied — normal on
      // a re-sync, not a failure worth reporting to the host.
      if (!response.ok && response.status !== 409) {
        throw new Error(result.message || "Failed to update booking");
      }
      return result;
    });
  });

  await Promise.all(requests.filter(Boolean));
};

/** Pull one calendar and import what it holds. Returns the imported count. */
export const syncOneFeed = async (accommodationId, feed) => {
  const fullUrl = withProtocol(feed.url);
  const urlParts = new URL(fullUrl);
  const params = new URLSearchParams(urlParts.search);

  const id = urlParts.pathname.split("/").pop().split(".")[0]; // id before .ics
  const token = params.get("s");
  const host = urlParts.hostname || "";
  const isAirbnbStyle = Boolean(id && token && host.includes("airbnb"));

  const bookings = isAirbnbStyle
    ? await fetchAirbnbBookings(id, token)
    : await fetchGenericBookings(fullUrl);

  if (Array.isArray(bookings) && bookings.length > 0) {
    await importBookings(accommodationId, bookings, feed._id);
  }
  return Array.isArray(bookings) ? bookings.length : 0;
};

/** Record how a feed's sync went, for the overview's status column. */
export const reportSyncStatus = async (accommodationId, feedId, payload) => {
  if (!feedId) return;
  try {
    await fetch(`${BASE()}/accommodation/${accommodationId}/calendar-sync/${feedId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Cosmetic — a failure here must not make a successful import look failed.
    console.error("Could not record sync status:", err);
  }
};

/**
 * Sync every feed on a listing, one at a time.
 *
 * Each feed is isolated: a dead Booking.com link must not stop Airbnb from
 * importing, so a failure is recorded against that row and the loop carries on.
 *
 * @returns {{outcomes: object, okCount: number}}
 */
export const syncAllFeeds = async (accommodationId, rows) => {
  const outcomes = {};
  let okCount = 0;

  for (const row of rows) {
    try {
      const count = await syncOneFeed(accommodationId, row);
      outcomes[row.localId] = { status: "ok", count };
      okCount += 1;
      await reportSyncStatus(accommodationId, row._id, { status: "ok", importedCount: count });
    } catch (err) {
      console.error("Error syncing feed:", row.url, err);
      outcomes[row.localId] = { status: "error", message: err.message };
      await reportSyncStatus(accommodationId, row._id, { status: "error", error: err.message });
    }
  }

  return { outcomes, okCount };
};
