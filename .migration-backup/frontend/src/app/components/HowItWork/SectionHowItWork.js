"use client";
import React, { useContext, useEffect, useState, useRef } from "react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const SectionHowItWork = ({ className = "" }) => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setActiveIndex((prev) => Math.min(prev + 1, data.length - 1));
      } else {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    }
    touchStartX.current = null;
  };

  const data = [
    {
      id: 1,
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M38 38L26 26M30 16C30 17.8385 29.6379 19.659 28.9343 21.3576C28.2307 23.0561 27.1995 24.5995 25.8995 25.8995C24.5995 27.1995 23.0561 28.2307 21.3576 28.9343C19.659 29.6379 17.8385 30 16 30C14.1615 30 12.341 29.6379 10.6424 28.9343C8.94387 28.2307 7.40053 27.1995 6.1005 25.8995C4.80048 24.5995 3.76925 23.0561 3.06569 21.3576C2.36212 19.659 2 17.8385 2 16C2 12.287 3.475 8.72601 6.1005 6.1005C8.72601 3.475 12.287 2 16 2C19.713 2 23.274 3.475 25.8995 6.1005C28.525 8.72601 30 12.287 30 16Z" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: t.Step_Search_Title,
      desc: t.Step_Search_Desc,
    },
    {
      id: 2,
      icon: (
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 6H6C4.93913 6 3.92172 6.42143 3.17157 7.17157C2.42143 7.92172 2 8.93913 2 10V34C2 35.0609 2.42143 36.0783 3.17157 36.8284C3.92172 37.5786 4.93913 38 6 38H26C27.0609 38 28.0783 37.5786 28.8284 36.8284C29.5786 36.0783 30 35.0609 30 34V10C30 8.93913 29.5786 7.92172 28.8284 7.17157C28.0783 6.42143 27.0609 6 26 6H22M10 6C10 7.06087 10.4214 8.07828 11.1716 8.82843C11.9217 9.57857 12.9391 10 14 10H18C19.0609 10 20.0783 9.57857 20.8284 8.82843C21.5786 8.07828 22 7.06087 22 6M10 6C10 4.93913 10.4214 3.92172 11.1716 3.17157C11.9217 2.42143 12.9391 2 14 2H18C19.0609 2 20.0783 2.42143 20.8284 3.17157C21.5786 3.92172 22 4.93913 22 6M10 24L14 28L22 20" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: t.Step_Book_Title,
      desc: t.Step_Book_Desc,
    },
    {
      id: 3,
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25.656 25.656C24.1558 27.1558 22.1213 27.9983 20 27.9983C17.8787 27.9983 15.8442 27.1558 14.344 25.656M14 16H14.02M26 16H26.02M38 20C38 22.3638 37.5344 24.7044 36.6298 26.8883C35.7252 29.0722 34.3994 31.0565 32.7279 32.7279C31.0565 34.3994 29.0722 35.7252 26.8883 36.6298C24.7044 37.5344 22.3638 38 20 38C17.6362 38 15.2956 37.5344 13.1117 36.6298C10.9278 35.7252 8.94353 34.3994 7.27208 32.7279C5.60062 31.0565 4.27475 29.0722 3.37017 26.8883C2.46558 24.7044 2 22.3638 2 20C2 15.2261 3.89642 10.6477 7.27208 7.27208C10.6477 3.89642 15.2261 2 20 2C24.7739 2 29.3523 3.89642 32.7279 7.27208C36.1036 10.6477 38 15.2261 38 20Z" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: t.Step_Enjoy_Title,
      desc: t.Step_Enjoy_Desc,
    },
  ];

  return (
    <div className={`nc-SectionHowItWork container mx-auto px-4 ${className}`}>
      {/* Section Title */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-6xl font-bold font-fraunces text-[#1A3A2E] mb-4">
          {t.HowItWorks_Title}
        </h2>
        <span className="font-inter font-normal text-[#64748B] text-lg">
          {t.HowItWorks_Subtitle}
        </span>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-3 gap-12">
        {data.map((item) => (
          <div
            key={item.id}
            className="relative flex flex-col items-center text-center bg-white rounded-[20px] p-6 border border-[#2A2A2A0F] shadow-[0_4px_4px_0_#40A587]"
          >
            {/* Number Badge */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <span className="flex items-center justify-center font-dmsans w-12 h-12 rounded-full bg-[#44A07E] text-white font-bold text-lg shadow-[0_4px_12px_0_#C85A3F4D]">
                {item.id}
              </span>
            </div>

            {/* Icon container */}
            <div className="w-20 h-20 rounded-[20px] bg-[#238869] flex items-center justify-center mb-6 mt-6 shadow-lg shadow-[#238869]/20">
              {item.icon}
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold font-fraunces text-[#1A3A2E] mb-3">
              {item.title}
            </h3>

            {/* Description */}
            <p className="font-inter font-normal text-[#64748B] text-base leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile slider */}
      <div className="md:hidden">
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="overflow-hidden">
          <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
            {data.map((item) => (
              <div key={item.id} className="min-w-full px-4 pt-8 pb-4">
                <div className="relative flex flex-col items-center text-center bg-white rounded-[20px] p-6 border border-[#2A2A2A0F] shadow-[0_4px_4px_0_#40A587]">
                  {/* Number Badge */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full bg-[#44A07E] text-white font-bold text-lg shadow-[0_4px_12px_0_#C85A3F4D] border-4 border-white">
                      {item.id}
                    </span>
                  </div>

                  {/* Icon container with extra top margin */}
                  <div className="w-20 h-20 rounded-[20px] bg-[#238869] flex items-center justify-center mb-6 mt-10 shadow-lg shadow-[#238869]/20">
                    {item.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold font-playfair text-[#1A3A2E] mb-3">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="font-sans font-normal text-[#64748B] text-base leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {data.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === activeIndex ? "w-6 h-2.5 bg-[#238869]" : "w-2.5 h-2.5 bg-neutral-300 hover:bg-neutral-400"
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionHowItWork;