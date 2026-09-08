"use client";
import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import Link from "@/app/components/NextLink";
import { useRouter } from "@/app/components/NextNavigation";
import { AuthContext } from "@/app/context/AuthContext";
import { toast } from "react-toastify";
import Image from "@/app/components/NextImage";

const PropertyBanner = () => {
  const router = useRouter();
  const { user, role, switchMode, isDevelopmentAccount } = useContext(AuthContext);
  const { updateSelectedpage, lang } = useContext(FormContext);

  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  const handleListProperty = async () => {
    if (!user) {
      toast.warn(t.Pleaseloginasahosttolistyourproperty);
      return;
    }
    if (isDevelopmentAccount) {
      if (!user?.capabilities?.includes("host")) {
        toast.info(language === "en" ? "Activate host mode in your traveler account first." : "Najprv si v účte cestovateľa aktivujte režim hostiteľa.");
        router.push("/account");
        return;
      }
      if (role !== "host") await switchMode("host");
      router.push("/host");
    } else if (role === "host") {
      updateSelectedpage("AddAccommodation");
      router.push("/host");
    } else {
      toast.error(t.OnlyhostscanlistpropertiesPleaseloginasahost);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl py-12 lg:py-16">
      <div className="relative w-full rounded-3xl overflow-hidden bg-[#1A3A2E] flex flex-col md:flex-row items-center justify-between">

        {/* Background Pattern / Texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#ffffff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotPattern)" />
          </svg>
        </div>

        {/* Content Content */}
        <div className="relative z-10 w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col items-center md:items-start text-center md:text-left">
          <h2 className="font-fraunces text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 lg:mb-6 leading-tight">
            {t.Banner_Title || "Máte vlastné ubytovanie?"}
          </h2>
          <p className="font-inter text-white/80 text-base md:text-lg mb-8 max-w-md">
            {t.Banner_Desc || "Pridajte sa k nám, prenajímajte bezpečne a získajte nových hostí bez zbytočných starostí."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={handleListProperty}
              className="w-full sm:w-auto bg-white text-[#1A3A2E] px-8 py-4 rounded-xl font-inter font-bold text-base transition-transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {t.Banner_ListProperty || "Pridať ubytovanie"}
            </button>
            <Link href="/About" className="w-full sm:w-auto">
              <button className="w-full h-full border-2 border-white/20 text-white px-8 py-4 rounded-xl font-inter font-semibold text-base transition-colors hover:bg-white/10">
                {t.Banner_LearnMore || "Viac informácií"}
              </button>
            </Link>
          </div>
        </div>

        {/* Image / Visual Side */}
        <div className="relative w-full md:w-1/2 min-h-[300px] md:min-h-full flex items-center justify-center p-8">
          <div className="relative w-full max-w-sm aspect-square">
            <Image
              src="/kosice.avif"
              alt="List your property on Putko"
              fill
              className="object-cover rounded-2xl rotate-3 shadow-2xl transition-transform hover:rotate-0 duration-500"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default PropertyBanner;
