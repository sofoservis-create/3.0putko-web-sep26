"use client";

import { useEffect, useState, useContext } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import MobileStaySearchForm from "./HeroComponent/MobileStaySearchForm";

export default function StickySearchMobile({ dockInFooter = false }) {
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const {
    lang,
    isFullscreenModalOpen,
    updateperson,
    updateCity,
    updatestartdate,
    updatendate,
    updateAccommodationName,
  } = useContext(FormContext);
  const t = lang === "en" ? en : sk;

  const clearSearch = () => {
    updateCity("");
    updateAccommodationName("");
    updatestartdate("");
    updatendate("");
    updateperson("");

    [
      "checkin",
      "checkout",
      "selectedAccommodation",
      "selectedCity",
      "guestValues",
      "guestAdults",
      "guestChildren",
      "guestInfants",
    ].forEach((key) => localStorage.removeItem(key));
    setFormResetKey((key) => key + 1);
  };

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

  useEffect(() => {
    if (!dockInFooter) return undefined;

    const footer = document.getElementById("footer");
    if (!footer) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, [dockInFooter]);

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
  const shouldShowSticky =
    visible && !sheetOpen && !isFullscreenModalOpen && !footerVisible;

  const renderSearchButton = (className = "") => (
    <button
      type="button"
      onClick={() => setSheetOpen(true)}
      className={`flex items-center justify-center gap-2 px-6 py-3.5 bg-[#238869] hover:bg-[#1f775d] active:scale-[0.97] text-white text-sm font-semibold font-inter rounded-full shadow-[0_8px_24px_rgba(35,136,105,0.45)] transition-all ${className}`}
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
  );

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
        {renderSearchButton()}
      </div>

      {dockInFooter && (
        <div className="flex justify-center bg-[#1A3A2E] px-5 pb-8 pt-1 lg:hidden">
          {renderSearchButton("w-full max-w-[338px]")}
        </div>
      )}

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
            <div className="relative px-4 pt-5">
              <div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-300" />
              <div className="relative flex min-h-11 items-center justify-center px-12">
                <h2 className="text-center text-base font-semibold text-gray-800">
                  {t.SearchAccommodation}
                </h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2"
                  aria-label={t.CloseSearch}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex min-h-11 items-center justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-gray-600 underline underline-offset-2 transition hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2"
                >
                  {t.Clearall}
                </button>
              </div>
            </div>

            {/* Search form */}
            <div className="px-4 pb-8">
              <MobileStaySearchForm
                key={formResetKey}
                onSearch={() => setSheetOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}