"use client";

import React, { useState, useRef, useEffect, useContext } from "react";
import { CircleX, Clock3, MapPin } from "lucide-react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const LocationInput = ({
  autoFocus = false,
  className = "nc-flex-1.5",
  divHideVerticalLineClass = "left-10 -right-0.5",
}) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showPopover, setShowPopover] = useState(autoFocus);
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
  const desc = t.Whereareyougoin;

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
      setValue(storedCity);
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
      if (!showPopover || containerRef.current.contains(event.target)) return;
      setShowPopover(false);
    };

    if (showPopover) document.addEventListener("click", eventClickOutsideDiv);
    return () => document.removeEventListener("click", eventClickOutsideDiv);
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

      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;

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

      // Fetch accommodation suggestions
      const accommodationPromise = (async () => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl || (input || "").trim().length < 1) return [];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        try {
          const res = await fetch(
            `${baseUrl}/accommodations/searching?name=${encodeURIComponent(input)}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
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
              input,
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

      setSuggestions([...accommodationResults, ...locationResults]);
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
      const cityName = item.description.split(",")[0].trim();
      localStorage.setItem("selectedCity", cityName);
      localStorage.removeItem("selectedAccommodation");
    } else if (item.type === "accommodation") {
      localStorage.setItem("selectedAccommodation", item.description);
      localStorage.removeItem("selectedCity");
      
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
          {item.type === "accommodation"
            ? `🏨 ${item.description}`
            : item.description}
        </span>
      </span>
    ));
  };

  return (
    <div className={`relative flex ${className}`} ref={containerRef}>
      <div
        onClick={() => {
          setShowPopover(true);
          if (!value) setSuggestions(commonLocations); // ✅ show default locations on click
        }}
        className={`flex z-10 flex-1  relative [ nc-hero-field-padding ] flex-shrink-0 items-center space-x-3 cursor-pointer focus:outline-none text-left ${
          showPopover ? "nc-hero-field-focused" : ""
        }`}
      >
        <div className="text-neutral-300 ">
          <MapPin className="w-5 h-5 lg:w-7 lg:h-7" />
        </div>
        <div className="flex-grow">
          <input
            className="block w-full p-0 font-semibold truncate bg-transparent border-none focus:ring-0 focus:outline-none focus:placeholder-neutral-300 xl:text-lg placeholder-neutral-800"
            placeholder={placeHolder}
            value={value}
            onChange={handleInputChange}
            ref={inputRef}
          />
          <span className="block mt-0.5 text-sm text-neutral-400 font-light">
            <span className="line-clamp-1">{value ? placeHolder : desc}</span>
          </span>
          {value && (
            <button
              onClick={() => {
                setValue("");
                setSuggestions(commonLocations); // reset to defaults on clear
                localStorage.removeItem("selectedCity");
                localStorage.removeItem("selectedAccommodation");
                if (typeof updateAccommodationName === "function") {
                  updateAccommodationName("");
                }
                if (typeof updateCity === "function") {
                  updateCity("");
                }
              }}
              className="absolute z-10 flex items-center justify-center w-5 h-5 text-sm transform -translate-y-1/2 rounded-full lg:w-6 lg:h-6 bg-neutral-200 right-1 lg:right-3 top-1/2"
            >
              <CircleX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showPopover && (
        <div
          className={`h-8 absolute self-center top-1/2 -translate-y-1/2 z-0 bg-white ${divHideVerticalLineClass}`}
        ></div>
      )}

      {showPopover && (
        <div className="absolute left-0 z-40 w-full min-w-[300px] sm:min-w-[500px] bg-white top-full mt-3 py-3 sm:py-6 rounded-3xl shadow-xl max-h-96 overflow-y-auto">
          {renderSearchSuggestions()}
        </div>
      )}
    </div>
  );
};

export default LocationInput; 
