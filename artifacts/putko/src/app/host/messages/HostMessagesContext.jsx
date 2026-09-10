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
  createHostMessageFixture,
  getHostConversation,
  listHostConversations,
  markHostConversationRead,
  sendHostMessage,
} from "../../utlis/guestAccountApi";
import {
  isPermanentSendError,
  newClientKey,
  parseOutbox,
  pruneOutbox,
  serializeOutbox,
  sortConversations,
  unreadTotal,
  upsertConversation,
  upsertMessage,
} from "./messagesModel";
import { createKeyedInFlight, isFresh, sameSnapshot } from "../hostStoreUtils";

/**
 * One shared messaging state for the Host workspace.
 *
 * - `conversations` is the host's thread list (drives the list screen and the
 *   navigation badge); `threads` caches opened threads by id.
 * - `outbox` holds messages the server has not confirmed yet, per thread:
 *   `sending` while the request is in flight, `failed` when it did not
 *   reach the server (`permanent: true` when the server rejected it and a
 *   retry with the same text cannot succeed). Every entry keeps its text and
 *   its clientKey so Retry re-sends exactly the same message and the server
 *   can de-duplicate. Failed entries are persisted in localStorage until the
 *   server confirms them or the host explicitly removes them, so a reload or
 *   a trip to another screen never loses unsent text.
 * - `drafts` keeps unsent composer text per thread; persisted the same way.
 *
 * There is no push transport: the thread screen polls while it is open.
 */
const HostMessagesContext = createContext(null);

const DRAFT_PREFIX = "putko:host-draft:";
const OUTBOX_PREFIX = "putko:host-outbox:";

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readStoredDraft = (id) => {
  try {
    return storage()?.getItem(`${DRAFT_PREFIX}${id}`) || "";
  } catch {
    return "";
  }
};

const writeStoredDraft = (id, text) => {
  try {
    if (text) storage()?.setItem(`${DRAFT_PREFIX}${id}`, text);
    else storage()?.removeItem(`${DRAFT_PREFIX}${id}`);
  } catch {
    /* storage unavailable: drafts still live in memory */
  }
};

const writeStoredOutbox = (id, entries) => {
  try {
    const serialized = serializeOutbox(entries);
    if (serialized.length) storage()?.setItem(`${OUTBOX_PREFIX}${id}`, JSON.stringify(serialized));
    else storage()?.removeItem(`${OUTBOX_PREFIX}${id}`);
  } catch {
    /* storage unavailable: the outbox still lives in memory */
  }
};

/** Every persisted outbox, keyed by conversation id. */
const readStoredOutboxes = () => {
  const result = new Map();
  try {
    const store = storage();
    if (!store) return result;
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key || !key.startsWith(OUTBOX_PREFIX)) continue;
      const entries = parseOutbox(store.getItem(key));
      if (entries.length) result.set(key.slice(OUTBOX_PREFIX.length), entries);
    }
  } catch {
    /* storage unavailable */
  }
  return result;
};

