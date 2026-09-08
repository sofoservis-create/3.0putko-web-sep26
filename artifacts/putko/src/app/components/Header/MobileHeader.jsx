"use client";
import React, { useContext, useState, useEffect, useRef } from "react";
import Link from "@/app/components/NextLink";
import { User, LogOut, Repeat2 } from "lucide-react";
import { toast } from "react-toastify";
import { FormContext } from "@/app/FormContext";
import { AuthContext } from "@/app/context/AuthContext";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import MenuBar from "@/app/Shared/MenuBar";

const MobileHeader = () => {
  const { lang, updatelang } = useContext(FormContext);
  const { user, role, dispatch, switchMode, isDevelopmentAccount } = useContext(AuthContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const toggleLanguage = () => {
    const next = language === "sk" ? "en" : "sk";
    setLanguage(next);
    updatelang(next);
    localStorage.setItem("appLanguage", next);
  };

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
  };

  const handleModeSwitch = async () => {
    const nextMode = role === "host" ? "guest" : "host";
    try {
      await switchMode(nextMode);
      setProfileMenuOpen(false);
      window.location.href = nextMode === "host" ? "/host" : "/account";
    } catch (error) {
      toast.error(error.message);
    }
  };

  // close profile menu if click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="lg:hidden sticky top-0 left-0 right-0 z-50 w-full bg-[#FFFEF9]">
      <div className="flex items-center justify-between px-4 py-3">

        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0">
          <img src="/putko.png" className="h-8" alt="Putko Logo" />
        </Link>

        <div className="flex items-center gap-2">
          {/* Language button — flag icon only */}
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition"
            aria-label="Change language"
          >
            <img
              src={language === "en" ? "/uk.avif" : "/sk.avif"}
              className="w-5 h-5 rounded-full object-cover"
              alt="lang"
            />
          </button>

          {/* Logged-in: show user avatar + dropdown */}
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 px-3 py-1 rounded-full border hover:shadow-md transition"
              >
                <div className="bg-[#4FBE9F] w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-semibold">
                  {user.name
                    ? user.name
                        .trim()
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : ""}
                </div>
                <span className="text-xs">{user.name?.split(" ")[0] || t.Account}</span>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg w-52 border p-2">
                  <Link
                    href={role === "host" ? "/host" : "/account"}
                    className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                  >
                    <User size={16} className="mr-2" /> {t.profile}
                  </Link>
                  {isDevelopmentAccount && user?.capabilities?.includes("host") && (
                    <button onClick={handleModeSwitch} className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-md">
                      <Repeat2 size={16} className="mr-2" />
                      {role === "host"
                        ? language === "en" ? "Travel mode" : "Režim cestovania"
                        : language === "en" ? "Host mode" : "Režim hostiteľa"}
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                  >
                    <LogOut size={16} className="mr-2" /> {t.logout}
                  </button>
                </div>
              )}
            </div>
          ) : null}
          {/* Login is intentionally removed for logged-out users — accessible via burger menu */}

          {/* Burger menu */}
          <MenuBar className="p-1.5 rounded-lg text-neutral-700" iconClassName="h-6 w-6" />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
