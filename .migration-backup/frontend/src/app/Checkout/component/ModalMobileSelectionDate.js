"use client";

import DatePicker from "react-datepicker";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import React, { Fragment, useContext, useEffect, useState } from "react";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import DatePickerCustomHeaderTwoMonth from "../../listings/component/DatePickerCustomHeaderTwoMonth";
import DatePickerCustomDay from "../../listings/component/DatePickerCustomDay";
import { FormContext } from "../../FormContext";
import { format } from "date-fns";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { toast } from "react-toastify";

import { blockingEntries } from "../../utlis/availability";
const ModalMobileSelectionDate = ({ renderChildren, onDateChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState(() => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("accommodation");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to parse accommodation data:", e);
      return null;
    }
  }
  return null;
});
  const {
    pricenight,
    ida,
    accdata,
    updatendate,
    enddate,
    startdate,
    updatestartdate,
  } = useContext(FormContext);

  console.log("datatata",data)

  
  const occpancy = data?.occupancyCalendar;
  console.log("data", occpancy);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [disabledDateRanges, setDisabledDateRanges] = useState([]);

  // Initialize dates from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCheckin = localStorage.getItem("checkin");
      const storedCheckout = localStorage.getItem("checkout");

      if (storedCheckin) setStartDate(new Date(storedCheckin + "T00:00:00"));
      if (storedCheckout) setEndDate(new Date(storedCheckout + "T00:00:00"));
    }
  }, []);

  // Process occupancyCalendar to extract disabled date ranges
  useEffect(() => {
    if (data?.occupancyCalendar || data?.excludedDates) {
      // Checkout holds are skipped — see utlis/availability.js.
      const ranges = blockingEntries(data?.occupancyCalendar).map((item) => ({
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
      }));
 
      const excludedDatesArray =
        data?.excludedDates?.map((date) => ({
        startDate: new Date(date),
        endDate: new Date(date),
      })) || [];
 
      setDisabledDateRanges([...ranges, ...excludedDatesArray]);
    }
  }, [data]);
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

    while (currentDate <= end) {
      if (isDisabledDate(currentDate)) {
        return true;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return false;
  };

  const onChangeDate = (dates) => {
    const [start, end] = dates;

    if (start && end && isRangeContainingDisabledDate(start, end)) {
      alert("You cannot select a range that includes a disabled date.");
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

    if (typeof window !== "undefined") {
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
      const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
      const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
    
        // Update language state when `lang` changes in FormContext
        useEffect(() => {
          setLanguage(lang || "sk");
        }, [lang]);
      
        const t = translations[language];

  return (
    <>
      {renderButtonOpenModal()}
      <Transition appear show={showModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 HeroSearchFormMobile__Dialog"
          onClose={closeModal}
        >
          <div className="fixed inset-0 bg-neutral-100">
            <div className="flex h-full">
              <Transition.Child
                as={Fragment}
                enter="ease-out transition-transform"
                enterFrom="opacity-0 translate-y-52"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in transition-transform"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-52"
              >
                <Dialog.Panel className="relative flex flex-col justify-between flex-1 h-full overflow-hidden ">
                  <div className="absolute left-4 top-4">
                    <button
                      className="focus:outline-none focus:ring-0"
                      onClick={closeModal}
                    >
                      <XMarkIcon className="w-5 h-5 text-black" />
                    </button>
                  </div>

                  <div className="flex flex-col flex-1 p-1 pt-12 overflow-auto">
                    <div className="flex flex-col flex-1 bg-white">
                      <div className="flex-1 flex flex-col transition-opacity animate-[myblur_0.4s_ease-in-out] overflow-auto">
                        <div className="p-5 ">
                          <span className="block text-xl font-semibold sm:text-2xl">
                            {`${t.Whenyourtrip}`}
                          </span>
                        </div>
                        <div className="relative z-10 flex flex-1 ">
                          <div className="overflow-hidden rounded-3xl ">
                            <DatePicker
                              selected={startDate}
                              onChange={onChangeDate}
                              startDate={startDate}
                              endDate={endDate}
                              selectsRange
                              monthsShown={2}
                              showPopperArrow={false}
                              inline
                              minDate={new Date()} // Disable all previous dates
                              calendarStartDay={1}   // ✅ FIX
                              filterDate={(date) => !isDisabledDate(date)} // Prevent selection of disabled dates
                              renderCustomHeader={(p) => (
                                <DatePickerCustomHeaderTwoMonth {...p} />
                              )}
                              renderDayContents={(day, date) => {
                                const isDisabled = isDisabledDate(date);
                                return (
                                  <div
                                    style={{
                                      color: isDisabled ? "gray" : "inherit",
                                      textDecoration: isDisabled ? "line-through" : "none",
                                      pointerEvents: isDisabled ? "none" : "auto",
                                      opacity: isDisabled ? 0.5 : 1,
                      
                                    }}
                                  >
                                    <DatePickerCustomDay
                                      dayOfMonth={day}
                                      date={date}
                                    />
                                  </div>
                                );
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-white border-t border-neutral-200">
                    <button
                      type="button"
                      className="flex-shrink-0 font-semibold underline"
                      onClick={() => {
                        onChangeDate([null, null]);
                      }}
                    >
                      {t.Cleardates}
                    </button>
                    <ButtonPrimary
                      sizeClass="px-6 py-3 !rounded-xl"
                      onClick={() => {
                        // Check if both dates are selected
                        if (!startDate || !endDate) {
                          toast.error(`${t.Pleaseselectdates}`);
                          return;
                        }

                        // Compute nights
                        const nights =
                          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                          (1000 * 60 * 60 * 24);

                        // Use correct nightMax key:
                        const nightLimit = data?.nightMaxs || data?.nightMax || 15;
                        // `data` is the accommodation object from localStorage,
                        // so the host's minimum stay is available here too — it
                        // was simply never checked.
                        const nightFloor = Math.max(
                          1,
                          Number(data?.nightMins || data?.nightMin) || 1
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

                        // All good
                        closeModal();
                      }}
                    >
                      {t.Save}
                    </ButtonPrimary>
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
