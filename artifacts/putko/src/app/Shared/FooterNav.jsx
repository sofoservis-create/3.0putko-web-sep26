"use client";

import React, { useContext, useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "@/app/components/NextLink";
import { usePathname } from "@/app/components/NextNavigation";
import MenuBar from "./MenuBar";
import { AuthContext } from "../context/AuthContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";
import HeroSearchForm2Mobile from "../components/HeroSearchForm2Mobile";

const FooterNav = () => {
  const pathname = usePathname();
  const { user, role, isDevelopmentAccount } = useContext(AuthContext);
  const { updatelang, lang } = useContext(FormContext);
  const translations = { en, sk };

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLinkClick = (event, item) => {
    if (
      item.link !== "/login" ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
        icon: MagnifyingGlassIcon,
        isSearch: true,
      },
      user && role ? {
        name: role === "host" ? t?.Profile || "Profile" : t?.Guest || "Guest",
        link: role === "host" ? "/host" : "/account",
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
    if (item.isSearch) {
      return (
        <button
          key={index}
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex min-h-11 min-w-16 flex-col items-center justify-center text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2"
          aria-label={t?.Explore || "Explore"}
        >
          <item.icon className="h-6 w-6 text-black" />
          <span className="mt-1 text-[11px] leading-none text-black">{item.name}</span>
        </button>
      );
    }

    const isActive = pathname === item.link;

    return item.link ? (
      <Link
        key={index}
        href={item.link}
        onClick={(event) => handleLinkClick(event, item)}
        className="flex min-h-11 min-w-16 flex-col items-center justify-center text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2"
        aria-current={isActive ? "page" : undefined}
      >
        <item.icon className="h-6 w-6 text-black" />
        <span className="mt-1 text-[11px] leading-none text-black">
          {item.name}
        </span>
      </Link>
    ) : (
      <div
        key={index}
        className={`flex min-h-11 min-w-16 flex-col items-center justify-center text-black ${
          item.isMenu ? "pr-4" : "" // Add padding to Menu item
        }`}
      >
        <item.icon
          className="min-h-6 min-w-6 p-0 text-black"
          iconClassName="h-6 w-6 text-black"
        />
        <span className="mt-1 text-[11px] leading-none text-black">{item.name}</span>
      </div>
    );
  };

  return (
    <div className="FooterNav block md:!hidden p-2 bg-white fixed bottom-0 left-0 w-full z-50 border-t border-neutral-300 transition-transform duration-300 ease-in-out">
      <div className="flex justify-around w-full max-w-lg mx-auto text-sm text-center">
        {NAV.map(renderItem)}
      </div>
      <HeroSearchForm2Mobile
        showTrigger={false}
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </div>
  );
};

export default FooterNav;
