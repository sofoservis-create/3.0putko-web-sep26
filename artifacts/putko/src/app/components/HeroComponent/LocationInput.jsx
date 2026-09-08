"use client";

import React, { useState, useRef, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { CircleX, Clock3 } from "lucide-react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import {
  getCanonicalCityMatch,
  loadCanonicalCities,
  mergeCanonicalCitySuggestion,
  resolveCanonicalCity,
} from "../../utils/searchNormalization";
 
const LocationInput = ({
  autoFocus = false,
  className = "",
  divHideVerticalLineClass = "left-10 -right-0.5",
}) => {
  const containerRef = useRef(null); 
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showPopover, setShowPopover] = useState(autoFocus);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const { city, updateAccommodationName, updateCity } = useContext(FormContext);
  const debounceRef = useRef(null); 

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const placeHolder = t.Location;
  const desc = t.Whereareyougoing; 

  // ✅ Common default locations
  const commonLocations = [
    { type: "location", id: "common-1", description: "Bratislava, Slovensko" },
    { type: "location", id: "common-2", description: "Košice, Slovensko" },
    { type: "location", id: "common-3", description: "Žilina, Slovensko" },
    { type: "location", id: "common-4", description: "Banská Bystrica, Slovensko" },
  ];

  // Sync value with localStorage on component mount (runs once only)
  useEffect(() => {
    const storedAccommodation = localStorage.getItem("selectedAccommodation");
    const storedCity = localStorage.getItem("selectedCity");
    if (storedAccommodation) {
      setValue(storedAccommodation);
    } else if (storedCity) {
      const canonicalCity = resolveCanonicalCity(storedCity);
      setValue(canonicalCity);
      localStorage.setItem("selectedCity", canonicalCity);
      updateCity(canonicalCity);
    } else if (city) {
      setValue(city);
    }
  }, []);

  useEffect(() => {
    setShowPopover(autoFocus);
  }, [autoFocus]);

  useEffect(() => {
    const eventClickOutsideDiv = (event) => {
      if (!containerRef.current) return;
      if (
        !showPopover ||
        containerRef.current.contains(event.target) ||
        popoverRef.current?.contains(event.target)
      ) return;
      setShowPopover(false);
    };

    if (showPopover) document.addEventListener("click", eventClickOutsideDiv);
    return () => document.removeEventListener("click", eventClickOutsideDiv);
  }, [showPopover]);

  useEffect(() => {
    if (!showPopover) {
      setPopoverPosition(null);
      return undefined;
    }

    const updatePopoverPosition = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportPadding = 16;
      const width = Math.min(
        Math.max(rect.width, 500),
        window.innerWidth - viewportPadding * 2
      );
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - width - viewportPadding
      );

      setPopoverPosition({
        left,
        top: rect.bottom + 12,
        width,
        maxHeight: Math.max(180, window.innerHeight - rect.bottom - 28),
      });
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [showPopover]);

  useEffect(() => {
    if (showPopover && inputRef.current) inputRef.current.focus();
  }, [showPopover]);

  const loadGoogleMapsScript = () => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve();
        return;
      }

      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;

      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existingScript) {
        existingScript.onload = resolve;
        existingScript.onerror = () => {
          console.error("Failed to load Google Maps API");
          reject(new Error("Google Maps API load error"));
        };
        return;
      }

      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = (error) => {
        console.error("Error loading Google Maps API:", error);
        reject(error);
      };
      document.body.appendChild(script);
    });
  };

  // ✅ Fetch suggestions (Google Places + backend + common locations)
  const fetchSuggestions = async (input) => {
    // Show default locations if empty
    if (!input) {
      setSuggestions(commonLocations);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const baseUrl = (import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api");
      await loadCanonicalCities(baseUrl);
      const canonicalCity = getCanonicalCityMatch(input);
      const suggestionQuery = canonicalCity || input;

      // Fetch accommodation suggestions
      const accommodationPromise = (async () => {
        if (!baseUrl || (input || "").trim().length < 1) return [];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        try {
          const res = await fetch(
            `${baseUrl}/accommodations/searching?name=${encodeURIComponent(suggestionQuery)}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // Backend returns { accommodations: [], totalCount: ... }
          const results = data.accommodations || (Array.isArray(data) ? data : []);
          return results.slice(0, 6).map((acc) => ({
            type: "accommodation",
            id: acc._id,
            description: acc.name || acc.accommodationName,
          }));
        } catch (err) {
          console.error("Error fetching accommodations:", err);
          return [];
        }
      })();

      // Fetch Google Places suggestions
      const googlePromise = (async () => {
        await loadGoogleMapsScript();
        return new Promise((resolve) => {
          const service = new window.google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: suggestionQuery,
              types: ["(cities)"],
              componentRestrictions: { country: "sk" },
            },
            (predictions, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                resolve(
                  (predictions || []).map((p) => ({
                    type: "location",
                    id: p.place_id,
                    description: p.description,
                  }))
                );
              } else {
                console.warn("Google Places API status:", status);
                resolve([]);
              }
            }
          );
        });
      })();

      const [accommodationResults, locationResults] = await Promise.all([
        accommodationPromise,
        googlePromise,
      ]);

      setSuggestions(
        mergeCanonicalCitySuggestion(input, [...accommodationResults, ...locationResults])
      );
      setLoading(false);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
      setLoading(true);
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    setValue(input);

    localStorage.removeItem("selectedCity");
    localStorage.removeItem("selectedAccommodation");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(input);
    }, 300);
  };

  const handleSelectLocation = (item) => {
    setValue(item.description);
    setShowPopover(false);

    if (item.type === "location") {
      const cityName = resolveCanonicalCity(item.description);
      localStorage.setItem("selectedCity", cityName);
      localStorage.removeItem("selectedAccommodation");
      updateCity?.(cityName);
      updateAccommodationName?.("");
    } else if (item.type === "accommodation") {
      localStorage.setItem("selectedAccommodation", item.description);
      localStorage.removeItem("selectedCity");
      updateAccommodationName?.(item.description);
      updateCity?.("");
    }
  };

  const renderSearchSuggestions = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-6">
          <span>Loading...</span>
        </div>
      );
    }

    if (suggestions.length === 0 && value?.trim()) {
      return (
        <div className="flex flex-col items-center justify-center px-6 py-8 text-center text-neutral-600">
          <p className="mb-2 font-semibold">
            {t.Noresultsfound
              ? `${t.Noresultsfound} "${value}"`
              : `No results for “${value}”`}
          </p>
          <p className="mb-4 text-sm">
            {language === "sk"
              ? "Skúste zadať iné mesto alebo pozrite obľúbené destinácie:"
              : "Try a different city or explore popular destinations:"}
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {["Košice", "Prešov", "Bratislava"].map((city) => (
              <button
                key={city}
                onMouseDown={() =>
                  handleSelectLocation({ type: "location", description: city })
                }
                className="px-3 py-1.5 rounded-full border border-neutral-300 hover:bg-neutral-100 text-sm font-medium transition"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (suggestions.length === 0) {
      return (
        <div className="flex items-center justify-center py-6">
          <span>{t.Noresultsfound || "No results found"}</span>
        </div>
      );
    }

    return suggestions.map((item) => (
      <span
        onMouseDown={() => handleSelectLocation(item)}
        key={item.id}
        className="flex items-center px-4 py-4 space-x-3 cursor-pointer sm:px-8 sm:space-x-4 hover:bg-neutral-100"
      >
        <span className="block text-neutral-400">
          <Clock3 className="w-4 h-4 sm:h-6 sm:w-6" />
        </span>
        <span className="block font-medium text-neutral-700">
          {item.type === "accommodation" ? (
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#238869]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
              {item.description}
            </span>
          ) : (
            item.description
          )}
        </span>
      </span>
    ));
  };

  return (
    <div className={`relative flex w-full h-full ${className}`} ref={containerRef}>
      <div
        onClick={() => {
          setShowPopover(true);
          if (!value) setSuggestions(commonLocations); // ✅ show default locations on click
        }}
        className={`flex z-10 flex-1 w-full relative px-4 sm:px-5 py-2.5 h-full items-center cursor-pointer focus:outline-none text-left rounded-[20px] ${
          showPopover ? "ring-2 ring-[#238869]/20 bg-white" : ""
        }`}
      >

        <div className="flex-grow min-w-0 overflow-hidden flex flex-col justify-center h-full">
          <span className="block mb-0.5 font-bold text-[10px] md:text-[11px] uppercase tracking-wider text-[#4A5D54] truncate w-full">
            {desc}
          </span>
          <input
            className="block w-full p-0 font-semibold text-[#112A22] bg-transparent border-none focus:ring-0 focus:outline-none focus:placeholder-neutral-400 text-sm xl:text-base truncate"
            placeholder={placeHolder}
            value={value}
            onChange={handleInputChange}
            ref={inputRef}
          />
          {value && (
            <button
              onClick={() => {
                setValue("");
                setSuggestions(commonLocations); // reset to defaults on clear
                localStorage.removeItem("selectedCity");
                localStorage.removeItem("selectedAccommodation");
                
              }}
              className="absolute z-10 flex items-center justify-center w-5 h-5 text-sm transform -translate-y-1/2 rounded-full bg-neutral-200 right-3 sm:right-4 top-1/2 text-neutral-500 hover:bg-neutral-300 hover:text-neutral-700 transition-colors shrink-0"
            >
              <CircleX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {showPopover && (
        <div
          className={`h-8 absolute self-center top-1/2 -translate-y-1/2 z-0 bg-white ${divHideVerticalLineClass}`}
        ></div>
      )}

      {showPopover && popoverPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[1000] bg-white py-3 sm:py-6 rounded-3xl shadow-xl overflow-y-auto"
          style={popoverPosition}
        >
          {renderSearchSuggestions()}
        </div>,
        document.body
      )}
    </div>
  );
};

export default LocationInput; 
 