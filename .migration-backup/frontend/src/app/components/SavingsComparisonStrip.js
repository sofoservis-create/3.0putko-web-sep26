"use client";

import { useContext, useEffect, useState } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

export default function SavingsComparisonStrip() {
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  useEffect(() => { setLanguage(lang || "sk"); }, [lang]);
  const t = language === "en" ? en : sk;

  const basePrice = 89;
  const platformFeeA = 18;
  const platformFeeB = 12;
  const putkoFee = 0;

  return (
    <section className="bg-[#F8FAF9] border-y border-[#2A2A2A0A] py-8 lg:py-10">
      <div className="container mx-auto px-4">

        {/* Heading */}
        <div className="text-center mb-6">
          <p className="font-inter text-xs font-semibold uppercase tracking-widest text-[#238869] mb-1">
            {t.Savings_Label || "Prečo platiť viac?"}
          </p>
          <h3 className="font-fraunces font-bold text-xl lg:text-2xl text-[#1A1A1A]">
            {t.Savings_Heading || "Ušetríte pri každej rezervácii"}
          </h3>
          <p className="font-inter text-sm text-[#737373] mt-1">
            {t.Savings_Subtitle || "Porovnanie konečnej ceny za rovnaké ubytovanie (€89/noc)"}
          </p>
        </div>

        {/* ── Mobile: single highlighted callout ── */}
        <div className="sm:hidden rounded-2xl border-2 border-[#238869] bg-[#F0FAF6] p-4 max-w-xs mx-auto">
          <div className="flex items-center justify-between gap-2">

            {/* Other platform side */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-inter text-[11px] text-[#737373]">
                {t.Savings_PlatformA || "Ostatné platformy"}
              </span>
              <span className="font-fraunces font-bold text-2xl text-[#ABABAB] line-through">
                €{basePrice + platformFeeA}
              </span>
            </div>

            {/* Arrow */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#238869] shrink-0">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>

            {/* Putko side */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-inter text-[11px] font-bold text-[#238869]">Putko</span>
              <span className="font-fraunces font-bold text-2xl text-[#238869]">
                €{basePrice}
              </span>
            </div>

            {/* Save badge */}
            <div className="flex flex-col items-center justify-center bg-[#238869] rounded-xl px-3 py-2 shrink-0">
              <span className="font-inter text-[10px] font-semibold text-white/80 uppercase tracking-wide">
                {t.Savings_Save || "UŠETRÍTE"}
              </span>
              <span className="font-fraunces font-bold text-2xl text-white leading-none">
                €{platformFeeA}
              </span>
            </div>
          </div>

          <p className="text-center font-inter text-[11px] text-[#238869]/70 mt-3">
            {t.Savings_MobileNote || "vs. iných platformách · rovnaké ubytovanie"}
          </p>
        </div>

        {/* ── Tablet+: 3-column comparison grid ── */}
        <div className="hidden sm:grid grid-cols-3 gap-3 lg:gap-5 max-w-xl mx-auto">

          {/* Platform A */}
          <div className="flex flex-col items-center text-center p-4 lg:p-5 rounded-2xl border border-[#E5E7EB] bg-white opacity-70">
            <span className="font-inter font-semibold text-xs text-[#737373] mb-3 truncate w-full text-center">
              {t.Savings_PlatformA || "Ostatné platformy"}
            </span>
            <div className="text-xs text-[#3A3A3A] space-y-0.5 mb-3">
              <div>€{basePrice} <span className="text-[#737373]">ubytovanie</span></div>
              <div className="text-[#E53935] font-medium">+€{platformFeeA} poplatok</div>
            </div>
            <div className="w-full h-px bg-[#E5E7EB] mb-3" />
            <span className="font-fraunces font-bold text-2xl text-[#3A3A3A]">
              €{basePrice + platformFeeA}
            </span>
          </div>

          {/* Platform B */}
          <div className="flex flex-col items-center text-center p-4 lg:p-5 rounded-2xl border border-[#E5E7EB] bg-white opacity-70">
            <span className="font-inter font-semibold text-xs text-[#737373] mb-3 truncate w-full text-center">
              {t.Savings_PlatformB || "Prenájom online"}
            </span>
            <div className="text-xs text-[#3A3A3A] space-y-0.5 mb-3">
              <div>€{basePrice} <span className="text-[#737373]">ubytovanie</span></div>
              <div className="text-[#E53935] font-medium">+€{platformFeeB} poplatok</div>
            </div>
            <div className="w-full h-px bg-[#E5E7EB] mb-3" />
            <span className="font-fraunces font-bold text-2xl text-[#3A3A3A]">
              €{basePrice + platformFeeB}
            </span>
          </div>

          {/* PUTKO — highlighted */}
          <div className="relative flex flex-col items-center text-center p-4 lg:p-5 rounded-2xl border-2 border-[#238869] bg-[#F0FAF6] shadow-sm shadow-[#238869]/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#238869] text-white text-[10px] font-bold font-inter px-2.5 py-0.5 rounded-full whitespace-nowrap">
                {t.Savings_Save || "UŠETRÍTE"} €{platformFeeA}
              </span>
            </div>
            <span className="font-inter font-bold text-xs text-[#238869] mb-3">
              Putko
            </span>
            <div className="text-xs text-[#3A3A3A] space-y-0.5 mb-3">
              <div>€{basePrice} <span className="text-[#737373]">ubytovanie</span></div>
              <div className="text-[#238869] font-semibold">€{putkoFee} poplatok</div>
            </div>
            <div className="w-full h-px bg-[#238869]/20 mb-3" />
            <span className="font-fraunces font-bold text-2xl text-[#238869]">
              €{basePrice}
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center font-inter text-[11px] text-[#ABABAB] mt-5">
          {t.Savings_Disclaimer || "* Ilustračný príklad. Skutočná cena závisí od vybraného ubytovania a termínu."}
        </p>
      </div>
    </section>
  );
}
