import React, { useContext } from "react";
import { FormContext } from "../../FormContext";
import { Calendar, Info } from "lucide-react";

export default function CalendarSync({ onMenuClick }) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1E3E2B]">
          {language === "en" ? "Calendar Synchronization" : "Synchronizácia kalendára"}
        </h1>
        <p className="text-neutral-500 mt-1">
          {language === "en" 
            ? "Manage calendar feeds across your properties." 
            : "Spravujte kanály kalendára vo vašich ubytovaniach."}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 p-8 md:p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-[#1E3E2B]/5 text-[#1E3E2B] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Calendar size={32} />
        </div>
        
        <h2 className="text-xl font-semibold text-[#1E3E2B] mb-3">
          {language === "en" 
            ? "Configured Per Accommodation" 
            : "Konfigurácia pre každé ubytovanie zvlášť"}
        </h2>
        
        <p className="text-neutral-500 mb-8 max-w-md mx-auto">
          {language === "en"
            ? "Calendar sync (iCal) is now managed directly within the settings of each individual property to ensure accurate availability."
            : "Synchronizácia kalendára (iCal) sa teraz spravuje priamo v nastaveniach každého ubytovania pre zabezpečenie presnej dostupnosti."}
        </p>

        <button
          type="button"
          onClick={() => onMenuClick("Accommodation")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1E3E2B] text-white font-medium hover:bg-[#163021] transition-colors"
        >
          {language === "en" ? "Go to Accommodations" : "Prejsť na Ubytovania"}
        </button>
      </div>

      <div className="mt-6 bg-[#F3F9F7] text-[#1E3E2B] p-4 rounded-xl flex items-start gap-3 border border-[#C5E1D8]">
        <Info size={20} className="shrink-0 mt-0.5 text-[#238869]" />
        <p className="text-sm leading-relaxed">
          {language === "en" 
            ? "In the accommodation editor, go to Step 8 (Calendar & Payouts) to connect your calendar feeds." 
            : "V editore ubytovania prejdite na Krok 8 (Kalendár a výplaty), kde môžete pripojiť kanály kalendára."}
        </p>
      </div>
    </div>
  );
}
