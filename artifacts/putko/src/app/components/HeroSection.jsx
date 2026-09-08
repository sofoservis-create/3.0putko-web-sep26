"use client";
import React, { useState, useEffect, useContext, useMemo } from "react";
import HeroSearchForm from "./HeroComponent/HeroSearchForm";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const VerifiedPhotoIcon = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
);
const HumanSupportIcon = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
);

const translations = { en, sk };

const HeroSection = ({ className = "" }) => {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const [stats, setStats] = useState({ propertyCount: null, totalReviews: "1 200", averageRating: 4.8 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodation/listing-stats`);
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
  const [subtitleLead, ...subtitleRest] = t.Hero_Subtitle.split(" - ");
  
  const displayCount = useMemo(() => 
    stats.propertyCount ? `${stats.propertyCount}+` : (t.Badge_DisplayCount || "441+"), 
    [stats.propertyCount, t.Badge_DisplayCount]
  );

  return (
    <div className={`nc-SectionHero relative isolate overflow-hidden flex flex-col justify-center ${className}`} data-nc-id="SectionHero">
      <picture className="absolute inset-0 -z-20" aria-hidden="true">
        <source
          media="(min-width: 768px)"
          type="image/avif"
          srcSet="/putko-hero-slovakia-wide.avif"
        />
        <source
          media="(min-width: 768px)"
          type="image/webp"
          srcSet="/putko-hero-slovakia-wide.webp"
        />
        <source type="image/avif" srcSet="/putko-hero-slovakia-portrait.avif" />
        <img
          src="/putko-hero-slovakia-portrait.webp"
          alt=""
          width="848"
          height="1264"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-[center_48%] md:object-[center_52%] lg:object-center"
        />
      </picture>
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(247,250,246,0.90)_0%,rgba(247,250,246,0.68)_38%,rgba(247,250,246,0.18)_70%,rgba(17,42,34,0.10)_100%)] md:bg-[linear-gradient(90deg,rgba(247,250,246,0.94)_0%,rgba(247,250,246,0.80)_42%,rgba(247,250,246,0.26)_72%,rgba(17,42,34,0.08)_100%)]"
        aria-hidden="true"
      />
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-4 pb-12 sm:pt-12 sm:pb-16 lg:pt-20 lg:pb-24 relative z-10 flex flex-col items-center">

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center lg:items-start relative z-20">

          {/* Left Column - Copy & Trust Elements */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-6 lg:gap-8 mt-2 lg:mt-6 z-20 relative">

            <div className="flex flex-col gap-4 max-w-[680px]">
              <h1 className="font-fraunces font-bold text-[36px] leading-[1.08] sm:text-5xl lg:text-6xl xl:text-7xl text-[#112A22] tracking-[-0.02em] animate-fadeIn">
                {t.Hero_Accommodation}
                <br />
                <span className="text-[#238869] italic tracking-[-0.03em] pr-2">
                  {t.Hero_WithinReach}
                </span>
              </h1>
              <p className="font-dmsans text-[15px] sm:text-lg lg:text-[19px] leading-relaxed animate-fadeIn font-semibold text-[#1e2423]" style={{animationDelay: '100ms'}}>
                {language === "sk" ? (
                  <>
                    <span className="relative isolate inline-block">
                      <span className="relative z-10">{subtitleLead}</span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 160 16"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute -bottom-1.5 left-0 z-0 h-3 w-full text-[#238869]"
                      >
                        <path
                          d="M3 9.5C18 4.5 33 4 48 8.5C64 13 78 13 94 7.5C111 2 127 3 157 8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.78"
                        />
                        <path
                          d="M7 12C24 8 38 8.5 53 11.5C69 14.5 84 13.5 99 9C116 4 135 5.5 152 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.5"
                        />
                      </svg>
                    </span>
                    {subtitleRest.length > 0 && ` - ${subtitleRest.join(" - ")}`}
                  </>
                ) : (
                  t.Hero_Subtitle
                )}
              </p>
            </div>

            {/* Responsive Trust Elements */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3 animate-fadeIn w-full" style={{animationDelay: '150ms'}}>

              {/* Savings Pill */}
              <div className="inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 bg-[#E9F3F0] border border-[#C5E1D8] rounded-full self-start w-fit shadow-[0_2px_10px_-4px_rgba(35,136,105,0.1)] shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#238869] shrink-0">
                  <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.576Z" />
                  <path fillRule="evenodd" d="M9.75 4.25a.75.75 0 0 0-1.5 0V5h-.25A4.75 4.75 0 0 0 3.25 9.75v.25H3a.75.75 0 0 0 0 1.5h.25v.25a4.75 4.75 0 0 0 4.75 4.75h.25v.75a.75.75 0 0 0 1.5 0V16h.25a4.75 4.75 0 0 0 4.75-4.75v-.25H15a.75.75 0 0 0 0-1.5h-.25v-.25A4.75 4.75 0 0 0 10 4.25V4.25ZM4.75 9.75A3.25 3.25 0 0 1 8 6.5h.25v7H8a3.25 3.25 0 0 1-3.25-3.25V9.75Zm5 3.25v-7H10A3.25 3.25 0 0 1 13.25 9.25v.5A3.25 3.25 0 0 1 10 13h-.25Z" clipRule="evenodd" />
                </svg>
                <span className="font-inter font-semibold text-[#112A22] text-[12.5px] leading-tight sm:text-sm">
                  {t.Hero_SavingsLabel || "Ušetríte priemerne €23 oproti iným platformám"}
                </span>
              </div>

              <div className="w-full h-0 hidden sm:block mb-0.5"></div>

              {/* Badges container */}
              <div className="flex flex-wrap gap-2 sm:gap-2.5 w-full items-center">

                {/* Desktop rating */}
                <div className="hidden lg:flex items-center gap-1.5 bg-white border border-[#DCEAE5] px-3 py-1.5 rounded-full shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-[#FFB800]" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-inter font-bold text-[#112A22] text-[13px] leading-none">{stats.averageRating}</span>
                  <span className="text-[#849B90] text-[10px] font-bold leading-none">·</span>
                  <span className="font-inter font-semibold text-[#4A5D54] text-[12.5px] leading-none">{stats.totalReviews}+ {t.Hero_RatingLabel || "hodnotení"}</span>
                </div>

                {/* Desktop verified count */}
                <div className="hidden lg:flex items-center gap-1.5 bg-[#F0F7F4] border border-[#C5E1D8] px-3 py-1.5 rounded-full shadow-[0_2px_8px_-4px_rgba(35,136,105,0.12)] shrink-0">
                  <span className="font-fraunces font-bold text-[#238869] text-[14px] leading-none mt-[1px]">{displayCount}</span>
                  <span className="font-dmsans font-bold text-[#112A22] text-[12.5px] leading-none">{t.VerifiedStays}</span>
                </div>

                {/* Desktop online payment */}
                <div className="hidden lg:flex items-center gap-1.5 bg-white border border-[#DCEAE5] px-3 py-1.5 rounded-full shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-3.5 h-3.5 shrink-0 text-[#238869]" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="font-dmsans font-semibold text-[#4A5D54] text-[12.5px] leading-none">Online platba</span>
                </div>

                {/* Verified photos */}
                <div className="hidden items-center gap-1.5 bg-white border border-[#DCEAE5] px-3 py-1.5 rounded-full shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] shrink-0 sm:flex">
                  <VerifiedPhotoIcon className="w-3.5 h-3.5 text-[#238869]" />
                  <span className="font-dmsans font-semibold text-[#4A5D54] text-[12.5px] leading-none">{t.Pill_VerifiedPhotos}</span>
                </div>

                {/* Human support */}
                <div className="hidden items-center gap-1.5 bg-white border border-[#DCEAE5] px-3 py-1.5 rounded-full shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] shrink-0 sm:flex">
                  <HumanSupportIcon className="w-3.5 h-3.5 text-[#238869]" />
                  <span className="font-dmsans font-semibold text-[#4A5D54] text-[12.5px] leading-none">{t.Pill_HumanSupport}</span>
                </div>

              </div>
            </div>

            {/* Desktop Search Form */}
            <div id="hero-search-form-desktop" className="hidden lg:block w-full mt-4 xl:mt-6 z-[100] animate-scaleIn" style={{animationDelay: '250ms'}}>
              <HeroSearchForm
                stats={stats}
                displayCount={displayCount}
                ratingLabel={t.Hero_RatingLabel || "hodnotení"}
                verifiedLabel={t.VerifiedStays}
              />
            </div>
          </div>

          {/* Right Column - Mobile Mascot & Mobile Search Form */}
          <div className="lg:col-span-5 xl:col-span-5 flex lg:hidden flex-col relative w-full z-10">

            {/* Mascot - Mobile inline */}
            <div className="order-1 flex justify-center items-end h-[364px] sm:h-[400px] z-10 pointer-events-none -mb-8">
              <picture className="h-full">
                <source type="image/avif" srcSet="/mascot.avif" />
                <img
                  src="/mascot.webp"
                  alt="Putko Mascot"
                  width="1536"
                  height="1499"
                  fetchPriority="high"
                  decoding="async"
                  className="w-auto h-full object-contain object-bottom origin-bottom [scale:1.2] [translate:0_-2%] sm:[scale:1] sm:[translate:0_15%] drop-shadow-[0_20px_40px_rgba(17,42,34,0.15)] animate-scaleIn z-10"
                  style={{ animationDelay: '200ms' }}
                />
              </picture>
            </div>

            <div className="order-2 -mb-[210px] w-full relative z-30 px-1 [translate:0_-51%] sm:mb-0 sm:px-0 sm:[translate:0_0]">
              <div id="hero-search-form" className="shadow-[0_24px_60px_-15px_rgba(17,42,34,0.2)] rounded-[26px]">
                <HeroSearchForm
                  stats={stats}
                  displayCount={displayCount}
                  ratingLabel={t.Hero_RatingLabel || "hodnotení"}
                  verifiedLabel={t.VerifiedStays}
                />
              </div>
            </div>

          </div>

        </div>

        {/* Desktop Mascot */}
        <div className="hidden lg:flex absolute right-0 xl:right-4 2xl:right-12 bottom-0 w-[45%] xl:w-[48%] h-full pointer-events-none z-10 justify-end items-end pb-0">
          <picture className="flex h-full items-end justify-end">
            <source type="image/avif" srcSet="/mascot.avif" />
            <img
              src="/mascot.webp"
              alt="Putko Mascot"
              width="1536"
              height="1499"
              fetchPriority="high"
              decoding="async"
              className="w-auto h-[105%] max-h-[750px] object-contain object-bottom origin-bottom [translate:0_-6%] drop-shadow-2xl animate-scaleIn"
              style={{ animationDelay: '250ms' }}
            />
          </picture>
        </div>

      </div>
    </div>
  );
};

export default HeroSection;
