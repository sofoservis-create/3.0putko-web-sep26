"use client";

import React, { useState, useRef, useEffect, useContext } from "react";
import { Building2, CircleX, Clock3, MapPin } from "lucide-react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import {
  getCanonicalCityMatch,
  loadCanonicalCities,
  mergeCanonicalCitySuggestion,
  resolveCanonicalCity,
} from "../../utils/searchNormalization";

const MobileLocationInput = ({ onNext }) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const { city, lang, updateAccommodationName, updateCity } = useContext(FormContext);
  const debounceRef = useRef(null);
 
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  useEffect(() => setLanguage(lang || "sk"), [lang]);
  const t = translations[language];

  const commonLocations = [
    { type: "location", id: "c1", description: "Bratislava, Slovensko" },
    { type: "location", id: "c2", description: "Košice, Slovensko" },
    { type: "location", id: "c3", description: "Žilina, Slovensko" },
    { type: "location", id: "c4", description: "Banská Bystrica, Slovensko" },
  ];

  // Sync from localStorage / context
  useEffect(() => {
    const storedAcc = localStorage.getItem("selectedAccommodation");
    const storedCity = localStorage.getItem("selectedCity");
    if (storedAcc) setValue(storedAcc);
    else if (storedCity) {
      const canonicalCity = resolveCanonicalCity(storedCity);
      setValue(canonicalCity);
      localStorage.setItem("selectedCity", canonicalCity);
      updateCity(canonicalCity);
    }
    else if (city) setValue(city);
  }, [city]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const loadGoogleMaps = () =>
    new Promise((resolve, reject) => {
      if (window.google?.maps?.places) return resolve();
      const src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { existing.onload = resolve; return; }
      const s = document.createElement("script");
      s.src = src; s.async = true; s.defer = true;
      s.onload = resolve; s.onerror = reject;
      document.body.appendChild(s);
    });

  const fetchSuggestions = async (input) => {
    if (!input) { setSuggestions(commonLocations); setLoading(false); return; }
    setLoading(true);
    try {
      const base = (import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api");
      await loadCanonicalCities(base);
      const canonicalCity = getCanonicalCityMatch(input);
      const suggestionQuery = canonicalCity || input;
      const [accResults, googleResults] = await Promise.all([
        (async () => {
          if (!base || input.trim().length < 1) return [];
          const ac = new AbortController();
          const tid = setTimeout(() => ac.abort(), 7000);
          try {
            const res = await fetch(`${base}/accommodations/searching?name=${encodeURIComponent(suggestionQuery)}`, { signal: ac.signal });
            clearTimeout(tid);
            const data = await res.json();
            const results = data.accommodations || (Array.isArray(data) ? data : []);
            return results.slice(0, 6).map((a) => ({ type: "accommodation", id: a._id, description: a.name || a.accommodationName }));
          } catch { return []; }
        })(),
        (async () => {
          await loadGoogleMaps();
          return new Promise((resolve) => {
            const svc = new window.google.maps.places.AutocompleteService();
            svc.getPlacePredictions({ input: suggestionQuery, types: ["(cities)"], componentRestrictions: { country: "sk" } }, (preds, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                resolve((preds || []).map((p) => ({ type: "location", id: p.place_id, description: p.description })));
              } else resolve([]);
            });
          });
        })(),
      ]);
      setSuggestions(mergeCanonicalCitySuggestion(input, [...accResults, ...googleResults]));
    } catch { setSuggestions([]); }
    setLoading(false);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);
    localStorage.removeItem("selectedCity");
    localStorage.removeItem("selectedAccommodation");
      updateAccommodationName("");
    updateCity("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  const handleSelect = (item) => {
    setValue(item.description);
    setShowDropdown(false);
    if (item.type === "location") {
      const c = resolveCanonicalCity(item.description);
      localStorage.setItem("selectedCity", c);
      localStorage.removeItem("selectedAccommodation");
      updateAccommodationName("");
      updateCity(c);
    } else {
      localStorage.setItem("selectedAccommodation", item.description);
      localStorage.removeItem("selectedCity");
      updateAccommodationName(item.description);
      updateCity("");
    }
    if (typeof onNext === "function") onNext();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    localStorage.removeItem("selectedCity");
    localStorage.removeItem("selectedAccommodation");
    updateAccommodationName("");
    updateCity("");
    setValue("");
    setSuggestions(commonLocations); 
   
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Row */}
      <div
        className="flex min-h-[70px] items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => {
          setShowDropdown(true);
          if (!value) setSuggestions(commonLocations);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#238869] shadow-sm ring-1 ring-[#DCEAE5]">
          <MapPin className="h-5 w-5" strokeWidth={2} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#64776F] leading-none mb-1.5">
            {t.Whereareyougoing || "Where are you going?"}
          </p>
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onFocus={() => { setShowDropdown(true); if (!value) setSuggestions(commonLocations); }}
            placeholder={t.Location || "Search destination"}
            className="w-full text-[15px] font-semibold text-[#112A22] bg-transparent border-none outline-none placeholder-[#899991] truncate"
          />
        </div>

        {/* Clear */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 w-11 h-11 -my-2.5 -mr-2.5 rounded-full bg-neutral-200 flex items-center justify-center"
            aria-label={language === "en" ? "Clear destination" : "Vymazať destináciu"}
          >
            <CircleX className="w-4 h-4 text-neutral-500" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-[50] bg-white shadow-xl rounded-2xl mt-1 max-h-72 overflow-y-auto border border-neutral-100">
          {loading ? (
            <div className="py-5 text-center text-sm text-neutral-400">Loading…</div>
          ) : suggestions.length === 0 ? (
            <div className="py-5 text-center text-sm text-neutral-400">{t.Noresultsfound || "No results found"}</div>
          ) : (
            suggestions.map((item) => (
              <button
                key={item.id}
                onMouseDown={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
              >
                <Clock3 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-neutral-700">
                  {item.type === "accommodation" && (
                    <Building2 className="h-4 w-4 shrink-0 text-[#238869]" />
                  )}
                  <span className="truncate">{item.description}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MobileLocationInput; 
