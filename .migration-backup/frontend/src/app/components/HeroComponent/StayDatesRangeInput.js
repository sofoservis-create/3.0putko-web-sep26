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
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
        "focus:outline-none focus:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1),-4px_0_8px_-2px_rgba(0,0,0,0.1)]",
        "focus:border-l-2 focus:border-r-2 focus:rounded-l-3xl focus:rounded-r-3xl",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Popover Component (desktop only)
function Popover({ children }) {
  return <div className="relative inline-block">{children}</div>;
}

function PopoverTrigger({ children }) {
  return <div className="popover-trigger">{children}</div>;
}

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
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState(null);
  const [endDate, setEndDate] = React.useState(null);
  const [activeMonth, setActiveMonth] = React.useState(new Date());
  // Temp dates used inside the mobile modal (committed only on Save)
  const [tempStart, setTempStart] = React.useState(null);
  const [tempEnd, setTempEnd] = React.useState(null);

  const { updatestartdate, updatendate } = React.useContext(FormContext);
  const desktopRef = React.useRef(null);

  // Close DESKTOP popover on outside click only
  React.useEffect(() => {
    const handleOutside = (e) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target)) {
        setIsDesktopOpen(false);
      }
    };
    if (isDesktopOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isDesktopOpen]);

  const translations = { en, sk };
  const { lang } = React.useContext(FormContext);
  const [language, setLanguage] = React.useState(lang || "sk");

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

  // Open: mobile shows modal, desktop shows popover
  const handleOpen = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOpen(true);
    } else {
      setIsDesktopOpen((prev) => !prev);
    }
  };

  // Handle date selection (works on both temp and committed state)
  const handleDateSelect = (date, setS, setE, s, e) => {
    if (!s || (s && e)) {
      setS(date);
      setE(null);
    } else {
      if (date < s) {
        setS(date);
      } else {
        setE(date);
      }
    }
  };

  // Desktop date select (commits immediately)
  const handleDesktopDateSelect = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
      localStorage.setItem("checkin", format(date, "yyyy-MM-dd"));
      localStorage.removeItem("checkout");
    } else {
      if (date < startDate) {
        setStartDate(date);
        localStorage.setItem("checkin", format(date, "yyyy-MM-dd"));
      } else {
        setEndDate(date);
        localStorage.setItem("checkout", format(date, "yyyy-MM-dd"));
      }
    }
  };

  // Mobile date select (updates temp state only)
  const handleMobileDateSelect = (date) => {
    handleDateSelect(date, setTempStart, setTempEnd, tempStart, tempEnd);
  };

  // Save button — commit temp dates
  const handleSave = () => {
    setStartDate(tempStart);
    setEndDate(tempEnd);
    if (tempStart) localStorage.setItem("checkin", format(tempStart, "yyyy-MM-dd"));
    else localStorage.removeItem("checkin");
    if (tempEnd) localStorage.setItem("checkout", format(tempEnd, "yyyy-MM-dd"));
    else localStorage.removeItem("checkout");
    setIsMobileOpen(false);
  };

  // Get class for a day given selected start/end
  const getDayClass = (date, s, e) => {
    if (s && e) {
      if (isSameDay(date, s)) return "bg-[#2C8360] text-white rounded-l-full";
      if (isSameDay(date, e)) return "bg-[#2C8360] text-white rounded-r-full";
      if (date > s && date < e) return "bg-emerald-100";
    }
    if (s && isSameDay(date, s)) return "bg-[#2C8360] text-white rounded-full";
    return "";
  };

  // Render a calendar month
  const renderMonth = (monthDate, onDayClick, selStart, selEnd) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    const monthIndex = monthDate.getMonth();
    const translatedMonth = t.Months[monthIndex];
    const paddingCount = (start.getDay() + 6) % 7;
    const paddingDays = Array.from({ length: paddingCount }).map((_, i) =>
      subDays(start, paddingCount - i)
    );

    return (
      <div className="w-full max-w-[340px] md:w-[380px] h-auto p-4 bg-white">
        <div className="mb-4 text-lg font-semibold text-center">
          {translatedMonth} {format(monthDate, "yyyy")}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2 text-sm justify-items-center">
          {t.Weekdays.map((day) => (
            <div key={day} className="flex items-center justify-center h-8 w-8 md:h-10 md:w-10 font-medium text-gray-600 uppercase text-xs">
              {day}
            </div>
          ))}
          {paddingDays.map((date) => (
            <div key={date.toISOString()} className="flex items-center justify-center h-8 w-8 md:h-10 md:w-10 text-gray-300 rounded-full text-xs">
              {format(date, "d")}
            </div>
          ))}
          {days.map((day) => {
            const isDisabled = day < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => !isDisabled && onDayClick(day)}
                className={cn(
                  "h-8 w-8 md:h-10 md:w-10 flex items-center justify-center rounded-full transition-all text-xs md:text-sm",
                  "hover:bg-[#2c8360] focus:outline-none",
                  getDayClass(day, selStart, selEnd),
                  !isSameMonth(day, monthDate) && "text-gray-400",
                  isDisabled && "opacity-40 cursor-not-allowed"
                )}
                disabled={isDisabled}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const displayLabel = startDate && endDate
    ? `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`
    : `${t.Adddates}`;

  return (
    <>
      {/* ── MOBILE MODAL ── */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-[999] flex flex-col bg-white overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100">
            <h2 className="text-base font-bold text-[#0F291E]">
              {t.CheckinCheckout || "Check-in – Check-out"}
            </h2>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-neutral-700" />
            </button>
          </div>

          {/* Scrollable calendar area */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-2">
              <button
                type="button"
                onClick={() => setActiveMonth(addMonths(activeMonth, -1))}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Current month */}
            <div className="flex justify-center">
              {renderMonth(activeMonth, handleMobileDateSelect, tempStart, tempEnd)}
            </div>
            {/* Next month */}
            <div className="flex justify-center">
              {renderMonth(addMonths(activeMonth, 1), handleMobileDateSelect, tempStart, tempEnd)}
            </div>
          </div>

          {/* Save button */}
          <div className="px-4 py-4 border-t border-neutral-100">
            {/* Selected summary */}
            {tempStart && (
              <p className="text-center text-sm text-neutral-500 mb-3">
                {tempStart && tempEnd
                  ? `${format(tempStart, "MMM dd")} → ${format(tempEnd, "MMM dd")}`
                  : `${format(tempStart, "MMM dd")} — pick check-out`}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="flex-1 border border-neutral-300 text-neutral-700 font-bold py-4 rounded-xl transition-all text-base hover:bg-neutral-50"
              >
                {t.close || "Close"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 bg-[#2C8360] hover:bg-[#246b4e] text-white font-bold py-4 rounded-xl transition-all text-base"
              >
                {t.save || "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP POPOVER ── */}
      <Popover>
        <PopoverTrigger>
          <Button
            variant="outline"
            className="flex items-center w-full min-w-[200px] px-4 py-2 border-none shadow-none focus:shadow-none bg-transparent hover:bg-neutral-50"
            onClick={handleOpen}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-start md:mb-5">
                <span className="block font-semibold text-[11px] lg:text-[12.8px] leading-[20.48px] tracking-[0.64px] uppercase text-[#64748B]">
                  {t.CheckinCheckout}
                </span>
                <span className="text-sm xl:text-base font-semibold text-[#64748B]">
                  {displayLabel}
                </span>
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

        {/* Desktop calendar popover — hidden on mobile */}
        <div ref={desktopRef} className="hidden md:block">
          {isDesktopOpen && (
            <PopoverContent className="absolute z-[200] -right-[170%] w-auto p-4 bg-white shadow-lg rounded-xl mt-3">
              <div className="flex flex-row gap-8 items-start">
                <div className="relative">
                  <Button
                    variant="outline"
                    className="absolute left-2 top-2"
                    onClick={() => setActiveMonth(addMonths(activeMonth, -1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {renderMonth(activeMonth, handleDesktopDateSelect, startDate, endDate)}
                </div>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="absolute right-2 top-2"
                    onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  {renderMonth(addMonths(activeMonth, 1), handleDesktopDateSelect, startDate, endDate)}
                </div>
              </div>
            </PopoverContent>
          )}
        </div>
      </Popover>
    </>
  );
}