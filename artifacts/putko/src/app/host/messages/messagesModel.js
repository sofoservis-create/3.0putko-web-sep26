// Pure helpers for the Host Messages screens: thread merging with the local
// outbox, ordering, filtering, and localized copy. No React, no I/O.

const t = (language, en, sk) => (language === "en" ? en : sk);

/** Client-side idempotency key for one send; reused verbatim on retry. */
export const newClientKey = () =>
  `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Newest activity first; ties keep the server order. */
export const sortConversations = (list) =>
  [...list].sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));

export const upsertConversation = (list, conversation) => {
  if (!conversation?.id) return list;
  const index = list.findIndex((item) => item.id === conversation.id);
  const next = index === -1 ? [...list, conversation] : list.map((item, i) => (i === index ? conversation : item));
  return sortConversations(next);
};

export const filterConversations = (list, { property = null } = {}) =>
  property ? list.filter((item) => item.accommodationId === property) : list;

export const unreadTotal = (list) =>
  list.reduce((sum, item) => sum + (Number.isFinite(item.unreadCount) ? item.unreadCount : 0), 0);

/**
 * The thread as the screen renders it: stored messages first, then local
 * outbox entries (`sending` / `failed`) that the server has not confirmed.
 * An outbox entry whose clientKey already came back from the server is
 * dropped so a retry that actually succeeded is never shown twice.
 */
export const mergeThread = (messages, outbox) => {
  const stored = Array.isArray(messages) ? messages : [];
  const knownKeys = new Set(stored.map((message) => message.clientKey).filter(Boolean));
  const local = (Array.isArray(outbox) ? outbox : [])
    .filter((entry) => !knownKeys.has(entry.clientKey))
    .map((entry) => ({
      id: `local:${entry.clientKey}`,
      clientKey: entry.clientKey,
      senderRole: "host",
      mine: true,
      body: entry.body,
      createdAt: entry.createdAt,
      state: entry.status, // sending | failed
      permanent: Boolean(entry.permanent),
      error: entry.error ?? null,
      local: true,
    }));
  return [...stored, ...local];
};

/* ------------------------------------------------------------------------ */
/* Outbox persistence                                                        */
/* ------------------------------------------------------------------------ */

/**
 * Errors from the API are Error instances; storage needs plain data. Only the
 * fields the UI reads survive (`code`, `status`, `message`).
 */
export const serializeOutboxError = (error) => {
  if (!error) return null;
  return {
    code: typeof error.code === "string" ? error.code : null,
    status: Number.isFinite(error.status) ? error.status : null,
    message: typeof error.message === "string" ? error.message : "",
  };
};

/** True for API errors a retry with the same text can never fix. */
export const isPermanentSendError = (error) =>
  error?.status === 400 || error?.status === 403 || error?.status === 404;

/**
 * Outbox entries as written to storage. An entry still `sending` when the
 * page unloads is stored as `failed`: the host sees "Not sent" + Retry after
 * reload, and if the request did reach the server the retry's identical
 * clientKey makes the server return the existing message instead of a copy.
 */
export const serializeOutbox = (entries) =>
  (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry.clientKey === "string" && typeof entry.body === "string")
    .map((entry) => ({
      clientKey: entry.clientKey,
      body: entry.body,
      createdAt: entry.createdAt,
      status: "failed",
      permanent: Boolean(entry.permanent),
      error: serializeOutboxError(entry.error),
    }));

/** Parse stored entries; anything malformed is dropped rather than trusted. */
export const parseOutbox = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.clientKey === "string" && typeof entry.body === "string" && entry.body.trim())
      .map((entry) => ({
        clientKey: entry.clientKey,
        body: entry.body,
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
        status: "failed",
        permanent: Boolean(entry.permanent),
        error: entry.error && typeof entry.error === "object" ? entry.error : null,
      }));
  } catch {
    return [];
  }
};

/** Drop outbox entries the server already confirmed (same clientKey). */
export const pruneOutbox = (entries, messages) => {
  const known = new Set((Array.isArray(messages) ? messages : []).map((message) => message.clientKey).filter(Boolean));
  return (Array.isArray(entries) ? entries : []).filter((entry) => !known.has(entry.clientKey));
};

/** Insert or replace a stored message by id (or by clientKey for a retry). */
export const upsertMessage = (messages, message) => {
  if (!message?.id) return messages;
  const index = messages.findIndex(
    (item) => item.id === message.id || (message.clientKey && item.clientKey === message.clientKey),
  );
  if (index === -1) return [...messages, message];
  return messages.map((item, i) => (i === index ? message : item));
};

/* ------------------------------------------------------------------------ */
/* Copy                                                                      */
/* ------------------------------------------------------------------------ */

const MESSAGE_ERRORS = {
  emptyMessage: { en: "Write a message first.", sk: "Najprv napíšte správu." },
  messageTooLong: { en: "The message is too long (max 4000 characters).", sk: "Správa je príliš dlhá (max. 4000 znakov)." },
  forbidden: { en: "You are not a participant of this conversation.", sk: "Nie ste účastníkom tejto konverzácie." },
  notFound: { en: "This conversation no longer exists.", sk: "Táto konverzácia už neexistuje." },
};

/** Localized text for an API error; falls back to a generic retry message. */
export const messageErrorText = (error, language) => {
  const code = error?.code;
  if (code && MESSAGE_ERRORS[code]) return MESSAGE_ERRORS[code][language === "en" ? "en" : "sk"];
  if (error?.status === 401) return t(language, "Your session has expired. Please log in again.", "Platnosť relácie vypršala. Prihláste sa znova.");
  if (error?.status === 0 || error?.name === "TypeError" || /fetch/i.test(error?.message || "")) {
    return t(language, "No connection. Check your network and try again.", "Bez pripojenia. Skontrolujte sieť a skúste to znova.");
  }
  return t(language, "Something went wrong. Please try again.", "Niečo sa pokazilo. Skúste to znova.");
};

export const deliveryLabel = (state, language) => {
  switch (state) {
    case "sending":
      return t(language, "Sending…", "Odosiela sa…");
    case "failed":
      return t(language, "Not sent", "Neodoslané");
    case "read":
      return t(language, "Read", "Prečítané");
    case "sent":
    default:
      return t(language, "Sent", "Odoslané");
  }
};

export const unreadLabel = (count, language) => {
  if (language === "en") return count === 1 ? "1 new message" : `${count} new messages`;
  if (count === 1) return "1 nová správa";
  if (count >= 2 && count <= 4) return `${count} nové správy`;
  return `${count} nových správ`;
};

/* ------------------------------------------------------------------------ */
/* Time formatting                                                           */
/* ------------------------------------------------------------------------ */

const locale = (language) => (language === "en" ? "en-GB" : "sk-SK");

const isoDay = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Compact timestamp for lists and bubbles: time of day for today, weekday +
 * time within the last week, otherwise a short date. `now` is injectable
 * for tests.
 */
export const formatMessageTime = (iso, language, now = new Date()) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(locale(language), { hour: "2-digit", minute: "2-digit" });
  if (isoDay(date) === isoDay(now)) return time;
  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (ageDays < 6 && ageDays > 0) {
    return `${date.toLocaleDateString(locale(language), { weekday: "short" })} ${time}`;
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(locale(language), {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

/** Day separator inside a thread ("Today", "Yesterday", or a full date). */
export const formatDayLabel = (iso, language, now = new Date()) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = isoDay(date);
  if (day === isoDay(now)) return t(language, "Today", "Dnes");
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day === isoDay(yesterday)) return t(language, "Yesterday", "Včera");
  return date.toLocaleDateString(locale(language), { weekday: "long", day: "numeric", month: "long" });
};

/** Groups a merged thread into `[{ day, label, messages }]` in order. */
export const groupByDay = (messages, language, now = new Date()) => {
  const groups = [];
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const day = Number.isNaN(date.getTime()) ? "unknown" : isoDay(date);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.messages.push(message);
    else groups.push({ day, label: formatDayLabel(message.createdAt, language, now), messages: [message] });
  }
  return groups;
};

const shortRange = (checkIn, checkOut, language) => {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const fmt = (date, withMonth) =>
    date.toLocaleDateString(locale(language), withMonth ? { day: "numeric", month: "short" } : { day: "numeric" });
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return `${fmt(start, !sameMonth)} – ${fmt(end, true)}`;
};

/** "Chata Lúčky · 21 – 24 Sep" or just the listing when there is no stay. */
export const conversationContext = (conversation, language) => {
  const listing = conversation?.listing?.name || t(language, "Untitled listing", "Ponuka bez názvu");
  const stay = conversation?.reservation;
  if (!stay?.checkIn || !stay?.checkOut) return listing;
  return `${listing} · ${shortRange(stay.checkIn, stay.checkOut, language)}`;
};
