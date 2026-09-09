"use client"
import React, { useContext, useState, useRef, useEffect } from "react";
import Link from "@/app/components/NextLink";
import { useRouter } from "@/app/components/NextNavigation";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { HomeIcon, LogOut, MapPin, Search, User, Clock3, CircleX, Repeat2 } from "lucide-react";
import {
  getCanonicalCityMatch,
  loadCanonicalCities,
  mergeCanonicalCitySuggestion,
  mergeDestinationSuggestions,
  resolveCanonicalCity,
  selectDestination,
} from "../utils/searchNormalization";

const Header = () => {
  const router = useRouter();
  const { user, role, dispatch, switchMode, isDevelopmentAccount } = useContext(AuthContext);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const { 
    selectedpage, updateSelectedpage, updatelang, lang,
    updateperson, updatestartdate, updatendate, 
    updateAccommodationName, updateCity, city
  } = useContext(FormContext);
  const menuRef = useRef(null);
  const [language, setLanguage] = useState(lang || "sk");

  const translations = { en, sk };

  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false);

  // Sticky compact search bar state
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [stickyDestination, setStickyDestination] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const searchContainerRef = useRef(null);

  const commonLocations = [
    { type: "location", id: "c1", description: "Bratislava, Slovensko" },
    { type: "location", id: "c2", description: "Košice, Slovensko" },
    { type: "location", id: "c3", description: "Žilina, Slovensko" },
    { type: "location", id: "c4", description: "Banská Bystrica, Slovensko" },
  ];

  // Set default language from local storage
  useEffect(() => {
    const storedLanguage = localStorage.getItem("appLanguage");
    if (storedLanguage) {
      updatelang(storedLanguage);
      setLanguage(storedLanguage);
    }
  }, []);

  // Scroll detection for sticky compact search bar
  useEffect(() => {
    const heroForm = document.getElementById("hero-search-form-desktop") || document.getElementById("hero-search-form");
    if (!heroForm) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickySearch(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(heroForm);
    return () => observer.disconnect();
  }, []);

  const handleLogout = () => {
    try {
      dispatch({ type: "LOGOUT" });
      router.push("/");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const toggleMenu = () => {
    setProfileMenuOpen((prev) => !prev);
  };

  const toggleLanguageMenu = () => {
    setLanguageMenuOpen((prev) => !prev);
  };

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlego = async () => {
    if (!user) {
      toast.warn("Please log in as a host to list your property");
      return;
    }
    if (isDevelopmentAccount) {
      if (user?.capabilities?.includes("host")) {
        if (role !== "host") await switchMode("host");
        router.push("/host");
      } else {
        toast.info(language === "en" ? "Activate host mode in your traveler account first." : "Najprv si v účte cestovateľa aktivujte režim hostiteľa.");
        router.push("/account");
      }
    } else if (role === "host") {
      updateSelectedpage("AddAccommodation");
      router.push("/host");
    } else {
      toast.error("Only hosts can list properties. Please log in as a host.");
    }
  };

  const handleDevelopmentModeSwitch = async () => {
    const nextMode = role === "host" ? "guest" : "host";
    try {
      await switchMode(nextMode);
      setProfileMenuOpen(false);
      router.push(nextMode === "host" ? "/host" : "/account");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    updatelang(lang);
    localStorage.setItem("appLanguage", lang);
    setLanguageMenuOpen(false);
  };

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
    if (!input) { setSuggestions(await mergeDestinationSuggestions("", commonLocations)); setLoading(false); return; }
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
          try {
            await loadGoogleMaps();
          } catch {
            return [];
          }
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
      setSuggestions(await mergeDestinationSuggestions(input, mergeCanonicalCitySuggestion(input, [...accResults, ...googleResults])));
    } catch { setSuggestions([]); }
    setLoading(false);
  };

  const handleStickyChange = (e) => {
    const v = e.target.value;
    setStickyDestination(v);
    localStorage.removeItem("selectedCity");
    localStorage.removeItem("selectedAccommodation");
    localStorage.removeItem("selectedDestination");
    if (updateAccommodationName) updateAccommodationName("");
    if (updateCity) updateCity("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  const handleStickySelect = (item) => {
    setStickyDestination(item.description);
    setShowDropdown(false);
    if (item.type === "location") {
      localStorage.removeItem("selectedDestination");
      const c = resolveCanonicalCity(item.description);
      localStorage.setItem("selectedCity", c);
      localStorage.removeItem("selectedAccommodation");
      if (updateAccommodationName) updateAccommodationName("");
      if (updateCity) updateCity(c);
    } else if (item.type === "accommodation") {
      localStorage.removeItem("selectedDestination");
      localStorage.setItem("selectedAccommodation", item.description);
      localStorage.removeItem("selectedCity");
      if (updateCity) updateCity("");
      if (updateAccommodationName) updateAccommodationName(item.description);
    } else selectDestination(item, updateCity, updateAccommodationName);
  };

  const handleStickySearch = async (e) => {
    e.preventDefault();
    if (stickyDestination.trim() && !localStorage.getItem("selectedCity") && !localStorage.getItem("selectedAccommodation")) {
      const base = (import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api");
      await loadCanonicalCities(base);
      const canonicalCity = getCanonicalCityMatch(stickyDestination);
      const destination = canonicalCity || stickyDestination.trim().normalize("NFC");
      localStorage.setItem("selectedCity", destination);
      setStickyDestination(destination);
    }

    const adults = parseInt(localStorage.getItem("guestAdults"), 10) || 0;
    const children = parseInt(localStorage.getItem("guestChildren"), 10) || 0;
    const infants = parseInt(localStorage.getItem("guestInfants"), 10) || 0;
    const total = adults + children + infants;
    if (total > 0 && updateperson) {
      updateperson(total);
    }

    const checkin = localStorage.getItem("checkin") || "";
    const checkout = localStorage.getItem("checkout") || "";
    if (checkin && updatestartdate) updatestartdate(checkin);
    if (checkout && updatendate) updatendate(checkout);

    const storedAccommodation = localStorage.getItem("selectedAccommodation");
    const storedCity = localStorage.getItem("selectedCity");
    if (storedAccommodation && updateAccommodationName) {
      updateAccommodationName(storedAccommodation);
      localStorage.removeItem("selectedCity");
    } else if (storedCity && updateCity) {
      const canonicalCity = resolveCanonicalCity(storedCity);
      localStorage.setItem("selectedCity", canonicalCity);
      updateCity(canonicalCity);
      localStorage.removeItem("selectedAccommodation");
    }

    // 1. Meta Pixel - Search (Browser)
    if (window.fbq) {
      window.fbq('track', 'Search', {
        search_string: localStorage.getItem("selectedCity") || "",
        content_category: "Stay",
        checkin_date: checkin || "",
        checkout_date: checkout || "",
        num_guests: (total || 0) 
      });
    }

    // 2. Meta CAPI - Search (Backend)
    const userPayload = {
        email: localStorage.getItem("userEmail") || "",
        phone: localStorage.getItem("userPhone") || "",
        fbp: document.cookie?.split('; ')?.find(row => row.startsWith('_fbp='))?.split('=')[1] || "",
        fbc: document.cookie?.split('; ')?.find(row => row.startsWith('_fbc='))?.split('=')[1] || "",
    };

    fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/facebook-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eventName: 'Search',
            eventData: {
                search_string: localStorage.getItem("selectedCity") || "",
                city: localStorage.getItem("selectedCity") || "",
                checkin_date: checkin || "",
                checkout_date: checkout || "",
                num_items: (total || 0) 
            },
            userPayload 
        })
    }).catch(err => console.error("Error sending Search CAPI:", err));

    router.push("/listing-stay-map");
  };

  const t = translations[language];

  return (
    <header className="fixed top-0 left-0 z-50 w-full bg-white">
      <nav className="flex items-center justify-between w-full max-w-[1440px] mx-auto px-6 h-[72px] md:px-3 2xl:px-3">
        {/* ---- Left: Logo ---- */}
        <div className="flex items-center">
          <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="/putko.png" className="h-8" alt="Putko Logo" />
          </a>
        </div>

        {/* ---- Center: Nav links OR compact sticky search bar ---- */}
        <div className="hidden lg:flex flex-1 items-center justify-center px-6">
          {/* Nav links — visible when hero is in view */}
          <div
            className={`flex gap-8 text-[16px] font-medium text-gray-700 transition-all duration-300 ${
              showStickySearch ? "opacity-0 pointer-events-none absolute" : "opacity-100"
            }`}
          >
            <Link
              href="/listing-stay-map"
              className="flex items-center gap-1.5 hover:text-[#4FBE9F] transition-all duration-150"
            >
              <MapPin size={18} className="text-[#4FBE9F]" />
              <span>{t.findStay}</span>
            </Link>
            {user && role === "host" && !isDevelopmentAccount && (
              <button
                onClick={handlego}
                className="flex items-center gap-1.5 hover:text-[#4FBE9F] transition-all duration-150"
              >
                <HomeIcon size={18} className="text-[#4FBE9F]" />
                <span>{t.listProperty}</span>
              </button>
            )}
          </div>

          {/* Compact sticky search bar — slides in when hero scrolls out */}
          <form
            onSubmit={handleStickySearch}
            className={`flex items-center gap-2 w-full max-w-md transition-all duration-300 ${
              showStickySearch ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none absolute"
            }`}
          >
            <div ref={searchContainerRef} className="relative flex items-center flex-1 gap-2 border border-gray-200 rounded-full px-4 py-2 shadow-sm bg-white hover:shadow-md transition-shadow">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={stickyDestination}
                onChange={handleStickyChange}
                onFocus={() => { setShowDropdown(true); if (!stickyDestination) setSuggestions(commonLocations); }}
                placeholder={t.Header_SearchPlaceholder || "Kam idete?"}
                className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
              />
              {stickyDestination && (
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setStickyDestination("");
                    localStorage.removeItem("selectedCity");
                    localStorage.removeItem("selectedAccommodation");
                    localStorage.removeItem("selectedDestination");
                    if (updateAccommodationName) updateAccommodationName("");
                    if (updateCity) updateCity("");
                    setSuggestions(commonLocations);
                  }} 
                  className="flex-shrink-0 w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center mr-1"
                >
                  <CircleX className="w-3 h-3 text-neutral-500" />
                </button>
              )}
              {showDropdown && (
                <div className="absolute left-0 right-0 top-full z-[50] bg-white shadow-xl rounded-2xl mt-2 max-h-72 overflow-y-auto border border-neutral-100">
                  {loading ? (
                    <div className="py-4 text-center text-sm text-neutral-400">Loading…</div>
                  ) : suggestions.length === 0 ? (
                    <div className="py-4 text-center text-sm text-neutral-400">{t.Noresultsfound || "No results found"}</div>
                  ) : (
                    suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => handleStickySelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <Clock3 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-neutral-700 truncate">
                          {item.type === "accommodation" ? `🏨 ${item.description}` : item.description}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-[#40A587] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#3ca685] transition shadow-[0_0_8px_0_#41C69F]"
            >
              {t.Header_SearchBtn || "Hľadať"}
            </button>
          </form> 
        </div>

        {/* ---- Right: Menu ---- */}
        <div className="items-center hidden space-x-3 lg:flex">

          {/* ---- Language Selector (flag icon only) ---- */}
          <div className="relative">
            <button
              onClick={toggleLanguageMenu}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition"
              aria-label="Change language"
            >
              <img
                src={language === "en" ? "/uk.avif" : "/sk.avif"}
                alt="Language"
                className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200"
              />
            </button>

            {/* Dropdown Menu */}
            {isLanguageMenuOpen && (
              <div className="absolute right-0 z-50 mt-3 w-48 bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] ring-1 ring-gray-100 overflow-hidden animate-slideDown">
                <ul className="divide-y divide-gray-100">
                  <li>
                    <button
                      onClick={() => handleLanguageChange("en")}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F8FAFB] hover:text-[#4FBE9F] transition-all duration-200"
                    >
                      <img src="/uk.avif" alt="English" className="w-5 h-5 mr-3 rounded-full ring-1 ring-gray-200" />
                      English
                      {language === "en" && (
                        <svg
                          className="ml-auto w-4 h-4 text-[#4FBE9F]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleLanguageChange("sk")}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F8FAFB] hover:text-[#4FBE9F] transition-all duration-200"
                    >
                      <img src="/sk.avif" alt="Slovak" className="w-5 h-5 mr-3 rounded-full ring-1 ring-gray-200" />
                      Slovak
                      {language === "sk" && (
                        <svg
                          className="ml-auto w-4 h-4 text-[#4FBE9F]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* ---- Profile / Login+CTA ---- */}
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 border rounded-full px-3 py-1 hover:shadow-lg transition"
              >
                <div className="bg-[#4FBE9F] w-8 h-8 text-white flex items-center justify-center rounded-full text-sm font-semibold">
                  {(() => {
                    if (!user?.name) return "";
                    const words = user.name.trim().split(" ");
                    if (words.length === 1) return words[0][0].toUpperCase();
                    return (words[0][0] + words[1][0]).toUpperCase();
                  })()}
                </div>
                <span className="text-[14px] font-medium">{user.name}</span>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 bg-white rounded-xl shadow-lg w-56 border border-gray-100 p-2">
                  <div className="px-4 py-2 border-b">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500"></p>
                  </div>
                  <ul className="py-2 text-sm text-gray-700">
                    <li>
                       <Link href={role === "host" ? "/host" : "/account"} className="flex items-center px-4 py-2 hover:bg-gray-100 rounded-md">
                        <User size={16} className="mr-2" /> {t.profile}
                      </Link>
                    </li>
                     {isDevelopmentAccount && user?.capabilities?.includes("host") && (
                       <li>
                         <button onClick={handleDevelopmentModeSwitch} className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 rounded-md">
                           <Repeat2 size={16} className="mr-2" />
                           {role === "host"
                             ? language === "en" ? "Travel mode" : "Režim cestovania"
                             : language === "en" ? "Host mode" : "Režim hostiteľa"}
                         </button>
                       </li>
                     )}
                    <li>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 rounded-md"
                      >
                        <LogOut size={16} className="mr-2" /> {t.logout}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/listing-stay-map"
                className="bg-[#40A587] text-white px-5 py-2 h-[40px] rounded-full shadow-[0_0_8.7px_0_#41C69F] flex items-center justify-center hover:bg-[#3ca685] transition font-medium text-sm"
              >
                {t.Header_FindAccommodation || "Nájdi ubytovanie"}
              </Link>
              <Link
                href="/login"
                className="text-gray-600 hover:text-[#4FBE9F] text-sm font-medium transition px-2"
              >
                {t.Header_LoginSecondary || "Prihlásiť sa"}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
