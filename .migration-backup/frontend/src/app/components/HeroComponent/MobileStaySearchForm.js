"use client";
import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import MobileLocationInput from "./MobileLocationInput";
import MobileDatesInput from "./MobileDatesInput";
import MobileGuestsInput1 from "./MobileGuestsInput1";

const MobileStaySearchForm = ({ className = "", onSearch }) => {
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
    if (checkin) updatestartdate(checkin);
    if (checkout) updatendate(checkout);
  const storedAccommodation = localStorage.getItem("selectedAccommodation");
    const storedCity = localStorage.getItem("selectedCity");
    if (storedAccommodation) {
      updateAccommodationName(storedAccommodation.toLowerCase());
      localStorage.removeItem("selectedCity");
    } else if (storedCity) {
      updateCity(storedCity.toLowerCase());
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

            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/facebook-events`, {
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
    <div className={`bg-white rounded-lg shadow-[0px_10px_40px_-5px_rgba(0,0,0,0.15)] ${className}`}>

      {/* Location */}
      <div className="border-b border-neutral-200 py-1 relative ">
        <MobileLocationInput />
      </div>

      {/* Dates */}
      <div className="border-b border-neutral-200 py-1 relative ">
        <MobileDatesInput />
      </div>

      {/* Guests */}
      <div className="border-b border-neutral-200 py-1 relative ">
        <MobileGuestsInput1 />
      </div>

      {/* Search Button */}
      <div className="px-5 py-5"> 
         <button
          type="button"
          onClick={handleSearch}
          className="w-full bg-[#40A587] hover:bg-[#368c72] font-inter font-normal text-xl active:scale-[0.98] text-white py-3.5 rounded-full shadow-md shadow-[#40A587]/30 transition-all flex items-center justify-center gap-2"
        >
          
          {t.Search || "Search"}
        </button>
      </div>
    </div>
  );
};

export default MobileStaySearchForm;
