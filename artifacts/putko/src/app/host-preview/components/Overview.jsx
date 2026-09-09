import React, { useContext, useMemo } from "react";
import { FormContext } from "../../FormContext";
import {
  House, ArrowRight, CheckCircle2, AlertCircle, Plus, BookOpenText, RefreshCw,
} from "lucide-react";
import Link from "@/app/components/NextLink";
import { useHostListings } from "../../host/HostListingsContext";
import {
  countAttentionListings,
  countByStatus,
  listingDisplayPercent,
  listingName,
  nextStepTitle,
  selectPriorityListing,
} from "../../host/hostListingModel";

const HOST_GUIDE_PATH = "/user-guide";

export default function Overview({ onOpenListing, onCreateListing, onOpenListings }) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const en = language === "en";
  const { listings, loaded, loading, error, refresh } = useHostListings();

  const counts = useMemo(() => countByStatus(listings), [listings]);
  const target = useMemo(() => selectPriorityListing(listings), [listings]);
  const attention = countAttentionListings(listings);

  const showLoading = !loaded && loading;
  const showError = !loaded && !loading && error;

  const getPriority = () => {
    if (showLoading || showError) return null;
    if (listings.length === 0) {
      return {
        type: "new",
        title: en ? "Create your first listing" : "Vytvorte svoju prvú ponuku",
        desc: en ? "Start earning by sharing your space." : "Začnite zarábať zdieľaním svojho priestoru.",
        action: en ? "Get started" : "Začať",
        onClick: onCreateListing,
        icon: Plus,
        color: "text-[#DFBA73]",
        bg: "bg-[#DFBA73]/10",
        border: "border-[#DFBA73]/20",
        btnColor: "bg-[#DFBA73] text-[#1E3E2B] hover:bg-[#c9a561]",
      };
    }
    const name = listingName(target, language);
    const others = attention - 1;
    const othersCopy =
      others > 0
        ? en
          ? ` · ${others} more ${others === 1 ? "listing needs" : "listings need"} attention`
          : ` · ${others === 1 ? "ešte 1 ponuka potrebuje" : others < 5 ? `ešte ${others} ponuky potrebujú` : `ešte ${others} ponúk potrebuje`} pozornosť`
        : "";
    if (target.status === "READY") {
      return {
        type: "ready",
        title: en ? "Ready to publish" : "Pripravené na zverejnenie",
        desc: `${name}${othersCopy}`,
        action: en ? "Review and publish" : "Skontrolovať a zverejniť",
        onClick: () => onOpenListing(target.id, { review: true }),
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        btnColor: "bg-green-600 text-white hover:bg-green-700",
      };
    }
    if (target.status === "DRAFT") {
      const step = nextStepTitle(target, language);
      const percent = listingDisplayPercent(target);
      return {
        type: "draft",
        title: en ? "Finish your listing" : "Dokončite svoju ponuku",
        desc: `${name} · ${percent}%${step ? ` · ${en ? "Next" : "Ďalej"}: ${step}` : ""}${othersCopy}`,
        action: en ? "Continue setup" : "Pokračovať v nastavení",
        onClick: () => onOpenListing(target.id),
        icon: AlertCircle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        btnColor: "bg-amber-500 text-white hover:bg-amber-600",
      };
    }
    return {
      type: "all_good",
      title: en ? "All listings are live" : "Všetky ponuky sú zverejnené",
      desc: en
        ? `${name} · Keep your listing details up to date.`
        : `${name} · Udržujte údaje o ponukách aktuálne.`,
      action: en ? "Manage listing" : "Spravovať ponuku",
      onClick: () => onOpenListing(target.id),
      icon: House,
      color: "text-[#1E3E2B]",
      bg: "bg-white",
      border: "border-neutral-200",
      btnColor: "bg-neutral-100 text-[#1E3E2B] hover:bg-neutral-200",
    };
  };

  const priority = getPriority();

  const STATUS_TILES = [
    { key: "DRAFT", label: { en: "Drafts", sk: "Koncepty" }, tone: "text-amber-600" },
    { key: "READY", label: { en: "Ready", sk: "Pripravené" }, tone: "text-green-600" },
    { key: "LIVE", label: { en: "Live", sk: "Zverejnené" }, tone: "text-[#1E3E2B]" },
  ];

  const quickActionClass =
    "flex min-h-11 flex-col items-start p-5 bg-white border border-neutral-200 rounded-3xl hover:border-[#DFBA73] hover:shadow-md transition-all group text-left";
  const quickIconClass =
    "p-3 bg-neutral-50 text-neutral-600 rounded-2xl group-hover:bg-[#DFBA73]/10 group-hover:text-[#DFBA73] transition-colors mb-5";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 animate-fadeIn space-y-8">
      <div className="pt-2 md:pt-4">
        <h1 className="text-3xl font-bold text-[#1E3E2B] tracking-tight">
          {en ? "Welcome back" : "Vitajte späť"}
        </h1>
        <p className="text-neutral-500 mt-2 text-[16px]">
          {en ? "Here's what's happening with your properties today." : "Tu je prehľad vašich ubytovaní na dnes."}
        </p>
      </div>

      {showLoading ? (
        <div className="w-full h-40 bg-neutral-100 rounded-3xl animate-pulse" aria-busy="true" />
      ) : showError ? (
        <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-red-700">
              {en ? "We couldn't load your listings" : "Nepodarilo sa načítať vaše ponuky"}
            </h2>
            <p className="text-sm text-red-600 mt-1">
              {en ? "Check your connection and try again." : "Skontrolujte pripojenie a skúste to znova."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {en ? "Retry" : "Skúsiť znova"}
          </button>
        </div>
      ) : priority ? (
        <div className={`relative overflow-hidden rounded-3xl border ${priority.border} ${priority.bg} p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm transition-all`}>
          <div className="flex items-start gap-5 min-w-0">
            <div className={`p-4 rounded-2xl bg-white shadow-sm shrink-0 ${priority.color}`}>
              <priority.icon size={32} />
            </div>
            <div className="min-w-0">
              <h2 className={`text-xl font-bold mb-1.5 ${priority.type === "all_good" ? "text-[#1E3E2B]" : "text-neutral-900"}`}>{priority.title}</h2>
              <p className="text-neutral-600 text-[15px] max-w-md leading-relaxed break-words">{priority.desc}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={priority.onClick}
            className={`shrink-0 inline-flex min-h-12 items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-colors shadow-sm w-full md:w-auto ${priority.btnColor}`}
          >
            {priority.action}
            <ArrowRight size={18} />
          </button>
        </div>
      ) : null}

      {loaded && listings.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-[#1E3E2B] mb-4 px-1">{en ? "Your listings" : "Vaše ponuky"}</h3>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {STATUS_TILES.map((tile) => (
              <button
                type="button"
                key={tile.key}
                onClick={onOpenListings}
                className="min-h-11 rounded-3xl border border-neutral-200 bg-white p-4 md:p-5 text-left hover:border-[#DFBA73] transition-colors"
              >
                <div className={`text-2xl md:text-3xl font-bold ${tile.tone}`}>{counts[tile.key]}</div>
                <div className="text-[12px] md:text-[13px] font-semibold text-neutral-500 mt-1">{tile.label[language]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-[#1E3E2B] mb-4 px-1">{en ? "Quick actions" : "Rýchle akcie"}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <button type="button" onClick={onOpenListings} className={quickActionClass}>
            <div className={quickIconClass}><House size={24} /></div>
            <span className="font-bold text-[#1E3E2B] text-[15px] mb-1">{en ? "Listings" : "Ponuky"}</span>
            <span className="text-[13px] text-neutral-500 font-medium">
              {!loaded
                ? "…"
                : en
                  ? `${listings.length} ${listings.length === 1 ? "property" : "properties"}`
                  : `${listings.length} ${listings.length === 1 ? "ubytovanie" : listings.length >= 2 && listings.length <= 4 ? "ubytovania" : "ubytovaní"}`}
            </span>
          </button>
          <button type="button" onClick={onCreateListing} className={quickActionClass}>
            <div className={quickIconClass}><Plus size={24} /></div>
            <span className="font-bold text-[#1E3E2B] text-[15px] mb-1">{en ? "Add listing" : "Pridať ponuku"}</span>
            <span className="text-[13px] text-neutral-500 font-medium">{en ? "Start a new draft" : "Nový koncept"}</span>
          </button>
          <Link href={HOST_GUIDE_PATH} className={`${quickActionClass} col-span-2 lg:col-span-1`}>
            <div className={quickIconClass}><BookOpenText size={24} /></div>
            <span className="font-bold text-[#1E3E2B] text-[15px] mb-1">{en ? "Host guide" : "Príručka hostiteľa"}</span>
            <span className="text-[13px] text-neutral-500 font-medium">{en ? "Tips for a strong listing" : "Tipy pre kvalitnú ponuku"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
