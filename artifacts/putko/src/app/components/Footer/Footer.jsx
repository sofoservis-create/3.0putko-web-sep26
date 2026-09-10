"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "@/app/components/NextLink";
import { useRouter } from "@/app/components/NextNavigation";
import { toast } from "react-toastify";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";
import { AuthContext } from "@/app/context/AuthContext";

const Footer = ({ compactMobile = false }) => {
  const router = useRouter();
  const { user, role } = useContext(AuthContext);
  const { updateSelectedpage, lang } = useContext(FormContext);

  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;
  const year = new Date().getFullYear();

  const handleRentAccommodation = () => {
    if (!user) {
      toast.warn(t.Pleaseloginasahosttolistyourproperty || "Prihláste sa prosím ako hostiteľ.");
      return;
    }
    if (role === "host") {
      updateSelectedpage("AddAccommodation");
      router.push("/host");
    } else {
      toast.error(t.OnlyhostscanlistpropertiesPleaseloginasahost || "Iba hostitelia môžu pridávať ubytovania.");
    }
  };

  const guestLinks = [
    { text: "Ako to funguje", href: "/#how-it-works", key: "HowItWorks_Title" },
    { text: "FAQ", href: "/FAQ", key: "FAQ_Title" },
    { text: "Pravidlá rezervácie", href: "#", key: "Footer_BookingPolicy" },
    { text: "Bezpečnosť", href: "#", key: "Footer_Safety" },
  ];

  const hostLinks = [
    { text: "Pridať ubytovanie", href: "/host", action: "rent", key: "Footer_ListYourProperty" },
    { text: "Partnerský program", href: "#", key: "Footer_PartnerProgram" },
    { text: "Cenník", href: "#", key: "Footer_Pricing" },
    { text: "Podpora pre hostiteľov", href: "#", key: "Footer_HostSupport" },
  ];

  const aboutLinks = [
    { text: "O nás", href: "/About", key: "AboutUs" },
    { text: "Blog", href: "/Blog", key: "Blog" },
    { text: "Kariéra", href: "#", key: "Footer_Careers" },
    { text: "Kontakt", href: "#", key: "Contact" },
  ];

  const getText = (item) => {
    if (item.key && t[item.key]) return t[item.key];
    return item.text;
  };

  return (
    <footer
      id="footer"
      className={`bg-[#1A3A2E] text-white pt-8 md:py-10 lg:py-12 ${
        compactMobile ? "pb-5" : "pb-28"
      }`}
    >
      <div className="container mx-auto px-4 max-w-7xl">

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] gap-8 md:gap-10 lg:gap-16 mb-8 md:mb-10">

          {/* Brand Column */}
          <div className="flex flex-col items-start gap-3">
            <Link href="/" className="inline-block focus:outline-none">
              <h2 className="font-fraunces text-3xl md:text-4xl font-bold text-white tracking-tight">
                Putko
              </h2>
            </Link>
            <p className="text-white/70 font-inter text-sm md:text-base leading-relaxed max-w-sm">
              {t.Footer_Description || "Nájdite a rezervujte si to najlepšie unikátne ubytovanie priamo cez Putko. Rýchlo, bezpečne a bez skrytých poplatkov."}
            </p>
          </div>

          {/* Compact Navigation Column */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            <div className="flex flex-col gap-2">
              <h3 className="font-inter font-bold text-sm text-white tracking-wider uppercase">
                {t.Footer_ForGuests || "Pre hostí"}
              </h3>
              <ul className="space-y-0.5">
                {guestLinks.map((item, index) => (
                  <li key={index}>
                    <Link href={item.href} className="text-white/70 hover:text-white font-inter text-sm md:text-base transition-colors py-1.5 inline-block">
                      {getText(item)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-inter font-bold text-sm text-white tracking-wider uppercase">
                {t.Footer_ForHosts || "Pre hostiteľov"}
              </h3>
              <ul className="space-y-0.5">
                {hostLinks.map((item, index) => (
                  <li key={index}>
                    {item.action === "rent" ? (
                      <button
                        onClick={handleRentAccommodation}
                        className="text-white/70 hover:text-white font-inter text-sm md:text-base transition-colors py-1.5 text-left inline-block"
                      >
                        {getText(item)}
                      </button>
                    ) : (
                      <Link href={item.href} className="text-white/70 hover:text-white font-inter text-sm md:text-base transition-colors py-1.5 inline-block">
                        {getText(item)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 col-span-2 lg:col-span-1">
              <h3 className="font-inter font-bold text-sm text-white tracking-wider uppercase">
                {t.Footer_AboutPutko || "O Putko"}
              </h3>
              <ul className="grid grid-cols-2 gap-x-6 lg:block lg:space-y-0.5">
                {aboutLinks.map((item, index) => (
                  <li key={index}>
                    <Link href={item.href} className="text-white/70 hover:text-white font-inter text-sm md:text-base transition-colors py-1.5 inline-block">
                      {getText(item)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
          <p className="text-white/50 font-inter text-sm">
            © {year} Putko. {t.AllRightsReserved || "Všetky práva vyhradené."}
          </p>

          <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:w-auto sm:justify-end sm:gap-x-6">
            <Link href="/Privacy-Policy" className="text-center text-white/50 hover:text-white font-inter text-sm leading-snug transition-colors py-1 sm:text-left">
              {t.PrivacyPolicy || "Ochrana osobných údajov"}
            </Link>
            <Link href="/Terms-&-Condition" className="text-center text-white/50 hover:text-white font-inter text-sm leading-snug transition-colors py-1 sm:text-left">
              {t.TermCondition || "Obchodné podmienky"}
            </Link>
            <Link href="/destination-photo-credits.html" className="text-center text-white/50 hover:text-white font-inter text-sm leading-snug transition-colors py-1 sm:text-left">
              {language === "en" ? "Photo credits and licences" : "Autori fotografií a licencie"}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
