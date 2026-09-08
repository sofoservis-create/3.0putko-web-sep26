import React, { useContext, useEffect, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import DatePickerCustomHeaderTwoMonth from "./component/DatePickerCustomHeaderTwoMonth";
import DatePickerCustomDay from "./component/DatePickerCustomDay";
import DatePicker, { registerLocale } from "react-datepicker";
import { enGB, sk as skLocale } from "date-fns/locale";
import ClearDataButton from "./component/ClearDataButton";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { Tooltip } from "react-tooltip";
import { blockingEntries } from "../utlis/availability";
import 'react-tooltip/dist/react-tooltip.css'

registerLocale("en", enGB);
registerLocale("sk", skLocale);

const StayDatesRangeInput = ({ className = "flex-1", onDateChange, data }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [disabledRanges, setDisabledRanges] = useState([]);

  const translations = { en, sk };
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const { pricenight, ida, accdata, updatendate, enddate, startdate, updatestartdate, updatestartdatein,
    updateenddatein,
    startdatein,
    enddatein, } =
    useContext(FormContext);

  // Initialize startDate and endDate from context
  // 🔥 Fix: Always convert context dates into real Date objects
  useEffect(() => {
    if (startdate) {
      setStartDate(startdate instanceof Date ? startdate : new Date(startdate));
    } else {
      setStartDate(null);
    }
    if (enddate) {
      setEndDate(enddate instanceof Date ? enddate : new Date(enddate));
    } else {
      setEndDate(null);
    }
  }, [startdate, enddate]);

  // Process occupancyCalendar and excludedDates to extract disabled ranges
  useEffect(() => {
    if (data?.occupancyCalendar || data?.excludedDates) {
      // Checkout holds are skipped — a guest still deciding must not grey out
      // the calendar for everyone, themselves included.
      const ranges = blockingEntries(data?.occupancyCalendar).map((item) => ({
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
      }));

      const excludedDatesArray =
        data?.excludedDates?.map((date) => ({
          startDate: new Date(date),
          endDate: new Date(date),
        })) || [];

      setDisabledRanges([...ranges, ...excludedDatesArray]);
    }
  }, [data]);

  // Check if a date is disabled
  // Utility function to compare date without time
  const isSameOrBetween = (date, start, end) => {
    const d = new Date(date).setHours(0, 0, 0, 0);
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(0, 0, 0, 0);
    return d >= s && d <= e;
  };

  // Check if a single date is disabled
  const isDisabledDate = (date) => {
    return disabledRanges.some((range) =>
      isSameOrBetween(date, range.startDate, range.endDate)
    );
  };

  // Check if a range contains any disabled date
  const isRangeContainingDisabledDate = (start, end) => {
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
    const [start, end] = dates;

    // If the range contains disabled dates, reset selection and alert user
    if (start && end && isRangeContainingDisabledDate(start, end)) {
      alert("You cannot select a range that includes a disabled date.");
      setStartDate(null);
      setEndDate(null);
      return;
    }

    // Update valid date selections
    updatestartdate(start);
    updateenddatein(end);
    updatestartdatein(start);
    updatendate(end);
    setStartDate(start);
    setEndDate(end);

    // Trigger callback if provided
    if (onDateChange) {
      onDateChange([start, end]);
    }
  };

  // Render the input UI
  const renderInput = () => {
    return (
      <>
        <div className="text-neutral-300">
          <CalendarIcon className="w-5 h-5 lg:w-7 lg:h-7" />
        </div>
        <div className="flex-grow text-left">
          <span className="block font-semibold xl:text-lg">
            {startDate?.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
            }) || `${t.Adddates}`}
            {endDate
              ? " - " +
              endDate?.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
              })
              : ""}
          </span>
          <span className="block mt-1 text-sm font-light leading-none text-neutral-400">
            {t.CheckinCheckout}
          </span>
        </div>
      </>
    );
  };

  return (
    <Popover className={`StayDatesRangeInput z-10 relative flex ${className}`}>
      {({ open }) => (
        <>
          <Popover.Button
            className={`flex-1 flex relative p-3 items-center space-x-3 focus:outline-none ${open ? "shadow-lg" : ""
              }`}
          >
            {renderInput()}
            {startDate && open && <ClearDataButton onClick={() => onChangeDate([null, null])} />}
          </Popover.Button>

          <Transition
            as={React.Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 left-auto z-10 w-screen max-w-sm px-4 mt-3 xl:-right-10 top-full sm:px-0 lg:max-w-3xl">
              <div className="p-8 overflow-hidden bg-white shadow-lg rounded-3xl ring-1 ring-black ring-opacity-5">
                <DatePicker
                  selected={startDate}
                  onChange={onChangeDate}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  monthsShown={2}
                  showPopperArrow={false}
                  inline
                  minDate={new Date()} // Disable all past dates
                  locale={language}
                  filterDate={(date) => !isDisabledDate(date)} // Prevent selection of disabled dates
                  renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
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
              </div>
              <Tooltip id="date-tooltip" />
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default StayDatesRangeInput;
