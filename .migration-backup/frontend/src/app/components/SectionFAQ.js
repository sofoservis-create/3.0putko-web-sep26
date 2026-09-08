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

  const t = translations[language];

  // Hardcoded FAQs based on image/common use cases
  const faqs = [
    {
      question: t.FAQ_Q1,
      answer: t.FAQ_A1,
    },
    {
      question: t.FAQ_Q2,
      answer: t.FAQ_A2,
    },
    {
      question: t.FAQ_Q3,
      answer: t.FAQ_A3,
    },
    {
      question: t.FAQ_Q4,
      answer: t.FAQ_A4,
    },
    {
      question: t.FAQ_Q5,
      answer: t.FAQ_A5,
    },
    {
      question: t.FAQ_Q6,
      answer: t.FAQ_A6,
    },
  ];

  return (
    <div className={`nc-SectionFAQ relative px-4 ${className}`}>
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
           <h2 className="text-2xl lg:text-4xl font-extrabold font-poppins text-[#1D2025] mb-4">
              {t.FAQ_Title}
           </h2>
           <span className="text-[#6B7280] font-poppins text-lg">
              {t.FAQ_Subtitle}
           </span>
        </div>

        <div className="space-y-4">
          {faqs.map((item, index) => (
            <Disclosure key={index}>
              {({ open }) => (
                <div className="border border-neutral-100 rounded-2xl bg-white overflow-hidden">
                  <Disclosure.Button className="flex justify-between w-full px-6 py-4 text-left font-medium font-poppins text-[#1D2025] bg-white hover:bg-neutral-50 focus:outline-none focus-visible:ring focus-visible:ring-[#2C8360]/75">
                    <span className="text-base font-semibold">{item.question}</span>
                    <ChevronDownIcon
                      className={`${
                        open ? "transform rotate-180" : ""
                      } w-5 h-5 text-[#1D2025] transition-transform duration-200`}
                    />
                  </Disclosure.Button>
                  <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Disclosure.Panel className="px-6 pb-4 pt-2 text-sm text-[#6B7280] font-poppins leading-relaxed bg-white">
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
