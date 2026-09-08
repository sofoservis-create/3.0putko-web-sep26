"use client"
import React, { useContext, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      router.push("/Profile");
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
    <header className="fixed top-0 left-0 z-50 w-full bg-white h-[96px]">
      <nav className="flex items-center justify-between w-full max-w-[1940px] mx-auto px-6 h-[72px] md:px-3 2xl:px-3">
        {/* ---- Left: Logo ---- */}
        <div className="flex items-center mt-8">
          <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="/putko.png" className="h-8" alt="Putko Logo" />
          </a>
        </div>

        {/* ---- Center Navigation / Search Bar ---- */}
        <div className="hidden lg:flex flex-1 justify-center px-4">
          <HeaderSearchForm />
        </div>


        {/* ---- Right: Menu ---- */}
        <div className="items-center hidden  mt-8 space-x-4 lg:flex">

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
                className="flex items-center gap-2 border rounded-full px-3 py-1 hover:shadow-lg transition"
              >
                <div className="bg-[#4FBE9F] w-8 h-8 text-white flex items-center justify-center rounded-full text-sm font-semibold">
                  {(() => {
                    if (!user?.name) return "";
                    const words = user.name.trim().split(" ");
                    if (words.length === 1) return words[0][0].toUpperCase(); // Single word
                    return (words[0][0] + words[1][0]).toUpperCase(); // First letter of first two words
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
