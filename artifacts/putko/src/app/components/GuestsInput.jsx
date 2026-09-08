"use client";

import React, { useEffect, useState } from "react";
import NcInputNumber from "../Shared/NcInputNumber";
import en from "../locales/en";
import sk from "../locales/sk";

const GuestsInput = ({ defaultValue = {}, onChange, className = "" }) => {
  const [guestValues, setGuestValues] = useState({
    adults: 0,
    children: 0,
    infants: 0,
  });

  // Optional: Set language manually
  const language = "sk"; // or "en"
  const t = { en, sk }[language];

  // Load values from localStorage or defaultValue
  useEffect(() => {
    const storedAdults = parseInt(localStorage.getItem("guestAdults")) || defaultValue.adults || 0;
    const storedChildren = parseInt(localStorage.getItem("guestChildren")) || defaultValue.children || 0;
    const storedInfants = parseInt(localStorage.getItem("guestInfants")) || defaultValue.infants || 0;

    setGuestValues({
      adults: storedAdults,
      children: storedChildren,
      infants: storedInfants,
    });
  }, [defaultValue]);

  // Save each value individually in localStorage when guestValues change
  useEffect(() => {
    const { adults, children, infants } = guestValues;
    localStorage.setItem("guestAdults", adults);
    localStorage.setItem("guestChildren", children);
    localStorage.setItem("guestInfants", infants);
  }, [guestValues]);

  const handleChangeData = (value, type) => {
    const newGuestValues = { ...guestValues, [type]: value };
    setGuestValues(newGuestValues);
    onChange && onChange(newGuestValues);
  };

  return (
    <div className={`flex flex-col relative p-5 ${className}`}>
      <span className="block mb-5 text-xl font-semibold sm:text-2xl">
        {`${t.Whoscoming}?`}
      </span>

      <NcInputNumber
        className="w-full"
        defaultValue={guestValues.adults}
        onChange={(value) => handleChangeData(value, "adults")}
        max={200}
        label={`${t.Adults}`}
        desc={`${t.Ages13orabove}`}
      />
      <NcInputNumber
        className="w-full mt-6"
        defaultValue={guestValues.children}
        onChange={(value) => handleChangeData(value, "children")}
        max={200}
        label={`${t.Children}`}
        desc={`${t.Ages212}`}
      />
      <NcInputNumber
        className="w-full mt-6"
        defaultValue={guestValues.infants}
        onChange={(value) => handleChangeData(value, "infants")}
        max={200}
        label={`${t.Infants}`}
        desc={`${t.Ages02}`}
      />  
    </div>
  );
};

export default GuestsInput;
