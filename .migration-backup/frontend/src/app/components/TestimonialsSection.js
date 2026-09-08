"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const StarFull = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const REVIEWS = [
  { nameKey: "Review1_Name", locationKey: "Review1_Location", stayKey: "Review1_Stay", dateKey: "Review1_Date", textKey: "Review1_Text", stars: 5, initials: "MK", color: "#E8F5F0" },
  { nameKey: "Review2_Name", locationKey: "Review2_Location", stayKey: "Review2_Stay", dateKey: "Review2_Date", textKey: "Review2_Text", stars: 5, initials: "TH", color: "#EAF2FF" },
  { nameKey: "Review3_Name", locationKey: "Review3_Location", stayKey: "Review3_Stay", dateKey: "Review3_Date", textKey: "Review3_Text", stars: 5, initials: "LB", color: "#FFF3E8" },
];

const QuoteIcon = () => (
  <svg viewBox="0 0 32 24" fill="none" className="w-8 h-6 text-[#238869]/20" aria-hidden>
    <path d="M0 24V14.4C0 10.56 1.12 7.36 3.36 4.8 5.6 2.24 8.8.8 13 .48V4.8C10.6 5.12 8.84 6.08 7.72 7.68 6.6 9.28 6.04 11.04 6.04 12.96H12V24H0ZM20 24V14.4C20 10.56 21.12 7.36 23.36 4.8 25.6 2.24 28.8.8 33 .48V4.8C30.6 5.12 28.84 6.08 27.72 7.68 26.6 9.28 26.04 11.04 26.04 12.96H32V24H20Z" fill="currentColor" />
  </svg>
);

const ReviewCard = ({ r, t }) => (
  <div className="relative flex flex-col gap-4 p-6 rounded-2xl border border-[#2A2A2A0A] bg-[#FAFAF9]">
    <div className="absolute top-5 right-5 opacity-60">
      <QuoteIcon />
    </div>
    <div className="flex gap-0.5 text-[#FFB800]">
      {Array.from({ length: r.stars }).map((_, i) => <StarFull key={i} />)}
    </div>
    <p className="font-inter text-sm text-[#3A3A3A] leading-relaxed flex-1">
      &ldquo;{t[r.textKey]}&rdquo;
    </p>
    <div className="flex items-center gap-3 pt-2 border-t border-[#2A2A2A08]">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[#238869] font-inter font-bold text-xs shrink-0"
        style={{ backgroundColor: r.color }}
      >
        {r.initials}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-inter font-semibold text-sm text-[#1A1A1A] truncate">
            {t[r.nameKey]}
          </span>
          <span className="text-[#737373] text-xs">·</span>
          <span className="font-inter text-xs text-[#737373] truncate">
            {t[r.locationKey]}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-[#238869] shrink-0">
            <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .75.75V6h-1.5V1.75A.75.75 0 0 1 8 1ZM4.465 5.132a.75.75 0 0 1 .321 1.01l-2.25 4.5a.75.75 0 0 1-1.33-.665l2.25-4.5a.75.75 0 0 1 1.01-.321ZM11.535 5.132a.75.75 0 0 1 1.01.321l2.25 4.5a.75.75 0 0 1-1.33.665l-2.25-4.5a.75.75 0 0 1 .321-1.01ZM1 11a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 11Z" clipRule="evenodd" />
          </svg>
          <span className="font-inter text-[11px] text-[#238869] font-medium truncate">
            {t.Reviews_VerifiedGuest}
          </span>
          <span className="text-[#CACACA] text-xs">·</span>
          <span className="font-inter text-[11px] text-[#9A9A9A] truncate">
            {t[r.dateKey]}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default function TestimonialsSection() {
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => { setLanguage(lang || "sk"); }, [lang]);

  const t = language === "en" ? en : sk;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setActiveIndex((prev) => Math.min(prev + 1, REVIEWS.length - 1));
      } else {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    }
    touchStartX.current = null;
  };

  return (
    <section className="bg-white border-t border-[#2A2A2A0A] py-10 lg:py-16">
      <div className="container mx-auto px-4">

        {/* Aggregate stats */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="flex items-center gap-1.5 text-[#FFB800]">
            {[1,2,3,4,5].map(i => <StarFull key={i} />)}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5">
            <span className="font-fraunces font-bold text-4xl text-[#238869]">
              {t.Reviews_AggRating}
            </span>
            <div className="hidden sm:block w-px h-8 bg-neutral-200" />
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-inter font-semibold text-[#2A2A2A] text-sm">{t.Reviews_AggCount}</span>
              <span className="font-inter text-xs text-[#737373]">{t.Reviews_AggRecommend}</span>
            </div>
          </div>
          <div>
            <h2 className="font-fraunces font-bold text-2xl lg:text-3xl text-[#1A1A1A] text-center mt-1">
              {t.Reviews_Heading}
            </h2>
            <p className="font-dmsans text-sm text-[#737373] text-center mt-1">
              {t.Reviews_Subheading}
            </p>
          </div>
        </div>

        {/* ── Mobile: horizontal swipe carousel ── */}
        <div className="md:hidden">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="overflow-hidden"
          >
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {REVIEWS.map((r) => (
                <div key={r.nameKey} className="min-w-full px-1">
                  <ReviewCard r={r} t={t} />
                </div>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {REVIEWS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? "w-6 h-2.5 bg-[#238869]"
                    : "w-2.5 h-2.5 bg-neutral-300 hover:bg-neutral-400"
                }`}
                aria-label={`Zobraz hodnotenie ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ── Desktop: 3-column grid ── */}
        <div className="hidden md:grid md:grid-cols-3 gap-5">
          {REVIEWS.map((r) => (
            <div key={r.nameKey} className="hover:shadow-md transition-shadow duration-200">
              <ReviewCard r={r} t={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
