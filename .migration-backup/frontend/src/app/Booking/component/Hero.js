"use client";
import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { CircleCheckBig, ClipboardList, PlaneTakeoff } from "lucide-react";

function Hero() { 
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  
  return ( 
    <div className="py-8">
      {/* Header Section */}
      <div className="px-4 mb-16 sm:px-8 lg:px-40">
        <h2 className="text-3xl font-extrabold leading-tight text-center text-gray-800 sm:text-4xl lg:text-5xl">
          {t.titles}
        </h2>
        <p className="max-w-xl mx-auto mt-4 text-base text-center text-gray-600 sm:text-lg sm:max-w-2xl">
          {t.HomePage_hero_description}
        </p>
      </div>

      {/* Steps Section */}
      <div className="grid gap-8 px-4 lg:grid-cols-3 sm:px-8 lg:px-10">
        {/* Step 1 */}
        <div className="p-6 transition transform bg-white shadow-lg sm:p-8 rounded-2xl hover:scale-105">
          <div className="flex flex-col items-center">
            <div className="mb-4 text-blue-600 sm:mb-6">
              <ClipboardList size={56} strokeWidth={2.5} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-center text-gray-800 sm:text-2xl sm:mb-4">
              {t.step1_title}
            </h3>
            <p className="text-sm leading-relaxed text-center text-gray-600 sm:text-base">
              {t.step1_description}
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-6 transition transform bg-white shadow-lg sm:p-8 rounded-2xl hover:scale-105">
          <div className="flex flex-col items-center">
            <div className="mb-4 text-green-600 sm:mb-6">
              <CircleCheckBig size={56} strokeWidth={2.5} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-center text-gray-800 sm:text-2xl sm:mb-4">
              {t.step2_title}
            </h3>
            <p className="text-sm leading-relaxed text-center text-gray-600 sm:text-base">
              {t.step2_description}
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-6 transition transform bg-white shadow-lg sm:p-8 rounded-2xl hover:scale-105">
          <div className="flex flex-col items-center">
            <div className="mb-4 text-purple-600 sm:mb-6">
              <PlaneTakeoff size={56} strokeWidth={2.5} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-center text-gray-800 sm:text-2xl sm:mb-4">
              {t.step3_title}
            </h3>
            <p className="text-sm leading-relaxed text-center text-gray-600 sm:text-base">
              {t.step3_description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
