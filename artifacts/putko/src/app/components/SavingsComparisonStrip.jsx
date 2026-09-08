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
  const platformFeeB = 14;
  const putkoFee = 0;

  return (
    <section className="w-full py-12 lg:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold font-fraunces text-[#1A3A2E] mb-3">
            {t.Savings_Title || "Rovnaké ubytovanie. Lepšia cena."}
          </h2>
          <p className="text-[#64748B] font-inter text-base md:text-lg max-w-2xl mx-auto">
            {t.Savings_Subtitle || "Neplatíte skryté poplatky. Ušetrené peniaze môžete minúť na zážitky."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {/* Platform A */}
          <div className="flex flex-col items-center p-6 lg:p-8 rounded-2xl border border-gray-100 bg-gray-50/50">
            <span className="font-inter font-medium text-sm text-gray-500 mb-4 uppercase tracking-wider">
              {t.Savings_PlatformA || "Iné platformy"}
            </span>
            <div className="w-full flex justify-between items-center text-sm text-gray-600 mb-2 font-inter">
              <span>{t.Savings_Accommodation || "Ubytovanie"}</span>
              <span>€{basePrice}</span>
            </div>
            <div className="w-full flex justify-between items-center text-sm text-red-500 font-medium mb-4 font-inter">
              <span>{t.Savings_Fee || "Poplatky platformy"}</span>
              <span>+ €{platformFeeA}</span>
            </div>
            <div className="w-full h-px bg-gray-200 mb-4" />
            <div className="w-full flex justify-between items-center">
              <span className="font-inter font-medium text-gray-800">{t.Savings_Total || "Spolu"}</span>
              <span className="font-fraunces font-bold text-2xl text-gray-800">
                €{basePrice + platformFeeA}
              </span>
            </div>
          </div>

          {/* Putko */}
          <div className="relative flex flex-col items-center p-8 lg:p-10 rounded-2xl border-2 border-[#238869] bg-[#F4FBF8] shadow-lg shadow-[#238869]/10 md:scale-105 z-10">
            <div className="absolute -top-4 bg-[#238869] text-white text-xs font-bold font-inter px-4 py-1.5 rounded-full uppercase tracking-wider">
              {t.Savings_Save || "Ušetríte"} €{platformFeeA}
            </div>
            <span className="font-fraunces font-bold text-xl text-[#238869] mb-4">
              Putko
            </span>
            <div className="w-full flex justify-between items-center text-sm text-gray-700 mb-2 font-inter">
              <span>{t.Savings_Accommodation || "Ubytovanie"}</span>
              <span>€{basePrice}</span>
            </div>
            <div className="w-full flex justify-between items-center text-sm text-[#238869] font-medium mb-4 font-inter">
              <span>{t.Savings_Fee || "Poplatky platformy"}</span>
              <span>+ €{putkoFee}</span>
            </div>
            <div className="w-full h-px bg-[#238869]/20 mb-4" />
            <div className="w-full flex justify-between items-center">
              <span className="font-inter font-medium text-[#1A3A2E]">{t.Savings_Total || "Spolu"}</span>
              <span className="font-fraunces font-bold text-3xl text-[#238869]">
                €{basePrice}
              </span>
            </div>
          </div>

          {/* Platform B */}
          <div className="flex flex-col items-center p-6 lg:p-8 rounded-2xl border border-gray-100 bg-gray-50/50">
            <span className="font-inter font-medium text-sm text-gray-500 mb-4 uppercase tracking-wider">
              {t.Savings_PlatformB || "Prenájom online"}
            </span>
            <div className="w-full flex justify-between items-center text-sm text-gray-600 mb-2 font-inter">
              <span>{t.Savings_Accommodation || "Ubytovanie"}</span>
              <span>€{basePrice}</span>
            </div>
            <div className="w-full flex justify-between items-center text-sm text-red-500 font-medium mb-4 font-inter">
              <span>{t.Savings_Fee || "Poplatky platformy"}</span>
              <span>+ €{platformFeeB}</span>
            </div>
            <div className="w-full h-px bg-gray-200 mb-4" />
            <div className="w-full flex justify-between items-center">
              <span className="font-inter font-medium text-gray-800">{t.Savings_Total || "Spolu"}</span>
              <span className="font-fraunces font-bold text-2xl text-gray-800">
                €{basePrice + platformFeeB}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
