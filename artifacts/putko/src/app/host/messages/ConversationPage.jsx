import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, CalendarDays, Check, CheckCheck, ClipboardList, FlaskConical, House, Loader2, Lock,
  MessageSquareText, PencilLine, RefreshCw, RotateCcw, SendHorizonal, Trash2,
} from "lucide-react";
import Link from "@/app/components/NextLink";
import { useHostNavigation } from "../HostNavigationGuard";
import { hostPaths } from "../hostRoutes";
import { useHostMessages } from "./HostMessagesContext";
import {
  conversationContext,
  deliveryLabel,
  formatMessageTime,
  groupByDay,
  mergeThread,
  messageErrorText,
} from "./messagesModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

const MAX_LENGTH = 4000;
// No push transport: while a thread is open it is re-fetched at this interval.
const POLL_MS = 15_000;
// A failed read acknowledgment is retried after this delay (and on the next poll).
const READ_RETRY_MS = 5_000;

function StatePanel({ icon: Icon, tone = "neutral", title, body, action }) {
  const tones = {
    neutral: "border-neutral-200 bg-white text-[#1E3E2B]",
    error: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`flex flex-col items-center rounded-3xl border p-8 text-center shadow-sm ${tones[tone]}`}>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#DFBA73]/10 text-[#DFBA73]">
        <Icon size={30} />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-neutral-600">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function DeliveryMark({ state }) {
  if (state === "sending") return <Loader2 size={12} className="animate-spin" aria-hidden="true" />;
  if (state === "failed") return <AlertCircle size={12} aria-hidden="true" />;
  if (state === "read") return <CheckCheck size={12} aria-hidden="true" />;
  return <Check size={12} aria-hidden="true" />;
}

/**
 * One bubble. Host messages sit right. A failed one keeps its text and
 * offers Retry + Edit; a permanently rejected one (too long, no permission,
 * thread gone) explains why and offers Edit + Delete instead of a retry that
 * cannot succeed.
 */
