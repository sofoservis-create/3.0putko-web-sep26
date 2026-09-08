"use client"
import React, { useContext, useState, useRef, useEffect } from "react";
import Link from "@/app/components/NextLink";
import { useRouter } from "@/app/components/NextNavigation";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { LogOut, User } from "lucide-react";
import HeaderSearchForm from "./HeroSearchForm";


const Header = () => {
  const router = useRouter();
  const { user, role, dispatch } = useContext(AuthContext);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const { selectedpage, updateSelectedpage,updatelang,lang } = useContext(FormContext);
  const menuRef = useRef(null);
  const [language, setLanguage] = useState(lang || "sk"); 

  const translations = { en, sk };
  
  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false); 

  // Set default language from local storage
  useEffect(() => {
    const storedLanguage = localStorage.getItem("appLanguage");
    if (storedLanguage) {
      updatelang(storedLanguage);
      setLanguage(storedLanguage);
    }
  }, []);

  const handleLogout = () => {
    try {
      dispatch({ type: "LOGOUT" });
      // toast.success("Successfully logged out");
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlego = () => {
    if (!user) {
      toast.warn("Please log in as a host to list your property");
      return;
    }
    if (role === "host") {
      updateSelectedpage("AddAccommodation");
      router.push("/host");
    } else {
      toast.error("Only hosts can list properties. Please log in as a host.");
    }
  }; 

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    updatelang(lang);
    localStorage.setItem("appLanguage", lang); // Store language in local storage
    setLanguageMenuOpen(false);
    
  };

  const t = translations[language];


  return (
    <header className="fixed left-0 top-0 z-50 h-[96px] w-full border-b border-[#E7EFEB] bg-white/95 shadow-[0_8px_30px_-24px_rgba(17,42,34,0.35)] backdrop-blur-xl">
      <nav className="mx-auto grid h-full w-full max-w-[1940px] grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-4 px-5 xl:gap-6 xl:px-8 2xl:px-10">
        {/* ---- Left: Logo ---- */}
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <img src="/putko.png" className="h-9 w-auto" alt="Putko Logo" />
          </a>
        </div>

        {/* ---- Center Navigation / Search Bar ---- */}
        <div className="hidden min-w-0 justify-self-center lg:flex w-full max-w-[820px]">
          <HeaderSearchForm />
        </div>


        {/* ---- Right: Menu ---- */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">

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


          {/* ---- Profile / Login ---- */}
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                className="flex h-11 max-w-[180px] items-center gap-2 rounded-full border border-[#DCEAE5] bg-white px-1.5 pr-3 text-[#112A22] shadow-sm transition hover:border-[#9CCDBD] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869]"
              >
                <div className="bg-[#4FBE9F] w-8 h-8 text-white flex items-center justify-center rounded-full text-sm font-semibold">
                  {(() => {
                    if (!user?.name) return "";
                    const words = user.name.trim().split(" ");
                    if (words.length === 1) return words[0][0].toUpperCase(); // Single word
                    return (words[0][0] + words[1][0]).toUpperCase(); // First letter of first two words
                  })()}
                </div>
                <span className="truncate text-sm font-semibold">{user.name}</span>
              </button>


              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 bg-white rounded-xl shadow-lg w-56 border border-gray-100 p-2">
                  <div className="px-4 py-2 border-b">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500"></p>
                  </div>
                  <ul className="py-2 text-sm text-gray-700">
                    <li>
                      <Link href={`/${role === "guest" ? "Guest" : "Profile"}`} className="flex items-center px-4 py-2 hover:bg-gray-100 rounded-md">
                        <User size={16} className="mr-2" /> {t.profile}
                      </Link>
                    </li>
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
                className="flex h-11 items-center justify-center rounded-full bg-[#40A587] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(64,165,135,0.8)] transition hover:bg-[#368C72] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2 xl:px-5"
              >
                <span className="xl:hidden">{language === "en" ? "Search" : "Hľadať"}</span>
                <span className="hidden xl:inline">
                  {t.Header_FindAccommodation || "Nájdi ubytovanie"}
                </span>
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
