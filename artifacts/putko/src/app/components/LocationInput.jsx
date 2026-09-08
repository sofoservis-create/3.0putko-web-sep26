"use client";

import React, { useState, useRef, useEffect, useContext } from "react";
import { CircleX, Clock3, MapPin } from "lucide-react";
import { FormContext } from "../FormContext";
import {
  getCanonicalCityMatch,
  loadCanonicalCities,
  mergeCanonicalCitySuggestion,
  resolveCanonicalCity,
} from "../utils/searchNormalization";

const LocationInput = ({
  autoFocus = false,
  placeHolder = "Location",
  desc = "Where are you going?",
  className = "nc-flex-1.5",
  divHideVerticalLineClass = "left-10 -right-0.5",
}) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showPopover, setShowPopover] = useState(autoFocus);

  const { updateCity, city } = useContext(FormContext);

  // Default 4 common locations
  const commonLocations = [
    { description: "Bratislava, Slovensko", place_id: "common-1" },
    { description: "Košice, Slovensko", place_id: "common-2" },
    { description: "Žilina, Slovensko", place_id: "common-3" },
    { description: "Banská Bystrica, Slovensko", place_id: "common-4" },
  ];

  // Load stored or context city
  useEffect(() => {
    const storedCity = localStorage.getItem("selectedCity");
    if (storedCity) {
      const canonicalCity = resolveCanonicalCity(storedCity);
      setValue(canonicalCity);
      localStorage.setItem("selectedCity", canonicalCity);
      updateCity(canonicalCity);
    } else if (city) {
      setValue(city);
    }
  }, [city]);

  // Close popover on outside click
  useEffect(() => {
    const eventClickOutsideDiv = (event) => {
      if (!containerRef.current) return;
      if (!showPopover || containerRef.current.contains(event.target)) return;
      setShowPopover(false);
    };

    if (showPopover) {
      document.addEventListener("click", eventClickOutsideDiv);
    }

    return () => {
      document.removeEventListener("click", eventClickOutsideDiv);
    };
  }, [showPopover]);

  // Focus input when popover opens
  useEffect(() => {
    if (showPopover && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPopover]);

  // Load Google Maps Places API
  const loadGoogleMapsScript = () => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        `script[src="https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places"]`
      );

      if (existingScript) {
        existingScript.onload = resolve;
        existingScript.onerror = reject;
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = (error) => {
        console.error("Error loading Google Maps API", error);
        reject(error);
      };
      document.body.appendChild(script);
    });
  };

  // Fetch suggestions from Google or show common cities
  const fetchSuggestions = async (input) => {
    if (!input) {
      setSuggestions(commonLocations);
      return;
    }

    try {
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

    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Input typing
  const handleInputChange = (e) => {
    const input = e.target.value;
    setValue(input);
    fetchSuggestions(input);
  };

  // Selecting a suggestion
  const handleSelectLocation = (item) => {
    const cityName = resolveCanonicalCity(item.description);
    setValue(item.type === "location" ? cityName : item.description);
    setShowPopover(false);
    if (item.type === "accommodation") {
      localStorage.setItem("selectedAccommodation", item.description);
      localStorage.removeItem("selectedCity");
    } else {
      localStorage.setItem("selectedCity", cityName);
      localStorage.removeItem("selectedAccommodation");
      updateCity(cityName);
    }
  };

  // Render suggestions or "No results"
  const renderSearchSuggestions = () => {
    if (suggestions.length === 0) {
      return (
        <div className="px-4 py-3 text-neutral-400 sm:px-8">
          No results found
        </div>
      );
    }

    return suggestions.map((item) => (
      <span
        onClick={() => handleSelectLocation(item)}
        key={item.id || item.place_id}
        className="flex items-center px-4 py-4 space-x-3 cursor-pointer sm:px-8 sm:space-x-4 hover:bg-neutral-100"
      >
        <span className="block text-[#000000]">
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
          if (!value) setSuggestions(commonLocations);
        }}
        className={`flex z-10 flex-1 relative [ nc-hero-field-padding ] flex-shrink-0 items-center space-x-3 cursor-pointer focus:outline-none text-left ${
          showPopover ? "nc-hero-field-focused" : ""
        }`}
      >
        <div className="text-neutral-300">
          <MapPin className="w-5 h-5 lg:w-7 lg:h-7" />
        </div>
        <div className="flex-grow">
          <input
            className="block w-full p-0 font-semibold truncate bg-transparent border-none focus:ring-0 focus:outline-none focus:placeholder-neutral-300 xl:text-lg placeholder-neutral-800"
            placeholder={city || placeHolder}
            value={value}
            onChange={handleInputChange}
            ref={inputRef}
          />
          <span className="block mt-0.5 text-sm text-neutral-400 font-light">
            <span className="line-clamp-1">{value ? placeHolder : desc}</span>
          </span>
          {value && showPopover && (
            <button
              onClick={() => {
                setValue("");
                setSuggestions([]);
                localStorage.removeItem("selectedCity");
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
