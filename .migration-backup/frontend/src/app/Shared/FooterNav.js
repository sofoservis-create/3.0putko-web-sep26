"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MenuBar from "./MenuBar";
import { AuthContext } from "../context/AuthContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";

const FooterNav = () => {
  const pathname = usePathname();
  const { user, role } = useContext(AuthContext);
  const { updatelang, lang } = useContext(FormContext);
  const translations = { en, sk };

  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [isLanguageMenuOpen, setLanguageMenuOpen] = useState(false);

  const toggleLanguageMenu = () => setLanguageMenuOpen(!isLanguageMenuOpen);

  const handleLanguageChange = (newLang) => {
    localStorage.setItem("appLanguage", newLang);
    updatelang(newLang);
    setLanguageMenuOpen(false);
  };

  useEffect(() => {
    const storedLanguage = localStorage.getItem("appLanguage");
    if (storedLanguage) {
      updatelang(storedLanguage);
    }
  }, [updatelang]);

  const t = translations[lang];

  const NAV = [
      {
        name: t?.Explore || "Explore", // Ensure fallback
        link: "/",
        icon: MagnifyingGlassIcon,
      },
      user && role ? {
        name: role === "host" ? t?.Profile || "Profile" : t?.Guest || "Guest",
        link: role === "host" ? "/Profile" : "/Profile",
        icon: UserCircleIcon,
      } : {
        name: t?.login || "Login",
        link: "/login",
        icon: UserCircleIcon,
      },
      {
        name: t?.Menu || "Menu",
        icon: MenuBar,
        isMenu: true, // Identifying as menu item for styling
      },
  ];

  const renderItem = (item, index) => {
    const isActive = pathname === item.link;

    return item.link ? (
      <Link
        key={index}
        href={item.link}
        className={`flex flex-col items-center justify-between text-neutral-500 ${
          isActive ? "text-neutral-900" : ""
        }`}
      >
        <item.icon className={`w-6 h-6 ${isActive ? "text-[#357965]" : ""}`} />
        <span
          className={`text-[11px] leading-none mt-1 ${
            isActive ? "text-[#357965]" : ""
          }`}
        >
          {item.name}
        </span>
      </Link>
    ) : (
      <div
        key={index}
        className={`flex flex-col items-center justify-between text-neutral-500 ${
          item.isMenu ? "pr-4" : "" // Add padding to Menu item
        }`}
      >
        <item.icon className="w-6 h-6" />
        <span className="text-[11px] leading-none mt-1">{item.name}</span>
      </div>
    );
  };

  return (
    <div className="FooterNav block md:!hidden p-2 bg-white fixed bottom-0 left-0 w-full z-50 border-t border-neutral-300 transition-transform duration-300 ease-in-out">
      <div className="flex justify-around w-full max-w-lg mx-auto text-sm text-center">
        {NAV.map(renderItem)}

        
      </div>
    </div>
  );
};

export default FooterNav;
