"use client";

import { useEffect, useState, useContext } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import MobileStaySearchForm from "./HeroComponent/MobileStaySearchForm";

export default function StickySearchMobile() {
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { lang, isFullscreenModalOpen } = useContext(FormContext);
  const t = lang === "en" ? en : sk;

  useEffect(() => {
    const target = document.getElementById("hero-search-form");
    if (!target) {
      // No hero on this page — always show the button
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  // Hide sticky completely when dates (or any fullscreen) modal is open
  const shouldShowSticky = visible && !sheetOpen && !isFullscreenModalOpen;

  return (
    <>
      {/* Sticky button */}
      <div
        className={`
          fixed bottom-6 left-0 w-full flex justify-center
          z-50 lg:hidden
          transition-all duration-300
          ${
            shouldShowSticky
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-8 opacity-0 pointer-events-none"
          }
        `}
      >
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-[#238869] hover:bg-[#1f775d] active:scale-[0.97] text-white text-sm font-semibold font-inter rounded-full shadow-[0_8px_24px_rgba(35,136,105,0.45)] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          {t.StickyCTA || "Hľadaj overené ubytovanie →"}
        </button>
      </div>

      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[100] lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slideUp">
            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="mx-auto w-10 h-1 rounded-full bg-gray-300 absolute top-3 left-1/2 -translate-x-1/2" />
              <span className="font-semibold text-gray-800 text-base">
                {lang === "en" ? "Search accommodation" : "Hľadaj ubytovanie"}
              </span>
              <button
                onClick={() => setSheetOpen(false)}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search form */}
            <div className="px-4 pb-8">
              <MobileStaySearchForm onSearch={() => setSheetOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}