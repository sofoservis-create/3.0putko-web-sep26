"use client";

import * as React from "react";
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
        "px-4 py-2 mt-4 rounded-lg transition-all",
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

// Popover Component
function Popover({ children, isOpen, setIsOpen }) {
  const handleClickOutside = (event) => {
    if (
      !event.target.closest(".popover-content") &&
      !event.target.closest(".popover-trigger")
    ) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return <div className="relative inline-block">{children}</div>;
}

// PopoverTrigger Component
function PopoverTrigger({ children }) {
  return <div className="popover-trigger">{children}</div>;
}

// PopoverContent Component
function PopoverContent({ children, className }) {
  return (
    <div
      className={cn(
        "popover-content absolute z-10 bg-white border border-gray-200 rounded-3xl shadow-lg mt-2",
        className
      )}
    >
      {children}
    </div>
  );
}

// Main Component
export default function DateRangePicker() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState(null);
  const [endDate, setEndDate] = React.useState(null);
  const [activeMonth, setActiveMonth] = React.useState(new Date());
  const { updatestartdate, updatendate } = React.useContext(FormContext);


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
      if (storedCheckin) setStartDate(new Date(storedCheckin));
      if (storedCheckout) setEndDate(new Date(storedCheckout));
    }
  }, []);

  // Handle date selection
  const handleDateSelect = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
      localStorage.setItem("checkin", format(date, "yyyy-MM-dd"));
      localStorage.removeItem("checkout");
      // updatestartdate(format(date, "yyyy-MM-dd")); // Update start date in context
    } else {
      if (date < startDate) {
        setStartDate(date);
        localStorage.setItem("checkin", format(date, "yyyy-MM-dd"));
        // updatestartdate(format(date, "yyyy-MM-dd")); // Update start date in context
      } else {
        setEndDate(date);
        localStorage.setItem("checkout", format(date, "yyyy-MM-dd"));
        // updatendate(format(date, "yyyy-MM-dd")); // Update end date in context
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
      <div className="w-[400px] h-[370px] p-4 bg-white">
        {/* Month header */}
        <div className="mb-4 text-lg font-semibold text-center">
          {translatedMonth} {format(monthDate, "yyyy")}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2 text-sm">
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
    <Popover isOpen={isOpen} setIsOpen={setIsOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          className="flex items-center w-[220px] h-[68px] px-4 py-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-gray-500" />
            <div className="flex flex-col items-start">
              <span className="text-base font-semibold">  
                {startDate && endDate
                  ? `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`
                  : `${t.Adddates}`}
              </span>
              <span className="text-sm text-gray-500">{t.CheckinCheck}</span>
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
                }}
              />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      {/* Calendar Content */}
      {isOpen && (
        <PopoverContent className="absolute -right-[620px] transform -translate-x-1/2 w-auto p-4 bg-white shadow-lg rounded-xl mt-3">
          <div className="flex gap-8">
            {/* Left Calendar */}
            <div className="relative">
              <Button
                variant="outline"
                className="absolute left-2 top-2"
                onClick={() => setActiveMonth(addMonths(activeMonth, -1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {renderMonth(activeMonth)}
            </div>

            {/* Right Calendar */}
            <div className="relative">
              <Button
                variant="outline"
                className="absolute right-2 top-2"
                onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {renderMonth(addMonths(activeMonth, 1))}
            </div>
          </div>


        </PopoverContent>
      )}
    </Popover>
  );
}