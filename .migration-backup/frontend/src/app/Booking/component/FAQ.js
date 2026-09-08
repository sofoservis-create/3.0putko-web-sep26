"use client";
import React, { useState, useContext, useEffect } from "react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

function FAQ() {

  const translations = { en, sk };
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language]; // Translation object for the current language
    const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen px-6 py-10 lg:px-20">
      {/* Title Section */}
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-extrabold text-gray-800 lg:text-5xl">
          {t.faq_title}
        </h2>
        <p className="mt-4 text-lg text-gray-600 lg:text-xl">
          
        </p>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto space-y-6">
        {t.faqs.map((faq, index) => (
          <div
            key={index}
            className="overflow-hidden transition-shadow duration-300 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg"
          >
            <button
              className="flex items-center justify-between w-full p-5 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
              onClick={() => handleToggle(index)}
            >
              <span className="text-lg text-left lg:text-xl">{faq.question}</span>
              <svg
                className={`w-6 h-6 transform transition-transform duration-200 ${
                  openIndex === index ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openIndex === index && (
              <div className="px-5 py-4 text-gray-600 border-t border-gray-200 lg:text-lg">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQ;
