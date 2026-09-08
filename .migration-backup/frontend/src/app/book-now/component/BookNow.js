"use client";

import { useContext, useEffect, useState, useRef } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer/Footer";
import HeroSearchForm2Mobile from "@/app/components/HeroSearchForm2Mobile";
import FooterNav from "@/app/Shared/FooterNav";
import MenuBar from "@/app/Shared/MenuBar";
import { FormContext } from "@/app/FormContext";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import StayCardFeatured from "@/app/listing-stay-map/component/StayCardFeatured";

// Minimalist time block consistent with your site's aesthetic
const TimeBlock = ({ value, label }) => (
  <div className="flex flex-col items-center px-4">
    <span className="text-3xl font-bold text-[#163C2E] tabular-nums tracking-tight">
      {String(value).padStart(2, '0')}
    </span>
    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-semibold mt-1">
      {label}
    </span>
  </div>
);

export default function BookNow({ listings = [] }) {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const t = translations[lang || "sk"];
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date("2026-02-12T00:00:00");
      const diff = target - new Date();
      return diff > 0 ? {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      } : { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#FCFBF9] min-h-screen">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="lg:hidden"><HeroSearchForm2Mobile /></div>
          <div className="hidden lg:block w-full"><Header /></div>
          <div className="lg:hidden"><MenuBar /></div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-16">
        {/* Campaign Editorial Hero */}
        <div className="mb-20">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="h-[2px] w-12 bg-[#38a186]"></span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#38a186]">{t.winterCollection}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[#1a1a1a] tracking-tight mb-6">{t.bookNowHeroTitle}</h1>
          <p className="text-xl text-gray-600 max-w-2xl leading-relaxed">{t.bookNowHeroDesc}</p>
        </div>

        {/* Institutional Countdown Container */}
        <div className="mb-20 bg-white rounded-3xl border border-gray-100 shadow-sm p-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2">{t.bookNowBannerTitlePrefix}</h3>
            <p className="text-gray-500">{t.bookNowBannerTitleSuffix}</p>
          </div>
          <div className="flex items-center bg-[#FCFBF9] p-4 rounded-2xl border border-gray-100">
            <TimeBlock value={timeLeft.days} label={t.bookNowDays} />
            <div className="w-[1px] h-10 bg-gray-200"></div>
            <TimeBlock value={timeLeft.hours} label={t.bookNowHours} />
            <div className="w-[1px] h-10 bg-gray-200"></div>
            <TimeBlock value={timeLeft.minutes} label={t.bookNowMinutes} />
          </div>
        </div>

        {/* Listings Grid - Aligned with site card style */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold mb-10 text-[#1a1a1a]">{t.bookNowListingsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((item) => (
              <div key={item._id} className="transition-transform duration-300 hover:scale-[1.01]">
                <StayCardFeatured data={item} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
      <div className="lg:hidden"><FooterNav /></div>
    </div>
  );
}