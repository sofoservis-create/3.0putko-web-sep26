"use client";

import React, { useState, Fragment, useContext, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import NcInputNumber from "./component/NcInputNumber";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { FormContext } from "../FormContext";
// import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import toast styles
import en from "../locales/en";
import sk from "../locales/sk";

const GuestsInput = ({
  guestAdultsInputValue,
  guestChildrenInputValue,
  guestInfantsInputValue,
  handleChangeData,
  person, // Max guests allowed
  className = "flex-1",
}) => {
  const totalGuests =
    guestChildrenInputValue + guestAdultsInputValue + guestInfantsInputValue;

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  // Show toast when max guests reached
  useEffect(() => {
    if (totalGuests === person) {
      // toast.warning(t.MaxGuestsReached || "You have reached the maximum number of guests.");
    }
  }, [totalGuests, person]);

  return (
    <Popover className={`flex relative ${className}`}>
      {({ open }) => (
        <>
          <div
            className={`flex-1 flex items-center focus:outline-none rounded-b-3xl ${
              open ? "shadow-lg" : ""
            }`}
          >
            <Popover.Button className="relative z-10 flex items-center flex-1 p-3 space-x-3 text-left focus:outline-none">
              <div className="text-neutral-300">
                <UserPlusIcon className="w-5 h-5 lg:w-7 lg:h-7" />
              </div>
              <div className="flex-grow">
                <span className="block font-semibold xl:text-lg">
                  {totalGuests || ""} {t.Guests}
                </span>
                <span className="block mt-1 text-sm font-light leading-none text-neutral-400">
                  {totalGuests ? `${t.Guests}` : `${t.Addguests}`}
                </span>
              </div>
            </Popover.Button>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-10 w-full sm:min-w-[340px] max-w-sm bg-white top-full mt-3 py-5 sm:py-6 px-4 sm:px-8 rounded-3xl shadow-xl ring-1 ring-black ring-opacity-5">
              <NcInputNumber
                className="w-full"
                defaultValue={guestAdultsInputValue}
                onChange={(value) => {
                  if (value >= 1 && totalGuests - guestAdultsInputValue + value <= person) {
                    handleChangeData(value, "guestAdults");
                  }
                }}
                max={person - (guestChildrenInputValue + guestInfantsInputValue)}
                min={1}
                label={`${t.Adults}`}
                desc={`${t.Ages13orabove}`}
                disabled={totalGuests >= person} // Disable when max reached
              />

              <NcInputNumber
                className="w-full mt-6"
                defaultValue={guestChildrenInputValue}
                onChange={(value) => {
                  if (value >= 0 && totalGuests - guestChildrenInputValue + value <= person) {
                    handleChangeData(value, "guestChildren");
                  }
                }}
                max={person - (guestAdultsInputValue + guestInfantsInputValue)}
                min={0}
                label={`${t.Children}`}
                desc={`${t.Ages212}`}
                disabled={totalGuests >= person} // Disable when max reached
              />

              <NcInputNumber
                className="w-full mt-6"
                defaultValue={guestInfantsInputValue}
                onChange={(value) => {
                  if (value >= 0 && totalGuests - guestInfantsInputValue + value <= person) {
                    handleChangeData(value, "guestInfants");
                  }
                }}
                max={person - (guestAdultsInputValue + guestChildrenInputValue)}
                min={0}
                label={`${t.Infants}`}
                desc={`${t.Ages02}`}
                disabled={totalGuests >= person} // Disable when max reached
              />
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default GuestsInput;
