"use client";

import DatePicker from "react-datepicker";
import React, { useContext, useEffect, useState } from "react";
import DatePickerCustomDay from "../Shared/DatePickerCustomDay";
import "../listings/styless.css";
import { FormContext } from "../FormContext";
import DatePickerCustomHeaderTwoMonth from "../Shared/DatePickerCustomHeaderTwoMonth";
import en from "../locales/en";
import sk from "../locales/sk";

const StayDatesRangeInput = ({ className = "", closeModal, onChangeDate, selectedStartDate, selectedEndDate }) => {
  const [startDate, setStartDate] = useState(selectedStartDate || null);
  const [endDate, setEndDate] = useState(selectedEndDate || null);
  const { updatestartdate, updatendate } = useContext(FormContext);

  const translations = { en, sk };
      const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
      const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
    
      // Update language state when `lang` changes in FormContext
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
    
    const t = translations[language];
    useEffect(() => {
      setStartDate(selectedStartDate || null);
      setEndDate(selectedEndDate || null);
    }, [selectedStartDate, selectedEndDate]);


  // Callback for date selection
  const handleDateChange = (dates) => {
    if (Array.isArray(dates)) {
      const [start, end] = dates; 
      setStartDate(start);
      setEndDate(end);

      // Update context
      // updatestartdate(start);
      // updatendate(end);
       const checkin = start?.toISOString().split("T")[0];   // "YYYY-MM-DD"
    const checkout = end?.toISOString().split("T")[0];

    if (checkin) localStorage.setItem("checkin", checkin);
    if (checkout) localStorage.setItem("checkout", checkout);


      // Notify parent
      if (onChangeDate) {
        onChangeDate(dates);
      }
    }
  };

  // Handle manual close of modal (controlled by a button or external trigger)
  const handleCloseModal = () => {
    if (closeModal) {
      closeModal();
    }
  };

  return (
    <div>
      <div className="p-5">
        <span className="block text-xl font-semibold sm:text-2xl">
          {`${t.Whensyourtrip}?`}
        </span>
      </div>
      <div
        className={`relative flex-shrink-0 flex justify-center z-10 py-5 ${className}`}
      >
        <DatePicker
          selected={startDate}
          onChange={handleDateChange}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          monthsShown={2}
          showPopperArrow={false}
          inline
          minDate={new Date()} // Disables all dates before today
          renderCustomHeader={(props) => (
            <DatePickerCustomHeaderTwoMonth {...props} />
          )}
          renderDayContents={(day, date) => (
            <DatePickerCustomDay dayOfMonth={day} date={date} />
          )}
        />
      </div>
    </div>
  );
};

export default StayDatesRangeInput;
