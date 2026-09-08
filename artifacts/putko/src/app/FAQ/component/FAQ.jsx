"use client";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import React, { useContext, useEffect, useState } from "react";

const FAQ = () => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const [openIndex, setOpenIndex] = useState(null);
  const [activeTab, setActiveTab] = useState("accommodation");

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setOpenIndex(null); // Smooth reset
  };

  // Derive selected FAQs directly during render to prevent out-of-sync state jumps
  const selectedFaqs = activeTab === "customer" ? t.faqsC : t.faqs;

  return (
    <div className=" text-[#1a1a1a] px-6 py-16 md:py-28 lg:px-32 font-sans selection:bg-[#14634b]/10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-16 md:mb-24 max-w-2xl">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#14634b] mb-3">
            {t.faq_title ? "FAQ" : "FAQ"}
          </p>
          <h2 className="text-4xl font-light tracking-tight md:text-5xl lg:text-6xl text-gray-900 leading-tight">
            {t.faq_title}
          </h2>
          <p className="mt-6 text-base md:text-lg text-gray-500 font-light leading-relaxed">
            {t.HavequestionsWehaveanswersExplorebelowtofindmoredetails}.
          </p>
        </header>

        {/* Navigation & Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* European Sidebar Navigation Tabs */}
          <div className="lg:col-span-4 sticky top-28 flex lg:flex-col gap-2 border-b lg:border-b-0 lg:border-l border-gray-200 pb-4 lg:pb-0 lg:pl-6">
            <button
              onClick={() => handleTabChange("customer")}
              className={`relative px-4 py-2 lg:py-3 text-left text-sm font-medium tracking-wide transition-all duration-300 rounded-md whitespace-nowrap ${
                activeTab === "customer"
                  ? "text-[#14634b] bg-[#14634b]/5 font-semibold"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              {activeTab === "customer" && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#14634b] hidden lg:block rounded-full" />
              )}
              {t.ForCustomers}
            </button>
            <button
              onClick={() => handleTabChange("accommodation")}
              className={`relative px-4 py-2 lg:py-3 text-left text-sm font-medium tracking-wide transition-all duration-300 rounded-md whitespace-nowrap ${
                activeTab === "accommodation"
                  ? "text-[#14634b] bg-[#14634b]/5 font-semibold"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              {activeTab === "accommodation" && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#14634b] hidden lg:block rounded-full" />
              )}
              {t.ForProviders}
            </button>
          </div>

          {/* Minimalist FAQ Accordion List */}
          <div className="lg:col-span-8 space-y-0 divide-y divide-gray-200/80">
            {selectedFaqs?.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className="group py-6 first:pt-0 last:pb-0 transition-all duration-300"
                >
                  <button
                    className="flex items-start justify-between w-full text-left font-normal py-2 focus:outline-none focus-visible:text-[#14634b]"
                    onClick={() => handleToggle(index)}
                  >
                    <span className="text-lg md:text-xl font-light text-gray-900 tracking-tight group-hover:text-[#14634b] transition-colors duration-200 pr-4">
                      {faq.question}
                    </span>
                    
                    {/* Minimalist Plus/Minus Vector */}
                    <span className="relative flex items-center justify-center w-6 h-6 mt-1 flex-shrink-0">
                      <span className={`absolute w-4 h-[1.5px] bg-gray-400 group-hover:bg-[#14634b] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      <span className={`absolute w-[1.5px] h-4 bg-gray-400 group-hover:bg-[#14634b] transition-transform duration-300 ${isOpen ? "rotate-90 opacity-0" : ""}`} />
                    </span>
                  </button>

                  {/* Elegant Expanding Content */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100 pt-4" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm md:text-base text-gray-500 font-light leading-relaxed max-w-2xl pb-2">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default FAQ;