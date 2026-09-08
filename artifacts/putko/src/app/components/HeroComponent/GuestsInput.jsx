"use client";
import React, { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Popover } from "@headlessui/react";
import { CircleX, X } from "lucide-react";
import NcInputNumber from "./NcInputNumber";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const GuestsInput = ({
  fieldClassName = "[ nc-hero-field-padding ]",
  className = "[ nc-flex-1 ]",
}) => {
  const translations = { en, sk };
  const { lang, updateLocation, person, updateperson, updateDates } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  // Initialize states with values from localStorage or default values
  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(2);
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(1);
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(1);

  // Fetch values from localStorage on the client side
  useEffect(() => {
    const storedAdults = parseInt(localStorage.getItem("guestAdults"), 10) || 0;
    const storedChildren = parseInt(localStorage.getItem("guestChildren"), 10) || 0;
    const storedInfants = parseInt(localStorage.getItem("guestInfants"), 10) || 0;
 
    setGuestAdultsInputValue(storedAdults);
    setGuestChildrenInputValue(storedChildren);
    setGuestInfantsInputValue(storedInfants);
  }, []);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  const handleChangeData = (value, type) => {
    let newValue = {
      guestAdults: guestAdultsInputValue,
      guestChildren: guestChildrenInputValue,
      guestInfants: guestInfantsInputValue,
    };
    if (type === "guestAdults") {
      setGuestAdultsInputValue(value);
      newValue.guestAdults = value;
      localStorage.setItem("guestAdults", value); // Save to localStorage
    }
    if (type === "guestChildren") {
      setGuestChildrenInputValue(value);
      newValue.guestChildren = value;
      localStorage.setItem("guestChildren", value); // Save to localStorage
    }
    if (type === "guestInfants") {
      setGuestInfantsInputValue(value);
      newValue.guestInfants = value;
      localStorage.setItem("guestInfants", value); // Save to localStorage
    }
    
    // Calculate the total guests and update it using updateperson
    const totalGuests =
      newValue.guestAdults +
      newValue.guestChildren +
      newValue.guestInfants; 
    // updateperson(totalGuests);
  };

  const handleReset = () => {
    setGuestAdultsInputValue(0);
    setGuestChildrenInputValue(0);
    setGuestInfantsInputValue(0);
    localStorage.setItem("guestAdults", 0);
    localStorage.setItem("guestChildren", 0);
    localStorage.setItem("guestInfants", 0);
    updateperson(0);
  };

  const totalGuests = guestChildrenInputValue + guestAdultsInputValue + guestInfantsInputValue;


  return (
    <Popover className={`flex relative w-full h-full ${className}`}>
      {({ open, close }) => (
        <>
          <div
            className="flex-1 min-w-0 z-10 flex items-center focus:outline-none w-full h-full"
          >
            <Popover.Button
              className={`relative z-10 flex-1 w-full h-full flex text-left items-center px-4 sm:px-5 py-2.5 cursor-pointer focus:outline-none !shadow-none !outline-none rounded-[20px] ${open ? "ring-2 ring-[#238869]/20 bg-white" : ""}`}
              onClickCapture={() => document.querySelector("html")?.click()}
            >

              <div className="flex-grow min-w-0 overflow-hidden flex flex-col justify-center h-full">
                 <span className="block mb-0.5 font-bold text-[10px] md:text-[11px] uppercase tracking-wider text-[#4A5D54] truncate w-full">
                  {t.Guests}
                </span>
                <span className="block font-semibold text-sm xl:text-base text-[#112A22] truncate w-full">
                  {totalGuests ? `${totalGuests} ${t.guests}` : `${t.Addguests}`}
                </span>
              </div>

              {!!totalGuests && open && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="absolute z-10 flex items-center justify-center w-5 h-5 text-sm transform -translate-y-1/2 rounded-full bg-neutral-200 right-3 sm:right-4 top-1/2 text-neutral-500 hover:bg-neutral-300 hover:text-neutral-700 transition-colors shrink-0"
                >
                  <CircleX className="w-3.5 h-3.5" />
                </button>
              )}
            </Popover.Button>

            {/* Search Button Removed from here as it is now in parent */}
          </div>

          {open && typeof document !== "undefined" && createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
              <button
                type="button"
                className="absolute inset-0 bg-[#112A22]/20 backdrop-blur-[2px]"
                onClick={close}
                aria-label={t.close || "Close"}
              />
              <Popover.Panel
                static
                className="relative z-10 w-full max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto bg-white py-6 px-5 sm:px-8 rounded-3xl shadow-2xl"
              >
                <div className="mb-5 flex items-center justify-between border-b border-[#E7EFEB] pb-4">
                  <h3 className="font-dmsans text-base font-semibold text-[#112A22]">
                    {t.Guests}
                  </h3>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0F7F4] text-[#4A5D54] transition-colors hover:bg-[#DCEAE5] hover:text-[#112A22] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869]"
                    aria-label={t.close || "Close"}
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
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
            </div>,
            document.body
          )}
        </>
      )}
    </Popover>
  );
};

export default GuestsInput;