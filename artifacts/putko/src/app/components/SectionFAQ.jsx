"use client";
import React, { useContext, useEffect, useState } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const SectionFAQ = ({ className = "" }) => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  const faqs = [
    { question: t.FAQ_Q1 || "Ako si môžem rezervovať ubytovanie?", answer: t.FAQ_A1 || "Rezervácia je jednoduchá. Stačí si vybrať ubytovanie, zvoliť termín, počet osôb a kliknúť na rezervovať. Následne prejdete bezpečným procesom platby." },
    { question: t.FAQ_Q2 || "Sú moje platobné údaje v bezpečí?", answer: t.FAQ_A2 || "Áno, používame zabezpečenú platobnú bránu Stripe, ktorá spĺňa najvyššie bezpečnostné štandardy." },
    { question: t.FAQ_Q3 || "Môžem rezerváciu zrušiť?", answer: t.FAQ_A3 || "Každé ubytovanie má svoje vlastné storno podmienky, ktoré si môžete prečítať v detaile ubytovania pred samotnou rezerváciou." },
    { question: t.FAQ_Q4 || "Sú na platforme skryté poplatky?", answer: t.FAQ_A4 || "Nie, cena, ktorú vidíte pri rezervácii, je konečná. Neúčtujeme si žiadne skryté poplatky." },
    { question: t.FAQ_Q5 || "Ako sa skontaktujem s hostiteľom?", answer: t.FAQ_A5 || "Po potvrdení rezervácie získate prístup k priamej komunikácii s hostiteľom cez náš interný chat." },
    { question: t.FAQ_Q6 || "Čo robiť v prípade problémov počas pobytu?", answer: t.FAQ_A6 || "Odporúčame najskôr kontaktovať hostiteľa. Ak sa problém nevyrieši, naša zákaznícka podpora je vám k dispozícii." },
  ];

  return (
    <div className={`relative py-12 md:py-16 lg:py-20 bg-[#FFFEF9] ${className}`}>
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10 md:mb-12">
           <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] mb-4">
              {t.FAQ_Title || "Často kladené otázky"}
           </h2>
           <p className="text-[#64748B] font-inter text-lg">
              {t.FAQ_Subtitle || "Všetko, čo potrebujete vedieť o Putko."}
           </p>
        </div>

        <div className="space-y-4">
          {faqs.map((item, index) => (
            <Disclosure key={index}>
              {({ open }) => (
                <div className="border border-neutral-200 rounded-2xl bg-white overflow-hidden transition-all duration-200 hover:border-[#238869]/30">
                  <Disclosure.Button className="flex justify-between w-full px-6 py-5 text-left bg-white focus:outline-none focus-visible:ring focus-visible:ring-[#238869]/50">
                    <span className="text-base md:text-lg font-bold font-inter text-[#1A3A2E] pr-4">
                      {item.question}
                    </span>
                    <ChevronDownIcon
                      className={`${open ? "transform rotate-180" : ""} w-6 h-6 text-[#238869] shrink-0 transition-transform duration-200`}
                    />
                  </Disclosure.Button>
                  <Transition
                    enter="transition duration-200 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-100 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Disclosure.Panel className="px-6 pb-6 text-base text-[#64748B] font-inter leading-relaxed">
                      {item.answer}
                    </Disclosure.Panel>
                  </Transition>
                </div>
              )}
            </Disclosure>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionFAQ;
