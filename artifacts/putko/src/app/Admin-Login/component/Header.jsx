"use client";
import React, { useContext, useState, useRef, useEffect } from "react";
import Link from "@/app/components/NextLink";
import { useRouter } from "@/app/components/NextNavigation";
import { toast } from "react-toastify";
import { AuthContext } from "@/app/context/AuthContext";
import { FormContext } from "@/app/FormContext";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";

const Header = () => {
  const router = useRouter();
  const { user, role, dispatch } = useContext(AuthContext);
  const { selectedpage, updateSelectedpage, updatelang, lang } = useContext(FormContext);
  
  const menuRef = useRef(null);
  const langMenuRef = useRef(null);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [language, setLanguage] = useState(lang || "en");

  const translations = { en, sk };
  const t = translations[language];

  // Set default language from local storage
  useEffect(() => {
    const storedLanguage = localStorage.getItem("appLanguage");
    if (storedLanguage) {
      updatelang(storedLanguage);
      setLanguage(storedLanguage);
    }
  }, [updatelang]);

  const handleLogout = () => {
    try {
      dispatch({ type: "LOGOUT" });
      router.push("/");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const toggleMenu = () => setProfileMenuOpen((prev) => !prev);
  const toggleLanguageMenu = () => setLanguageMenuOpen((prev) => !prev);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    updatelang(lang);
    localStorage.setItem("appLanguage", lang);
    setLanguageMenuOpen(false);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-md">
      <nav className="flex items-center justify-between w-full px-6 py-6 bg-transparent md:px-6 2xl:px-28">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/Admin" className="flex items-center space-x-3">
            <img src="/putko.png" className="h-8" alt="Logo" />
          </Link>
        </div>

        {/* Right-side navigation */}
        <div className="items-center hidden space-x-4 lg:flex">
          {/* Language Selector */}
          <div className="relative" ref={langMenuRef}>
            <button className="flex items-center space-x-2 focus:outline-none" onClick={toggleLanguageMenu}>
              <img src={language === "en" ? "/uk.avif" : "/sk.avif"} alt="Language" className="w-6 h-6" />
              <span>{language === "en" ? "EN" : "SK"}</span>
            </button>
            {isLanguageMenuOpen && (
              <div className="absolute right-0 z-40 w-48 mt-2 bg-white rounded-md shadow-lg top-12">
                <ul className="flex flex-col px-4 py-2 space-y-1 text-sm font-medium">
                  <li>
                    <button
                      onClick={() => handleLanguageChange("en")}
                      className="flex items-center px-2 py-1 text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <img src="/uk.avif" alt="English" className="w-5 h-5 mr-2" />
                      English
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleLanguageChange("sk")}
                      className="flex items-center px-2 py-1 text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <img src="/sk.avif" alt="Slovakian" className="w-5 h-5 mr-2" />
                      Slovensko
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          {user ? (
            <div className="relative flex items-center space-x-2" ref={menuRef}>
              <button className="flex items-center focus:outline-none" onClick={toggleMenu}>
                <div className="flex items-center space-x-2">
                  <img
                    className="w-8 h-8 rounded-full"
                    src={user?.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                    alt={user?.name || "User"}
                  />
                  <span className="text-sm font-medium">{user?.name || "User"}</span>
                </div>
                {/* Three-dot menu icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6h.01M12 12h.01M12 18h.01" />
                </svg>
              </button>
              {isProfileMenuOpen && (
                <div className="absolute right-0 z-40 w-48 mt-2 bg-white rounded-md shadow-lg top-12">
                  <ul className="flex flex-col px-4 py-2 space-y-1 text-sm font-medium">
                    <li>
                      <Link
                        href={role === "superadmin" ? "/superadmin" : "/Admin"}
                        className="flex items-center px-2 py-1 text-gray-700 hover:bg-gray-100"
                      >
                        {role === "superadmin" ? "Superadmin Panel" : "Admin Panel"}
                      </Link>
                    </li>
                    <li onClick={handleLogout}>
                      <button className="block w-full text-left px-2 py-1 text-gray-700 hover:bg-gray-100">
                        {t.logout}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Link href="/Admin-Login">
              <button className="bg-[#4FBE9F] py-2 px-6 text-white font-[600] flex items-center justify-center rounded-lg">
                {t.login}
              </button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
