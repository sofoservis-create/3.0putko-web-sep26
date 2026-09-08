"use client";

import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { FormContext } from "../FormContext";
import {
  ArrowLeft, Home, ShieldCheck, CreditCard, LayoutDashboard,
  ClipboardList, User, CalendarDays, RefreshCcw, Pencil,
  LockKeyhole, BookOpenText, MessageCircle, Menu as MenuIcon, Undo, House, ChevronRight
} from "lucide-react";
import { toast } from "react-toastify";
import Link from "@/app/components/NextLink";
import ProtectedRoute from "../ProtectedRoute";

// Import components
import Overview from "./components/Overview";
import AccommodationsList from "./components/AccommodationsList";
import PlaceholderState from "./components/PlaceholderState";
import StripePayments from "./components/StripePayments";
import CalendarSync from "./components/CalendarSync";
import { listHostAccommodations } from "../utlis/guestAccountApi";

export default function HostWorkspace() {
  const { switchMode, user } = useContext(AuthContext);
  const { lang } = useContext(FormContext);
  const language = lang || "sk";

  const [startFirstAccommodation] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("putko:start-host-onboarding") === "true",
  );

  const [activePage, setActivePage] = useState("Overview");
  const [formAction, setFormAction] = useState(startFirstAccommodation ? "new" : null);
  const [accommodationFormOpen, setAccommodationFormOpen] = useState(startFirstAccommodation);
  const [hostAccommodations, setHostAccommodations] = useState([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (startFirstAccommodation) {
      localStorage.removeItem("putko:start-host-onboarding");
      setActivePage("Accommodation");
    }
  }, [startFirstAccommodation]);

  const handleSwitchToTravel = async () => {
    setSwitching(true);
    try {
      await switchMode("guest");
      toast.success(
        language === "en"
          ? "Switched to Travel Mode."
          : "Prepnuto do režimu cestovateľa."
      );
      window.location.href = "/account";
    } catch (error) {
      toast.error(error.message || "Failed to switch mode.");
    } finally {
      setSwitching(false);
    }
  };

  const handleBackToWeb = () => {
    window.location.href = "/";
  };

  const handleMenuClick = (page, action = null) => {
    setActivePage(page);
    setFormAction(action);
    setAccommodationFormOpen(page === "Accommodation" && Boolean(action));
    window.scrollTo(0, 0);
  };

  const MOBILE_TABS = [
    { id: "Overview", icon: LayoutDashboard, label: { en: "Overview", sk: "Prehľad" } },
    { id: "Reservation requests", icon: ClipboardList, label: { en: "Bookings", sk: "Rezervácie" } },
    { id: "Occupancy calendar", icon: CalendarDays, label: { en: "Calendar", sk: "Kalendár" } },
    { id: "Accommodation", icon: House, label: { en: "Listings", sk: "Ponuky" } },
    { id: "Menu", icon: MenuIcon, label: { en: "Menu", sk: "Menu" } },
  ];

  const MENU_SECTIONS = [
    {
      title: { en: "Communication", sk: "Komunikácia" },
      items: [
        { id: "Messages", icon: MessageCircle, label: { en: "Messages", sk: "Správy" } },
      ]
    },
    {
      title: { en: "Host setup", sk: "Nastavenie hostiteľa" },
      items: [
        { id: "Calendar synchronization", icon: RefreshCcw, label: { en: "Calendar connections", sk: "Prepojenia kalendára" } },
        { id: "Payments", icon: CreditCard, label: { en: "Payments", sk: "Platby" } },
        { id: "MyProfile", icon: User, label: { en: "Public Profile", sk: "Verejný profil" } },
      ]
    },
    {
      title: { en: "Account & Support", sk: "Účet a podpora" },
      items: [
        { id: "EditProfile", icon: Pencil, label: { en: "Personal Details", sk: "Osobné údaje" } },
        { id: "ChangePassword", icon: LockKeyhole, label: { en: "Security", sk: "Bezpečnosť" } },
        { id: "UserGuide", icon: BookOpenText, label: { en: "Host Guide", sk: "Príručka" } },
      ]
    }
  ];

  useEffect(() => {
    listHostAccommodations()
      .then((result) => setHostAccommodations(result.accommodations || []))
      .catch(() => setHostAccommodations([]));
  }, [activePage, accommodationFormOpen]);

  const setupTarget =
    hostAccommodations.find((item) => item.status === "DRAFT") ||
    hostAccommodations.find((item) => item.status === "READY") ||
    hostAccommodations[0];
  const setupPercent = setupTarget?.completionPercent || 0;
  const setupCopy = !setupTarget
    ? {
        title: language === "en" ? "Add your first listing" : "Pridajte prvé ubytovanie",
        action: language === "en" ? "Start setup" : "Začať nastavenie",
        actionKey: "new",
      }
    : setupTarget.status === "DRAFT"
      ? {
          title: language === "en" ? "Finish your listing" : "Dokončite ubytovanie",
          action: language === "en" ? "Continue setup" : "Pokračovať v nastavení",
          actionKey: setupTarget.id,
        }
      : setupTarget.status === "READY"
        ? {
            title: language === "en" ? "Review and publish" : "Skontrolujte a zverejnite",
            action: language === "en" ? "Open listing" : "Otvoriť ubytovanie",
            actionKey: { id: setupTarget.id, review: true },
          }
        : {
            title: language === "en" ? "Host setup complete" : "Nastavenie je dokončené",
            action: language === "en" ? "Manage listings" : "Spravovať ubytovania",
            actionKey: null,
          };
  const setupDisplayPercent = setupTarget?.status === "LIVE" ? 100 : setupPercent;
  const hostInitial =
    user?.name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    "H";
  const activeMobileLabel =
    MOBILE_TABS.find((tab) => tab.id === activePage)?.label[language] ||
    MENU_SECTIONS.flatMap((section) => section.items).find((item) => item.id === activePage)?.label[language] ||
    (language === "en" ? "Host workspace" : "Pracovisko hostiteľa");

  const renderMobileMenu = () => (
    <div className="pb-8 animate-fadeIn max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-[#1E3E2B] px-4 mb-6 pt-2">{language === "en" ? "Menu" : "Menu"}</h1>

      <div className="px-4 flex items-center gap-5 mb-10">
        <div className="w-16 h-16 rounded-full bg-[#1E3E2B] flex items-center justify-center text-[#DFBA73] text-2xl font-bold shadow-md">
          {hostInitial}
        </div>
        <div>
          <div className="text-[16px] font-bold text-[#1E3E2B]">{language === "en" ? "Host Workspace" : "Pracovisko hostiteľa"}</div>
          <div className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md inline-block mt-1">{language === "en" ? "Development Mode" : "Vývojový režim"}</div>
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
            onClick={() => handleMenuClick("Accommodation", setupCopy.actionKey)}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#1E3E2B] transition-colors hover:bg-[#F8F4EA]"
          >
            {setupCopy.action}
            <ChevronRight size={17} />
          </button>
        </div>

        {MENU_SECTIONS.map((section, idx) => (
          <div key={idx}>
            <h2 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-2">{section.title[language]}</h2>
            <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
              {section.items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMenuClick(item.id)}
                  aria-current={activePage === item.id ? "page" : undefined}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left bg-white active:bg-neutral-50 transition-colors ${i !== section.items.length - 1 ? 'border-b border-neutral-100' : ''}`}
                >
                  <item.icon size={22} className="text-[#1E3E2B]" />
                  <span className="flex-1 text-[15px] font-bold text-[#1E3E2B]">{item.label[language]}</span>
                  <ChevronRight size={20} className="text-neutral-300" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h2 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-2">{language === "en" ? "Actions" : "Akcie"}</h2>
          <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm mb-6">
            <button type="button" onClick={handleSwitchToTravel} disabled={switching} className="w-full flex min-h-12 items-center gap-4 px-5 py-4 text-left active:bg-neutral-50 border-b border-neutral-100 transition-colors">
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
    switch (activePage) {
      case "Overview":
      case " ":
        return <Overview onMenuClick={handleMenuClick} />;
      case "Accommodation":
        return (
          <AccommodationsList
            initialFormId={formAction}
            setFormAction={setFormAction}
            onFormOpenChange={setAccommodationFormOpen}
            onNavigate={handleMenuClick}
          />
        );
      case "Payments":
        return <StripePayments onMenuClick={handleMenuClick} />;
      case "Calendar synchronization":
        return <CalendarSync onMenuClick={handleMenuClick} />;
      case "Menu":
        return renderMobileMenu();

      // Placeholders
      case "Reservation requests":
        return <PlaceholderState title={language === "en" ? "Reservations" : "Rezervácie"} description={language === "en" ? "View and manage incoming booking requests here." : "Prezerajte a spravujte prichádzajúce žiadosti o rezerváciu tu."} icon={ClipboardList} />;
      case "MyProfile":
        return <PlaceholderState title={language === "en" ? "Public Profile" : "Verejný profil"} description={language === "en" ? "This is how guests will see you on the platform." : "Takto vás uvidia hostia na platforme."} icon={User} />;
      case "Occupancy calendar":
        return <PlaceholderState title={language === "en" ? "Occupancy Calendar" : "Kalendár obsadenosti"} description={language === "en" ? "Manage blocked dates and seasonal pricing." : "Spravujte zablokované dátumy a sezónne ceny."} icon={CalendarDays} />;
      case "EditProfile":
        return <PlaceholderState title={language === "en" ? "Personal Details" : "Osobné údaje"} description={language === "en" ? "Manage your contact info and preferences." : "Spravujte svoje kontaktné údaje a preferencie."} icon={Pencil} />;
      case "ChangePassword":
        return <PlaceholderState title={language === "en" ? "Security" : "Bezpečnosť"} description={language === "en" ? "Update your password and secure your account." : "Aktualizujte si heslo a zabezpečte svoj účet."} icon={LockKeyhole} />;
      case "UserGuide":
        return <PlaceholderState title={language === "en" ? "Host Guide" : "Príručka"} description={language === "en" ? "Learn the best practices for hosting on Putko." : "Zistite najlepšie postupy pre hosťovanie na Putko."} icon={BookOpenText} />;
      case "Messages":
        return <PlaceholderState title={language === "en" ? "Messages" : "Správy"} description={language === "en" ? "Communicate with your guests." : "Komunikujte so svojimi hosťami."} icon={MessageCircle} />;
      default:
        return <Overview onMenuClick={handleMenuClick} />;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["host"]}>
      <div className="flex min-h-[100dvh] bg-[#FAFAFA] font-sans">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex fixed top-0 left-0 w-[280px] h-screen bg-[#1E3E2B] text-white flex-col shadow-2xl z-40">
          <div className="p-6 border-b border-white/10 shrink-0">
            <Link href="/" className="block mb-8">
              <img src="/putko.png" alt="Putko" className="h-8 brightness-0 invert" />
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#DFBA73] text-[#1E3E2B] flex items-center justify-center font-bold text-xl shadow-inner">
                {hostInitial}
              </div>
              <div>
                <div className="text-[10px] text-[#DFBA73] font-bold uppercase tracking-widest">{language === "en" ? "Dev Mode" : "Vývoj"}</div>
                <div className="text-[15px] font-bold text-white leading-tight">{language === "en" ? "Host Workspace" : "Pracovisko hostiteľa"}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar space-y-8">
            <div>
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 px-3">{language === "en" ? "Main" : "Hlavné"}</div>
              <ul className="space-y-1">
                {MOBILE_TABS.slice(0, 4).map(tab => {
                  const isActive = activePage === tab.id || (tab.id === "Overview" && activePage === " ");
                  return (
                    <li key={tab.id}>
                      <button type="button" onClick={() => handleMenuClick(tab.id)} aria-current={isActive ? "page" : undefined} className={`w-full flex min-h-11 items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${isActive ? 'bg-[#DFBA73] text-[#1E3E2B] font-bold shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white font-semibold'}`}>
                        <tab.icon size={20} className={isActive ? 'text-[#1E3E2B]' : 'text-[#DFBA73]'} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[15px]">{tab.label[language]}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

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
                onClick={() => handleMenuClick("Accommodation", setupCopy.actionKey)}
                className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-white/15"
              >
                {setupCopy.action}
                <ChevronRight size={15} />
              </button>
            </div>

            {MENU_SECTIONS.slice(0, 2).map((section, idx) => (
              <div key={idx}>
                <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3 px-3">{section.title[language]}</div>
                <ul className="space-y-1">
                  {section.items.map(item => {
                    const isActive = activePage === item.id;
                    return (
                      <li key={item.id}>
                        <button type="button" onClick={() => handleMenuClick(item.id)} aria-current={isActive ? "page" : undefined} className={`w-full flex min-h-11 items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${isActive ? 'bg-[#DFBA73] text-[#1E3E2B] font-bold shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white font-semibold'}`}>
                          <item.icon size={20} className={isActive ? 'text-[#1E3E2B]' : 'text-[#DFBA73]'} strokeWidth={isActive ? 2.5 : 2} />
                          <span className="text-[15px]">{item.label[language]}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10 shrink-0 space-y-2 bg-black/10">
            <details className="group mb-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-white/90 transition-colors hover:bg-white/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DFBA73] text-sm font-bold text-[#1E3E2B]">
                  {hostInitial}
                </span>
                <span className="flex-1">{language === "en" ? "Account & support" : "Účet a podpora"}</span>
                <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-2 space-y-1 rounded-xl bg-black/15 p-2">
                {MENU_SECTIONS[2].items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMenuClick(item.id)}
                    aria-current={activePage === item.id ? "page" : undefined}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-bold text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <item.icon size={17} className="text-[#DFBA73]" />
                    {item.label[language]}
                  </button>
                ))}
              </div>
            </details>
            <button type="button" onClick={handleSwitchToTravel} disabled={switching} className="w-full flex min-h-11 items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white/90 text-[14px] font-bold hover:bg-white/10 transition-colors">
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
          {activePage !== "Menu" && !accommodationFormOpen && (
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
          {!accommodationFormOpen && (
            <nav aria-label={language === "en" ? "Host navigation" : "Navigácia hostiteľa"} className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-around h-[72px] px-2">
                {MOBILE_TABS.map(tab => {
                  const isOverview = tab.id === "Overview" && (activePage === "Overview" || activePage === " ");
                  const isActive = isOverview || activePage === tab.id || (tab.id === "Menu" && MENU_SECTIONS.some(s => s.items.some(i => i.id === activePage)));

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleMenuClick(tab.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-11 flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? "text-[#1E3E2B]" : "text-neutral-400 hover:text-neutral-800"}`}
                    >
                      <tab.icon size={26} className={isActive ? "text-[#DFBA73] fill-[#DFBA73]/20" : ""} strokeWidth={isActive ? 2.5 : 2} />
                      <span className={`text-[10px] uppercase tracking-wide ${isActive ? "font-bold" : "font-semibold"}`}>{tab.label[language]}</span>
                    </button>
                  )
                })}
              </div>
            </nav>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
