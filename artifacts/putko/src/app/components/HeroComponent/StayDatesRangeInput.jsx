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
        "transition-all focus:outline-none",
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
  return <div className="relative block w-full h-full min-w-0">{children}</div>;
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
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
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
      {isMobileOpen && typeof document !== "undefined" && createPortal(
        <div className="xl:hidden fixed inset-0 z-[999] flex flex-col bg-white overflow-hidden">
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
        </div>,
        document.body
      )}

      {/* ── DESKTOP POPOVER ── */}
      <Popover>
        <PopoverTrigger>
          <Button
            variant="outline"
            className={cn(
              "flex items-center w-full h-full px-4 sm:px-5 py-2.5 border-none shadow-none focus:shadow-none bg-transparent hover:bg-transparent rounded-[20px]",
              isDesktopOpen && "ring-2 ring-[#238869]/20 bg-white",
              "w-full min-w-0" // override external container classes if necessary
            )}
            onClick={handleOpen}
          >
            <div className="flex items-center gap-2 sm:gap-4 w-full min-w-0">
              <div className="flex flex-col items-start justify-center w-full min-w-0 overflow-hidden h-full">
                <span className="block mb-0.5 font-bold text-[10px] md:text-[11px] uppercase tracking-wider text-[#4A5D54] truncate w-full text-left">
                  {t.CheckinCheckout}
                </span>
                <span className="text-sm xl:text-base font-semibold text-[#112A22] truncate w-full text-left">
                  {displayLabel}
                </span>
              </div>
              {(startDate || endDate) && (
                <X
                  className="w-4 h-4 ml-auto text-neutral-500 hover:text-neutral-700 bg-neutral-200 hover:bg-neutral-300 rounded-full p-0.5 transition-colors shrink-0"
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
        {isDesktopOpen && typeof document !== "undefined" && createPortal(
          <div
            ref={desktopRef}
            className="fixed inset-0 z-[999] hidden items-center justify-center bg-[#112A22]/20 p-6 backdrop-blur-[2px] xl:flex"
            onMouseDown={() => setIsDesktopOpen(false)}
          >
            <div
              className="relative flex flex-row gap-8 items-start rounded-[28px] border border-white bg-white p-4 shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsDesktopOpen(false)}
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
                aria-label={t.close || "Close"}
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative">
                <Button
                  variant="outline"
                  className="absolute left-2 top-2 p-2 hover:bg-neutral-100 rounded-full"
                  onClick={() => setActiveMonth(addMonths(activeMonth, -1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {renderMonth(activeMonth, handleDesktopDateSelect, startDate, endDate)}
              </div>
              <div className="relative">
                <Button
                  variant="outline"
                  className="absolute right-2 top-2 p-2 hover:bg-neutral-100 rounded-full"
                  onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {renderMonth(addMonths(activeMonth, 1), handleDesktopDateSelect, startDate, endDate)}
              </div>
            </div>
          </div>,
          document.body
        )}
      </Popover>
    </>
  );
}