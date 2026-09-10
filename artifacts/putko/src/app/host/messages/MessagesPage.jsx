import React, { useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, FlaskConical, Loader2, MessageSquareText, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import Link from "@/app/components/NextLink";
import { useHostListings } from "../HostListingsContext";
import { useHostNavigation } from "../HostNavigationGuard";
import { listingName } from "../hostListingModel";
import { hostPaths } from "../hostRoutes";
import { useHostMessages } from "./HostMessagesContext";
import {
  conversationContext,
  filterConversations,
  formatMessageTime,
  messageErrorText,
  unreadLabel,
} from "./messagesModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

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

/** One thread row: guest, context line, last message preview, unread badge. */
export function ConversationCard({ conversation, language, now }) {
  const { linkProps } = useHostNavigation();
  const unread = conversation.unreadCount > 0;
  const last = conversation.lastMessage;
  const preview = last ? `${last.mine ? t(language, "You: ", "Vy: ") : ""}${last.body}` : "";
  return (
    <li>
      <Link
        {...linkProps(hostPaths.conversation(conversation.id))}
        aria-label={`${conversation.guest?.name}${unread ? `, ${unreadLabel(conversation.unreadCount, language)}` : ""}`}
        className={`flex min-h-[72px] items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:border-[#DFBA73] ${
          unread ? "border-[#1E3E2B]/30 border-l-4 border-l-[#1E3E2B]" : "border-neutral-200"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate text-[15px] text-[#1E3E2B] ${unread ? "font-extrabold" : "font-bold"}`}>{conversation.guest?.name}</p>
            <span className="ml-auto shrink-0 text-[12px] text-neutral-500">{formatMessageTime(conversation.lastMessageAt, language, now)}</span>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-neutral-500">{conversationContext(conversation, language)}</p>
          {preview && (
            <p className={`mt-1 line-clamp-2 text-[14px] leading-snug ${unread ? "font-semibold text-[#1E3E2B]" : "text-neutral-600"}`}>{preview}</p>
          )}
        </div>
        {unread ? (
          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#1E3E2B] px-1.5 text-[12px] font-bold text-white" aria-hidden="true">
            {conversation.unreadCount}
          </span>
        ) : (
          <ChevronRight size={20} className="shrink-0 text-neutral-400" />
        )}
      </Link>
    </li>
  );
}

/**
 * Development-only helper: seeds a guest message for one of the host's
 * listings so the host flow can be exercised without the traveller UI.
 */
function SampleMessageCard({ listings, language }) {
  const { createFixture, fixturesPending } = useHostMessages();
  const { guardedNavigate } = useHostNavigation();
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [error, setError] = useState(null);
  const selected = listings.some((item) => item.id === listingId) ? listingId : listings[0]?.id ?? "";

  const run = async () => {
    if (!selected) return;
    setError(null);
    const result = await createFixture({ accommodationId: selected });
    if (result.ignored) return;
    if (!result.ok) {
      setError(messageErrorText(result.error, language));
      return;
    }
    toast.success(t(language, "A sample guest wrote to you.", "Napísal vám ukážkový hosť."));
    if (result.conversation?.id) guardedNavigate(hostPaths.conversation(result.conversation.id));
  };

  return (
    <section aria-label={t(language, "Sample data", "Ukážkové dáta")} className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 !py-4">
      <div className="flex items-start gap-3">
        <FlaskConical size={18} className="mt-0.5 shrink-0 text-neutral-500" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#1E3E2B]">{t(language, "Development: sample guest message", "Vývoj: ukážková správa od hosťa")}</p>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            {t(language, "Opens a new thread from a pretend guest about one listing. Not visible to real guests.", "Otvorí nové vlákno od fiktívneho hosťa k jednej ponuke. Skutoční hostia ho nevidia.")}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="relative block flex-1">
              <span className="sr-only">{t(language, "Listing", "Ponuka")}</span>
              <select
                value={selected}
                onChange={(event) => setListingId(event.target.value)}
                disabled={fixturesPending}
                className="min-h-11 w-full appearance-none rounded-xl border border-neutral-300 bg-white py-2 pl-3 pr-10 text-[14px] font-semibold text-[#1E3E2B] outline-none focus:border-[#1E3E2B]"
              >
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>{listingName(listing, language)}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            </label>
            <button
              type="button"
              onClick={run}
              disabled={fixturesPending || !selected}
              aria-busy={fixturesPending || undefined}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1E3E2B] px-4 text-[14px] font-bold text-[#1E3E2B] transition-colors hover:bg-[#1E3E2B]/5 disabled:opacity-50"
            >
              {fixturesPending && <Loader2 size={16} className="animate-spin" />}
              {t(language, "Add sample message", "Pridať ukážkovú správu")}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 flex items-start gap-2 text-[13px] font-semibold text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Conversation list. The property filter lives in the URL; the data comes
 * from the shared store so a reply on the thread screen is reflected here.
 * Updates arrive by refresh (manual or when the screen is opened) — there is
 * no live push.
 */
export default function MessagesPage({ filters, language }) {
  const { listings, loaded: listingsLoaded } = useHostListings();
  const { guardedNavigate } = useHostNavigation();
  const { conversations, loaded, loading, refreshing, error, refresh } = useHostMessages();
  const now = useMemo(() => new Date(), [conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  const property = filters?.property ?? null;
  const propertyKnown = !property || !listingsLoaded || listings.some((item) => item.id === property);
  const visible = useMemo(
    () => filterConversations(conversations, { property: propertyKnown ? property : null }),
    [conversations, property, propertyKnown],
  );

  const header = (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-wide text-neutral-500">{t(language, "Host", "Hostiteľ")}</p>
        <h1 className="truncate text-2xl font-bold text-[#1E3E2B]">{t(language, "Messages", "Správy")}</h1>
      </div>
      <div className="flex items-center gap-2">
        {listingsLoaded && listings.length > 1 && (
          <label className="relative block flex-1 sm:flex-none">
            <span className="sr-only">{t(language, "Property", "Ubytovanie")}</span>
            <select
              value={propertyKnown && property ? property : ""}
              onChange={(event) => guardedNavigate(hostPaths.messages({ property: event.target.value || null }), { replace: true })}
              className="min-h-12 w-full appearance-none rounded-xl border border-neutral-300 bg-white py-3 pl-4 pr-11 text-[15px] font-bold text-[#1E3E2B] outline-none focus:border-[#1E3E2B] focus:ring-2 focus:ring-[#1E3E2B]/15 sm:w-auto sm:min-w-[240px]"
            >
              <option value="">{t(language, "All properties", "Všetky ubytovania")}</option>
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>{listingName(listing, language)}</option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          </label>
        )}
        {loaded && (
          <button
            type="button"
            onClick={() => refresh({ background: true })}
            disabled={refreshing}
            aria-label={t(language, "Refresh messages", "Obnoviť správy")}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-300 bg-white text-[#1E3E2B] hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        )}
      </div>
    </header>
  );

  const wrap = "mx-auto max-w-4xl px-4 pb-8 animate-fadeIn md:px-0";

  if (loading && !loaded) {
    return (
      <div className={wrap}>
        {header}
        <div aria-busy="true" className="animate-pulse space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 rounded-2xl border border-neutral-200 bg-white" />
          ))}
        </div>
        <p className="sr-only" role="status">{t(language, "Loading messages", "Načítavajú sa správy")}</p>
      </div>
    );
  }

  if (error && !loaded) {
    return (
      <div className={wrap}>
        {header}
        <StatePanel
          icon={AlertCircle}
          tone="error"
          title={t(language, "We couldn't load your messages", "Správy sa nepodarilo načítať")}
          body={messageErrorText(error, language)}
          action={
            <button type="button" onClick={() => refresh()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-white px-6 font-bold text-red-700 hover:bg-red-100">
              <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
            </button>
          }
        />
      </div>
    );
  }

  const showSampleData = import.meta.env.DEV && listingsLoaded && listings.length > 0;

  return (
    <div className={wrap}>
      {header}

      {!propertyKnown && (
        <p role="status" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
          {t(language, "That property is no longer in your listings, so all properties are shown.", "Toto ubytovanie už nie je medzi vašimi ponukami, zobrazujú sa všetky.")}
        </p>
      )}

      {error && loaded && (
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          <AlertCircle size={16} /> {t(language, "Couldn't refresh: ", "Nepodarilo sa obnoviť: ")}{messageErrorText(error, language)}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="space-y-4">
          <StatePanel
            icon={MessageSquareText}
            title={property ? t(language, "No messages for this property", "Pre toto ubytovanie žiadne správy") : t(language, "No messages yet", "Zatiaľ žiadne správy")}
            body={
              listingsLoaded && listings.length === 0
                ? t(language, "Once you publish a listing, guests can write to you here.", "Keď zverejníte ponuku, hostia vám sem môžu písať.")
                : t(language, "Questions from guests about your listings and stays will show up here.", "Otázky hostí k vašim ponukám a pobytom sa zobrazia tu.")
            }
          />
          {showSampleData && <SampleMessageCard listings={listings} language={language} />}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {visible.map((conversation) => (
              <ConversationCard key={conversation.id} conversation={conversation} language={language} now={now} />
            ))}
          </ul>
          <p className="mt-4 text-center text-[12px] text-neutral-500">
            {t(language, "New messages appear when you open a thread or refresh.", "Nové správy sa zobrazia po otvorení vlákna alebo obnovení.")}
          </p>
          {showSampleData && <div className="mt-6"><SampleMessageCard listings={listings} language={language} /></div>}
        </>
      )}
    </div>
  );
}
