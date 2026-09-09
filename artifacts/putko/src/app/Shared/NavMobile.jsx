"use client";

import React, { useContext, useEffect, useState } from "react";
import { Disclosure } from "@headlessui/react";
import Link from "@/app/components/NextLink";
import ButtonClose from "./ButtonClose";
import { FormContext } from "../FormContext";
import { AuthContext } from "../context/AuthContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { ChevronDown, Plus, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import HostActivationDialog from "../components/HostActivationDialog";

const LANGUAGES = [
  { id: 8, name: "Slovak", code: "sk", flag: "/sk.avif" },
  { id: 9, name: "English", code: "en", flag: "/uk.avif" },
];

const NavMobile = ({ onClickClose }) => {
  const { updatelang, lang } = useContext(FormContext);
  const {
    user,
    role,
    dispatch,
    activateHost,
    switchMode,
    isDevelopmentAccount,
  } = useContext(AuthContext);
  const translations = { en, sk };

  const storedLanguage =
    typeof window !== "undefined" ? localStorage.getItem("appLanguage") : "sk";
  const initialLanguage =
    LANGUAGES.find((l) => l.code === storedLanguage) || LANGUAGES[0];
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [showHostActivation, setShowHostActivation] = useState(false);
  const [activatingHost, setActivatingHost] = useState(false);

  const handleLanguageChange = (newLang) => {
    localStorage.setItem("appLanguage", newLang.code);
    updatelang(newLang.code);
    setSelectedLanguage(newLang);
  };

  useEffect(() => {
    const storedLanguage = localStorage.getItem("appLanguage");
    if (storedLanguage) {
      const langObj = LANGUAGES.find((lang) => lang.code === storedLanguage);
      if (langObj) {
        setSelectedLanguage(langObj);
        updatelang(storedLanguage);
      }
    }
  }, [updatelang]);

  const t = translations[lang];

  const handleLogout = () => {
    if (!dispatch) {
      console.error("Dispatch function is not available!");
      return;
    }
    dispatch({ type: "LOGOUT" }); // Call logout action
    onClickClose(); // Close the menu
    window.location.href = "/"; // Redirect to homepage
  };

  const openAddAccommodation = async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (!isDevelopmentAccount) {
      window.location.href = "/host";
      return;
    }

    if (!user.capabilities?.includes("host")) {
      setShowHostActivation(true);
      return;
    }

    try {
      setActivatingHost(true);
      if (role !== "host") await switchMode("host");
      onClickClose();
      window.location.href = "/host/listings/new";
    } catch (error) {
      toast.error(error.message || (lang === "en" ? "Something went wrong." : "Niečo sa pokazilo."));
    } finally {
      setActivatingHost(false);
    }
  };

  const confirmHostActivation = async () => {
    try {
      setActivatingHost(true);
      await activateHost();
      toast.success(lang === "en" ? "Host mode activated!" : "Hostiteľský režim bol aktivovaný!");
      setShowHostActivation(false);
      onClickClose();
      window.location.href = "/host/listings/new";
    } catch (error) {
      toast.error(error.message || (lang === "en" ? "Something went wrong." : "Niečo sa pokazilo."));
    } finally {
      setActivatingHost(false);
    }
  };

  return (
    <div className="w-full h-screen py-2 overflow-y-auto transition transform bg-white divide-y-2 shadow-lg ring-1 divide-neutral-100">
      <div className="relative py-8 mt-24 px-7">
        <Link href="/">
        <img
          src="/putko.png"
          alt=""
          className="inline-block w-24 ttnc-logo text-primary-600 focus:outline-none focus:ring-0"
          onClick={onClickClose}
        />
        </Link>
        <div className="flex flex-col mt-5 text-md text-neutral-700">
          <span>
            {lang === "en"
              ? "Discover the best accommodations and book your next stay easily."
              : "Objavte najlepšie ubytovania a rezervujte si ďalší pobyt jednoducho."}
          </span>
        </div>
        <span className="absolute p-1 right-2 top-2">
          <ButtonClose onClick={onClickClose} />
        </span>
      </div>

      <ul className="flex flex-col px-2 py-6 space-y-1">
        {user && (
          <li className="text-neutral-900">
            <button
              onClick={() => {
                onClickClose();
                window.location.href = "/host";
              }}
              className="flex items-center w-full px-4 py-2.5 text-lg font-medium tracking-wide rounded-lg hover:bg-neutral-100"
            >
              <img
                className="w-8 h-8 rounded-full border border-gray-300 object-cover"
                src={
                  user?.photo ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                }
                alt={user?.name || "User"}
              />
              <span className="ml-3 text-neutral-800">
                {user?.name || "User"}
              </span>
            </button>
          </li>
        )}
        {/* Login or Logout */}
        {user ? (
          <li className="text-neutral-900">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2.5 text-lg font-medium tracking-wide rounded-lg hover:bg-neutral-100"
            >
              <UserRound className="w-5 h-5"/>
              <span className="ml-2">{lang === "en" ? "Logout" : "Odhlásiť sa"}</span>
            </button>
          </li>
        ) : (
          <li className="text-neutral-900">
            <button
              onClick={() => {
                if (!user) {
                  window.location.href = "/login"; // Redirect to login if not logged in
                }
              }}
              className="flex items-center w-full px-3 py-2.5 text-lg font-medium tracking-wide rounded-lg hover:bg-neutral-100"
            >
              <UserRound className="w-5 h-5"/>
              <span className="ml-2">{lang === "en" ? "Login / Registration" : "Prihlásiť sa / Registrácia"}</span>
            </button>
          </li>
        )}

        {/* Add Accommodation */}
        <li className="text-neutral-900">
          <button
            onClick={openAddAccommodation}
            disabled={activatingHost}
            className="flex items-center w-full px-4 py-2.5 text-lg font-medium tracking-wide rounded-lg hover:bg-neutral-100"
          >
            <Plus className="w-5 h-5"/>
            <span className="ml-2">
              {lang === "en" ? "Add Accommodation" : "Pridať ubytovanie"}
            </span>
          </button>
        </li>

        {/* Language Selection */}
        <Disclosure as="li" className="text-neutral-900">
          {({ open, close }) => (
            <>
              <Disclosure.Button className="flex items-center w-full px-4 py-2.5 text-lg font-medium tracking-wide rounded-lg hover:bg-neutral-100">
                <img
                  src={selectedLanguage.flag}
                  alt={selectedLanguage.name}
                  width="24"
                  height="16"
                  className="w-6 h-4"
                  loading="lazy"
                  decoding="async"
                />
                <span className="ml-2">{selectedLanguage.name}</span>
                <ChevronDown
                  className={`ml-auto h-4 w-4 text-neutral-500 transform transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </Disclosure.Button>

              <Disclosure.Panel>
                <ul className="pb-1 pl-6 text-base nav-mobile-sub-menu">
                  {LANGUAGES.filter((lang) => lang.code !== selectedLanguage.code).map(
                    (lang) => (
                      <li key={lang.id}>
                        <button
                          onClick={() => {
                            handleLanguageChange(lang);
                            close();
                          }}
                          className="flex items-center px-4 py-2.5 text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-100 w-full text-left"
                        >
                          <img
                            src={lang.flag}
                            alt={lang.name}
                            width="24"
                            height="16"
                            className="w-6 h-4 mr-2"
                            loading="lazy"
                            decoding="async"
                          />
                          {lang.name}
                        </button>
                      </li>
                    )
                  )}
                </ul>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      </ul>
      <HostActivationDialog
        open={showHostActivation}
        language={lang}
        loading={activatingHost}
        onCancel={() => setShowHostActivation(false)}
        onConfirm={confirmHostActivation}
      />
    </div>
  );
};

export default NavMobile;
