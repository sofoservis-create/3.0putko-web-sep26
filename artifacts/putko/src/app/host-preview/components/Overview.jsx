import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, AlertTriangle, CalendarX2, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Landmark,
  ListChecks, MessageSquareText, RefreshCw,
} from "lucide-react";
import Link from "@/app/components/NextLink";
import { FormContext } from "../../FormContext";
import { getHostDashboard } from "../../utlis/guestAccountApi";
import { useHostListings } from "../../host/HostListingsContext";
import { useHostNavigation } from "../../host/HostNavigationGuard";
import { useHostReservations } from "../../host/reservations/HostReservationsContext";
import { useHostMessages } from "../../host/messages/HostMessagesContext";
import { listingName } from "../../host/hostListingModel";
import { hostPaths } from "../../host/hostRoutes";
import {
  buildTodayTasks,
  dashboardErrorText,
  filterTasks,
  groupTasks,
  summaryFigures,
} from "../../host/dashboard/hostDashboardModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

const GROUP_ICON = {
  setup: ListChecks,
  requests: ClipboardList,
  calendar: CalendarX2,
  messages: MessageSquareText,
  payouts: Landmark,
};

const TONE = {
  urgent: { card: "border-red-200 border-l-4 border-l-red-500", icon: "bg-red-50 text-red-600" },
  warn: { card: "border-amber-300 border-l-4 border-l-amber-500", icon: "bg-amber-50 text-amber-700" },
  todo: { card: "border-neutral-200 border-l-4 border-l-[#DFBA73]", icon: "bg-[#DFBA73]/10 text-[#DFBA73]" },
  info: { card: "border-neutral-200 border-l-4 border-l-[#1E3E2B]", icon: "bg-[#1E3E2B]/5 text-[#1E3E2B]" },
};