export function HostMessagesProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [today, setToday] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [threads, setThreads] = useState(() => new Map());
  const [outbox, setOutbox] = useState(() => readStoredOutboxes());
  const [drafts, setDrafts] = useState(() => new Map());
  const [fixturesPending, setFixturesPending] = useState(false);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(null);
  const loadedRef = useRef(false);
  const outboxRef = useRef(null);
  if (outboxRef.current === null) outboxRef.current = new Map(outbox);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const storeConversation = useCallback((conversation) => {
    if (!conversation?.id) return;
    setConversations((current) => upsertConversation(current, conversation));
  }, []);

  const loadedAtRef = useRef(0);
  const threadInFlight = useRef(createKeyedInFlight());

  /**
   * Re-fetch the conversation list. `background` keeps the current list on
   * screen; `maxAge` (ms) skips the request when the last successful load is
   * more recent. A refresh already in flight is shared, never doubled.
   */
  const refresh = useCallback(({ background = false, maxAge = 0 } = {}) => {
    if (inFlightRef.current) return inFlightRef.current;
    if (background && isFresh(loadedAtRef.current, maxAge)) return Promise.resolve(null);
    const showAsBackground = background && loadedRef.current;
    if (showAsBackground) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const request = listHostConversations()
      .then((result) => {
        if (!mountedRef.current) return [];
        const next = sortConversations(Array.isArray(result?.conversations) ? result.conversations : []);
        setConversations((current) => sameSnapshot(current, next));
        if (typeof result?.today === "string") setToday(result.today);
        loadedAtRef.current = Date.now();
        loadedRef.current = true;
        setLoaded(true);
        return next;
      })
      .catch((err) => {
        if (!mountedRef.current) return [];
        setError(err instanceof Error ? err : new Error("Failed to load conversations"));
        return null;
      })
      .finally(() => {
        inFlightRef.current = null;
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

  const setOutboxEntries = useCallback((id, updater) => {
    const current = outboxRef.current.get(id) ?? [];
    const next = updater(current);
    if (next === current) return;
    if (next.length === 0) outboxRef.current.delete(id);
    else outboxRef.current.set(id, next);
    writeStoredOutbox(id, next);
    setOutbox(new Map(outboxRef.current));
  }, []);

  const storeThread = useCallback(
    (result) => {
      const conversation = result?.conversation;
      if (!conversation?.id) return null;
      const messages = Array.isArray(result?.messages) ? result.messages : null;
      if (messages && outboxRef.current.has(conversation.id)) {
        // A message the server already has (same clientKey) is no longer unsent.
        setOutboxEntries(conversation.id, (list) => {
          const pruned = pruneOutbox(list, messages);
          return pruned.length === list.length ? list : pruned;
        });
      }
      setThreads((current) => {
        const next = new Map(current);
        const previous = current.get(conversation.id);
        next.set(conversation.id, {
          conversation,
          messages: messages ?? previous?.messages ?? [],
          loadedAt: Date.now(),
        });
        return next;
      });
      storeConversation(conversation);
      return conversation;
    },
    [setOutboxEntries, storeConversation],
  );

  /**
   * Fetch one thread from the server. Resolves to `{ ok: true, thread }` or
   * `{ ok: false, error }` (403/404 arrive as `error.status`); never throws.
   */
  const loadThread = useCallback(
    async (id) => {
      try {
        // Initial load, poll tick and a manual retry that overlap share one GET.
        const result = await threadInFlight.current(id, () => getHostConversation(id));
        if (!mountedRef.current) return { ok: false, ignored: true };
        if (typeof result?.today === "string") setToday(result.today);
        storeThread(result);
        return { ok: true, thread: result };
      } catch (err) {
        return { ok: false, error: err };
      }
    },
    [storeThread],
  );

  const performSend = useCallback(
    async (id, entry) => {
      setOutboxEntries(id, (list) =>
        list.some((item) => item.clientKey === entry.clientKey)
          ? list.map((item) =>
              item.clientKey === entry.clientKey ? { ...item, status: "sending", permanent: false, error: null } : item,
            )
          : [...list, { ...entry, status: "sending", permanent: false, error: null }],
      );
      try {
        const result = await sendHostMessage(id, { body: entry.body, clientKey: entry.clientKey });
        if (!mountedRef.current) return { ok: false, ignored: true };
        if (typeof result?.today === "string") setToday(result.today);
        const message = result?.message;
        setThreads((current) => {
          const next = new Map(current);
          const previous = current.get(id);
          next.set(id, {
            conversation: result?.conversation ?? previous?.conversation ?? null,
            messages: upsertMessage(previous?.messages ?? [], message),
            loadedAt: Date.now(),
          });
          return next;
        });
        if (result?.conversation) storeConversation(result.conversation);
        setOutboxEntries(id, (list) => list.filter((item) => item.clientKey !== entry.clientKey));
        return { ok: true, message };
      } catch (err) {
        if (!mountedRef.current) return { ok: false, ignored: true };
        // The text is never dropped on failure. A permanent rejection
        // (validation / permission) stays in the outbox without Retry so the
        // host can take the text back into the composer or delete it.
        const permanent = isPermanentSendError(err);
        setOutboxEntries(id, (list) =>
          list.map((item) =>
            item.clientKey === entry.clientKey ? { ...item, status: "failed", permanent, error: err } : item,
          ),
        );
        return { ok: false, error: err, permanent };
      }
    },
    [setOutboxEntries, storeConversation],
  );

  /** Queue and send a new message. Resolves like `performSend`; never throws. */
  const send = useCallback(
    (id, body) => {
      const text = typeof body === "string" ? body.trim() : "";
      if (!text) return Promise.resolve({ ok: false, error: Object.assign(new Error("Empty"), { code: "emptyMessage", status: 400 }), permanent: true });
      return performSend(id, { clientKey: newClientKey(), body: text, createdAt: new Date().toISOString() });
    },
    [performSend],
  );

  /** Re-send a failed outbox entry with the same clientKey. */
  const retry = useCallback(
    (id, clientKey) => {
      const entry = (outboxRef.current.get(id) ?? []).find((item) => item.clientKey === clientKey);
      if (!entry || entry.status === "sending") return Promise.resolve({ ok: false, ignored: true });
      return performSend(id, { clientKey: entry.clientKey, body: entry.body, createdAt: entry.createdAt });
    },
    [performSend],
  );

  /**
   * Drop a failed outbox entry (in memory and in storage). Returns its text
   * so the composer can take it back; callers append it to whatever the host
   * typed meanwhile instead of overwriting it.
   */
  const discard = useCallback(
    (id, clientKey) => {
      const entry = (outboxRef.current.get(id) ?? []).find((item) => item.clientKey === clientKey);
      setOutboxEntries(id, (list) => list.filter((item) => item.clientKey !== clientKey));
      return entry?.body ?? "";
    },
    [setOutboxEntries],
  );

  const markRead = useCallback(
    async (id) => {
      try {
        const result = await markHostConversationRead(id);
        if (!mountedRef.current) return { ok: false, ignored: true };
        storeThread(result);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err };
      }
    },
    [storeThread],
  );

  const getDraft = useCallback(
    (id) => (drafts.has(id) ? drafts.get(id) : readStoredDraft(id)),
    [drafts],
  );

  const setDraft = useCallback((id, text) => {
    setDrafts((current) => {
      const next = new Map(current);
      next.set(id, text);
      return next;
    });
    writeStoredDraft(id, text);
  }, []);

  /** Development helper: seed a guest message (new thread or reply). */
  const createFixture = useCallback(
    async (target) => {
      if (fixturesPending) return { ok: false, ignored: true };
      setFixturesPending(true);
      try {
        const result = await createHostMessageFixture(target);
        if (!mountedRef.current) return { ok: false, ignored: true };
        if (typeof result?.today === "string") setToday(result.today);
        const conversation = storeThread(result);
        return { ok: true, conversation };
      } catch (err) {
        return { ok: false, error: err };
      } finally {
        if (mountedRef.current) setFixturesPending(false);
      }
    },
    [fixturesPending, storeThread],
  );

  const unread = useMemo(() => unreadTotal(conversations), [conversations]);

  const value = useMemo(
    () => ({
      conversations,
      today,
      loaded,
      loading,
      refreshing,
      error,
      unreadTotal: unread,
      threads,
      outbox,
      fixturesPending,
      refresh,
      loadThread,
      send,
      retry,
      discard,
      markRead,
      getDraft,
      setDraft,
      createFixture,
    }),
    [conversations, today, loaded, loading, refreshing, error, unread, threads, outbox, fixturesPending, refresh, loadThread, send, retry, discard, markRead, getDraft, setDraft, createFixture],
  );

  return <HostMessagesContext.Provider value={value}>{children}</HostMessagesContext.Provider>;
}

export function useHostMessages() {
  const context = useContext(HostMessagesContext);
  if (!context) {
    throw new Error("useHostMessages must be used within a HostMessagesProvider");
  }
  return context;
}
