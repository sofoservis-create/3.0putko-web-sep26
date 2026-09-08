"use client"
import React, { useContext, useEffect, useState } from "react";
import { format } from "date-fns"
import "./styless.css";
import DatePicker, { registerLocale } from "react-datepicker";
import { enGB, sk as skLocale } from "date-fns/locale";
import DatePickerCustomHeaderTwoMonth from "./component/DatePickerCustomHeaderTwoMonth";
import DatePickerCustomDay from "./component/DatePickerCustomDay";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { Tooltip } from "react-tooltip";
import { blockingEntries } from "../utlis/availability";
import 'react-tooltip/dist/react-tooltip.css'

registerLocale("en", enGB);
registerLocale("sk", skLocale);

const SectionDateRange = ({ data }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [disabledRanges, setDisabledRanges] = useState([]);
  const { pricenight, ida, accdata, updatendate, updatestartdate, updatestartdatein,
    updateenddatein,
    startdatein,
    enddatein, } = useContext(FormContext);

  // Utility function to normalize a date (remove time)
  const normalizeDate = (date) => {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };


  useEffect(() => {
    // Retrieve stored dates from localStorage when component mounts
    if (startdatein && enddatein) {


      const storedCheckin = localStorage.getItem("checkin");
      const storedCheckout = localStorage.getItem("checkout");
      if (storedCheckin) setStartDate(new Date(storedCheckin));
      if (storedCheckout) setEndDate(new Date(storedCheckout));
    }
  }, [startdatein, enddatein]);

  useEffect(() => {
    // Retrieve stored dates from localStorage when component mounts
    if (typeof window !== "undefined") {
      const storedCheckin = localStorage.getItem("checkin");
      const storedCheckout = localStorage.getItem("checkout");
      if (storedCheckin) setStartDate(new Date(storedCheckin));
      if (storedCheckout) setEndDate(new Date(storedCheckout));
    }
  }, []);

  // Process occupancyCalendar to extract disabled ranges
  useEffect(() => {
    if (data?.occupancyCalendar || data?.excludedDates) {
      // Checkout holds are skipped — see utlis/availability.js.
      const ranges = blockingEntries(data?.occupancyCalendar).map((item) => ({
        startDate: normalizeDate(new Date(item.startDate)),
        endDate: normalizeDate(new Date(item.endDate)),
      }));

      const excludedDatesArray = data?.excludedDates?.map(date => normalizeDate(new Date(date))) || [];

      setDisabledRanges([...ranges, ...excludedDatesArray.map(date => ({ startDate: date, endDate: date }))]);
    }
  }, [data]);

  // Check if a date is disabled
  const isDisabledDate = (date) => {
    const normalizedDate = normalizeDate(date);
    return disabledRanges.some(
      (range) =>
        normalizedDate >= range.startDate && normalizedDate <= range.endDate
    );
  };

  // Check if any disabled dates are in the range
  const hasDisabledDatesInRange = (start, end) => {
    if (!start || !end) return false;

    let currentDate = new Date(start);
    while (currentDate <= end) {
      if (isDisabledDate(currentDate)) {
        return true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return false;
  };

  // Handle date changes
  const onChangeDate = (dates) => {
    let [start, end] = dates;

    // Fix: Swap if start date is after end date
    if (start && end && start > end) {
      [start, end] = [end, start];
    }

    const normalizedStart = normalizeDate(start);
    const normalizedEnd = normalizeDate(end);

    // Check if selected range includes any disabled dates
    if (
      (normalizedStart && isDisabledDate(normalizedStart)) ||
      (normalizedEnd && isDisabledDate(normalizedEnd)) ||
      (normalizedStart && normalizedEnd && hasDisabledDatesInRange(normalizedStart, normalizedEnd))
    ) {
      alert(t.YoucannotselectdisableddatesPleasechooseavalidrange || "You cannot select disabled dates. Please choose a valid range.");
      setStartDate(null);
      setEndDate(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("checkin");
        localStorage.removeItem("checkout");
        updatestartdate(null);
        updatendate(null);
      }
      return;
    }

    // Update state with valid dates
    setStartDate(normalizedStart);
    setEndDate(normalizedEnd);

    if (typeof window !== "undefined") {
      if (normalizedStart) {
        localStorage.setItem("checkin", format(normalizedStart, "yyyy-MM-dd"));
        updatestartdate(normalizedStart);
      } else {
        localStorage.removeItem("checkin");
        updatestartdate(null);
      }

      if (normalizedEnd) {
        localStorage.setItem("checkout", format(normalizedEnd, "yyyy-MM-dd"));
        updatendate(normalizedEnd);
      } else {
        localStorage.removeItem("checkout");
        updatendate(null);
      }
    }
  };

  const translations = { en, sk };
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  return (
    <div
      id="date-section"
      className="overflow-hidden section-date-range w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6"
    >
      {/* SECTION HEADER */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
          {t.Availability}
        </h2>
        <span className="block text-xs sm:text-sm text-neutral-400 font-normal">
          {t.Pricesmayincreaseonweekendsorholidays}
        </span>
        <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
      </div>

      <div>
        <DatePicker
          selected={startDate}
          onChange={onChangeDate}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          monthsShown={2}
          showPopperArrow={false}
          inline
          minDate={new Date()}
          locale={language}
          filterDate={(date) => !isDisabledDate(date)}
          renderCustomHeader={(props) => (
            <DatePickerCustomHeaderTwoMonth {...props} />
          )}
          renderDayContents={(day, date) => {
            const isDisabled = isDisabledDate(date);
            const isPast = date < new Date().setHours(0, 0, 0, 0); // compare only date, ignore time
            const tooltipText = isDisabled || isPast
              ? t?.Occupied || "Occupied / Disabled"
              : t?.Available || "Available";
            return (
              <div
                data-tooltip-id="date-tooltip"
                data-tooltip-content={tooltipText}
                style={{
                  color: isDisabled ? "gray" : "inherit",
                  textDecoration: isDisabled ? "line-through" : "none",
                  cursor: "default",
                }}
              >
                <DatePickerCustomDay dayOfMonth={day} date={date} />
              </div>
            );
          }}
        />
        <Tooltip id="date-tooltip" />

      </div>
      {/* LEGEND */}
      <div className="pt-5 border-t border-neutral-100">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-sm">
          {/* Occupied / Disabled Dates */}
          <div className="inline-flex items-center gap-2.5 bg-neutral-50/70 border border-neutral-100 rounded-xl px-3 py-2">
            <div className="w-7 h-7 border border-neutral-300 rounded-lg flex items-center justify-center text-xs font-semibold text-neutral-400 line-through bg-white">
              <span>15</span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-neutral-600">{t?.Occupied || "Occupied / Disabled"}</span>
          </div>

          {/* Available Dates */}
          <div className="inline-flex items-center gap-2.5 bg-neutral-50/70 border border-neutral-100 rounded-xl px-3 py-2">
            <div className="w-7 h-7 border border-neutral-300 rounded-lg bg-white flex items-center justify-center text-xs font-semibold text-neutral-700">
              <span>16</span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-neutral-600">{t?.Available || "Available"}</span>
          </div>

          {/* Selected Dates */}
          <div className="inline-flex items-center gap-2.5 bg-neutral-50/70 border border-neutral-100 rounded-xl px-3 py-2">
            <div className="w-7 h-7 rounded-lg bg-[#22C55E] flex items-center justify-center text-xs font-semibold text-white shadow-3xs">
              <span>17</span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-neutral-600">{t?.SelectedDates || "Selected Dates"}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SectionDateRange;
