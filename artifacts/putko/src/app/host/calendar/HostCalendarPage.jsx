import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CalendarX2, ChevronDown, List, Lock, RefreshCw, X } from "lucide-react";
import Link from "@/app/components/NextLink";
import { useHostListings } from "../HostListingsContext";
import { useHostNavigation } from "../HostNavigationGuard";
import { listingName } from "../hostListingModel";
import { hostPaths } from "../hostRoutes";
import { useHostCalendar } from "./useHostCalendar";
import MonthGrid from "./MonthGrid";
import FeedsSection from "./FeedsSection";
import {
  CALENDAR_LISTING_STORAGE_KEY,
  calendarErrorText,
  formatRange,
  isSameMonth,
  monthOf,
  rangeDays,
  rangeFromTaps,
  selectionSummary,
  shiftMonth,
  todayIso,
  upcomingBlocks,
} from "./calendarModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

const skDays = (n) => `${n} ${n === 1 ? "deň" : n >= 2 && n <= 4 ? "dni" : "dní"}`;
const daysLabel = (n, language) => (language === "en" ? `${n} ${n === 1 ? "day" : "days"}` : skDays(n));

function PropertySwitcher({ listings, listingId, language, onChange }) {
  if (listings.length <= 1) return null;
  return (
    <label className="relative block">
      <span className="sr-only">{t(language, "Property", "Ubytovanie")}</span>
      <select
        value={listingId}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full appearance-none rounded-xl border border-neutral-300 bg-white py-3 pl-4 pr-11 text-[15px] font-bold text-[#1E3E2B] outline-none focus:border-[#1E3E2B] focus:ring-2 focus:ring-[#1E3E2B]/15 sm:w-auto sm:min-w-[260px]"
      >
        {listings.map((listing) => (
          <option key={listing.id} value={listing.id}>
            {listingName(listing, language)}
          </option>
        ))}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500" />
    </label>
  );
}

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

/**
 * Availability for a single property. Mounted with `key={listingId}` by the
 * shell so every property gets fresh local state (month, selection, forms).
 */
export default function HostCalendarPage({ listingId, language }) {
  const { listings, loaded: listingsLoaded } = useHostListings();
  const { linkProps, guardedNavigate } = useHostNavigation();
  const calendar = useHostCalendar(listingId);

  const today = calendar.snapshot?.today ?? todayIso();
  const [month, setMonth] = useState(() => monthOf(todayIso()));
  const [view, setView] = useState("month"); // month | list
  const [anchor, setAnchor] = useState(null);
  const [selection, setSelection] = useState(null);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState(null);

  // Remember the last property opened so the global Calendar tab returns here.
  useEffect(() => {
    if (calendar.phase === "ready") {
      try {
        localStorage.setItem(CALENDAR_LISTING_STORAGE_KEY, listingId);
      } catch {
        /* storage unavailable — the picker will simply ask again */
      }
    }
  }, [calendar.phase, listingId]);

  const blocks = calendar.snapshot?.blocks ?? [];
  const feeds = calendar.snapshot?.feeds ?? [];
  const summary = useMemo(() => selectionSummary(blocks, selection), [blocks, selection]);
  const upcoming = useMemo(() => upcomingBlocks(blocks, today), [blocks, today]);
  const currentListing = calendar.snapshot?.listing ?? listings.find((item) => item.id === listingId) ?? null;
  const title = currentListing ? listingName(currentListing, language) : t(language, "Calendar", "Kalendár");

  const clearSelection = () => {
    setAnchor(null);
    setSelection(null);
    setNote("");
    setActionError(null);
  };

  const tapDay = (iso) => {
    setActionError(null);
    if (selection) {
      // A fresh tap after a complete range starts a new one.
      setSelection(null);
      setAnchor(iso);
      return;
    }
    const range = rangeFromTaps(anchor, iso);
    if (range.complete) {
      setSelection({ startDate: range.startDate, endDate: range.endDate });
      setAnchor(null);
    } else {
      setAnchor(iso);
    }
  };

  const runRange = async (kind) => {
    if (!selection || calendar.rangeAction) return;
    setActionError(null);
    const result = kind === "block" ? await calendar.blockRange(selection, note.trim()) : await calendar.unblockRange(selection);
    if (result.ok) clearSelection();
    else if (!result.ignored) setActionError(calendarErrorText(result.error, language));
  };

  const switchProperty = (nextId) => {
    if (nextId && nextId !== listingId) guardedNavigate(hostPaths.listingCalendar(nextId));
  };

  const editorLinkProps = linkProps(hostPaths.listing(listingId, { step: "calendar" }));
  const currentMonth = monthOf(today);
  const activeRange = selection ?? (anchor ? { startDate: anchor, endDate: anchor } : null);

  const header = (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-wide text-neutral-500">{t(language, "Calendar", "Kalendár")}</p>
        <h1 className="truncate text-2xl font-bold text-[#1E3E2B]">{title}</h1>
      </div>
      {listingsLoaded && (
        <PropertySwitcher listings={listings} listingId={listingId} language={language} onChange={switchProperty} />
      )}
    </header>
  );

  const wrap = "mx-auto max-w-4xl px-4 animate-fadeIn md:px-0";

  if (calendar.phase === "loading") {
    return (
      <div className={wrap}>
        {header}
        <div aria-busy="true" className="animate-pulse space-y-4">
          <div className="h-[420px] rounded-3xl border border-neutral-200 bg-white" />
          <div className="h-40 rounded-3xl border border-neutral-200 bg-white" />
        </div>
        <p className="sr-only" role="status">{t(language, "Loading calendar", "Načítava sa kalendár")}</p>
      </div>
    );
  }

  if (calendar.phase === "forbidden") {
    return (
      <div className={wrap}>
        {header}
        <StatePanel
          icon={Lock}
          title={t(language, "This listing belongs to another host", "Táto ponuka patrí inému hostiteľovi")}
          body={t(language, "You can only manage availability for your own listings.", "Dostupnosť môžete spravovať iba pri vlastných ponukách.")}
          action={
            <Link {...linkProps(hostPaths.listings)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1E3E2B] px-6 font-bold text-white">
              {t(language, "Go to my listings", "Prejsť na moje ponuky")}
            </Link>
          }
        />
      </div>
    );
  }

  if (calendar.phase === "notFound") {
    return (
      <div className={wrap}>
        {header}
        <StatePanel
          icon={CalendarX2}
          title={t(language, "This listing no longer exists", "Táto ponuka už neexistuje")}
          body={t(language, "It may have been deleted. Pick another property from your listings.", "Možno bola vymazaná. Vyberte iné ubytovanie zo svojich ponúk.")}
          action={
            <Link {...linkProps(hostPaths.listings)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1E3E2B] px-6 font-bold text-white">
              {t(language, "Go to my listings", "Prejsť na moje ponuky")}
            </Link>
          }
        />
      </div>
    );
  }

  if (calendar.phase === "error") {
    return (
      <div className={wrap}>
        {header}
        <StatePanel
          icon={AlertCircle}
          tone="error"
          title={t(language, "We couldn't load this calendar", "Kalendár sa nepodarilo načítať")}
          body={calendarErrorText(calendar.loadError, language)}
          action={
            <button type="button" onClick={calendar.reload} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-white px-6 font-bold text-red-700 hover:bg-red-100">
              <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
            </button>
          }
        />
      </div>
    );
  }

  const rangeBusy = Boolean(calendar.rangeAction);

  // The action bar lives outside the animated wrapper: `animate-fadeIn` keeps a
  // transform, which would turn the wrapper into the containing block of the
  // fixed bar and pin it to the page bottom instead of the viewport. It is
  // fixed on every breakpoint (offset by the 280px sidebar on desktop) because
  // the shell's <main> has overflow set, which defeats `position: sticky`.
  return (
    <>
    <div className="mx-auto max-w-4xl px-4 pb-36 animate-fadeIn md:px-0">
      {header}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div role="tablist" aria-label={t(language, "View", "Zobrazenie")} className="inline-flex rounded-xl bg-neutral-100 p-1">
          {[
            { key: "month", icon: CalendarDays, label: t(language, "Month", "Mesiac") },
            { key: "list", icon: List, label: t(language, "List", "Zoznam") },
          ].map((option) => {
            const active = view === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(option.key)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-bold transition-colors ${active ? "bg-white text-[#1E3E2B] shadow-sm" : "text-neutral-500"}`}
              >
                <option.icon size={16} /> {option.label}
              </button>
            );
          })}
        </div>
        {view === "month" && !isSameMonth(month, currentMonth) && (
          <button type="button" onClick={() => setMonth(currentMonth)} className="min-h-10 rounded-lg px-3 text-[13px] font-bold text-[#1E3E2B] underline decoration-[#DFBA73] decoration-2 underline-offset-4">
            {t(language, "Today", "Dnes")}
          </button>
        )}
      </div>

      {view === "month" ? (
        <>
          <p className="mb-3 text-[13px] text-neutral-600">
            {t(language, "Tap a start day, then an end day, to block or open dates.", "Ťuknite na prvý a potom na posledný deň, aby ste termín zablokovali alebo uvoľnili.")}
          </p>
          <MonthGrid
            month={month}
            today={today}
            blocks={blocks}
            selection={selection}
            anchor={anchor}
            language={language}
            onPrev={() => setMonth((current) => shiftMonth(current, -1))}
            onNext={() => setMonth((current) => shiftMonth(current, 1))}
            canGoPrev={!isSameMonth(month, currentMonth)}
            onTapDay={tapDay}
            disabled={rangeBusy}
          />
        </>
      ) : (
        <section aria-label={t(language, "Blocked dates", "Blokované termíny")} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-[17px] font-bold text-[#1E3E2B]">{t(language, "Upcoming blocked dates", "Nadchádzajúce blokované termíny")}</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-[14px] text-neutral-500">
              {t(language, "Nothing is blocked. Every day from today on is open for guests.", "Nič nie je blokované. Každý deň odo dneška je pre hostí voľný.")}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-neutral-100">
              {upcoming.map((block) => {
                const feed = block.source === "feed" ? feeds.find((item) => item.id === block.feedId) : null;
                return (
                  <li key={block.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-[#1E3E2B]">{formatRange(block, language)}</p>
                      <p className="text-[13px] text-neutral-600">
                        {daysLabel(rangeDays(block), language)}
                        {block.source === "feed"
                          ? ` · ${t(language, "from", "z")} ${feed?.label?.trim() || t(language, "connected calendar", "pripojeného kalendára")}`
                          : block.source === "reservation"
                            ? ` · ${t(language, "reserved", "rezervované")}${block.note ? ` · ${block.note}` : ""}`
                            : block.note
                              ? ` · ${block.note}`
                              : ` · ${t(language, "blocked by you", "blokované vami")}`}
                      </p>
                    </div>
                    {block.source === "reservation" ? (
                      <Link
                        {...linkProps(hostPaths.reservation(block.reservationId))}
                        className="inline-flex min-h-11 items-center rounded-xl border border-[#DFBA73] bg-[#DFBA73]/10 px-4 text-[13px] font-bold text-[#1E3E2B] transition-colors hover:bg-[#DFBA73]/20"
                      >
                        {t(language, "Open reservation", "Otvoriť rezerváciu")}
                      </Link>
                    ) : block.source === "manual" ? (
                      <button
                        type="button"
                        disabled={rangeBusy}
                        onClick={async () => {
                          setActionError(null);
                          const result = await calendar.unblockRange(block);
                          if (!result.ok && !result.ignored) setActionError(calendarErrorText(result.error, language));
                        }}
                        className="min-h-11 rounded-xl border border-neutral-300 px-4 text-[13px] font-bold text-[#1E3E2B] transition-colors hover:bg-neutral-50 disabled:opacity-60"
                      >
                        {t(language, "Unblock", "Uvoľniť")}
                      </button>
                    ) : (
                      <span className="text-[12px] font-semibold text-neutral-500">{t(language, "Managed in the other calendar", "Spravované v druhom kalendári")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {actionError && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] font-semibold text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {actionError}
            </p>
          )}
        </section>
      )}

      <div className="mt-4">
        <FeedsSection
          language={language}
          feeds={feeds}
          addingFeed={calendar.addingFeed}
          feedActions={calendar.feedActions}
          onAdd={calendar.addFeed}
          onUpdate={calendar.updateFeed}
          onRemove={calendar.removeFeed}
          onFetch={calendar.fetchFeed}
          calendarChoice={calendar.snapshot?.calendarChoice ?? null}
          modeAction={calendar.modeAction}
          onSetMode={calendar.setMode}
          editorLinkProps={editorLinkProps}
        />
      </div>

    </div>
      {view === "month" && activeRange && (
        <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 px-3 lg:bottom-6 lg:left-[280px] lg:px-10">
          <div role="region" aria-live="polite" aria-label={t(language, "Selected dates", "Vybrané dni")} className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-[#1E3E2B]">{formatRange(activeRange, language)}</p>
                <p className="text-[12px] text-neutral-600">
                  {selection
                    ? `${daysLabel(summary.days, language)}${summary.reservedDays > 0 ? ` · ${t(language, "some nights are reserved", "niektoré noci sú rezervované")}` : ""}${summary.feedDays > 0 ? ` · ${t(language, "some days come from a connected calendar", "niektoré dni sú z pripojeného kalendára")}` : ""}`
                    : t(language, "Now tap the last day (or the same day again).", "Teraz ťuknite na posledný deň (alebo znova na ten istý).")}
                </p>
              </div>
              <button type="button" onClick={clearSelection} disabled={rangeBusy} aria-label={t(language, "Clear selection", "Zrušiť výber")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100">
                <X size={18} />
              </button>
            </div>
            {selection && (
              <>
                {summary.canBlock && (
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, 120))}
                    placeholder={t(language, "Note (optional), e.g. family visit", "Poznámka (nepovinné), napr. rodinná návšteva")}
                    className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-[14px] outline-none focus:border-[#1E3E2B]"
                  />
                )}
                {actionError && (
                  <p role="alert" className="mt-2 flex items-start gap-2 text-[13px] font-semibold text-red-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> {actionError}
                  </p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!summary.canBlock || rangeBusy}
                    aria-busy={calendar.rangeAction === "block" || undefined}
                    onClick={() => runRange("block")}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] text-[15px] font-bold text-white transition-colors hover:bg-[#163021] disabled:opacity-50"
                  >
                    {calendar.rangeAction === "block" && <RefreshCw size={16} className="animate-spin" />}
                    {t(language, "Block", "Blokovať")}
                  </button>
                  <button
                    type="button"
                    disabled={!summary.canUnblock || rangeBusy}
                    aria-busy={calendar.rangeAction === "unblock" || undefined}
                    onClick={() => runRange("unblock")}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#1E3E2B] text-[15px] font-bold text-[#1E3E2B] transition-colors hover:bg-[#1E3E2B]/5 disabled:opacity-50"
                  >
                    {calendar.rangeAction === "unblock" && <RefreshCw size={16} className="animate-spin" />}
                    {t(language, "Unblock", "Uvoľniť")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
