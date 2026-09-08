"use client";
import React, { useState, useEffect, useContext, useMemo } from "react";
import HeroSearchForm from "./HeroComponent/HeroSearchForm";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

// Hoisted static SVGs outside the component to prevent re-creation on every render
const ZeroFeeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
);
const ZeroFeeIconLg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
);
const VerifiedPhotoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
);
const VerifiedPhotoIconLg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
);
const HumanSupportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
);

const translations = { en, sk };

const HeroSection = ({ className = "" }) => {
  const { lang } = useContext(FormContext);
  const language = lang || "sk"; // Derived directly
  const [stats, setStats] = useState({ propertyCount: null, totalReviews: "1 200", averageRating: 4.8 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/listing-stats`);
        if (response.ok) {
          const data = await response.json();
          setStats({
            propertyCount: data.propertyCount,
            totalReviews: data.totalReviews || "1 200",
            averageRating: data.averageRating || 4.8,
          });
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, []);

  const t = translations[language] || translations.sk;
  
  // Memoize the display count to avoid string operations on every render
  const displayCount = useMemo(() => 
    stats.propertyCount ? `${stats.propertyCount}+` : (t.Badge_DisplayCount || "441+"), 
    [stats.propertyCount, t.Badge_DisplayCount]
  );

  return (
    <div className={`nc-SectionHero relative flex flex-col justify-center ${className}`} data-nc-id="SectionHero">
      {/* ── Mobile ── */}
      <div className="flex flex-col lg:hidden px-5 pt-10 pb-2 gap-5">
        <div className="flex flex-col gap-3">
          <h2 className="font-fraunces font-bold text-[42px] leading-[108%] text-white">
            {t.Hero_Accommodation}
            <br />
            <span className="font-fraunces text-[#4FBE9F] font-bold italic text-[42px] leading-[1.08] tracking-[-0.03em]">
              {t.Hero_WithinReach}
            </span>
          </h2>
          <p className="font-dmsans font-medium text-sm text-white/85 leading-relaxed">
            {t.Hero_Subtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full font-inter text-xs font-medium text-white">
            <ZeroFeeIcon />
            <span><span className="font-bold text-[#4FBE9F]">€0</span> {t.Pill_ZeroFee?.replace("€0 ", "")}</span>
          </div>
          <div className="basis-full h-0" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full font-inter text-xs font-medium text-white">
            <VerifiedPhotoIcon />
            {t.Pill_VerifiedPhotos}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full font-inter text-xs font-medium text-white">
            <HumanSupportIcon />
            {t.Pill_HumanSupport}
          </div>
        </div>

        {/* Mobile savings pill + star rating */}
        <div className="flex flex-col gap-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#238869]/30 backdrop-blur-sm border border-[#4FBE9F]/40 rounded-full self-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#4FBE9F] shrink-0">
              <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.576Z" />
              <path fillRule="evenodd" d="M9.75 4.25a.75.75 0 0 0-1.5 0V5h-.25A4.75 4.75 0 0 0 3.25 9.75v.25H3a.75.75 0 0 0 0 1.5h.25v.25a4.75 4.75 0 0 0 4.75 4.75h.25v.75a.75.75 0 0 0 1.5 0V16h.25a4.75 4.75 0 0 0 4.75-4.75v-.25H15a.75.75 0 0 0 0-1.5h-.25v-.25A4.75 4.75 0 0 0 10 4.25V4.25ZM4.75 9.75A3.25 3.25 0 0 1 8 6.5h.25v7H8a3.25 3.25 0 0 1-3.25-3.25V9.75Zm5 3.25v-7H10A3.25 3.25 0 0 1 13.25 9.25v.5A3.25 3.25 0 0 1 10 13h-.25Z" clipRule="evenodd" />
            </svg>
            <span className="font-inter font-semibold text-white text-xs">
              {t.Hero_SavingsLabel || "Ušetríte priemerne €23 oproti iným platformám"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 text-[#FFB800]">
              {[1,2,3,4,5].map(i => (
                <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="font-inter font-semibold text-white text-xs">{stats.averageRating}</span>
            <span className="text-white/50 text-xs">·</span>
            <span className="font-inter text-white/70 text-xs">{stats.totalReviews}+ {t.Hero_RatingLabel || "hodnotení"}</span>
          </div>
        </div>
      </div>

      <div id="hero-search-form" className="lg:hidden px-5 pb-8 pt-4 relative z-20">
        <HeroSearchForm />
      </div>

      {/* ── Desktop — centered layout ── */}
      <div className="hidden lg:flex flex-col items-center justify-center relative py-14 px-6 min-h-[500px]">
        <div className="flex flex-col items-center text-center max-w-4xl w-full gap-5">

          <h2 className="font-fraunces font-bold text-7xl xl:text-[90px] !leading-[105%] text-white tracking-[-0.02em]">
            {t.Hero_Accommodation}
            <br />
            <span className="font-fraunces text-[#4FBE9F] font-bold italic leading-[1.05] tracking-[-0.03em]">
              {t.Hero_WithinReach}
            </span>
          </h2>

          <p className="font-dmsans font-medium text-lg text-white/80 max-w-xl leading-relaxed">
            {t.Hero_Subtitle}
          </p>

          {/* Savings pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#238869]/30 backdrop-blur-sm border border-[#4FBE9F]/40 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#4FBE9F] shrink-0">
              <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.576Z" />
              <path fillRule="evenodd" d="M9.75 4.25a.75.75 0 0 0-1.5 0V5h-.25A4.75 4.75 0 0 0 3.25 9.75v.25H3a.75.75 0 0 0 0 1.5h.25v.25a4.75 4.75 0 0 0 4.75 4.75h.25v.75a.75.75 0 0 0 1.5 0V16h.25a4.75 4.75 0 0 0 4.75-4.75v-.25H15a.75.75 0 0 0 0-1.5h-.25v-.25A4.75 4.75 0 0 0 10 4.25V4.25ZM4.75 9.75A3.25 3.25 0 0 1 8 6.5h.25v7H8a3.25 3.25 0 0 1-3.25-3.25V9.75Zm5 3.25v-7H10A3.25 3.25 0 0 1 13.25 9.25v.5A3.25 3.25 0 0 1 10 13h-.25Z" clipRule="evenodd" />
            </svg>
            <span className="font-inter font-semibold text-white text-sm">
              {t.Hero_SavingsLabel || "Ušetríte priemerne €23 oproti iným platformám"}
            </span>
          </div>

          {/* Star rating micro-element */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 text-[#FFB800]">
              {[1,2,3,4,5].map(i => (
                <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="font-inter font-semibold text-white text-sm">{stats.averageRating}</span>
            <span className="text-white/50 text-sm">·</span>
            <span className="font-inter text-white/70 text-sm">{stats.totalReviews}+ {t.Hero_RatingLabel || "hodnotení"}</span>
          </div>

          {/* Trust bar */}
          <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-3 text-white">
              <span className="font-fraunces font-bold text-xl text-[#4FBE9F]">{displayCount}</span>
              <span className="font-dmsans text-xs text-white/75 leading-tight max-w-[72px]">{t.VerifiedStays}</span>
            </div>
            <div className="w-px h-9 bg-white/20" />
            <div className="flex items-center gap-2 px-6 py-3 text-white">
              <ZeroFeeIconLg />
              <span className="font-dmsans text-xs text-white/85 font-medium">{t.Pill_ZeroFee}</span>
            </div>
            <div className="w-px h-9 bg-white/20" />
            <div className="flex items-center gap-2 px-6 py-3 text-white">
              <VerifiedPhotoIconLg />
              <span className="font-dmsans text-xs text-white/85 font-medium">{t.Pill_VerifiedPhotos}</span>
            </div>
            <div className="w-px h-9 bg-white/20" />
            <div className="flex items-center gap-2 px-6 py-3 text-white">
              <HumanSupportIcon />
              <span className="font-dmsans text-xs text-white/85 font-medium">{t.Pill_HumanSupport}</span>
            </div>
          </div>

          {/* Search form — full width under headline */}
          <div id="hero-search-form-desktop" className="w-full relative z-[100]">
            <HeroSearchForm />
          </div>

        </div>
      </div>
    </div>
  );
};

export default HeroSection;
