import React, { useEffect, useMemo } from "react";
import { AlertCircle, CalendarDays, ChevronRight, RefreshCw } from "lucide-react";
import Link from "@/app/components/NextLink";
import { useHostListings } from "../HostListingsContext";
import { useHostNavigation } from "../HostNavigationGuard";
import { listingName, statusPresentation } from "../hostListingModel";
import { hostPaths } from "../hostRoutes";
import { CALENDAR_LISTING_STORAGE_KEY } from "./calendarModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

const rememberedListingId = () => {
  try {
    return localStorage.getItem(CALENDAR_LISTING_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Global Calendar entry (`/host/calendar`). It never shows dates itself: with
 * one property it forwards straight to that property's calendar, with several
 * it forwards to the last one opened, and otherwise asks which property.
 */
export default function CalendarHome({ language }) {
  const wrap = "mx-auto max-w-4xl px-4 animate-fadeIn md:px-0";
  const { listings, loaded, loading, error, refresh } = useHostListings();
  const { guardedNavigate, linkProps } = useHostNavigation();

  const target = useMemo(() => {
    if (!loaded) return null;
    if (listings.length === 1) return listings[0].id;
    const remembered = rememberedListingId();
    if (remembered && listings.some((listing) => listing.id === remembered)) return remembered;
    return null;
  }, [loaded, listings]);

  useEffect(() => {
    if (target) guardedNavigate(hostPaths.listingCalendar(target), { replace: true });
  }, [target, guardedNavigate]);

  if (!loaded && loading) {
    return (
      <div aria-busy="true" className={`${wrap} animate-pulse space-y-3`}>
        <div className="h-8 w-40 rounded-lg bg-neutral-200" />
        <div className="h-20 rounded-2xl border border-neutral-200 bg-white" />
        <div className="h-20 rounded-2xl border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (!loaded && error) {
    return (
      <div role="alert" className="mx-auto max-w-4xl flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <h2 className="text-lg font-bold text-red-700">{t(language, "We couldn't load your listings", "Nepodarilo sa načítať vaše ponuky")}</h2>
            <p className="mt-1 text-sm text-red-600">{t(language, "Check your connection and try again.", "Skontrolujte pripojenie a skúste to znova.")}</p>
          </div>
        </div>
        <button type="button" onClick={() => refresh()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {t(language, "Retry", "Skúsiť znova")}
        </button>
      </div>
    );
  }

  if (loaded && listings.length === 0) {
    return (
      <div className="mx-auto max-w-4xl flex flex-col items-center rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm md:p-14">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#DFBA73]/10 text-[#DFBA73]">
          <CalendarDays size={36} />
        </div>
        <h1 className="text-2xl font-bold text-[#1E3E2B]">{t(language, "No calendar yet", "Zatiaľ žiadny kalendár")}</h1>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-neutral-500">
          {t(language, "Each listing gets its own availability calendar. Create your first listing to start blocking dates.", "Každá ponuka má vlastný kalendár dostupnosti. Vytvorte prvú ponuku a začnite blokovať termíny.")}
        </p>
        <Link {...linkProps(hostPaths.newListing)} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1E3E2B] px-8 font-bold text-white hover:bg-[#163021]">
          {t(language, "Create a listing", "Vytvoriť ponuku")}
        </Link>
      </div>
    );
  }

  // Several properties and none remembered: ask.
  if (loaded && !target) {
    return (
      <div className={wrap}>
        <h1 className="text-2xl font-bold text-[#1E3E2B]">{t(language, "Which property?", "Ktoré ubytovanie?")}</h1>
        <p className="mt-1 text-[14px] text-neutral-600">{t(language, "Every listing has its own calendar.", "Každá ponuka má vlastný kalendár.")}</p>
        <ul className="mt-4 flex flex-col gap-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link {...linkProps(hostPaths.listingCalendar(listing.id))} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-[#1E3E2B]">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-[#1E3E2B]">{listingName(listing, language)}</p>
                  <p className="text-[12px] font-semibold text-neutral-500">{statusPresentation(listing.status, language).label}</p>
                </div>
                <ChevronRight size={20} className="shrink-0 text-neutral-400" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Redirecting to the resolved property.
  return (
    <div aria-busy="true" className={`${wrap} animate-pulse space-y-3`}>
      <div className="h-8 w-40 rounded-lg bg-neutral-200" />
      <div className="h-[420px] rounded-3xl border border-neutral-200 bg-white" />
    </div>
  );
}