/** One task: the whole card is the link to the exact screen that resolves it. */
function TaskCard({ task, language }) {
  const { linkProps } = useHostNavigation();
  const Icon = GROUP_ICON[task.group];
  const tone = TONE[task.tone] ?? TONE.info;
  return (
    <li>
      <Link
        {...linkProps(task.href)}
        className={`flex min-h-[72px] items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:border-[#DFBA73] ${tone.card}`}
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.icon}`} aria-hidden="true">
          <Icon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-[#1E3E2B]">{task.title}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-neutral-600">{task.detail}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-neutral-400" />
        <span className="sr-only">{t(language, "Open", "Otvoriť")}</span>
      </Link>
    </li>
  );
}

/**
 * Today: the host's operational home. Everything on it comes from the
 * dashboard summary endpoint, which aggregates the modules' own data
 * (listings, reservations, calendar, messages, payouts) — nothing here is
 * simulated. Tasks are ordered by priority: setup → requests → calendar →
 * messages → payouts. A property filter narrows property-specific tasks;
 * host-level tasks always stay visible.
 */
export default function Overview({ filters }) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const { listings, loaded: listingsLoaded } = useHostListings();
  const { guardedNavigate, linkProps } = useHostNavigation();
  // Any change in the modules' stores re-fetches the summary so Today never
  // shows a number the owning module already moved past.
  const { reservations } = useHostReservations();
  const { conversations } = useHostMessages();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const queuedRef = useRef(false);

  const load = useCallback(async ({ background = false } = {}) => {
    // One request at a time; a change that arrives mid-flight queues exactly
    // one follow-up so the last state always wins.
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    inFlightRef.current = true;
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await getHostDashboard();
      if (!mountedRef.current) return;
      setSummary(result);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        if (queuedRef.current) {
          queuedRef.current = false;
          load({ background: true });
        }
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-aggregate after the first load whenever a module's data changed.
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      return undefined;
    }
    const timer = setTimeout(() => load({ background: true }), 250);
    return () => clearTimeout(timer);
  }, [listings, reservations, conversations, load]);

  const property = filters?.property ?? null;
  const propertyKnown = !property || !listingsLoaded || listings.some((item) => item.id === property);
  const activeProperty = propertyKnown ? property : null;

  const listingsById = useMemo(() => new Map(listings.map((item) => [item.id, item])), [listings]);
  const tasks = useMemo(() => buildTodayTasks(summary, { language, listingsById }), [summary, language, listingsById]);
  const visible = useMemo(() => filterTasks(tasks, { property: activeProperty }), [tasks, activeProperty]);
  const groups = useMemo(() => groupTasks(visible, language), [visible, language]);
  const figures = useMemo(() => summaryFigures(summary, language), [summary, language]);
  const hiddenByFilter = tasks.length - visible.length;

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(language === "en" ? "en-GB" : "sk-SK", { weekday: "long", day: "numeric", month: "long" }),
    [language],
  );

  const header = (
    <header className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between md:pt-4">
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-wide text-neutral-500">{todayLabel}</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#1E3E2B]">{t(language, "Today", "Dnes")}</h1>
      </div>
      <div className="flex items-center gap-2">
        {listingsLoaded && listings.length > 1 && (
          <label className="relative block flex-1 sm:flex-none">
            <span className="sr-only">{t(language, "Property", "Ubytovanie")}</span>
            <select
              value={activeProperty ?? ""}
              onChange={(event) => guardedNavigate(hostPaths.todayFor(event.target.value || null), { replace: true })}
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
        {summary && (
          <button
            type="button"
            onClick={() => load({ background: true })}
            disabled={refreshing}
            aria-label={t(language, "Refresh", "Obnoviť")}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-300 bg-white text-[#1E3E2B] hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        )}
      </div>
    </header>
  );

  const wrap = "mx-auto max-w-4xl space-y-6 px-4 pb-8 animate-fadeIn md:px-0";

  if (loading && !summary) {
    return (
      <div className={wrap}>
        {header}
        <div aria-busy="true" className="animate-pulse space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => <div key={index} className="h-20 rounded-2xl bg-neutral-200" />)}
          </div>
          {[0, 1, 2].map((index) => <div key={index} className="h-[72px] rounded-2xl border border-neutral-200 bg-white" />)}
        </div>
        <p className="sr-only" role="status">{t(language, "Loading today's overview", "Načítava sa dnešný prehľad")}</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className={wrap}>
        {header}
        <div role="alert" className="flex flex-col items-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
          <AlertCircle size={30} className="mb-4" />
          <h2 className="text-xl font-bold">{t(language, "We couldn't load today's overview", "Dnešný prehľad sa nepodarilo načítať")}</h2>
          <p className="mt-2 max-w-sm text-[15px] text-red-600">{dashboardErrorText(error, language)}</p>
          <button type="button" onClick={() => load()} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-white px-6 font-bold text-red-700 hover:bg-red-100">
            <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={wrap}>
      {header}

      {/* Every figure is a count the owning module reports; tap to open it. */}
      <ul aria-label={t(language, "Summary", "Prehľad")} className="grid grid-cols-3 gap-2">
        {figures.map((figure) => (
          <li key={figure.id}>
            <Link
              {...linkProps(figure.href)}
              className="flex min-h-20 flex-col justify-center rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-center shadow-sm transition-colors hover:border-[#DFBA73]"
            >
              <span className="text-2xl font-extrabold leading-none text-[#1E3E2B]">{figure.value}</span>
              <span className="mt-1.5 text-[11px] font-bold uppercase leading-tight tracking-wide text-neutral-500">{figure.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {!propertyKnown && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
          {t(language, "That property is no longer in your listings, so all properties are shown.", "Toto ubytovanie už nie je medzi vašimi ponukami, zobrazujú sa všetky.")}
        </p>
      )}

      {error && summary && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          <AlertTriangle size={16} /> {t(language, "Couldn't refresh: ", "Nepodarilo sa obnoviť: ")}{dashboardErrorText(error, language)}
        </p>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2 size={30} />
          </div>
          <h2 className="text-xl font-bold text-[#1E3E2B]">
            {activeProperty ? t(language, "Nothing to do for this property", "Pre toto ubytovanie nie je čo riešiť") : t(language, "Nothing needs your attention", "Nič nevyžaduje vašu pozornosť")}
          </h2>
          <p className="mt-2 max-w-sm text-[15px] text-neutral-600">
            {t(language, "No open requests, calendar problems or unread messages right now.", "Momentálne žiadne otvorené žiadosti, problémy s kalendárom ani neprečítané správy.")}
          </p>
          {hiddenByFilter > 0 && (
            <button type="button" onClick={() => guardedNavigate(hostPaths.today, { replace: true })} className="mt-5 inline-flex min-h-11 items-center gap-1 text-[14px] font-bold text-[#1E3E2B] underline-offset-4 hover:underline">
              {t(language, `Show all properties (${hiddenByFilter})`, `Zobraziť všetky ubytovania (${hiddenByFilter})`)}
            </button>
          )}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.group} aria-label={group.title} className="!py-0">
            <h2 className="mb-2 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-neutral-500">
              {group.title}
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700">{group.tasks.length}</span>
            </h2>
            <ul className="space-y-2">
              {group.tasks.map((task) => (
                <TaskCard key={task.id} task={task} language={language} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
