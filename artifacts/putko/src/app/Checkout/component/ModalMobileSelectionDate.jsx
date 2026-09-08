"use client";

import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment, useContext, useEffect, useState } from "react";
import { FormContext } from "../../FormContext";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subDays } from "date-fns";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { blockingEntries } from "../../utlis/availability";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ModalMobileSelectionDate = ({ renderChildren, onDateChange, guestValues, onGuestsChange, capacity, checkoutMode = false }) => {
  const [showModal, setShowModal] = useState(false);
  const {
    accdata,
    updatendate,
    updatestartdate,
  } = useContext(FormContext);

  const listingData = accdata;
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [disabledDateRanges, setDisabledDateRanges] = useState([]);
  const [activeMonth, setActiveMonth] = useState(new Date());

  // Initialize dates from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (checkoutMode) {
        const checkoutData = JSON.parse(localStorage.getItem("userData") || "null");
        if (checkoutData?.checkInDate) setStartDate(new Date(checkoutData.checkInDate));
        if (checkoutData?.checkOutDate) setEndDate(new Date(checkoutData.checkOutDate));
        return;
      }
      const storedCheckin = localStorage.getItem("checkin");
      const storedCheckout = localStorage.getItem("checkout");

      if (storedCheckin) setStartDate(new Date(storedCheckin + "T00:00:00"));
      if (storedCheckout) setEndDate(new Date(storedCheckout + "T00:00:00"));
    }
  }, [checkoutMode]);

  // Process occupancyCalendar to extract disabled date ranges
  useEffect(() => {
    if (listingData?.occupancyCalendar || listingData?.excludedDates) {
      const ranges = blockingEntries(listingData?.occupancyCalendar).map((item) => ({
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
      }));

      const excludedDatesArray =
        listingData?.excludedDates?.map((date) => ({
        startDate: new Date(date),
        endDate: new Date(date),
      })) || [];

      setDisabledDateRanges([...ranges, ...excludedDatesArray]);
    }
  }, [listingData]);

  const isSameOrBetween = (date, start, end) => {
    const d = new Date(date).setHours(0, 0, 0, 0);
    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(0, 0, 0, 0);
    return d >= s && d <= e;
  };

  const isDisabledDate = (date) => {
    return disabledDateRanges.some((range) =>
      isSameOrBetween(date, range.startDate, range.endDate)
    );
  };

  const isRangeContainingDisabledDate = (start, end) => {
    if (!start || !end) return false;
    let currentDate = new Date(start);

    while (currentDate < end) {
      if (isDisabledDate(currentDate)) {
        return true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return false;
  };

  const onChangeDate = (start, end) => {
    if (start && end && isRangeContainingDisabledDate(start, end)) {
      toast.error(t.PleaseselectdifferentdatesSomedatesareunavailable || "Please select different dates. Some dates are unavailable.");
      setStartDate(null);
      setEndDate(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("checkin");
        localStorage.removeItem("checkout");
      }
      return;
    }

    setStartDate(start);
    setEndDate(end);
    updatestartdate(start);
    updatendate(end);

    if (typeof window !== "undefined" && !checkoutMode) {
      if (start) {
        localStorage.setItem("checkin", format(start, "yyyy-MM-dd"));
      } else {
        localStorage.removeItem("checkin");
      }

      if (end) {
        localStorage.setItem("checkout", format(end, "yyyy-MM-dd"));
      } else {
        localStorage.removeItem("checkout");
      }
    }

    if (onDateChange) {
      onDateChange({ startDate: start, endDate: end });
    }
  };

  const handleDayClick = (date) => {
    if (!startDate || (startDate && endDate)) {
      onChangeDate(date, null);
    } else {
      if (date < startDate) {
        onChangeDate(date, null);
      } else {
        onChangeDate(startDate, date);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const openModal = () => {
    setShowModal(true);
  };

  const renderButtonOpenModal = () => {
    return renderChildren ? (
      renderChildren({ openModal })
    ) : (
      <button onClick={openModal}>Select Date</button>
    );
  };

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const totalGuests = (Number(guestValues?.adults) || 0) + (Number(guestValues?.children) || 0) + (Number(guestValues?.infants) || 0);

  const changeGuests = (field, delta) => {
    const current = Number(guestValues?.[field]) || 0;
    const next = Math.max(field === "adults" ? 1 : 0, current + delta);
    if (delta > 0 && capacity && totalGuests >= Number(capacity)) return;
    onGuestsChange?.({ ...guestValues, [field]: next });
  };

  const getDayClass = (date, s, e) => {
    if (s && e) {
      if (isSameDay(date, s) || isSameDay(date, e)) return "bg-[#319a7a] text-white rounded-full";
      if (date > s && date < e) return "bg-[#d2f8e8] text-[#173f32] rounded-full";
    }
    if (s && isSameDay(date, s)) return "bg-[#319a7a] text-white rounded-full";
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
    const weekdayLabels = language === "sk"
      ? ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"]
      : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

    return (
      <div className="w-full max-w-[420px] px-3 py-1 sm:px-4">
        <div className="mb-1 text-center text-base font-bold text-neutral-800 sm:mb-3">
          {monthLabel} {format(monthDate, "yyyy")}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((d, i) => (
            <div
              key={i}
              className="flex h-7 w-full items-center justify-center text-[10px] font-semibold uppercase text-neutral-400 sm:h-8"
            >
              {d}
            </div>
          ))}
          {padding.map((d) => (
            <div
              key={d.toISOString()}
              className="flex h-11 items-center justify-center text-sm text-neutral-200"
            >
              {format(d, "d")}
            </div>
          ))}
          {days.map((day) => {
            const past = day < new Date(new Date().setHours(0, 0, 0, 0));
            const disabled = isDisabledDate(day);
            const notSelectable = past || disabled;

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={notSelectable}
                onClick={() => !notSelectable && handleDayClick(day)}
                className={cn(
                    "relative h-11 w-full flex items-center justify-center text-sm font-medium rounded-full transition-all",
                  !notSelectable && "hover:bg-[#2c8360] hover:text-white focus:outline-none",
                  getDayClass(day, startDate, endDate),
                  !isSameMonth(day, monthDate) && "text-neutral-300",
                    notSelectable && "cursor-not-allowed bg-[#e7ebe9] text-[#5f6763] opacity-70 after:absolute after:left-1/2 after:top-1/2 after:h-0.5 after:w-7 after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:rounded-full after:bg-[#7a837e]"
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

  const handleSave = () => {
    if (!startDate || !endDate) {
      toast.error(`${t.Pleaseselectdates || "Prosím, vyberte dátumy"}`);
      return;
    }

    const nights =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24);

    const nightLimit = listingData?.nightMaxs || listingData?.nightMax || 15;
    const nightFloor = Math.max(
      1,
      Number(listingData?.nightMins || listingData?.nightMin) || 1
    );

    if (nights < nightFloor) {
      toast.error(
        `${t.Theminimumnumberofnightsallowedis} ${nightFloor}. ${t.Pleaseadjustyourdates}.`
      );
      return;
    }

    if (nights > nightLimit) {
      toast.error(
        `${t.Themaximumnumberofnightsallowedis} ${nightLimit}. ${t.Pleaseadjustyourdates}.`
      );
      return;
    }
    if ((Number(guestValues?.adults) || 0) < 1 || (capacity && totalGuests > Number(capacity))) {
      toast.error(t.MaxGuestsReached || "Please adjust the number of guests for this accommodation.");
      return;
    }

    if (checkoutMode && typeof window !== "undefined") {
      const checkoutData = JSON.parse(localStorage.getItem("userData") || "{}");
      localStorage.setItem("userData", JSON.stringify({
        ...checkoutData,
        checkInDate: startDate.toISOString(),
        checkOutDate: endDate.toISOString(),
        nights,
        guests: {
          adults: Number(guestValues?.adults) || 1,
          children: Number(guestValues?.children) || 0,
          infants: Number(guestValues?.infants) || 0,
        },
      }));
      closeModal();
      window.location.reload();
      return;
    }

    closeModal();
  };

  return (
    <>
      {renderButtonOpenModal()}
      <Transition appear show={showModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[999]"
          onClose={closeModal}
        >
          <div className="fixed inset-0 z-[999] bg-white">
            <div className="flex h-full">
              <Transition.Child
                as={Fragment}
                enter="ease-out transition-transform duration-300"
                enterFrom="opacity-0 translate-y-full"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in transition-transform duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-full"
              >
                <Dialog.Panel className="relative flex flex-col justify-between flex-1 h-full overflow-hidden bg-white">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2 sm:py-4">
                    <Dialog.Title className="text-base font-bold text-[#0F291E]">
                      {t.CheckinCheckout || "Príchod – Odchod"}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#357965]"
                      aria-label={language === "sk" ? "Zavrieť výber termínu a hostí" : "Close date and guest selection"}
                    >
                      <X className="w-4 h-4 text-neutral-700" />
                    </button>
                  </div>

                  <div className="relative flex-1 overflow-y-auto px-2 sm:py-2">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 sm:top-2">
                      <button
                        type="button"
                        onClick={() => setActiveMonth(addMonths(activeMonth, -1))}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#357965]"
                        aria-label={language === "sk" ? "Predchádzajúci mesiac" : "Previous month"}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
                        className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#357965]"
                        aria-label={language === "sk" ? "Nasledujúci mesiac" : "Next month"}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mx-auto grid w-full max-w-[900px] grid-cols-1 justify-items-center gap-8 md:grid-cols-2">
                      {renderMonth(activeMonth)}
                      <div className="hidden w-full justify-center md:flex">
                        {renderMonth(addMonths(activeMonth, 1))}
                      </div>
                    </div>

                    <section className="mx-4 border-t border-neutral-200 pb-6 pt-3 sm:mt-2 sm:pt-6" aria-labelledby="mobile-guests-heading">
                      <h2 id="mobile-guests-heading" className="text-lg font-bold text-[#0F291E]">{t.Guests || "Hostia"}</h2>
                      {[
                        ["adults", t.Adults || "Dospelí", t.Ages13orabove || "Vek 13 a viac"],
                        ["children", t.Children || "Deti", t.Ages212 || "Vek 2–12"],
                        ["infants", t.Infants || "Dojčatá", t.Ages02 || "Vek 0–2"],
                      ].map(([field, label, description]) => (
                        <div key={field} className="flex items-center justify-between py-3 sm:py-4">
                          <div>
                            <p className="font-semibold text-neutral-900">{label}</p>
                            <p className="text-sm text-neutral-500">{description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              aria-label={`${label} minus`}
                              className="h-11 w-11 rounded-full border border-neutral-300 text-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#357965] disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={field === "adults" ? (guestValues?.adults || 1) <= 1 : !(guestValues?.[field] || 0)}
                              onClick={() => changeGuests(field, -1)}
                            >
                              −
                            </button>
                            <output aria-label={`${label}: ${guestValues?.[field] || 0}`} className="w-5 text-center font-semibold text-neutral-900">
                              {guestValues?.[field] || 0}
                            </output>
                            <button
                              type="button"
                              aria-label={`${label} plus`}
                              className="h-11 w-11 rounded-full border border-neutral-300 text-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#357965] disabled:opacity-40 disabled:cursor-not-allowed"
                              disabled={Boolean(capacity) && totalGuests >= Number(capacity)}
                              onClick={() => changeGuests(field, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>

                  <div className="border-t border-neutral-100 bg-white px-4 py-3 sm:py-4">
                    {startDate && (
                      <p className="text-center text-sm mb-3 text-[#000000]">
                        {startDate && endDate
                          ? `${format(startDate, "MMM dd")} → ${format(endDate, "MMM dd")}`
                          : `${format(startDate, "MMM dd")} — ${t.Checkout || "Odchod"}`}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="flex-1 border border-neutral-300 text-neutral-700 font-bold py-4 rounded-xl transition-all text-base hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#357965]"
                        onClick={() => {
                          onChangeDate(null, null);
                        }}
                      >
                        {t.Cleardates || "Vymazať"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 bg-[#2C8360] hover:bg-[#246b4e] text-white font-bold py-4 rounded-xl transition-all text-base focus:outline-none focus:ring-2 focus:ring-[#2C8360] focus:ring-offset-2"
                      >
                        {t.Save || "Uložiť"}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ModalMobileSelectionDate;
