"use client";

import React, { useState, useRef, useContext, useEffect } from "react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const getIcon = (id) => {
  const icons = {
    1: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.6 4.8 5 8 5C9.8 5 11 6.5 12 7.5C13 6.5 14.2 5 16 5C19.2 5 21 7.6 21 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
       </svg>,
    2: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M8 7V3M16 7V3M3 11H21M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
       </svg>,
    3: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
         <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
       </svg>,
  };
  return icons[id];
};

const SectionHowItWork = () => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  const data = [
    {
      id: 1,
      title: t.HowItWorks_1_Title || "Vyhľadajte si ubytovanie",
      desc: t.HowItWorks_1_Desc || "Vyberte si destináciu, zadajte termín a počet osôb. Náš systém vám ponúkne tie najlepšie možnosti podľa vašich predstáv.",
      icon: getIcon(1),
    },
    {
      id: 2,
      title: t.HowItWorks_2_Title || "Rezervujte a zaplaťte",
      desc: t.HowItWorks_2_Desc || "Potvrďte svoju rezerváciu jednoducho a bezpečne online. Naše platobné riešenie garantuje maximálnu ochranu vašich dát.",
      icon: getIcon(2),
    },
    {
      id: 3,
      title: t.HowItWorks_3_Title || "Užite si pobyt",
      desc: t.HowItWorks_3_Desc || "Všetko je vybavené! Skontaktujte sa s hostiteľom, vyrazte na cestu a začnite zbierať nové zážitky a spomienky.",
      icon: getIcon(3),
    },
  ];

  return (
    <div className="py-12 lg:py-24 bg-[#FFFEF9] border-t border-neutral-100">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] mb-4">
            {t.HowItWorks_Title || "Ako to funguje?"}
          </h2>
          <p className="text-[#64748B] font-inter text-lg">
            {t.HowItWorks_Subtitle || "Celý proces od hľadania až po samotný pobyt je s nami rýchly a jednoduchý."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connector line for desktop */}
          <div className="hidden md:block absolute top-[88px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#238869]/20 to-transparent z-0" />

          {data.map((item) => (
            <div key={item.id} className="relative z-10 flex flex-col items-center text-center">
              {/* Number Badge */}
              <div className="w-8 h-8 rounded-full bg-[#1A3A2E] text-white flex items-center justify-center font-inter font-bold text-sm mb-4">
                {item.id}
              </div>

              {/* Icon container */}
              <div className="w-20 h-20 rounded-2xl bg-[#238869] text-white flex items-center justify-center mb-6 shadow-xl shadow-[#238869]/20 transform transition-transform duration-300 hover:scale-105">
                {item.icon}
              </div>

              {/* Text */}
              <h3 className="text-2xl font-bold font-fraunces text-[#1A3A2E] mb-3">
                {item.title}
              </h3>
              <p className="font-inter text-[#64748B] text-base leading-relaxed max-w-sm">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionHowItWork;
