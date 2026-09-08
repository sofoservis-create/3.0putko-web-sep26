"use client"
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
const DatePickerCustomHeaderTwoMonth = ({
  monthDate,
  customHeaderCount,
  decreaseMonth,
  increaseMonth,
}) => {

  
  const translations = { en, sk };
     const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
     const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
    
       // Update language state when `lang` changes in FormContext
       useEffect(() => {
         setLanguage(lang || "sk");
       }, [lang]);
     
  const t = translations[language];
   // Get the translated month name from locales
   const monthIndex = monthDate.getMonth();
   const translatedMonth = t.Months[monthIndex]; 

  return (
    <div>
      <button
        aria-label="Previous Month"
        className={
          "react-datepicker__navigation react-datepicker__navigation--previous absolute -top-1 left-0 flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
        }
        style={customHeaderCount === 1 ? { visibility: "hidden" } : {}}
        onClick={decreaseMonth}
        type="button"
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous">
          <ChevronLeftIcon className="w-5 h-5" />
        </span>
      </button>
      <span className="react-datepicker__current-month">
      {translatedMonth} {monthDate.getFullYear()}
      </span>
      <button
        aria-label="Next Month"
        className="absolute flex items-center justify-center p-2 rounded-full react-datepicker__navigation react-datepicker__navigation--next -top-1 -right-0 hover:bg-gray-100"
        style={customHeaderCount === 0 ? { visibility: "hidden" } : {}}
        type="button"
        onClick={increaseMonth}
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
          <ChevronRightIcon className="w-5 h-5" />
        </span>
      </button>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 w-full mt-4 text-center text-gray-600 text-sm">
        {t.Weekdays.map((day, index) => (
          <div key={index} className="font-medium">
            {day}
          </div> 
        ))}
      </div>
    </div>
  );
};

export default DatePickerCustomHeaderTwoMonth;
