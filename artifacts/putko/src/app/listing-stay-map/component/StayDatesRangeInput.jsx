"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  subDays,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

// Utility function for conditional class names
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Button Component
function Button({ children, variant, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg px-4 py-2 transition-all",
        variant === "outline",
        "focus:outline-none focus:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1),-4px_0_8px_-2px_rgba(0,0,0,0.1)]", // Left and right shadow
        "focus:border-l-2 focus:border-r-2 focus:rounded-l-3xl focus:rounded-r-3xl", // Rounded corners on left and right
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Main Component
export default function DateRangePicker() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState(null);
  const [endDate, setEndDate] = React.useState(null);
  const [activeMonth, setActiveMonth] = React.useState(new Date());
  const { updatestartdate, updatendate } = React.useContext(FormContext);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const translations = { en, sk };
  const { lang } = React.useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = React.useState(lang || "sk"); // Initialize with context value or default to "en"

  // Update language state when `lang` changes in FormContext
  React.useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  // Fetch from localStorage once on client-side
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCheckin = localStorage.getItem("checkin");
      const storedCheckout = localStorage.getItem("checkout");
      if (storedCheckin) {
        setStartDate(new Date(storedCheckin));
        updatestartdate(storedCheckin);
      }
      if (storedCheckout) {
        setEndDate(new Date(storedCheckout));
        updatendate(storedCheckout);
      }
    }
  }, []);

  // Handle date selection
  const handleDateSelect = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
      const value = format(date, "yyyy-MM-dd");
      localStorage.setItem("checkin", value);
      localStorage.removeItem("checkout");
      updatestartdate(value);
      updatendate("");
    } else {
      if (date < startDate) {
        setStartDate(date);
        const value = format(date, "yyyy-MM-dd");
        localStorage.setItem("checkin", value);
        updatestartdate(value);
      } else {
        setEndDate(date);
        const value = format(date, "yyyy-MM-dd");
        localStorage.setItem("checkout", value);
        updatendate(value);
      }
    }
  };

  // Get class names for a specific day
  const getDayClass = (date) => {
    if (startDate && endDate) {
      if (isSameDay(date, startDate)) {
        return "bg-[#2c8360] text-white rounded-l-full"; // Start date
      }
      if (isSameDay(date, endDate)) {
        return "bg-[#2c8360] text-white rounded-r-full"; // End date
      }
      if (date > startDate && date < endDate) {
        return "bg-emerald-100"; // Dates in the range
      }
    }
    if (startDate && isSameDay(date, startDate)) {
      return "bg-[#2c8360] text-white rounded-full"; // Single selected start date
    }
    return "";
  };

  // Render a calendar for a specific month
  const renderMonth = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    // Get translated month name
    const monthIndex = monthDate.getMonth();
    const translatedMonth = t.Months[monthIndex];

    // Calculate padding days for Monday start
    const paddingCount = (start.getDay() + 6) % 7;
    const paddingDays = Array.from({ length: paddingCount }).map((_, index) => {
      return subDays(start, paddingCount - index);
    });

    return (
      <div className="h-auto w-[380px] bg-white p-4">
        {/* Month header */}
        <div className="mb-4 text-lg font-semibold text-center">
          {translatedMonth} {format(monthDate, "yyyy")}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 justify-items-center gap-2 text-sm">
          {/* Day names */}
          {t.Weekdays.map((day) => (
            <div key={day} className="flex items-center justify-center h-10 font-medium text-gray-600 uppercase">
              {day}
            </div>
          ))}

          {/* Previous Month Dates (Padding) */}
          {paddingDays.map((date) => (
            <div
              key={date.toISOString()}
              className="flex items-center justify-center h-10 w-10 text-gray-300 rounded-full"
            >
              {format(date, "d")}
            </div>
          ))}

          {/* Current Month Dates */}
          {days.map((day) => {
            const isDisabled = day < new Date(new Date().setHours(0, 0, 0, 0)); // Disable past dates
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => !isDisabled && handleDateSelect(day)}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-full transition-all",
                  "hover:bg-[#2c8360] focus:outline-none focus:ring-2 focus:ring-green-700",
                  getDayClass(day),
                  !isSameMonth(day, monthDate) && "text-gray-400",
                  isDisabled && "opacity-50 cursor-not-allowed" // Add disabled styles
                )}
                disabled={isDisabled} // Disable the button for past dates
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-1">
        <Button
          variant="outline"
          className="flex h-full min-w-0 flex-1 items-center px-4 py-2"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Calendar className="w-6 h-6 text-gray-500" />
            <div className="flex min-w-0 flex-col items-start">
              <span className="w-full truncate text-sm font-semibold xl:text-base">
                {startDate && endDate
                  ? `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`
                  : `${t.Adddates}`}
              </span>
              <span className="w-full truncate text-xs text-gray-500 xl:text-sm">{t.CheckinCheck}</span>
            </div>
            {(startDate || endDate) && (
              <X
                className="w-4 h-4 ml-auto text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setStartDate(null);
                  setEndDate(null);
                  localStorage.removeItem("checkin");
                  localStorage.removeItem("checkout");
                  updatestartdate("");
                  updatendate("");
                }}
              />
            )}
          </div>
        </Button>
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#112A22]/20 p-6 backdrop-blur-[2px]"
          onMouseDown={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="relative flex items-start gap-8 rounded-[28px] border border-white bg-white p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t.CheckinCheckout}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238869]"
              aria-label={t.close || "Close"}
              autoFocus
            >
              <X className="h-4 w-4" />
            </button>
            {/* Left Calendar */}
            <div className="relative">
              <Button
                variant="outline"
                className="absolute left-2 top-2 p-2 hover:bg-neutral-100 rounded-full"
                onClick={() => setActiveMonth(addMonths(activeMonth, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {renderMonth(activeMonth)}
            </div>

            {/* Right Calendar */}
            <div className="relative">
              <Button
                variant="outline"
                className="absolute right-2 top-2 p-2 hover:bg-neutral-100 rounded-full"
                onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {renderMonth(addMonths(activeMonth, 1))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}