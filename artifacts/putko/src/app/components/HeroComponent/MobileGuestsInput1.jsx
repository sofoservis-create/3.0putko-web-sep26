"use client";

import React, { Fragment, useContext, useEffect, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { CircleX, Users } from "lucide-react";
import NcInputNumber from "./NcInputNumber";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk"; 

const MobileGuestsInput1 = () => { 
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
    <Popover className="flex flex-col relative w-full">
      {({ open }) => (
        <>
          <div className="relative z-[9] flex min-h-[70px] flex-1 items-center px-4 py-3.5 focus:outline-none">
            <Popover.Button
              className="absolute inset-0 cursor-pointer rounded-[inherit] focus:outline-none !shadow-none !outline-none"
              onClickCapture={() => document.querySelector("html")?.click()}
              aria-label={t.Guests || "Guests"}
            />

            <div className="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#238869] shadow-sm ring-1 ring-[#DCEAE5]">
              <Users className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="pointer-events-none ml-3 min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#64776F] leading-none mb-1.5">
                {t.Guests || "Guests"}
              </p>
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="min-w-0 truncate text-[15px] font-semibold text-[#112A22]">
                  {displayLabel}
                </p>
                {!!totalGuests && open && (
                  <button
                    type="button"
                    aria-label={t.Resetguests || "Reset guests"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="pointer-events-auto relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#238869]"
                  >
                    <CircleX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {open && (
            <div className="h-8 absolute self-center top-1/2 -translate-y-1/2  -left-0.5 right-1 bg-white" />
          )}

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 -translate-y-2"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 -translate-y-2"
          >
            <Popover.Panel className="relative w-full bg-white pt-2 pb-6 px-6 sm:px-8">
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

export default MobileGuestsInput1;
