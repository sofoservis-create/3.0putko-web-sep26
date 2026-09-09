"use client";
import React, { useContext, useEffect, useState } from "react";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";

const CardCategorySlider = ({
  className = "",
  taxonomy,
  onClick,
}) => {
  const { lang } = useContext(FormContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const { count, name, thumbnail } = taxonomy;
  
  return (
    <button
      type="button"
      aria-label={`${name}, ${count} ${t.properties || "ubytovaní"}`}
      onClick={onClick}
      className={`nc-CardCategorySlider relative flex flex-col w-full aspect-[4/5] rounded-2xl overflow-hidden group cursor-pointer ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A3A2E] via-[#238869] to-[#8BC9B5] transition-transform duration-700 group-hover:scale-105">
        {thumbnail && <img src={thumbnail} alt="" className="h-full w-full object-cover" />}
      </div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 p-5 md:p-6 w-full flex flex-col items-start justify-end h-full">
        <h2 className="text-xl md:text-2xl font-bold font-fraunces text-white mb-1 md:mb-1.5 drop-shadow-md">
          {name}
        </h2>
        <span className="text-xs md:text-sm font-inter text-white/90 font-medium drop-shadow-sm tracking-wide uppercase">
          {count > 0
            ? `${count} ${t.properties || "ubytovaní"}`
            : `${t.properties || "ubytovania"}`
          }
        </span>
      </div>
    </button>
  );
};

export default CardCategorySlider;
