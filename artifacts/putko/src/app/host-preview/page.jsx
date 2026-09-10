"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AuthContext } from "../context/AuthContext";
import { FormContext } from "../FormContext";
import {
  ArrowLeft, LayoutDashboard, House, BookOpenText, CalendarDays, ClipboardList,
  Menu as MenuIcon, Undo, ChevronRight, Plus, UserRound, Landmark, KeyRound, MessageSquareText,
} from "lucide-react";
import { toast } from "react-toastify";
import Link from "@/app/components/NextLink";
import ProtectedRoute from "../ProtectedRoute";

import Overview from "./components/Overview";
import AccommodationsList from "./components/AccommodationsList";
import AccommodationForm from "./components/AccommodationForm";
import HostCalendarPage from "../host/calendar/HostCalendarPage";
import CalendarHome from "../host/calendar/CalendarHome";
import ReservationsPage from "../host/reservations/ReservationsPage";
import ReservationDetailPage from "../host/reservations/ReservationDetailPage";
import HostProfilePage from "../host/profile/HostProfilePage";
import HostPayoutsPage from "../host/payouts/HostPayoutsPage";
import MessagesPage from "../host/messages/MessagesPage";
import ConversationPage from "../host/messages/ConversationPage";
import { HostMessagesProvider, useHostMessages } from "../host/messages/HostMessagesContext";
import { HostReservationsProvider, useHostReservations } from "../host/reservations/HostReservationsContext";
import { DEFAULT_MAX_AGE_MS } from "../host/hostStoreUtils";
import {
  hostPaths,
  resolveHostLocation,
  START_ONBOARDING_FLAG,
} from "../host/hostRoutes";
import { HostListingsProvider, useHostListings } from "../host/HostListingsContext";
import { useHostNavigation } from "../host/HostNavigationGuard";
import {
  listingDisplayPercent,
  listingName,
  selectPriorityListing,
} from "../host/hostListingModel";

const HOST_GUIDE_PATH = "/user-guide";

export default function HostWorkspace() {
  return (
    <ProtectedRoute allowedRoles={["host"]}>
      <HostListingsProvider>
        <HostReservationsProvider>
          <HostMessagesProvider>
            <HostWorkspaceShell />
          </HostMessagesProvider>
        </HostReservationsProvider>
      </HostListingsProvider>
    </ProtectedRoute>
  );
}

function HostWorkspaceShell() {
  const { switchMode, user } = useContext(AuthContext);
  const { lang, updatelang } = useContext(FormContext);
  const language = lang || "sk";
  const [, rawNavigate] = useLocation();
  // The app-level leave guard (HostNavigationProvider in AppRoutes) owns
  // unsaved-change confirmation. Every navigation the shell starts goes
  // through it; replace navigations issued by the editor itself (id swap,
  // ?review) use rawNavigate. While the editor holds unsaved changes, a URL
  // change it does not own (browser Back, etc.) is held in `shownPath` so the
  // editor stays mounted with its edits until the host confirms.
  const hostNavigation = useHostNavigation();
  const navigate = hostNavigation.guardedNavigate;
  const { linkProps, guardedAction } = hostNavigation;
  const [pathname, search = ""] = hostNavigation.shownPath.split("?");

  // The Host shell does not render the public header that normally restores
  // the chosen language, so honour the stored preference on a hard reload.
  useEffect(() => {
    if (lang || typeof window === "undefined") return;
    const stored = localStorage.getItem("appLanguage");
    if (stored === "en" || stored === "sk") updatelang(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const location = useMemo(() => resolveHostLocation(pathname, search), [pathname, search]);

  const { listings: hostAccommodations, loaded: listingsLoaded, refresh: refreshListings } = useHostListings();
  const { reservations, refresh: refreshReservations } = useHostReservations();
  // Open requests are the one thing a host must act on; the count sits on the
  // Reservations entry in both navigations.
  const openRequests = reservations.filter((item) => item.stage === "request").length;
  // Unread guest messages come from the shared messages store, the same one
  // the Messages screen and Today read from.
  const { unreadTotal: unreadMessages, refresh: refreshMessages } = useHostMessages();
  const [switching, setSwitching] = useState(false);

  // Older traveler screens set a flag before redirecting to /host. Honour it
  // once by sending the host straight to the first-listing editor.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(START_ONBOARDING_FLAG) === "true") {
      localStorage.removeItem(START_ONBOARDING_FLAG);
      rawNavigate(hostPaths.newListing, { replace: true });
    }
  }, [rawNavigate]);

  // Unknown /host/... paths fall back to the Today view.
  useEffect(() => {
    if (location === null) rawNavigate(hostPaths.today, { replace: true });
  }, [location, rawNavigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const section = location?.section ?? "today";
  const editorOpen = section === "listing";

  // Mutations update the shared store directly; a background refresh when the
  // host returns to a list-driven section keeps it aligned with the server
  // without flashing a loading state.
  useEffect(() => {
    if (editorOpen) return;
    refreshListings({ background: true, maxAge: DEFAULT_MAX_AGE_MS });
  }, [section, editorOpen, refreshListings]);

  // Reservations change on the server without this host (new requests, stays
  // becoming active), so entering the section always re-syncs quietly.
  useEffect(() => {
    if (section === "reservations" || section === "today") refreshReservations({ background: true, maxAge: DEFAULT_MAX_AGE_MS });
  }, [section, refreshReservations]);

  // Guests write without this host doing anything, so the conversation list
  // (and its unread count) re-syncs whenever Messages or Today is opened.
  useEffect(() => {
    if (section === "messages" || section === "today") refreshMessages({ background: true, maxAge: DEFAULT_MAX_AGE_MS });
  }, [section, refreshMessages]);

  // Mode switching removes the editor (ProtectedRoute re-evaluates the role),
  // so the unsaved-changes confirmation must come before the mode mutation.
  // Personal details and password live in the shared traveler account
  // (`/account` is a traveler-mode screen), so "Account" from the Host menu
  // is the same switch: both capabilities stay, only the active mode changes.
  const handleSwitchToTravel = ({ silent = false } = {}) =>
    guardedAction(async () => {
      setSwitching(true);
      try {
        await switchMode("guest");
        if (!silent) {
          toast.success(
            language === "en" ? "Switched to Travel Mode." : "Prepnuté do režimu cestovateľa.",
          );
        }
        window.location.href = "/account";
      } catch (error) {
        // Session loss is announced (and redirected) by AuthContext; every
        // other failure keeps the menu usable so the host can simply retry.
        if (error?.status !== 401) {
          toast.error(
            language === "en"
              ? "Couldn't switch mode. Check your connection and try again."
              : "Režim sa nepodarilo prepnúť. Skontrolujte pripojenie a skúste to znova.",
          );
        }
        setSwitching(false);
        throw error;
      }
    });
  const handleOpenAccount = () => handleSwitchToTravel({ silent: true });

  const handleBackToWeb = () =>
    guardedAction(() => {
      window.location.href = "/";
    });

  const openListing = (id, { review = false } = {}) => navigate(hostPaths.listing(id, { review }));
  const openNewListing = () => navigate(hostPaths.newListing);
  const backToListings = () => navigate(hostPaths.listings);

  const NAV_ITEMS = [
    { id: "today", href: hostPaths.today, icon: LayoutDashboard, label: { en: "Today", sk: "Dnes" } },
    { id: "listings", href: hostPaths.listings, icon: House, label: { en: "Listings", sk: "Ponuky" } },
    // Calendar returned to primary navigation once per-property availability
    // (blocks + feed status) persisted and stayed isolated per listing.
    { id: "calendar", href: hostPaths.calendar, icon: CalendarDays, label: { en: "Calendar", sk: "Kalendár" } },
    // Reservations joined once accept/decline/cancel persisted and kept the
    // property calendar consistent (accepted stays block their nights).
    { id: "reservations", href: hostPaths.reservations(), icon: ClipboardList, label: { en: "Reservations", sk: "Rezervácie" }, badge: openRequests, badgeLabel: { en: (n) => `${n} open requests`, sk: (n) => `Otvorené žiadosti: ${n}` } },
    // Messages joined once host↔guest threads persisted with participant-only
    // access, delivery/read state and a retry path for failed sends.
    { id: "messages", href: hostPaths.messages(), icon: MessageSquareText, label: { en: "Messages", sk: "Správy" }, badge: unreadMessages, badgeLabel: { en: (n) => `${n} unread messages`, sk: (n) => `Neprečítané správy: ${n}` } },
  ];
  const MOBILE_TABS = [
    ...NAV_ITEMS,
    { id: "menu", href: hostPaths.menu, icon: MenuIcon, label: { en: "Menu", sk: "Menu" } },
  ];
  // Host-level settings (not tied to a property). Enabled once their data
  // persisted server-side with ownership enforced.
  const HOST_SETTINGS_ITEMS = [
    { id: "profile", href: hostPaths.profile, icon: UserRound, label: { en: "Host profile", sk: "Hostiteľský profil" } },
    { id: "payouts", href: hostPaths.payouts, icon: Landmark, label: { en: "Payouts", sk: "Výplaty" } },
  ];
  const SECTION_LABELS = {
    profile: { en: "Host profile", sk: "Hostiteľský profil" },
    payouts: { en: "Payouts", sk: "Výplaty" },
  };

  // Same priority rule as the Today card: READY → oldest DRAFT → LIVE.
  const setupTarget = selectPriorityListing(hostAccommodations);
  const setupTargetName = setupTarget ? listingName(setupTarget, language) : null;
  const setupCopy = !listingsLoaded
    ? {
        title: language === "en" ? "Loading your listings…" : "Načítavajú sa ponuky…",
        action: language === "en" ? "Open listings" : "Otvoriť ponuky",
        onClick: backToListings,
      }
    : !setupTarget
      ? {
          title: language === "en" ? "Add your first listing" : "Pridajte prvé ubytovanie",
          action: language === "en" ? "Start setup" : "Začať nastavenie",
          onClick: openNewListing,
        }
      : setupTarget.status === "READY"
        ? {
            title: language === "en" ? `Publish ${setupTargetName}` : `Zverejnite ${setupTargetName}`,
            action: language === "en" ? "Review and publish" : "Skontrolovať a zverejniť",
            onClick: () => openListing(setupTarget.id, { review: true }),
          }
        : setupTarget.status === "DRAFT"
          ? {
              title: language === "en" ? `Finish ${setupTargetName}` : `Dokončite ${setupTargetName}`,
              action: language === "en" ? "Continue setup" : "Pokračovať v nastavení",
              onClick: () => openListing(setupTarget.id),
            }
          : {
              title: language === "en" ? "All listings are live" : "Všetky ponuky sú zverejnené",
              action: language === "en" ? "Manage listings" : "Spravovať ponuky",
              onClick: backToListings,
            };
  const setupDisplayPercent = setupTarget ? listingDisplayPercent(setupTarget) : 0;
  const hostInitial =
    user?.name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    "H";
  const isActive = (id) =>
    section === id ||
    (id === "reservations" && section === "reservation") ||
    (id === "messages" && section === "conversation");
  const activeMobileLabel =
    MOBILE_TABS.find((tab) => isActive(tab.id))?.label[language] ||
    SECTION_LABELS[section]?.[language] ||
    (language === "en" ? "Host workspace" : "Pracovisko hostiteľa");

  const navButtonClass = (active) =>
    `w-full flex min-h-11 items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
      active
        ? "bg-[#DFBA73] text-[#1E3E2B] font-bold shadow-md"
        : "text-white/70 hover:bg-white/10 hover:text-white font-semibold"
    }`;

  const renderMobileMenu = () => (
    <div className="pb-8 animate-fadeIn max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-[#1E3E2B] px-4 mb-6 pt-2">Menu</h1>

      <div className="px-4 flex items-center gap-5 mb-10">
        <div className="w-16 h-16 rounded-full bg-[#1E3E2B] flex items-center justify-center text-[#DFBA73] text-2xl font-bold shadow-md">
          {hostInitial}
        </div>
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-[#1E3E2B] truncate">
            {user?.name ? `${user.name}${user.lastName ? ` ${user.lastName}` : ""}` : (language === "en" ? "Host Workspace" : "Pracovisko hostiteľa")}
          </div>
          <div className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md inline-block mt-1">
            {language === "en" ? "Development Mode" : "Vývojový režim"}
          </div>
        </div>
      </div>

      <div className="space-y-8 px-4">
        <div className="rounded-3xl bg-[#1E3E2B] p-5 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#DFBA73]">
                {language === "en" ? "Host setup" : "Nastavenie hostiteľa"}
              </p>
              <h2 className="mt-1 text-lg font-bold">{setupCopy.title}</h2>
            </div>
            <span className="text-sm font-bold">{setupDisplayPercent}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#DFBA73] transition-all duration-500"
              style={{ width: `${setupDisplayPercent}%` }}
            />
          </div>
          <button
            type="button"
            onClick={setupCopy.onClick}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#1E3E2B] transition-colors hover:bg-[#F8F4EA]"
          >
            {setupCopy.action}
            <ChevronRight size={17} />
          </button>
        </div>

        <div>
          <h2 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-2">
            {language === "en" ? "Hosting" : "Hosťovanie"}
          </h2>
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={openNewListing}
              className="w-full flex min-h-12 items-center gap-4 px-5 py-4 text-left bg-white active:bg-neutral-50 transition-colors border-b border-neutral-100"
            >
              <Plus size={22} className="text-[#1E3E2B]" />
              <span className="flex-1 text-[15px] font-bold text-[#1E3E2B]">{language === "en" ? "Add listing" : "Pridať ponuku"}</span>
              <ChevronRight size={20} className="text-neutral-300" />
            </button>
            {HOST_SETTINGS_ITEMS.map((item) => (
              <Link
                key={item.id}
                {...linkProps(item.href)}
                className="w-full flex min-h-12 items-center gap-4 px-5 py-4 text-left bg-white active:bg-neutral-50 transition-colors border-b border-neutral-100"
              >
                <item.icon size={22} className="text-[#1E3E2B]" />
                <span className="flex-1 text-[15px] font-bold text-[#1E3E2B]">{item.label[language]}</span>
                <ChevronRight size={20} className="text-neutral-300" />
              </Link>
            ))}
            <Link
              href={HOST_GUIDE_PATH}
              className="w-full flex min-h-12 items-center gap-4 px-5 py-4 text-left bg-white active:bg-neutral-50 transition-colors"
            >
              <BookOpenText size={22} className="text-[#1E3E2B]" />
              <span className="flex-1 text-[15px] font-bold text-[#1E3E2B]">{language === "en" ? "Host Guide" : "Príručka"}</span>
              <ChevronRight size={20} className="text-neutral-300" />
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-2">{language === "en" ? "Account" : "Účet"}</h2>
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm mb-6">
            <button type="button" onClick={handleOpenAccount} disabled={switching} className="w-full flex min-h-12 items-center gap-4 px-5 py-4 text-left active:bg-neutral-50 border-b border-neutral-100 transition-colors disabled:opacity-60">
              <KeyRound size={22} className="text-[#1E3E2B]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-[#1E3E2B]">{language === "en" ? "Personal details & password" : "Osobné údaje a heslo"}</span>
                <span className="block text-[12px] font-medium text-neutral-500">{language === "en" ? "Shared account · opens in Travel mode" : "Spoločný účet · otvorí sa v režime cestovateľa"}</span>
              </span>
              <ChevronRight size={20} className="text-neutral-300" />
            </button>
            <button type="button" onClick={() => handleSwitchToTravel()} disabled={switching} className="w-full flex min-h-12 items-center gap-4 px-5 py-4 text-left active:bg-neutral-50 border-b border-neutral-100 transition-colors disabled:opacity-60">
              {switching ? <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" /> : <ArrowLeft size={22} className="text-neutral-500" />}
              <span className="flex-1 text-[15px] font-bold text-[#1E3E2B]">{language === "en" ? "Switch to Travel" : "Prepnúť na Cestovanie"}</span>
            </button>
            <button type="button" onClick={handleBackToWeb} className="w-full flex min-h-12 items-center gap-4 px-5 py-4 text-left active:bg-neutral-50 transition-colors">
              <Undo size={22} className="text-neutral-500" />
              <span className="flex-1 text-[15px] font-bold text-neutral-600">{language === "en" ? "Return to Web" : "Návrat na web"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case "listings":
        return (
          <AccommodationsList
            onOpen={openListing}
            onCreate={openNewListing}
          />
        );
      case "listing":
        return (
          <AccommodationForm
            accommodationId={location?.listingId ?? null}
            openReview={Boolean(location?.review)}
            openStep={location?.step ?? null}
            onBack={backToListings}
            onCreated={(id) => rawNavigate(hostPaths.listing(id), { replace: true })}
            onReviewDismiss={() => {
              if (location?.listingId) rawNavigate(hostPaths.listing(location.listingId), { replace: true });
            }}
          />
        );
      case "calendar":
        // Keyed by listing id so switching properties remounts with fresh
        // local state; nothing from the previous property can linger.
        return location?.listingId ? (
          <HostCalendarPage key={location.listingId} listingId={location.listingId} language={language} />
        ) : (
          <CalendarHome language={language} />
        );
      case "reservations":
        return <ReservationsPage filters={location?.filters ?? null} language={language} />;
      case "reservation":
        return (
          <ReservationDetailPage
            key={location.reservationId}
            reservationId={location.reservationId}
            language={language}
          />
        );
      case "profile":
        return <HostProfilePage language={language} onOpenAccount={handleOpenAccount} openingAccount={switching} />;
      case "payouts":
        return <HostPayoutsPage language={language} />;
      case "messages":
        return <MessagesPage filters={location?.filters ?? null} language={language} />;
      case "conversation":
        return <ConversationPage key={location.conversationId} conversationId={location.conversationId} language={language} />;
      case "menu":
        return renderMobileMenu();
      case "today":
      default:
        return (
          <Overview filters={location?.filters ?? null} />
        );
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-[#FAFAFA] font-sans">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 w-[280px] h-screen bg-[#1E3E2B] text-white flex-col shadow-2xl z-40">
        <div className="p-5 border-b border-white/10 shrink-0">
          <Link {...linkProps("/")} className="block mb-6">
            <img src="/putko.png" alt="Putko" className="h-8 brightness-0 invert" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#DFBA73] text-[#1E3E2B] flex items-center justify-center font-bold text-xl shadow-inner">
              {hostInitial}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#DFBA73] font-bold uppercase tracking-widest">{language === "en" ? "Dev Mode" : "Vývoj"}</div>
              <div className="text-[15px] font-bold text-white leading-tight truncate">{language === "en" ? "Host Workspace" : "Pracovisko hostiteľa"}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-4 custom-scrollbar space-y-6">
          <nav aria-label={language === "en" ? "Host navigation" : "Navigácia hostiteľa"}>
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 px-3">{language === "en" ? "Main" : "Hlavné"}</div>
            <ul className="space-y-1">
              {NAV_ITEMS.map((tab) => {
                const active = isActive(tab.id) || (tab.id === "listings" && editorOpen);
                return (
                  <li key={tab.id}>
                    <Link {...linkProps(tab.href)} aria-current={active ? "page" : undefined} className={navButtonClass(active)}>
                      <tab.icon size={20} className={active ? "text-[#1E3E2B]" : "text-[#DFBA73]"} strokeWidth={active ? 2.5 : 2} />
                      <span className="flex-1 text-[15px]">{tab.label[language]}</span>
                      {tab.badge > 0 && (
                        <span
                          aria-label={tab.badgeLabel[language === "en" ? "en" : "sk"](tab.badge)}
                          className={`min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${active ? "bg-[#1E3E2B] text-[#DFBA73]" : "bg-[#DFBA73] text-[#1E3E2B]"}`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button type="button" onClick={openNewListing} className={navButtonClass(false)}>
                  <Plus size={20} className="text-[#DFBA73]" />
                  <span className="text-[15px]">{language === "en" ? "Add listing" : "Pridať ponuku"}</span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#DFBA73]">
                  {language === "en" ? "Next step" : "Ďalší krok"}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{setupCopy.title}</p>
              </div>
              <span className="text-xs font-bold text-white/70">{setupDisplayPercent}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[#DFBA73]" style={{ width: `${setupDisplayPercent}%` }} />
            </div>
            <button
              type="button"
              onClick={setupCopy.onClick}
              className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-white/15"
            >
              {setupCopy.action}
              <ChevronRight size={15} />
            </button>
          </div>

          <div>
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 px-3">{language === "en" ? "Host settings" : "Nastavenia hostiteľa"}</div>
            <ul className="space-y-1">
              {HOST_SETTINGS_ITEMS.map((item) => {
                const active = isActive(item.id);
                return (
                  <li key={item.id}>
                    <Link {...linkProps(item.href)} aria-current={active ? "page" : undefined} className={navButtonClass(active)}>
                      <item.icon size={20} className={active ? "text-[#1E3E2B]" : "text-[#DFBA73]"} strokeWidth={active ? 2.5 : 2} />
                      <span className="flex-1 text-[15px]">{item.label[language]}</span>
                    </Link>
                  </li>
                );
              })}
              <li>
                <button type="button" onClick={handleOpenAccount} disabled={switching} className={`${navButtonClass(false)} disabled:opacity-60`}>
                  <KeyRound size={20} className="text-[#DFBA73]" />
                  <span className="flex-1 text-[15px]">{language === "en" ? "Personal details & password" : "Osobné údaje a heslo"}</span>
                </button>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 px-3">{language === "en" ? "Help" : "Pomoc"}</div>
            <ul className="space-y-1">
              <li>
                <Link {...linkProps(HOST_GUIDE_PATH)} className={navButtonClass(false)}>
                  <BookOpenText size={20} className="text-[#DFBA73]" />
                  <span className="text-[15px]">{language === "en" ? "Host Guide" : "Príručka"}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 shrink-0 space-y-2 bg-black/10">
          <button type="button" onClick={() => handleSwitchToTravel()} disabled={switching} className="w-full flex min-h-11 items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white/90 text-[14px] font-bold hover:bg-white/10 transition-colors disabled:opacity-60">
            {switching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowLeft size={18} />}
            {language === "en" ? "Switch to Travel" : "Prepnúť na Cestovanie"}
          </button>
          <button type="button" onClick={handleBackToWeb} className="w-full flex min-h-11 items-center justify-center gap-2 py-3 text-white/50 text-[13px] font-bold hover:text-white transition-colors">
            <Undo size={16} />
            {language === "en" ? "Return to Web" : "Návrat na web"}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col lg:ml-[280px] min-h-0 min-w-0 bg-[#FAFAFA] relative">

        {/* Mobile Top Header */}
        {section !== "menu" && !editorOpen && (
          <header className="lg:hidden sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur-md shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {language === "en" ? "Host" : "Hostiteľ"}
              </p>
              <p className="max-w-[230px] truncate text-sm font-bold text-[#1E3E2B]">{activeMobileLabel}</p>
            </div>
            <img src="/putko.png" alt="Putko" className="h-6" />
          </header>
        )}

        {/* Page Content */}
        <main className="flex-1 w-full overflow-x-hidden overflow-y-auto px-0 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {renderContent()}
        </main>

        {/* Mobile Bottom Nav */}
        {!editorOpen && (
          <nav aria-label={language === "en" ? "Host navigation" : "Navigácia hostiteľa"} className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-around h-[72px] px-2">
              {MOBILE_TABS.map((tab) => {
                const active = isActive(tab.id);
                return (
                  <Link
                    key={tab.id}
                    {...linkProps(tab.href)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${active ? "text-[#1E3E2B]" : "text-neutral-400 hover:text-neutral-800"}`}
                  >
                    <span className="relative">
                      <tab.icon size={26} className={active ? "text-[#DFBA73] fill-[#DFBA73]/20" : ""} strokeWidth={active ? 2.5 : 2} />
                      {tab.badge > 0 && (
                        <span
                          aria-label={tab.badgeLabel[language === "en" ? "en" : "sk"](tab.badge)}
                          className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white"
                        >
                          {tab.badge > 9 ? "9+" : tab.badge}
                        </span>
                      )}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wide ${active ? "font-bold" : "font-semibold"}`}>{tab.label[language]}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

      </div>

    </div>
  );
}
