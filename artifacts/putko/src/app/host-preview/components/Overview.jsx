import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../../FormContext";
import {
  ClipboardList, CalendarDays, House, MessageCircle, ArrowRight, CheckCircle2,
  AlertCircle, Plus
} from "lucide-react";
import { listHostAccommodations } from "../../utlis/guestAccountApi";

export default function Overview({ onMenuClick }) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHostAccommodations()
      .then(res => setAccommodations(res.accommodations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getPriority = () => {
    if (loading) return null;
    if (accommodations.length === 0) {
      return {
        type: 'new',
        title: language === "en" ? "Create your first listing" : "Vytvorte svoju prvú ponuku",
        desc: language === "en" ? "Start earning by sharing your space." : "Začnite zarábať zdieľaním svojho priestoru.",
        action: language === "en" ? "Get started" : "Začať",
        page: "Accommodation",
        actionKey: "new",
        icon: Plus,
        color: "text-[#DFBA73]",
        bg: "bg-[#DFBA73]/10",
        border: "border-[#DFBA73]/20",
        btnColor: "bg-[#DFBA73] text-[#1E3E2B] hover:bg-[#c9a561]"
      };
    }
    const draft = accommodations.find(a => a.status === "DRAFT");
    if (draft) {
      return {
        type: 'draft',
        title: language === "en" ? "Finish your listing" : "Dokončite svoju ponuku",
        desc: draft.data.name || (language === "en" ? "Unnamed Property" : "Ubytovanie bez názvu"),
        action: language === "en" ? "Continue setup" : "Pokračovať",
        page: "Accommodation",
        actionKey: draft.id,
        icon: AlertCircle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        btnColor: "bg-amber-500 text-white hover:bg-amber-600"
      };
    }
    const ready = accommodations.find(a => a.status === "READY");
    if (ready) {
      return {
        type: 'ready',
        title: language === "en" ? "Ready to publish" : "Pripravené na zverejnenie",
        desc: ready.data.name || (language === "en" ? "Unnamed Property" : "Ubytovanie bez názvu"),
        action: language === "en" ? "Publish now" : "Zverejniť",
        page: "Accommodation",
        actionKey: { id: ready.id, review: true },
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        btnColor: "bg-green-600 text-white hover:bg-green-700"
      };
    }
    return {
      type: 'all_good',
      title: language === "en" ? "All listings are live" : "Všetky ponuky sú aktívne",
      desc: language === "en" ? "Keep your calendar up to date to avoid declined requests." : "Udržujte svoj kalendár aktuálny.",
      action: language === "en" ? "Manage calendar" : "Spravovať kalendár",
      page: "Occupancy calendar",
      icon: CalendarDays,
      color: "text-[#1E3E2B]",
      bg: "bg-white",
      border: "border-neutral-200",
      btnColor: "bg-neutral-100 text-[#1E3E2B] hover:bg-neutral-200"
    };
  };

  const priority = getPriority();

  const QUICK_LINKS = [
    { id: "Reservation requests", icon: ClipboardList, label: { en: "Reservations", sk: "Rezervácie" }, desc: { en: "Manage stays", sk: "Spravovať pobyty" } },
    { id: "Occupancy calendar", icon: CalendarDays, label: { en: "Calendar", sk: "Kalendár" }, desc: { en: "Availability", sk: "Dostupnosť" } },
    { id: "Accommodation", icon: House, label: { en: "Listings", sk: "Ponuky" }, desc: { en: accommodations.length + " properties", sk: accommodations.length + " ubytovaní" } },
    { id: "Messages", icon: MessageCircle, label: { en: "Messages", sk: "Správy" }, desc: { en: "Inbox", sk: "Doručená pošta" } }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 animate-fadeIn space-y-8">
      {/* Greeting */}
      <div className="pt-2 md:pt-4">
        <h1 className="text-3xl font-bold text-[#1E3E2B] tracking-tight">
          {language === "en" ? "Welcome back" : "Vitajte späť"}
        </h1>
        <p className="text-neutral-500 mt-2 text-[16px]">
          {language === "en" ? "Here's what's happening with your properties today." : "Tu je prehľad vašich ubytovaní na dnes."}
        </p>
      </div>

      {/* Priority Card */}
      {loading ? (
        <div className="w-full h-40 bg-neutral-100 rounded-3xl animate-pulse" />
      ) : priority ? (
        <div className={`relative overflow-hidden rounded-3xl border ${priority.border} ${priority.bg} p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm transition-all`}>
          <div className="flex items-start gap-5">
            <div className={`p-4 rounded-2xl bg-white shadow-sm shrink-0 ${priority.color}`}>
              <priority.icon size={32} />
            </div>
            <div>
              <h2 className={`text-xl font-bold mb-1.5 ${priority.type === 'all_good' ? 'text-[#1E3E2B]' : 'text-neutral-900'}`}>{priority.title}</h2>
              <p className="text-neutral-600 text-[15px] max-w-md leading-relaxed">{priority.desc}</p>
            </div>
          </div>
          <button
            onClick={() => onMenuClick(priority.page, priority.actionKey)}
            className={`shrink-0 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-colors shadow-sm w-full md:w-auto ${priority.btnColor}`}
          >
            {priority.action}
            <ArrowRight size={18} />
          </button>
        </div>
      ) : null}

      {/* Quick Links Grid */}
      <div>
        <h3 className="text-lg font-bold text-[#1E3E2B] mb-4 px-1">{language === "en" ? "Quick actions" : "Rýchle akcie"}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {QUICK_LINKS.map((link) => (
            <button
              type="button"
              key={link.id}
              onClick={() => onMenuClick(link.id)}
              className="flex flex-col items-start p-5 bg-white border border-neutral-200 rounded-3xl hover:border-[#DFBA73] hover:shadow-md transition-all group text-left"
            >
              <div className="p-3 bg-neutral-50 text-neutral-600 rounded-2xl group-hover:bg-[#DFBA73]/10 group-hover:text-[#DFBA73] transition-colors mb-5">
                <link.icon size={24} />
              </div>
              <span className="font-bold text-[#1E3E2B] text-[15px] mb-1">{link.label[language]}</span>
              <span className="text-[13px] text-neutral-500 font-medium">{link.desc[language]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