function MessageBubble({ message, language, now, onRetry, onEdit, onDelete }) {
  const mine = message.senderRole === "host";
  const failed = message.state === "failed";
  const permanent = failed && message.permanent;
  const button = "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold";
  const primary = `${button} bg-[#1E3E2B] text-white hover:bg-[#163021]`;
  const secondary = `${button} border border-neutral-300 bg-white text-[#1E3E2B] hover:bg-neutral-50`;
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
            mine
              ? failed
                ? "border border-red-200 bg-red-50 text-[#1E3E2B]"
                : "bg-[#1E3E2B] text-white"
              : "border border-neutral-200 bg-white text-[#1E3E2B]"
          } ${message.state === "sending" ? "opacity-70" : ""}`}
        >
          {message.body}
        </div>
        <p className={`mt-1 flex items-center gap-1 px-1 text-[11px] ${failed ? "font-semibold text-red-600" : "text-neutral-500"}`}>
          {mine && <DeliveryMark state={message.state} />}
          <span>{mine ? deliveryLabel(message.state, language) : formatMessageTime(message.createdAt, language, now)}</span>
          {mine && message.state !== "sending" && message.state !== "failed" && (
            <span aria-hidden="true">· {formatMessageTime(message.createdAt, language, now)}</span>
          )}
        </p>
        {failed && (
          <div className="mt-1 flex flex-col items-end gap-1.5">
            {message.error && (
              <p role="alert" className="px-1 text-right text-[12px] text-red-600">
                {messageErrorText(message.error, language)}
              </p>
            )}
            <div className="flex gap-2">
              {!permanent && (
                <button type="button" onClick={() => onRetry(message.clientKey)} className={primary}>
                  <RotateCcw size={14} /> {t(language, "Retry", "Skúsiť znova")}
                </button>
              )}
              <button type="button" onClick={() => onEdit(message.clientKey)} className={permanent ? primary : secondary}>
                <PencilLine size={14} /> {t(language, "Edit", "Upraviť")}
              </button>
              {permanent && (
                <button type="button" onClick={() => onDelete(message.clientKey)} className={secondary}>
                  <Trash2 size={14} /> {t(language, "Delete", "Odstrániť")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * One thread: header with the guest and the stay/listing it is about, the
 * messages (server-confirmed first, then the local outbox), and a composer
 * pinned to the bottom. Opening the thread marks the guest's messages read.
 *
 * Sending is optimistic: the text leaves the composer at once and shows as
 * "Sending…"; if the request does not reach the server the bubble turns into
 * "Not sent" with Retry (same clientKey, so the server de-duplicates) and
 * Edit (appends the text to the composer without overwriting what the host
 * typed meanwhile). A rejected message (400/403/404) stays as well, with the
 * reason and Edit/Delete. Unsent text survives reloads via the outbox store,
 * so nothing typed is ever lost.
 */
export default function ConversationPage({ conversationId, language }) {
  const { linkProps } = useHostNavigation();
  const { threads, outbox, loadThread, send, retry, discard, markRead, getDraft, setDraft, createFixture, fixturesPending } = useHostMessages();
  const thread = threads.get(conversationId) ?? null;
  const localEntries = outbox.get(conversationId) ?? [];

  const [phase, setPhase] = useState(thread ? "ready" : "loading"); // loading | ready | forbidden | notFound | error
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pollFailed, setPollFailed] = useState(false);
  const [draft, setDraftState] = useState(() => getDraft(conversationId));
  const [composerHeight, setComposerHeight] = useState(96);

  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);
  const markedRef = useRef(null); // last lastMessageAt we marked read for

  // Initial load (server decides 403/404 even when the list already had it).
  useEffect(() => {
    let cancelled = false;
    if (!thread) setPhase("loading");
    setLoadError(null);
    loadThread(conversationId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setPhase("ready");
        return;
      }
      if (result.ignored) return;
      if (thread) {
        // Keep showing the cached thread; surface the refresh failure inline.
        setPollFailed(true);
        return;
      }
      const status = result.error?.status;
      setLoadError(result.error);
      setPhase(status === 403 ? "forbidden" : status === 404 ? "notFound" : "error");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, loadThread, reloadKey]);

  // Poll while the thread is open and the tab is visible.
  useEffect(() => {
    if (phase !== "ready") return undefined;
    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const result = await loadThread(conversationId);
      if (result.ignored) return;
      setPollFailed(!result.ok);
    };
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [phase, conversationId, loadThread]);

  // Mark read whenever unread guest messages are showing. The thread counts
  // as acknowledged only once the server confirms; a failed acknowledgment is
  // retried shortly and again on the next poll. 403/404 are not retried.
  const [readAttempt, setReadAttempt] = useState(0);
  useEffect(() => {
    const conversation = thread?.conversation;
    if (!conversation || conversation.unreadCount <= 0) return undefined;
    if (markedRef.current === conversation.lastMessageAt) return undefined;
    const attemptedFor = conversation.lastMessageAt;
    markedRef.current = attemptedFor;
    let cancelled = false;
    let timer = null;
    markRead(conversationId).then((result) => {
      if (result.ok || result.ignored) return;
      const status = result.error?.status;
      if (status === 403 || status === 404) return;
      if (markedRef.current === attemptedFor) markedRef.current = null;
      if (!cancelled) timer = setTimeout(() => setReadAttempt((n) => n + 1), READ_RETRY_MS);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [thread, conversationId, markRead, readAttempt]);

  const merged = useMemo(() => mergeThread(thread?.messages, localEntries), [thread, localEntries]);
  const now = useMemo(() => new Date(), [merged]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => groupByDay(merged, language, now), [merged, language, now]);

  // Keep the newest message in view as the thread grows.
  const lastId = merged[merged.length - 1]?.id;
  const lastState = merged[merged.length - 1]?.state;
  useEffect(() => {
    if (phase !== "ready") return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [phase, lastId, lastState, composerHeight]);

  // The composer is pinned; pad the thread by its real height.
  useLayoutEffect(() => {
    const node = composerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setComposerHeight(node.offsetHeight));
    observer.observe(node);
    setComposerHeight(node.offsetHeight);
    return () => observer.disconnect();
  }, [phase]);

  const updateDraft = useCallback(
    (text) => {
      setDraftState(text);
      setDraft(conversationId, text);
    },
    [conversationId, setDraft],
  );

  const autosize = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, []);
  useEffect(autosize, [draft, autosize]);

  const canSend = draft.trim().length > 0 && draft.length <= MAX_LENGTH;

  const submit = useCallback(() => {
    if (!canSend) return;
    const text = draft;
    updateDraft("");
    // The text now lives in the outbox (persisted): a failure of any kind
    // shows as a "Not sent" bubble there, so the composer is never touched
    // afterwards and whatever the host types next is kept.
    send(conversationId, text);
    textareaRef.current?.focus();
  }, [canSend, draft, send, conversationId, updateDraft]);

  const onKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent?.isComposing) return;
    // Enter sends only with a precise pointer (desktop); on touch it wraps.
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)")?.matches) {
      event.preventDefault();
      submit();
    }
  };

  /** Take a failed message back into the composer, after any newer text. */
  const onEdit = (clientKey) => {
    const text = discard(conversationId, clientKey);
    if (!text) return;
    const current = draft;
    updateDraft(current.trim() ? `${current.replace(/\s+$/, "")}\n${text}` : text);
    textareaRef.current?.focus();
  };

  /** Remove a rejected message for good (explicit host choice). */
  const onDelete = (clientKey) => {
    discard(conversationId, clientKey);
    textareaRef.current?.focus();
  };

  const wrap = "mx-auto max-w-3xl px-4 md:px-0";
  const backLink = (
    <Link {...linkProps(hostPaths.messages())} className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-[#1E3E2B]">
      <ArrowLeft size={18} /> {t(language, "Messages", "Správy")}
    </Link>
  );

  if (phase === "loading") {
    return (
      <div className={`${wrap} animate-fadeIn pb-8`}>
        {backLink}
        <div aria-busy="true" className="mt-3 animate-pulse space-y-3">
          <div className="h-8 w-1/2 rounded-xl bg-neutral-200" />
          <div className="h-4 w-2/3 rounded bg-neutral-200" />
          <div className="mt-6 h-16 w-3/4 rounded-2xl bg-neutral-200" />
          <div className="ml-auto h-12 w-1/2 rounded-2xl bg-neutral-200" />
        </div>
        <p className="sr-only" role="status">{t(language, "Loading conversation", "Načítava sa konverzácia")}</p>
      </div>
    );
  }

  if (phase !== "ready") {
    const copy = {
      forbidden: {
        icon: Lock,
        title: t(language, "This conversation isn't yours", "Táto konverzácia nie je vaša"),
        body: t(language, "Only the guest and the host of the listing can read it.", "Čítať ju môže len hosť a hostiteľ ponuky."),
      },
      notFound: {
        icon: MessageSquareText,
        title: t(language, "Conversation not found", "Konverzácia sa nenašla"),
        body: t(language, "It may have been removed.", "Možno bola odstránená."),
      },
      error: {
        icon: AlertCircle,
        title: t(language, "We couldn't load this conversation", "Konverzáciu sa nepodarilo načítať"),
        body: messageErrorText(loadError, language),
      },
    }[phase];
    return (
      <div className={`${wrap} animate-fadeIn pb-8`}>
        {backLink}
        <div className="mt-3">
          <StatePanel
            icon={copy.icon}
            tone={phase === "error" ? "error" : "neutral"}
            title={copy.title}
            body={copy.body}
            action={
              phase === "error" ? (
                <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-white px-6 font-bold text-red-700 hover:bg-red-100">
                  <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
                </button>
              ) : (
                <Link {...linkProps(hostPaths.messages())} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1E3E2B] px-6 font-bold text-white hover:bg-[#163021]">
                  {t(language, "Back to messages", "Späť na správy")}
                </Link>
              )
            }
          />
        </div>
      </div>
    );
  }

  const conversation = thread.conversation;
  const reservation = conversation.reservation;

  return (
    <>
      {/* Not inside animate-fadeIn: the composer below is position: fixed. */}
      <div className={wrap}>
        <header className="mb-3">
          {backLink}
          <h1 className="mt-1 truncate text-2xl font-bold text-[#1E3E2B]">{conversation.guest?.name}</h1>
          <p className="truncate text-[14px] text-neutral-600">{conversationContext(conversation, language)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reservation ? (
              <Link {...linkProps(hostPaths.reservation(reservation.id))} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 text-[13px] font-bold text-[#1E3E2B] hover:border-[#DFBA73]">
                <ClipboardList size={15} /> {t(language, "Open reservation", "Otvoriť rezerváciu")}
              </Link>
            ) : (
              <Link {...linkProps(hostPaths.listing(conversation.accommodationId))} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 text-[13px] font-bold text-[#1E3E2B] hover:border-[#DFBA73]">
                <House size={15} /> {t(language, "Open listing", "Otvoriť ponuku")}
              </Link>
            )}
            <Link {...linkProps(hostPaths.listingCalendar(conversation.accommodationId))} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 text-[13px] font-bold text-[#1E3E2B] hover:border-[#DFBA73]">
              <CalendarDays size={15} /> {t(language, "Calendar", "Kalendár")}
            </Link>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => createFixture({ conversationId })}
                disabled={fixturesPending}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-neutral-400 bg-neutral-50 px-3 text-[13px] font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
              >
                {fixturesPending ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
                {t(language, "Dev: guest replies", "Vývoj: hosť odpovie")}
              </button>
            )}
          </div>
        </header>

        {pollFailed && (
          <p role="status" className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
            <AlertCircle size={16} /> {t(language, "Couldn't check for new messages. Retrying automatically.", "Nepodarilo sa skontrolovať nové správy. Skúšame to automaticky.")}
          </p>
        )}

        <section aria-label={t(language, "Conversation", "Konverzácia")} aria-live="polite" className="!py-0">
          {merged.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center text-[14px] text-neutral-500">
              {t(language, "No messages yet. Say hello!", "Zatiaľ žiadne správy. Pozdravte hosťa!")}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.day} className="mb-4">
                <p className="my-3 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">{group.label}</p>
                <ul className="space-y-2">
                  {group.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      language={language}
                      now={now}
                      onRetry={(clientKey) => retry(conversationId, clientKey)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="mt-2 text-center text-[11px] text-neutral-400">
            {t(language, `Checks for new messages every ${POLL_MS / 1000} s while open.`, `Nové správy sa kontrolujú každých ${POLL_MS / 1000} s, kým je vlákno otvorené.`)}
          </p>
        </section>
        {/* Room for the pinned composer; the scroll anchor sits below it so
            the newest message is never hidden behind the composer. */}
        <div aria-hidden="true" style={{ height: composerHeight + 16 }} />
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <div
        ref={composerRef}
        className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 border-t border-neutral-200 bg-white/95 backdrop-blur lg:bottom-0 lg:left-[280px]"
      >
        <form
          className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-3 md:px-6 lg:px-10"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t(language, "Message", "Správa")}</span>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={MAX_LENGTH + 500}
              enterKeyHint="enter"
              placeholder={t(language, `Message ${conversation.guest?.name ?? ""}`.trim(), `Napíšte hosťovi ${conversation.guest?.name ?? ""}`.trim())}
              className="block max-h-40 min-h-12 w-full resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-[15px] text-[#1E3E2B] outline-none focus:border-[#1E3E2B] focus:ring-2 focus:ring-[#1E3E2B]/15"
            />
          </label>
          <button
            type="submit"
            disabled={!canSend}
            aria-label={t(language, "Send", "Odoslať")}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1E3E2B] text-white transition-colors hover:bg-[#163021] disabled:bg-neutral-300"
          >
            <SendHorizonal size={20} />
          </button>
        </form>
        {draft.length > MAX_LENGTH - 500 && (
          <div className="mx-auto max-w-3xl px-4 pb-2 md:px-6 lg:px-10">
            <p className={`text-right text-[11px] ${draft.length > MAX_LENGTH ? "font-bold text-red-600" : "text-neutral-500"}`}>
              {draft.length} / {MAX_LENGTH}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
