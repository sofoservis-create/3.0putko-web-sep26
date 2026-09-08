"use client";

import React, { useState, useRef, useContext, useEffect } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const getIcon = (id) => {
  const icons = {
    1: <svg width="23" height="25" viewBox="0 0 23 25" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5 10V1.25L1.25 15H10V23.75L21.25 10H12.5Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
,
    2: <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.75 12.57L11.25 15.07L16.25 10.07M23.2725 5.05C19.3201 5.25989 15.4459 3.89327 12.5 1.25C9.55409 3.89327 5.67988 5.25989 1.7275 5.05C1.40942 6.28139 1.24897 7.54819 1.25 8.82C1.25 15.8087 6.03 21.6825 12.5 23.3475C18.97 21.6825 23.75 15.81 23.75 8.82C23.75 7.5175 23.5838 6.255 23.2725 5.05Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
 ,
    3: <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.5 7.5C10.4288 7.5 8.75 8.61875 8.75 10C8.75 11.3813 10.4288 12.5 12.5 12.5C14.5712 12.5 16.25 13.6187 16.25 15C16.25 16.3813 14.5712 17.5 12.5 17.5M12.5 7.5C13.8875 7.5 15.1 8.0025 15.7487 8.75M12.5 7.5V6.25M12.5 7.5V17.5M12.5 17.5V18.75M12.5 17.5C11.1125 17.5 9.9 16.9975 9.25125 16.25M23.75 12.5C23.75 13.9774 23.459 15.4403 22.8936 16.8052C22.3283 18.1701 21.4996 19.4103 20.455 20.455C19.4103 21.4996 18.1701 22.3283 16.8052 22.8936C15.4403 23.459 13.9774 23.75 12.5 23.75C11.0226 23.75 9.55972 23.459 8.19481 22.8936C6.8299 22.3283 5.58971 21.4996 4.54505 20.455C3.50039 19.4103 2.67172 18.1701 2.10636 16.8052C1.54099 15.4403 1.25 13.9774 1.25 12.5C1.25 9.51631 2.43526 6.65483 4.54505 4.54505C6.65483 2.43526 9.51631 1.25 12.5 1.25C15.4837 1.25 18.3452 2.43526 20.455 4.54505C22.5647 6.65483 23.75 9.51631 23.75 12.5Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
,
    4: <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.455 4.545L16.035 8.965M20.455 4.545C18.3452 2.43522 15.4837 1.25 12.5 1.25C9.51631 1.25 6.65478 2.43522 4.545 4.545M20.455 4.545C22.5648 6.65478 23.75 9.51631 23.75 12.5C23.75 13.9774 23.459 15.4403 22.8936 16.8052C22.3283 18.1701 21.4997 19.4103 20.455 20.455M16.035 8.965C15.0973 8.02732 13.8261 7.5 12.5 7.5C11.1739 7.5 9.90268 8.02732 8.965 8.965M16.035 8.965C16.9727 9.90268 17.5 11.1739 17.5 12.5C17.5 13.8261 16.9727 15.0973 16.035 16.035M16.035 16.035L20.455 20.455M16.035 16.035C15.0973 16.9727 13.8261 17.5 12.5 17.5C11.1739 17.5 9.90268 16.9727 8.965 16.035M20.455 20.455C19.4103 21.4997 18.1701 22.3283 16.8052 22.8936C15.4403 23.459 13.9774 23.75 12.5 23.75C11.0226 23.75 9.55972 23.459 8.19481 22.8936C6.8299 22.3283 5.58966 21.4997 4.545 20.455M8.965 8.965L4.545 4.545M8.965 8.965C8.02732 9.90268 7.5 11.1739 7.5 12.5C7.5 13.8261 8.02732 15.0973 8.965 16.035M4.545 4.545C2.43522 6.65478 1.25 9.51631 1.25 12.5C1.25 13.9774 1.54099 15.4403 2.10636 16.8052C2.67172 18.1701 3.50034 19.4103 4.545 20.455M8.965 16.035L4.545 20.455" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
,
  };
  return icons[id];
};

const BenefitsSection = ({ className = "" }) => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  const benefits = [
    { id: 1, title: t.Benefits_1_Title, desc: t.Benefits_1_Desc },
    { id: 2, title: t.Benefits_2_Title, desc: t.Benefits_2_Desc },
    { id: 3, title: t.Benefits_3_Title, desc: t.Benefits_3_Desc },
    { id: 4, title: t.Benefits_4_Title, desc: t.Benefits_4_Desc },
  ];

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setActiveIndex((prev) => Math.min(prev + 1, benefits.length - 1));
      } else {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    }
    touchStartX.current = null;
  };

  return (
    <div className={className}>
      {/* ── DESKTOP grid (md+) ── */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {benefits.map((b) => (
          <div key={b.id} className="bg-white p-6 rounded-[20px] border border-[#40A587] shadow-[0px_4px_4px_0px_#238869] transition-shadow flex flex-col gap-4" style={{minHeight: '231px'}}>
            <div className="w-[60px] h-[60px] rounded-xl bg-[#44A07E] flex items-center justify-center text-white">
              {getIcon(b.id)}
            </div>
            <h3 className="font-fraunces font-bold text-xl text-[#000000]">{b.title}</h3>
            <p className="text-[#737373] font-inter text-sm leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* ── MOBILE slider (below md) ── */}
      <div className="md:hidden">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="overflow-x-hidden overflow-y-visible py-2"
        >
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {benefits.map((b) => (
              <div key={b.id} className="min-w-full px-2">
                <div className="bg-white p-6 rounded-[20px] border border-[#40A587] shadow-[0px_4px_4px_0px_#238869] flex flex-col gap-4" style={{minHeight: '231px'}}>
                  <div className="w-[60px] h-[60px] rounded-xl bg-[#44A07E] flex items-center justify-center text-white">
                    {getIcon(b.id)}
                  </div>
                  <h3 className="font-fraunces font-bold text-xl text-[#000000]">{b.title}</h3>
                  <p className="text-[#737373] text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {benefits.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? "w-6 h-2.5 bg-[#44A07E]"
                  : "w-2.5 h-2.5 bg-neutral-300 hover:bg-neutral-400"
              }`}
              aria-label={`Go to benefit ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BenefitsSection;

