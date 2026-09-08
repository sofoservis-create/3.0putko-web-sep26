"use client";
import React, { Fragment, useContext, useEffect, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { CircleX } from "lucide-react";
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
    <Popover className={`flex relative ${className}`}>
      {({ open }) => (
        <>
          <div
            className="flex-1 z-10 flex items-center focus:outline-none"
          >
            <Popover.Button
              className={`relative z-10 flex-1 flex text-left items-center ${fieldClassName} cursor-pointer focus:outline-none !shadow-none !outline-none`}
              onClickCapture={() => document.querySelector("html")?.click()}
            >

              <div className="flex-grow min-w-0">
                 <span className="block mb-0.5 font-semibold text-[9px] md:text-[11px] lg:text-[12.8px] leading-[20.48px] tracking-[0.64px] uppercase text-[#64748B] whitespace-nowrap">
                  {t.Guests}
                </span>
                <span className="block font-semibold text-xs md:text-sm xl:text-lg text-[#64748B] whitespace-nowrap">
                  {totalGuests ? `${totalGuests} ${t.guests}` : `${t.Addguests}`}
                </span>
              </div>

              {!!totalGuests && open && (
                <button 
                  onClick={handleReset}
                  className="absolute z-10 flex items-center justify-center w-5 h-5 text-sm transform -translate-y-1/2 rounded-full lg:w-6 lg:h-6 bg-neutral-200 right-1 lg:right-3 top-1/2"
                >
                  <CircleX className="w-4 h-4" />
                </button>
              )}
            </Popover.Button>

            {/* Search Button Removed from here as it is now in parent */}
          </div>

          {open && (
            <div className="h-8 absolute self-center top-1/2 -translate-y-1/2 z-0 -left-0.5 right-1 bg-white"></div>
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
            <Popover.Panel className="absolute right-0 z-10 w-full sm:min-w-[340px] max-w-sm bg-white top-full mt-3 py-5 sm:py-6 px-4 sm:px-8 rounded-3xl shadow-xl">
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

export default GuestsInput;