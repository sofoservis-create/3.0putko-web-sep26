"use client";

import React, { useContext, useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { format } from "date-fns";
import Link from "@/app/components/NextLink";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import MobileStaySearchForm from "./HeroComponent/MobileStaySearchForm";

const HeroSearchForm2Mobile = ({
  showTrigger = true,
  open,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const {
    lang,
    updateperson,
    updateCity,
    updatestartdate,
    updatendate,
    updateAccommodationName,
    city,
    accommodationName,
    person,
    startdate,
    enddate,
  } = useContext(FormContext);

  const language = lang || "sk";
  const t = language === "en" ? en : sk;
  const destinationSummary = accommodationName || city || t.Anywhere;
  const dateSummary =
    startdate && enddate
      ? `${format(new Date(startdate), "d.M.")} – ${format(new Date(enddate), "d.M.")}`
      : t.Anyweek;
  const guestSummary =
    Number(person) > 0
      ? `${person} ${language === "sk" ? "hostia" : Number(person) === 1 ? "guest" : "guests"}`
      : t.Addguests;

  const isControlled = typeof open === "boolean";
  const showModal = isControlled ? open : internalOpen;
  const setShowModal = (nextOpen) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };
  const closeModal = () => setShowModal(false);
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
    if (!showModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal]);

  return (
    <div className="HeroSearchForm2Mobile">
      {showTrigger && (
        <div className="flex items-center w-full gap-2">
          <Link href="/" className="flex-shrink-0">
            <img src="/P.avif" alt="logo" className="w-10 h-10 object-contain" />
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="relative flex min-w-0 items-center flex-1 px-4 py-2.5 border rounded-full shadow-[0_8px_24px_-12px_rgba(17,42,34,0.35)] border-[#DCEAE5] bg-white pr-4 text-[#112A22] transition hover:border-[#9CCDBD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2"
            aria-label={`${destinationSummary}, ${dateSummary}, ${guestSummary}`}
          >
            <MagnifyingGlassIcon className="flex-shrink-0 w-5 h-5 text-[#238869]" />
            <div className="flex-1 ml-3 overflow-hidden text-left">
              <span className="block truncate text-sm font-semibold">{destinationSummary}</span>
              <span className="block mt-0.5 text-xs font-light text-neutral-500">
                <span className="block truncate">{dateSummary} · {guestSummary}</span>
              </span>
            </div>
          </button>
        </div>
      )}

      <Dialog
        open={showModal}
        onClose={closeModal}
        className="fixed inset-0 z-[999999] lg:hidden"
      >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              aria-hidden="true"
            />

            <DialogPanel className="absolute bottom-0 left-0 right-0 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-2xl bg-white shadow-2xl animate-slideUp">
              <div className="relative px-4 pt-5">
                <div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-300" />
                <div className="relative flex min-h-11 items-center justify-center px-12">
                  <DialogTitle className="text-center text-base font-semibold text-gray-800">
                    {t.SearchAccommodation}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2"
                    aria-label={t.CloseSearch}
                  >
                    <XMarkIcon className="h-5 w-5" />
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

              <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
                <MobileStaySearchForm key={formResetKey} onSearch={closeModal} />
              </div>
            </DialogPanel>
      </Dialog>
    </div>
  );
};

export default HeroSearchForm2Mobile;