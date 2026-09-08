"use client"
import React, { Fragment, useContext, useState, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import { CircleX, Search } from "lucide-react";
import NcInputNumber from "../../Shared/NcInputNumber";
import { FormContext } from "../../FormContext";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { resolveCanonicalCity } from "../../utils/searchNormalization";

const GuestsInput = ({
  fieldClassName = "[ nc-hero-field-padding ]",
  className = "[ nc-flex-1 ]",
}) => {
  const translations = { en, sk };
  const { 
    lang, 
    updateperson, 
    updatestartdate, 
    updatendate,  
    updateAccommodationName, 
    updateCity,
    person,
  } = useContext(FormContext);
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

  const handleSearch = async () => {
    // --- Get latest values from localStorage ---
    const adults = parseInt(localStorage.getItem("guestAdults"), 10) || 0;
    const children = parseInt(localStorage.getItem("guestChildren"), 10) || 0;
    const infants = parseInt(localStorage.getItem("guestInfants"), 10) || 0;
    const total = adults + children + infants;
    if (total > 0) {
      updateperson(total); 
    }
    const checkin = localStorage.getItem("checkin") || "";
    const checkout = localStorage.getItem("checkout") || "";
    if (checkin) updatestartdate(checkin);
    if (checkout) updatendate(checkout);
    const storedAccommodation = localStorage.getItem("selectedAccommodation");
    const storedCity = localStorage.getItem("selectedCity");
    if (storedAccommodation) {
      updateAccommodationName(storedAccommodation);
      localStorage.removeItem("selectedCity");
      updateCity("");
    } else if (storedCity) { 
      const canonicalCity = resolveCanonicalCity(storedCity);
      localStorage.setItem("selectedCity", canonicalCity);
      updateCity(canonicalCity);
      localStorage.removeItem("selectedAccommodation");
      updateAccommodationName("");
    }else{
      updateAccommodationName(""); 
      updateCity("");
    }
    // --- Meta Pixel (Browser Event) ---
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Search", {
        search_string: storedCity || storedAccommodation || "",
        content_category: "Stay", 
        checkin_date: checkin,
        checkout_date: checkout,
        num_guests: total,
      });
    }

    // --- Meta CAPI (Backend Event) ---
    const userPayload = {
      email: localStorage.getItem("userEmail") || "",
      phone: localStorage.getItem("userPhone") || "",
      fbp: document.cookie
        .split("; ")
        .find((row) => row.startsWith("_fbp="))
        ?.split("=")[1],
      fbc: document.cookie
        .split("; ")
        .find((row) => row.startsWith("_fbc="))
        ?.split("=")[1],
    };

    try {
      await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/facebook-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Search",
          eventData: {
            search_string: storedCity || storedAccommodation || "",
            city: storedCity || "",
            checkin_date: checkin,
            checkout_date: checkout,
            num_items: total,
          },
          userPayload,
        }),
      });
    } catch (err) {
      console.error("Error sending Search CAPI:", err);
    }

    // --- Navigate to listing page ---
    // Note: User prompt ended with a semicolon, implying no specific navigation here or keeping it as is.
  };

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

  const totalGuests = guestChildrenInputValue + guestAdultsInputValue + guestInfantsInputValue;

  return (
    <Popover className={`flex relative ${className}`}>
      {({ open }) => (
        <>
          <div
            className={`flex-1 z-10 flex items-center focus:outline-none ${open ? "nc-hero-field-focused" : ""}`}
          >
            <Popover.Button
              className={`relative z-10 flex-1 flex text-left items-center ${fieldClassName} space-x-3 focus:outline-none`}
              onClickCapture={() => document.querySelector("html")?.click()}
            >
              <div className="text-neutral-300">
                <UserPlusIcon className="w-5 h-5 lg:w-7 lg:h-7" />
              </div>
              <div className="min-w-0 flex-grow">
                <span className="block truncate font-semibold capitalize xl:text-lg">
                   {totalGuests || ""} {t.Map_Guests || "Guests"}
                </span>
                <span className="mt-1 block truncate text-sm font-light leading-none text-neutral-400">
                  {totalGuests ? (t.Map_Guests || "Guests") : (t.Map_AddGuests || "Add guests")}
                </span>
              </div>

              {!!totalGuests && open && (
                <button
                  onClick={() => {
                    setGuestAdultsInputValue(0);
                    setGuestChildrenInputValue(0);
                    setGuestInfantsInputValue(0);
                    localStorage.setItem("guestAdults", 0);
                    localStorage.setItem("guestChildren", 0);
                    localStorage.setItem("guestInfants", 0);
                    updateperson(0);
                  }}
                  className="absolute z-10 flex items-center justify-center w-5 h-5 text-sm transform -translate-y-1/2 rounded-full lg:w-6 lg:h-6 bg-neutral-200 right-1 lg:right-3 top-1/2"
                >
                  <CircleX className="w-4 h-4" />
                </button>
              )}
            </Popover.Button>
            {/* BUTTON SUBMIT OF FORM */}
              <div className="flex shrink-0 items-center pr-2">
              <button
                onClick={(e) => {
                  e.preventDefault(); // Prevent page reload
                  handleSearch();
                }}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#238869] p-0 text-white shadow-[0_7px_18px_-8px_rgba(35,136,105,0.65)] transition-colors hover:bg-[#1C7358] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2"
                aria-label={t.Search || "Search"}
              >
                <Search className="h-[22px] w-[22px]" strokeWidth={2.25} />
              </button>
            </div>
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
                label={t.Map_Adults || "Adults"}
                desc={t.Map_AdultsDesc || "Ages 13 or above"}
              />
              <NcInputNumber
                className="w-full mt-6"
                defaultValue={guestChildrenInputValue}
                onChange={(value) => handleChangeData(value, "guestChildren")}
                max={100}
                label={t.Map_Children || "Children"}
                desc={t.Map_ChildrenDesc || "Ages 2-12"}
              />
              <NcInputNumber
                className="w-full mt-6"
                defaultValue={guestInfantsInputValue}
                onChange={(value) => handleChangeData(value, "guestInfants")}
                max={100}
                label={t.Map_Infants || "Infants"}
                desc={t.Map_InfantsDesc || "Ages 0-2"}
              />
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default GuestsInput;
