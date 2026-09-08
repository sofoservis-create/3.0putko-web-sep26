"use client";

import React, { useState, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  subDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const MobileDatesInput = () => {
  const { lang, setIsFullscreenModalOpen } = useContext(FormContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  useEffect(() => setLanguage(lang || "sk"), [lang]);
  const t = translations[language];

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempStart, setTempStart] = useState(null);
  const [tempEnd, setTempEnd] = useState(null);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const ci = localStorage.getItem("checkin");
    const co = localStorage.getItem("checkout");
    if (ci) setStartDate(new Date(ci));
    if (co) setEndDate(new Date(co));
  }, []);

  const open = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setIsOpen(true);
    setIsFullscreenModalOpen?.(true); // hide sticky
  };

  const close = () => {
    setIsOpen(false);
    setIsFullscreenModalOpen?.(false); // show sticky again
  };

  const save = () => {
    setStartDate(tempStart);
    setEndDate(tempEnd);
    if (tempStart) {
      localStorage.setItem("checkin", format(tempStart, "yyyy-MM-dd"));
    } else {
      localStorage.removeItem("checkin");
    }
    if (tempEnd) {
      localStorage.setItem("checkout", format(tempEnd, "yyyy-MM-dd"));
    } else {
      localStorage.removeItem("checkout");
    }
    close();
  };

  const handleDayClick = (date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
    } else {
      if (date < tempStart) setTempStart(date);
      else setTempEnd(date);
    }
  };

  const getDayClass = (date) => {
    if (tempStart && tempEnd) {
      if (isSameDay(date, tempStart)) return "bg-[#2C8360] text-white rounded-l-full";
      if (isSameDay(date, tempEnd)) return "bg-[#2C8360] text-white rounded-r-full";
      if (date > tempStart && date < tempEnd) return "bg-emerald-100";
    }
    if (tempStart && isSameDay(date, tempStart)) return "bg-[#2C8360] text-white rounded-full";
    return "";
  };

  const renderMonth = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    const padding = Array.from({
      length: (start.getDay() + 6) % 7,
    }).map((_, i) => subDays(start, ((start.getDay() + 6) % 7) - i));
    const monthLabel = t.Months
      ? t.Months[monthDate.getMonth()]
      : format(monthDate, "MMMM");

    return (
      <div className="w-full p-4">
        <div className="text-center font-semibold text-base mb-3 text-neutral-800">
          {monthLabel} {format(monthDate, "yyyy")}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {(t.Weekdays || ["M", "T", "W", "T", "F", "S", "S"]).map((d, i) => (
            <div
              key={i}
              className="h-8 w-full flex items-center justify-center text-[10px] font-semibold text-neutral-400 uppercase"
            >
              {d}
            </div>
          ))}
          {padding.map((d) => (
            <div
              key={d.toISOString()}
              className="h-8 flex items-center justify-center text-xs text-neutral-200"
            >
              {format(d, "d")}
            </div>
          ))}
          {days.map((day) => {
            const past = day < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={past}
                onClick={() => !past && handleDayClick(day)}
                className={cn(
                  "h-8 w-full flex items-center justify-center text-xs font-medium rounded-full transition-all",
                  "hover:bg-[#2c8360] focus:outline-none",
                  getDayClass(day),
                  !isSameMonth(day, monthDate) && "text-neutral-300",
                  past && "opacity-30 cursor-not-allowed"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const displayLabel =
    startDate && endDate
      ? `${format(startDate, "MMM dd")} – ${format(endDate, "MMM dd")}`
      : startDate
      ? `${format(startDate, "MMM dd")} – ?`
      : t.Adddates || "Add dates";

  return (
    <>
      {/* Row trigger */}
      <div className="flex items-center px-6 py-3 cursor-pointer" onClick={open}>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 leading-none mb-1">
            {t.CheckinCheckout || "Check-in – Check-out"}
          </p>
          <p className="text-sm font-semibold text-neutral-700 truncate">
            {displayLabel}
          </p>
        </div>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStartDate(null);
              setEndDate(null);
              localStorage.removeItem("checkin");
              localStorage.removeItem("checkout");
            }}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        )}
      </div>

      {/* Full-screen modal (portaled so it escapes the sheet transform) */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[550] flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100">
              <h2 className="text-base font-bold text-neutral-900">
                {t.CheckinCheckout || "Check-in – Check-out"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-neutral-600" />
              </button>
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => setActiveMonth(addMonths(activeMonth, -1))}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar scroll */}
            <div className="flex-1 overflow-y-auto">
              {renderMonth(activeMonth)}
              {renderMonth(addMonths(activeMonth, 1))}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-neutral-100">
              {tempStart && (
                <p className="text-center text-sm text-neutral-400 mb-3">
                  {tempStart && tempEnd
                    ? `${format(tempStart, "MMM dd")} → ${format(tempEnd, "MMM dd")}`
                    : `${format(tempStart, "MMM dd")} — ${t.Adddates || "pick check-out"}`}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 border border-neutral-200 text-neutral-700 font-semibold py-3.5 rounded-xl text-sm"
                >
                  {t.close || "Close"}
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="flex-1 bg-[#2C8360] hover:bg-[#246b4e] text-white font-semibold py-3.5 rounded-xl text-sm"
                >
                  {t.save || "Save"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default MobileDatesInput;