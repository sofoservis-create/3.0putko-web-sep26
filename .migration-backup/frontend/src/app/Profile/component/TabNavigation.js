import React, { useContext, useEffect, useState } from "react";
import Price from "./Price";
import ContactForm from "./ContactForm";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const TabNavigation = ({ reservationData }) => {
  const translations = { en, sk }
            
    const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
    const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
                
      // Update language state when `lang` changes in FormContext
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
                
    const t = translations[language];

  const [activeTab, setActiveTab] = useState(`${t.Information}`);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case `${t.Contact}`:
        return <ContactForm contactInfo={reservationData} />;
      case `${t.Information}`:
      default:
        return <Price priceDetails={reservationData} />;
    }
  };

  return (
    <div className="mt-10 bg-white lg:p-8">
      {/* Tab Navigation */}
      <div className="flex flex-wrap mb-6 gap-2 sm:gap-4">
        {[`${t.Information}`, `${t.Contact}`].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-3 rounded-md font-semibold text-sm transition-all ${
              activeTab === tab
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Render Tab Content */}
      <div className=" lg:p-8">
        {renderActiveTabContent()}
      </div>
    </div>
  );
};

export default TabNavigation;
