"use client";
import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "@/app/components/NextNavigation";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import MobileLocationInput from "./MobileLocationInput";
import MobileDatesInput from "./MobileDatesInput";
import MobileGuestsInput1 from "./MobileGuestsInput1";
import { Search } from "lucide-react";
import { resolveCanonicalCity } from "../../utils/searchNormalization";

const MobileStaySearchForm = ({ className = "", onSearch, statsFooter }) => {
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
    city
  } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const router = useRouter();

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  
  const handleSearch = () => {
    const adults = parseInt(localStorage.getItem("guestAdults"), 10) || 0;
    const children = parseInt(localStorage.getItem("guestChildren"), 10) || 0;
    const infants = parseInt(localStorage.getItem("guestInfants"), 10) || 0;
    const total = adults + children + infants;
    if (total > 0) {
      updateperson(total);
    }

        const checkin = localStorage.getItem("checkin") || "";
    const checkout = localStorage.getItem("checkout") || "";
    updatestartdate(checkin);
    updatendate(checkout);
  const storedAccommodation = localStorage.getItem("selectedAccommodation");
    const storedCity = localStorage.getItem("selectedCity");
    if (storedAccommodation) {
      updateAccommodationName(storedAccommodation);
      updateCity("");
      localStorage.removeItem("selectedCity");
    } else if (storedCity) {
      const canonicalCity = resolveCanonicalCity(storedCity);
      localStorage.setItem("selectedCity", canonicalCity);
      updateCity(canonicalCity);
      updateAccommodationName("");
      localStorage.removeItem("selectedAccommodation");
    }

                // 1. Meta Pixel - Search (Browser)
            if (window.fbq) {
              window.fbq('track', 'Search', {
                search_string: localStorage.getItem("selectedCity") || "",
                content_category: "Stay",
                checkin_date: startdate || "",
                checkout_date: enddate || "",
                num_guests:  (total || 0) 
              });
            }

            // 2. Meta CAPI - Search (Backend)
            const userPayload = {
                email: localStorage.getItem("userEmail") || "",
                phone: localStorage.getItem("userPhone") || "",
                fbp: document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1],
                fbc: document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1],
            };

            fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/facebook-events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventName: 'Search',
                    eventData: {
                        search_string: localStorage.getItem("selectedCity") || "",
                        city: localStorage.getItem("selectedCity") || "",
                        checkin_date: startdate || "",
                        checkout_date: enddate || "",
                        num_items:  (total || 0) 
                    },
                    userPayload 
                })
            }).catch(err => console.error("Error sending Search CAPI:", err));

    // Close bottom sheet if opened from sticky button
    if (onSearch) onSearch();
    // Navigate to listing map page 
    router.push("/listing-stay-map");
  }; 

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-[26px] border border-white shadow-[0_24px_60px_-18px_rgba(17,42,34,0.24)] p-2.5 ${className}`}>

      {/* Location */}
      <div className="relative rounded-[18px] border border-[#DCEAE5] bg-[#F7FAF8] transition-colors focus-within:border-[#40A587] focus-within:bg-white">
        <MobileLocationInput />
      </div>

      {/* Dates */}
      <div className="relative mt-2 rounded-[18px] border border-[#DCEAE5] bg-[#F7FAF8] transition-colors focus-within:border-[#40A587] focus-within:bg-white">
        <MobileDatesInput />
      </div>

      {/* Guests */}
      <div className="relative mt-2 rounded-[18px] border border-[#DCEAE5] bg-[#F7FAF8] transition-colors focus-within:border-[#40A587] focus-within:bg-white">
        <MobileGuestsInput1 />
      </div>

      {/* Search Button */}
      <div className="pt-2.5"> 
         <button
          type="button"
          onClick={handleSearch}
          className="w-full min-h-14 bg-[#40A587] hover:bg-[#368c72] font-inter font-semibold text-base active:scale-[0.985] text-white px-5 py-4 rounded-[18px] shadow-lg shadow-[#40A587]/25 transition-all flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#40A587]/25"
        >
          <Search className="h-5 w-5" strokeWidth={2.25} />
          {t.Search || "Search"}
        </button>
      </div>
      {statsFooter}
    </div>
  );
};

export default MobileStaySearchForm;
