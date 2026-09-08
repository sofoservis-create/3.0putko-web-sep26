"use client";

import React, { useContext, useEffect, useState, useRef } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const StarFull = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
  </svg>
);

const REVIEWS = [
  {
    id: 1,
    name: "Jana M.",
    initials: "JM",
    color: "#E2F0CB",
    location: "Bratislava",
    date: "August 2023",
    text: "Úžasné ubytovanie v srdci prírody! Majitelia boli veľmi milí a ústretoví. Chata bola čistá a výborne vybavená. Určite sa sem ešte vrátime s celou rodinou.",
  },
  {
    id: 2,
    name: "Martin K.",
    initials: "MK",
    color: "#FFE5E5",
    location: "Košice",
    date: "Júl 2023",
    text: "Skvelý zážitok od začiatku až do konca. Komunikácia prebehla rýchlo a ubytovanie presne zodpovedalo fotografiám. Vrelo odporúčam každému, kto hľadá pokojný oddych.",
  },
  {
    id: 3,
    name: "Lucia S.",
    initials: "LS",
    color: "#E5F2FF",
    location: "Žilina",
    date: "September 2023",
    text: "Nádherný výhľad a neskutočný kľud. Toto miesto bolo presne to, čo sme potrebovali na útek z mesta. Postele boli mimoriadne pohodlné.",
  },
  {
    id: 4,
    name: "Peter D.",
    initials: "PD",
    color: "#FFF0E5",
    location: "Trnava",
    date: "Október 2023",
    text: "Rezervácia cez Putko prebehla bleskovo a bez problémov. Všetky informácie boli prehľadné a na mieste nás čakalo príjemné prekvapenie v podobe lokálnych produktov.",
  },
];

const ReviewCard = ({ r }) => (
  <div className="flex flex-col h-full bg-white border border-neutral-100 rounded-2xl p-6 lg:p-8 hover:shadow-lg hover:shadow-neutral-200/50 transition-shadow duration-300">
    <div className="flex items-center gap-1 text-[#FFB800] mb-4">
      {[...Array(5)].map((_, i) => <StarFull key={i} />)}
    </div>

    <p className="font-inter text-[#4A5568] text-base leading-relaxed mb-6 flex-grow">
      "{r.text}"
    </p>

    <div className="flex items-center gap-4 pt-4 border-t border-neutral-100">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-[#1A3A2E] font-inter font-bold text-sm shrink-0"
        style={{ backgroundColor: r.color }}
      >
        {r.initials}
      </div>
      <div>
        <div className="font-inter font-bold text-[#1A3A2E] text-base">
          {r.name}
        </div>
        <div className="font-inter text-sm text-[#94A3B8]">
          {r.location} · {r.date}
        </div>
      </div>
    </div>
  </div>
);

export default function TestimonialsSection() {
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => { setLanguage(lang || "sk"); }, [lang]);
  const t = language === "en" ? en : sk;

  return (
    <section className="bg-neutral-50 py-12 lg:py-24">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 lg:mb-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] mb-4 leading-tight">
              {t.Reviews_Heading || "Čo hovoria naši hostia?"}
            </h2>
            <p className="text-[#64748B] font-inter text-lg">
              {t.Reviews_Subheading || "Prečítajte si reálne skúsenosti od ľudí, ktorí si zarezervovali pobyt cez Putko."}
            </p>
          </div>

          {/* Aggregate stats */}
          <div className="flex flex-col items-start md:items-end bg-white p-4 rounded-xl border border-neutral-100 shadow-sm shrink-0">
            <div className="flex items-center gap-2 text-[#FFB800] mb-1">
              <span className="font-fraunces font-bold text-2xl text-[#1A3A2E]">4.9</span>
              <div className="flex items-center">
                <StarFull />
                <StarFull />
                <StarFull />
                <StarFull />
                <StarFull />
              </div>
            </div>
            <span className="font-inter text-sm text-[#64748B]">
              Založené na viac ako {t.Reviews_AggCount || "2 500+ hodnoteniach"}
            </span>
          </div>
        </div>

        {/* Desktop & Tablet Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {REVIEWS.map(r => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </div>

        {/* Mobile Scroll */}
        <div className="md:hidden flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory hide-scrollbar -mx-4 px-4">
          {REVIEWS.map(r => (
            <div key={r.id} className="min-w-[85vw] snap-center">
              <ReviewCard r={r} />
            </div>
          ))}
        </div>

      </div>

      {/* Hide scrollbar styles for mobile slider */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </section>
  );
}
