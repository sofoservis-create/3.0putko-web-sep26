"use client";

import converSelectedDateToString from "../utlis/converSelectedDateToString";
import React, { useContext, useState, useEffect } from "react";
import GuestsInput from "./GuestsInput";
import LocationInput from "../components/HeroComponent/LocationInput";
import { FormContext } from "../FormContext";
import StayDatesRangeInput from "./DatesRangeInput";
import en from "../locales/en";
import sk from "../locales/sk";

const StaySearchForm = () => {
  const [fieldNameShow, setFieldNameShow] = useState("location"); // "location" | "dates" | "guests"
  const [locationInputTo, setLocationInputTo] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const storedCheckin = localStorage.getItem("checkin");
    const storedCheckout = localStorage.getItem("checkout");

    if (storedCheckin) setStartDate(new Date(storedCheckin));
    if (storedCheckout) setEndDate(new Date(storedCheckout));
  }, []);

  const {
    updateCity,
    updatestartdate,
    updatendate,
    city,
    startdate,
    enddate,
    adults,
    updateAdults,
    childrens,
    updateChildren,
    infants,
    updateInfants,
    lang,
  } = useContext(FormContext);

  // Guest values from localStorage on first load
  const [localGuests, setLocalGuests] = useState({
    guestAdults: 0,
    guestChildren: 0,
    guestInfants: 0,
  });

  useEffect(() => {
    const storedAdults = parseInt(localStorage.getItem("guestAdults") || "0", 10);
    const storedChildren = parseInt(localStorage.getItem("guestChildren") || "0", 10);
    const storedInfants = parseInt(localStorage.getItem("guestInfants") || "0", 10);
    setLocalGuests({
      guestAdults: storedAdults || 0,
      guestChildren: storedChildren || 0,
      guestInfants: storedInfants || 0,
    });
  }, []);

  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  const t = translations[language];

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const closeModal = () => {
    setFieldNameShow(""); // Close the calendar
  };

  const renderInputLocation = () => {
    const isActive = fieldNameShow === "location";
    return (
      <div className={`w-full bg-white ${isActive ? "rounded-2xl" : "rounded-xl"}`}>
        <LocationInput
          defaultValue={locationInputTo}
          onChange={(value) => {
            setLocationInputTo(value);
          }}
        />
      </div>
    );
  };

  const renderInputDates = () => {
    const isActive = fieldNameShow === "dates";

    const checkin = localStorage.getItem("checkin");
    const checkout = localStorage.getItem("checkout");

    return (
      <div className={`w-full bg-white overflow-hidden ${isActive ? "rounded-2xl" : "rounded-xl"}`}>
        {!isActive ? (
          <button
            className="flex justify-between w-full p-4 text-sm font-medium"
            onClick={() => setFieldNameShow("dates")}
          >
            <span className="text-neutral-400">{t.When}</span>
            <span>
              {checkin && checkout
                ? converSelectedDateToString([new Date(checkin), new Date(checkout)])
                : `${t.Adddate}`}
            </span>
          </button>
        ) : (
          <StayDatesRangeInput
            closeModal={closeModal}
            onChangeDate={(dates) => {
              if (Array.isArray(dates)) {
                const [start, end] = dates;
                setStartDate(start);
                setEndDate(end);

                if (start && end) {
                  localStorage.setItem("checkin", start.toISOString());
                  localStorage.setItem("checkout", end.toISOString());
                }
              }
            }}
            selectedStartDate={startDate}
            selectedEndDate={endDate}
          />
        )}
      </div>
    );
  };

  const renderInputGuests = () => {
    const isActive = fieldNameShow === "guests";
    let guestSelected = "";

    const hasStoredGuests =
      localGuests.guestAdults !== 0 ||
      localGuests.guestChildren !== 0 ||
      localGuests.guestInfants !== 0;

    if (hasStoredGuests) {
      const totalGuests = localGuests.guestAdults + localGuests.guestChildren;
      guestSelected += totalGuests > 0 ? `${totalGuests} guests` : "";
      if (localGuests.guestInfants > 0) {
        guestSelected += `, ${localGuests.guestInfants} infants`;
      }
    } else if (adults || childrens || infants) {
      const totalGuests = (adults || 0) + (childrens || 0);
      guestSelected += totalGuests > 0 ? `${totalGuests} guests` : "";
      if (infants > 0) {
        guestSelected += `, ${infants} infants`;
      }
    }

    return (
      <div className={`w-full bg-white overflow-hidden ${isActive ? "rounded-2xl" : "rounded-xl"}`}>
        {!isActive ? (
          <button
            className="flex justify-between w-full p-4 text-sm font-medium"
            onClick={() => setFieldNameShow("guests")}
          >
            <span className="text-neutral-400">{t.Who}</span>
            <span>{guestSelected || `${t.Addguests}`}</span>
          </button>
        ) : (
          <GuestsInput
            defaultValue={{
              adults,
              children: childrens,
              infants,
            }}
            onChange={(newGuestInput) => {
              const {
                adults: guestAdults = 0,
                children: guestChildren = 0,
                infants: guestInfants = 0,
              } = newGuestInput || {};

              updateAdults(guestAdults);
              updateChildren(guestChildren);
              updateInfants(guestInfants);

              // Keep local summary in sync so the closed row updates immediately
              setLocalGuests({
                guestAdults,
                guestChildren,
                guestInfants,
              });

              // Individual keys (used by listing page + search)
              localStorage.setItem("guestAdults", String(guestAdults));
              localStorage.setItem("guestChildren", String(guestChildren));
              localStorage.setItem("guestInfants", String(guestInfants));

              // Same object the listing mobile footer reads — must stay in sync
              localStorage.setItem(
                "guestValues",
                JSON.stringify({
                  adults: guestAdults,
                  children: guestChildren,
                  infants: guestInfants,
                })
              );
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex-1 w-full mb-16 space-y-3 overflow-y-auto">
        {renderInputLocation()}
        {renderInputDates()}
        {renderInputGuests()}
      </div>
    </div>
  );
};

export default StaySearchForm;