"use client";
import React, { useState, useContext, useRef, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { CircleUserRound, EllipsisVertical, Plus } from "lucide-react";

const Header = ({ title, subtitle, showAddButton, onAddButtonClick }) => {
   const { user, role, dispatch } = useContext(AuthContext);
  const { lang } = useContext(FormContext);
  const { selectedpage, updateSelectedpage } = useContext(FormContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For user menu
  const menuRef = useRef(null); // Ref for detecting clicks outside of the menu

  const t = translations[language];

  // Update language state when `lang` changes
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    try {
      // Add your logout logic here
      dispatch({ type: "LOGOUT" });
      router.push("/");
    } catch (error) {
      console.error("Logout failed. Please try again.");
    }
  };


  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex flex-col gap-4 mb-4 md:flex-row md:justify-between">
        {/* Left Section: Title and Subtitle */}
        <div className="flex flex-col md:items-start">
          <h1 className="text-[#292A34] font-bold text-2xl">{title}</h1>
          <p className="text-[#292A34B2] text-xs font-medium">{subtitle}</p>
        </div>

        {/* Center Section: Add Button and User Profile */}
        <div className="hidden gap-4 md:flex md:flex-row md:items-center">
          {showAddButton && (
            <button
              className="flex items-center px-4 py-2 space-x-2 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              onClick={() => updateSelectedpage("AddAccommodation")}
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>{t.AddAccommodation}</span>
            </button>
          )}

          {/* User Profile Section */}
          <div className="relative">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {user?.photo ? (
                <img
                  src={user?.photo}
                  alt="User Profile"
                  className="object-cover w-8 h-8 rounded-full"
                />
              ) : (
                <CircleUserRound className="text-[#292A34] text-xl w-5 h-5 stroke-[2.5]" />
              )}
              <h1 className="text-[#292A34] text-sm">{user?.name || "User"}</h1>
              <EllipsisVertical className="text-gray-600 w-5 h-5 stroke-[2.5]" />
            </div>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 z-50 mt-2 bg-white rounded-lg shadow-lg w-40"
              >
                <ul className="py-2">
                  <li
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={handleLogout}
                  >
                    {t.logout}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
