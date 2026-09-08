"use client";

import React, { Fragment, useContext, useEffect, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { CircleX } from "lucide-react";
import NcInputNumber from "./NcInputNumber";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk"; 

const MobileGuestsInput = () => {
  const { lang  ,updateperson} = useContext(FormContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  useEffect(() => setLanguage(lang || "sk"), [lang]);
  const t = translations[language];

  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(0);
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(0);
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(0);

  // Load from localStorage
  useEffect(() => {
    setGuestAdultsInputValue(parseInt(localStorage.getItem("guestAdults")) || 0);
    setGuestChildrenInputValue(parseInt(localStorage.getItem("guestChildren")) || 0);
    setGuestInfantsInputValue(parseInt(localStorage.getItem("guestInfants")) || 0);
  }, []);

  const handleChangeData = (value, type) => {
    if (type === "guestAdults") {
      setGuestAdultsInputValue(value);
      localStorage.setItem("guestAdults", value);
    } else if (type === "guestChildren") {
      setGuestChildrenInputValue(value);
      localStorage.setItem("guestChildren", value);
    } else if (type === "guestInfants") {
      setGuestInfantsInputValue(value);
      localStorage.setItem("guestInfants", value);
    }
  };

  const handleReset = () => {
    setGuestAdultsInputValue(0);
    setGuestChildrenInputValue(0);
    setGuestInfantsInputValue(0);
    localStorage.removeItem("guestAdults");
    localStorage.removeItem("guestChildren");
    localStorage.removeItem("guestInfants");
    updateperson(0); 
  };

  const totalGuests = guestAdultsInputValue + guestChildrenInputValue + guestInfantsInputValue;
  const displayLabel = totalGuests > 0
    ? `${totalGuests} ${t.guests || "guests"}`
    : t.Addguests || "Add guests";

  return (
    <Popover className="flex relative w-full">
      {({ open }) => (
        <>
          <div className="flex-1  flex items-center focus:outline-none">
            <Popover.Button
              className="relative z-[9] flex-1 flex text-left items-center px-6 py-3 cursor-pointer focus:outline-none !shadow-none !outline-none"
              onClickCapture={() => document.querySelector("html")?.click()}
            >
              <div className="flex-grow min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 leading-none mb-1">
                  {t.Guests || "Guests"}
                </p>
                <p className="text-sm font-semibold text-neutral-700 truncate">{displayLabel}</p>
              </div>

              {!!totalGuests && open && (
                <button
                  onClick={handleReset}
                  type="button"
                  aria-label={language === "en" ? "Clear guests" : "Vymazať hostí"}
                  className="absolute z-[9] flex items-center justify-center w-11 h-11 text-sm transform -translate-y-1/2 rounded-full bg-neutral-200 -right-2 lg:right-1 top-1/2"
                >
                  <CircleX className="w-4 h-4" />
                </button>
              )}
            </Popover.Button>
          </div>

          {open && (
            <div className="h-8 absolute self-center top-1/2 -translate-y-1/2  -left-0.5 right-1 bg-white" />
          )}

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0  w-full sm:min-w-[340px] max-w-sm bg-white top-full mt-3 py-5 sm:py-6 px-4 sm:px-8 rounded-3xl shadow-xl">
              <NcInputNumber
                className="w-full"
                defaultValue={guestAdultsInputValue}
                onChange={(value) => handleChangeData(value, "guestAdults")}
                max={100}
                min={1}
                label={`${t.Adults}`}
                desc={`${t.Ages13orabove}`}
              />
              <NcInputNumber
                className="w-full mt-6"
                defaultValue={guestChildrenInputValue}
                onChange={(value) => handleChangeData(value, "guestChildren")}
                max={100}
                label={`${t.Children}`}
                desc={`${t.Ages212}`}
              />
              <NcInputNumber
                className="w-full mt-6"
                defaultValue={guestInfantsInputValue}
                onChange={(value) => handleChangeData(value, "guestInfants")}
                max={100}
                label={`${t.Infants}`}
                desc={`${t.Ages02}`}
              />
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default MobileGuestsInput;
