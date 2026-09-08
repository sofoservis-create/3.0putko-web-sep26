import React, { useContext } from "react";
import { FormContext } from "../../FormContext";
import { CreditCard, Info } from "lucide-react";

export default function StripePayments({ onMenuClick }) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1E3E2B]">
          {language === "en" ? "Payments & Payouts" : "Platby a Výplaty"}
        </h1>
        <p className="text-neutral-500 mt-1">
          {language === "en" 
            ? "Manage payout settings for your properties." 
            : "Spravujte nastavenia výplat pre vaše ubytovania."}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 p-8 md:p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-[#DFBA73]/10 text-[#DFBA73] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CreditCard size={32} />
        </div>
        
        <h2 className="text-xl font-semibold text-[#1E3E2B] mb-3">
          {language === "en" 
            ? "Payout Settings Moved" 
            : "Nastavenia výplat boli presunuté"}
        </h2>
        
        <p className="text-neutral-500 mb-8 max-w-md mx-auto">
          {language === "en"
            ? "Payout acknowledgement and Stripe settings are managed individually per listing to allow different payout methods per property."
            : "Potvrdenia výplat a nastavenia Stripe sa spravujú individuálne pre každú ponuku, čo umožňuje rôzne spôsoby výplaty pre každú nehnuteľnosť."}
        </p>

        <button
          type="button"
          onClick={() => onMenuClick("Accommodation")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DFBA73] text-[#1E3E2B] font-medium hover:bg-[#c9a561] transition-colors shadow-sm shadow-[#DFBA73]/20"
        >
          {language === "en" ? "Go to Accommodations" : "Prejsť na Ubytovania"}
        </button>
      </div>

      <div className="mt-6 bg-[#FFF8F3] text-[#1E3E2B] p-4 rounded-xl flex items-start gap-3 border border-[#F2DAC9]">
        <Info size={20} className="shrink-0 mt-0.5 text-[#D9774B]" />
        <p className="text-sm leading-relaxed">
          {language === "en" 
            ? "In the accommodation editor, go to Step 8 (Calendar & Payouts) to acknowledge payout terms." 
            : "V editore ubytovania prejdite na Krok 8 (Kalendár a výplaty) pre potvrdenie podmienok výplat."}
        </p>
      </div>
    </div>
  );
}
