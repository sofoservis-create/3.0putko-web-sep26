"use client";
import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/app/context/AuthContext";
import { toast } from "react-toastify";

const PropertyBanner = () => {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const { updateSelectedpage, lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  const translations = { en, sk };
  const t = translations[language];

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const handlego = () => {
    if (!user) {
      toast.warn("Please log in as a host to list your property");
      return;
    }
    if (role === "host") {
      updateSelectedpage("AddAccommodation");
      router.push("/Profile");
    } else {
      toast.error("Only hosts can list properties. Please log in as a host.");
    }
  };

  return (
    <div className="w-full flex justify-center px-4">
      <div
        className="
          w-full max-w-[1280px]
          rounded-[24px]
          pt-[60px] lg:pt-[71.2px]
          pb-[50px] lg:pb-[56px]
          px-[24px] lg:px-[48px]
          bg-gradient-to-r
          from-[#163C2E]
          via-[#1A3A2E]
          to-[#214F3D]
        "
      >
        <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-8 lg:gap-0 text-center lg:text-left">
          
          {/* LEFT CONTENT */}
          <div className="max-w-[650px]">
            <h2 className="
              font-fraunces
              text-[28px] sm:text-[32px] lg:text-[40px]
              leading-[36px] sm:leading-[40px] lg:leading-[48px]
              font-semibold
              text-white
              mb-4
            ">
              {t.Banner_Rent_Title}
            </h2>

            <p className="font-inter text-[15px] lg:text-[16px] leading-[24px] lg:leading-[26px] text-white/80">
              {t.Banner_Rent_Desc}
            </p>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-6 lg:mt-0">
            
            <button
              onClick={handlego}
              className="
                w-full sm:w-auto
                bg-white
                text-[#1A3A2E]
                px-8
                py-3
                rounded-[12px]
                font-inter
                font-medium
                text-[15px]
                transition
                hover:bg-gray-100
              "
            >
              {t.Banner_ListProperty}
            </button>

            <Link href="/About" className="w-full sm:w-auto">
              <button
                className="
                  w-full sm:w-auto
                  border border-white/30
                  text-white
                  px-8
                  py-3
                  rounded-[12px]
                  font-inter
                  font-medium
                  text-[15px]
                  transition
                  hover:bg-white/10
                "
              >
                {t.Banner_LearnMore}
              </button>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyBanner;