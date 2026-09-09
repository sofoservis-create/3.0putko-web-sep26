import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../../FormContext";
import { Plus, Home, MapPin, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { listHostAccommodations, deleteHostAccommodation } from "../../utlis/guestAccountApi";
import { toast } from "react-toastify";

export default function AccommodationsList({ onOpen, onCreate, onChanged }) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequirements, setShowRequirements] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await listHostAccommodations();
      setAccommodations(res.accommodations || []);
    } catch (err) {
      toast.error(language === "en" ? "Failed to load accommodations" : "Nepodarilo sa načítať ubytovania");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(language === "en" ? "Delete this accommodation?" : "Vymazať toto ubytovanie?")) return;
    try {
      await deleteHostAccommodation(id);
      toast.success(language === "en" ? "Deleted" : "Vymazané");
      onChanged?.();
      loadData();
    } catch (err) {
      toast.error(language === "en" ? "Failed to delete" : "Nepodarilo sa vymazať");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 pt-2 md:pt-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1E3E2B] tracking-tight">
            {language === "en" ? "Listings" : "Ponuky"}
          </h1>
          <p className="text-neutral-500 mt-2 text-[15px]">
            {language === "en" ? "Manage your properties and drafts." : "Spravujte svoje ubytovania a koncepty."}
          </p>
        </div>
        {accommodations.length > 0 && (
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#DFBA73] text-[#1E3E2B] font-bold hover:bg-[#c9a561] transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus size={20} />
            {language === "en" ? "Add Listing" : "Pridať ponuku"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="bg-white border border-neutral-200 rounded-3xl h-80" />)}
        </div>
      ) : accommodations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-200 p-8 md:p-16 text-center flex flex-col items-center shadow-sm">
          <div className="w-24 h-24 bg-[#DFBA73]/10 text-[#DFBA73] rounded-full flex items-center justify-center mb-8">
            <Home size={40} />
          </div>
          <h3 className="text-2xl font-bold text-[#1E3E2B] mb-3">
            {language === "en" ? "Add your first accommodation" : "Pridajte svoje prvé ubytovanie"}
          </h3>
          <p className="text-neutral-500 mb-10 max-w-sm text-[16px] leading-relaxed">
            {language === "en" 
              ? "Set aside about 10 minutes. You will need property details, photos, pricing, availability, and payout readiness."
              : "Vyhraďte si približne 10 minút. Budete potrebovať údaje o ubytovaní, fotografie, ceny, dostupnosť a nastavenie výplat."}
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#1E3E2B] text-white font-bold hover:bg-[#163021] transition-colors w-full sm:w-auto shadow-md"
          >
            <Plus size={20} />
            {language === "en" ? "Start" : "Začať"}
          </button>
          <button
            type="button"
            onClick={() => setShowRequirements((current) => !current)}
            aria-expanded={showRequirements}
            className="mt-4 min-h-11 px-4 text-sm font-bold text-[#1E3E2B] underline decoration-[#DFBA73] decoration-2 underline-offset-4"
          >
            {language === "en" ? "What will I need?" : "Čo budem potrebovať?"}
          </button>
          {showRequirements && (
            <div className="mt-3 max-w-md rounded-2xl bg-[#F8F4EA] p-4 text-left text-sm leading-6 text-neutral-700">
              {language === "en"
                ? "Address and capacity, amenities, at least one photo, nightly price, house rules, availability, calendar choice, and payout acknowledgement."
                : "Adresu a kapacitu, vybavenie, aspoň jednu fotografiu, cenu za noc, pravidlá, dostupnosť, voľbu kalendára a potvrdenie výplat."}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-24 md:pb-8">
          {accommodations.map(acc => {
            const isLive = acc.status === "LIVE";
            const isReady = acc.status === "READY";
            const isDraft = acc.status === "DRAFT";

            return (
              <div key={acc.id} className="bg-white rounded-3xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all group flex flex-col relative">
                <div className="aspect-[4/3] bg-neutral-100 relative">
                  {acc.data.photoUrls?.[0] ? (
                    <img
                      src={acc.data.photoUrls[0]}
                      className="w-full h-full object-cover"
                      alt={acc.data.name || (language === "en" ? "Accommodation" : "Ubytovanie")}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-100">
                      <Home size={48} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <div className={`px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-lg shadow-md backdrop-blur-md flex items-center gap-1.5 ${
                      isLive ? "bg-green-500/90 text-white" :
                      isReady ? "bg-white/90 text-green-700" :
                      "bg-white/90 text-neutral-600"
                    }`}>
                      {isLive && <CheckCircle2 size={14} />}
                      {isReady && <CheckCircle2 size={14} />}
                      {isDraft && <AlertCircle size={14} />}
                      {isLive
                        ? (language === "en" ? "Live" : "Aktívne")
                        : isReady
                          ? (language === "en" ? "Ready" : "Pripravené")
                          : (language === "en" ? "Draft" : "Koncept")}
                    </div>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-[#1E3E2B] mb-1.5 line-clamp-1">
                    {acc.data.name || (language === "en" ? "Unnamed Property" : "Ubytovanie bez názvu")}
                  </h3>
                  <div className="flex items-center text-[14px] font-medium text-neutral-500 mb-6 gap-1.5">
                    <MapPin size={16} />
                    <span className="line-clamp-1">{[acc.data.city, acc.data.country].filter(Boolean).join(", ") || (language === "en" ? "Location missing" : "Lokalita chýba")}</span>
                  </div>

                  <div className="mt-auto">
                    {isDraft && (
                      <div className="mb-5 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                        <div className="flex justify-between text-xs font-bold text-neutral-600 mb-2">
                          <span>{language === "en" ? "Setup progress" : "Priebeh nastavenia"}</span>
                          <span>{acc.completionPercent}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-[#DFBA73] h-full rounded-full transition-all duration-500" style={{ width: `${acc.completionPercent}%` }} />
                        </div>
                        {acc.missingRequirements?.[0] && (
                          <p className="mt-2 text-xs font-medium text-neutral-500">
                            {language === "en" ? "Next required item: " : "Ďalej doplňte: "}
                            {acc.missingRequirements[0]}
                          </p>
                        )}
                        {acc.updatedAt && (
                          <p className="mt-1 text-xs text-neutral-400">
                            {language === "en" ? "Saved " : "Uložené "}
                            {new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sk-SK", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(acc.updatedAt))}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => onOpen(acc.id, { review: isReady })}
                        className="flex-1 px-4 py-3.5 bg-neutral-50 hover:bg-[#1E3E2B] text-[#1E3E2B] hover:text-white rounded-xl text-[14px] font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        {isDraft
                          ? (language === "en" ? "Continue setup" : "Pokračovať")
                          : isReady
                            ? (language === "en" ? "Review and publish" : "Skontrolovať a zverejniť")
                            : (language === "en" ? "Manage" : "Spravovať")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id)}
                        className="p-3.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                        title={language === "en" ? "Delete" : "Vymazať"}
                        aria-label={language === "en" ? "Delete" : "Vymazať"}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
