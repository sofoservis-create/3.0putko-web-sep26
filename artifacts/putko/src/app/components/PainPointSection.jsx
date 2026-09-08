"use client";
import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const PAIN_POINTS = [
  {
    key: "PainPoint_1",
    fallback: "Žiadne skryté poplatky",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
  {
    key: "PainPoint_2",
    fallback: "Overení hostitelia",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    key: "PainPoint_3",
    fallback: "Priama komunikácia",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
];

const PainPointSection = () => {
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = language === "en" ? en : sk;

  return (
    <section className="w-full bg-[#FFFEF9] border-y border-neutral-100 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-fraunces font-bold text-xl lg:text-2xl text-[#238869]">
              {t.PainPoint_Resolution || "Prečo práve my?"}
            </h3>
            <div className="hidden md:block h-px w-16 bg-[#238869]/30" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-10">
            {PAIN_POINTS.map(({ key, fallback, icon }) => (
              <div
                key={key}
                className="flex items-center gap-3 text-[#1A3A2E] font-inter font-medium text-sm lg:text-base"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F4FBF8] text-[#238869]">
                  {icon}
                </div>
                <span>{t[key] || fallback}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PainPointSection;
