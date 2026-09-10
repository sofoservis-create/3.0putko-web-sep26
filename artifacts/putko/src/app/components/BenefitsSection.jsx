"use client";

import React, { useState, useContext, useEffect } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const ICONS = {
  1: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 10V1.25L1.25 15H10V23.75L21.25 10H12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  2: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 12.5L11.5 15L16.5 10M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  3: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7.5C10.5 7.5 9 8.5 9 10C9 11.5 10.5 12.5 12 12.5C13.5 12.5 15 13.5 15 15C15 16.5 13.5 17.5 12 17.5M12 7.5C13.5 7.5 14.5 8 15 9M12 7.5V6M12 17.5V19M12 17.5C10.5 17.5 9.5 17 9 16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  4: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.6 4.8 5 8 5C9.8 5 11 6.5 12 7.5C13 6.5 14.2 5 16 5C19.2 5 21 7.6 21 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const BenefitsSection = ({ className = "" }) => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  const benefits = [
    { id: 1, title: t.Benefits_1_Title || "Rýchla rezervácia", desc: t.Benefits_1_Desc || "Zarezervujte si pobyt behom pár minút." },
    { id: 2, title: t.Benefits_2_Title || "Overení hostitelia", desc: t.Benefits_2_Desc || "Všetky ubytovania prechádzajú našou kontrolou." },
    { id: 3, title: t.Benefits_3_Title || "Bezpečné platby", desc: t.Benefits_3_Desc || "Vaše platby sú u nás v bezpečí." },
    { id: 4, title: t.Benefits_4_Title || "Lokálna podpora", desc: t.Benefits_4_Desc || "Sme tu pre vás každý deň." },
  ];

  return (
    <section className={`py-12 md:py-16 lg:py-20 bg-white ${className}`}>
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] mb-4">
            {t.Benefits_Title || "Prečo si vybrať Putko?"}
          </h2>
          <p className="text-[#64748B] font-inter text-lg">
            {t.Benefits_Subtitle || "Snažíme sa robiť veci lepšie a s ohľadom na vás."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {benefits.map((item) => (
            <div key={item.id} className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-[#F4FBF8] text-[#238869] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#238869] group-hover:text-white transition-all duration-300">
                {ICONS[item.id]}
              </div>
              <h3 className="text-xl font-bold font-fraunces text-[#1A3A2E] mb-3">
                {item.title}
              </h3>
              <p className="font-inter text-[#64748B] leading-relaxed text-sm md:text-base">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
