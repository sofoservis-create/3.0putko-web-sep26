"use client";
import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import LocationInput from "./LocationInput";
import StayDatesRangeInput from "./StayDatesRangeInput";
import GuestsInput from "./GuestsInput";

const StaySearchForm = () => {
  const translations = { en, sk };
  const { 
    lang, 
    updateperson, 
    updatestartdate, 
    updatendate,  
    updateAccommodationName, 
    updateCity,
    person,
    startdate,
    enddate,
    accommodationName,
    city,
    adults,
    childrens,
    infants
  } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const router = useRouter();

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
      updateAccommodationName(storedAccommodation.toLowerCase());
      localStorage.removeItem("selectedCity");
      updateCity("");
    } else if (storedCity) { 
      updateCity(storedCity.toLowerCase());
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
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/facebook-events`, {
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
    router.push("/listing-stay-map");
  };

  return ( 
    <form className="w-full relative mt-8 flex flex-col md:flex-row rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2 items-center divide-y md:divide-y-0 md:divide-x divide-neutral-100">
      <LocationInput className="w-full md:flex-[1.6]" />
      <StayDatesRangeInput className="w-full md:flex-[1.5] xl:flex-[1.2]" />
      <GuestsInput className="w-full md:flex-[1.5] xl:flex-[1.2]" />

      <div className="pt-4 md:pt-0 md:pl-2">
        <button
          type="button"
          onClick={handleSearch}
          className="w-full md:w-auto px-10 xl:px-20 py-4 bg-[#40A587] hover:bg-[#368c72] text-white text-base font-semibold rounded-full transition-all shadow-lg shadow-[#40A587]/20 flex items-center justify-center gap-2"
        >
          <span className="hidden md:block">
            {t.Search || "Search"}
          </span>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 md:hidden"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </button> 
      </div>
    </form>
  );
};

export default StaySearchForm;