"use client";
import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "@/app/components/NextNavigation";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import LocationInput from "./LocationInput";
import StayDatesRangeInput from "./StayDatesRangeInput";
import GuestsInput from "./GuestsInput";
import { resolveCanonicalCity } from "../../utils/searchNormalization";

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
    router.push("/listing-stay-map");
  };

  return ( 
    <form className="w-full min-w-0 relative grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)_minmax(0,1fr)_minmax(190px,1.15fr)] gap-2 lg:gap-3 bg-white/95 backdrop-blur-xl p-2.5 lg:p-3 rounded-[28px] shadow-[0_24px_60px_-15px_rgba(17,42,34,0.15)] border border-white items-center">

      <div className="bg-[#F7FAF8] hover:bg-[#F0F5F2] transition-colors rounded-[20px] border border-[#DCEAE5] focus-within:border-[#238869] focus-within:bg-white flex shadow-sm h-[68px]">
        <LocationInput className="w-full h-full" />
      </div>

      <div className="bg-[#F7FAF8] hover:bg-[#F0F5F2] transition-colors rounded-[20px] border border-[#DCEAE5] focus-within:border-[#238869] focus-within:bg-white flex shadow-sm h-[68px]">
        <StayDatesRangeInput className="w-full h-full" />
      </div>

      <div className="bg-[#F7FAF8] hover:bg-[#F0F5F2] transition-colors rounded-[20px] border border-[#DCEAE5] focus-within:border-[#238869] focus-within:bg-white flex shadow-sm h-[68px]">
        <GuestsInput className="w-full h-full" />
      </div>

      <div className="h-[68px] min-w-0 flex items-center md:col-span-1 xl:col-span-1">
        <button
          type="button"
          onClick={handleSearch}
          className="w-full min-w-0 h-full px-4 xl:px-5 bg-[#238869] hover:bg-[#1C7358] active:scale-[0.98] text-white text-[15px] sm:text-base font-bold rounded-[20px] transition-all shadow-[0_8px_20px_-6px_rgba(35,136,105,0.4)] flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[#238869]/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span className="min-w-0 whitespace-normal text-center leading-tight">
            {t.Search || "Search"}
          </span>
        </button> 
      </div>
    </form>
  );
};

export default StaySearchForm;
