"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";
import { AuthContext } from "@/app/context/AuthContext";

/**
 * Footer Component - Redesigned to match dark theme reference
 */
const Footer = () => {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const { updateSelectedpage, lang } = useContext(FormContext);

  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const year = new Date().getFullYear();

  // Handle host login redirect (same as previous)
  const handleRentAccommodation = () => {
    if (!user) {
      toast.warn(t.Pleaseloginasahosttolistyourproperty);
      return;
    }

    if (role === "host") {
      updateSelectedpage("AddAccommodation");
      router.push("/Profile");
    } else {
      toast.error(t.OnlyhostscanlistpropertiesPleaseloginasahost);
    }
  };

  const guestLinks = [
    { text: "How it works", href: "/#how-it-works", key: "HowItWorks_Title" },
    { text: "FAQ", href: "/FAQ", key: "FAQ_Title" }, // Changed key to FAQ_Title as per en.js
    { text: "Booking policy", href: "#", key: "Footer_BookingPolicy" },
    { text: "Safety", href: "#", key: "Footer_Safety" },
  ];

  const hostLinks = [
    { text: "List your property", href: "/Profile", action: "rent", key: "Footer_ListYourProperty" }, // Special action
    { text: "Partner program", href: "#", key: "Footer_PartnerProgram" },
    { text: "Pricing", href: "#", key: "Footer_Pricing" },
    { text: "Host support", href: "#", key: "Footer_HostSupport" },
  ];

  const aboutLinks = [
    { text: "About us", href: "/About", key: "AboutUs" },
    { text: "Blog", href: "/Blog", key: "Blog" },
    { text: "Careers", href: "#", key: "Footer_Careers" },
    { text: "Contact", href: "#", key: "Contact" },
  ];

  // Helper to get translated text or fallback
  const getText = (item) => {
    if (item.key && t[item.key]) return t[item.key];
    return item.text; // Fallback to English text from array
  };

  return (
    <footer className="bg-[#2A2A2A] text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <h2 className="font-fraunces text-3xl font-bold text-white">Putko</h2>
            <p className="text-[#FFFFFFCC] font-inter text-sm leading-relaxed max-w-xs">
              {t.Footer_Description}
            </p>
          </div>

          {/* For Guests */}
          <div>
            <h3 className="font-bold text-base uppercase font-dmsans tracking-wide text-white mb-6">{t.Footer_ForGuests}</h3>
            <ul className="space-y-4">
              {guestLinks.map((item, index) => (
                <li key={index}>
                  <Link href={item.href} className="text-[#FFFFFFB2] font-inter hover:text-white transition-colors text-sm">
                    {getText(item)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Hosts */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide font-dmsans text-white mb-6">{t.Footer_ForHosts}</h3>
            <ul className="space-y-4">
              {hostLinks.map((item, index) => (
                <li key={index}>
                  {item.action === "rent" ? (
                    <button
                      onClick={handleRentAccommodation}
                      className="text-[#FFFFFFB2] hover:text-white font-inter transition-colors text-sm text-left"
                    >
                      {getText(item)}
                    </button>
                  ) : (
                    <Link href={item.href} className="text-[#FFFFFFB2] font-inter hover:text-white transition-colors text-sm">
                       {getText(item)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* About Putko */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide font-dmsans text-white mb-6">{t.Footer_AboutPutko}</h3>
            <ul className="space-y-4">
              {aboutLinks.map((item, index) => (
                <li key={index}>
                  <Link href={item.href} className="text-[#FFFFFFB2] font-inter hover:text-white transition-colors text-sm">
                    {getText(item)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#FFFFFFCC] font-dmsans text-sm">
            © {year} Putko. {t.AllRightsReserved || "All rights reserved."}
          </p>
          
          <div className="flex items-center gap-8">
            <Link href="/Privacy-Policy" className="text-[#FFFFFFB2] font-inter hover:text-white transition-colors text-sm underline decoration-gray-600 underline-offset-4">
              {t.PrivacyPolicy || "Privacy Policy"}
            </Link>
            <Link href="/Terms-&-Condition" className="text-[#FFFFFFB2] font-inter hover:text-white transition-colors text-sm underline decoration-gray-600 underline-offset-4">
              {t.TermCondition || "Terms of Service"}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;