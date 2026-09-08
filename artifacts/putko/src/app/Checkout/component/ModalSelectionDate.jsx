import React, { useState, Fragment, useEffect, useContext } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import DatePicker, { registerLocale } from "react-datepicker";
import { enGB, sk as skLocale } from "date-fns/locale";
import DatePickerCustomHeaderTwoMonth from "../../Shared/DatePickerCustomHeaderTwoMonth";
import DatePickerCustomDay from "../../Shared/DatePickerCustomDay";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { FormContext } from "@/app/FormContext";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";

import { blockingEntries } from "../../utlis/availability";
import "../../listings/styless.css";

registerLocale("en", enGB);
registerLocale("sk", skLocale);

const ModalSelectDate = ({ renderChildren, nightMaxs, nightMins, excludedDates = [], occupancyCalendar = [] }) => {
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [disabledDateRanges, setDisabledDateRanges] = useState([]);
  const [disabledSingleDates, setDisabledSingleDates] = useState([]);
  const [userData, setUserData] = useState(null);
  const [computedPricePerNight, setComputedPricePerNight] = useState(0);
  const [nights, setNights] = useState(0);
  const [computedTotal, setComputedTotal] = useState(0);

  const { accdata, updatestartdate, updatendate, lang } = useContext(FormContext);
  const translations = { en, sk };
  const t = translations[lang || "sk"];
  const formatCompactWeekday = (weekday) => {
    const normalized = String(weekday || "").trim().toLocaleLowerCase();
    const labels = lang === "en"
      ? { monday: "Mo", tuesday: "Tu", wednesday: "We", thursday: "Th", friday: "Fr", saturday: "Sa", sunday: "Su" }
      : { pondelok: "Po", utorok: "Ut", streda: "St", štvrtok: "Št", piatok: "Pi", sobota: "So", nedeľa: "Ne" };
    return labels[normalized] || weekday.slice(0, 2);
  };

  // Normalize date to midnight (local)
  const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Load from localStorage
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("userData"));
    if (data) {
      setUserData(data);
      if (data.checkInDate && data.checkOutDate) {
        const start = new Date(data.checkInDate);
        const end = new Date(data.checkOutDate);
        setStartDate(start);
        setEndDate(end);
        setNights(calculateDays(start, end));
        setComputedPricePerNight(data.pricePerNight || accdata?.priceMonThus || 0);
        setComputedTotal(data.total || 0);
      }
    }
  }, [accdata]);

  // Create disabled ranges + single days
  useEffect(() => {
    // Checkout holds are skipped — see utlis/availability.js.
    const ranges = blockingEntries(occupancyCalendar).map(item => ({
      startDate: normalizeDate(item.startDate),
      endDate: normalizeDate(item.endDate),
    }));

    // ⭐ normalize excluded single days
    const normalizedSingleDates = excludedDates.map(date => normalizeDate(date));

    // keep ranges unchanged, but also push single-day ranges
    const singleDayRanges = normalizedSingleDates.map(d => ({ startDate: d, endDate: d }));

    setDisabledDateRanges([...ranges, ...singleDayRanges]);

    // ⭐ new: pass single excluded days separately to DatePicker
    setDisabledSingleDates(normalizedSingleDates);
  }, [occupancyCalendar, excludedDates]);

  const isDisabledDate = (date) => disabledDateRanges.some(range => date >= range.startDate && date <= range.endDate);

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  };

  const onChangeDate = (dates) => {
    const [start, end] = dates;
    if (start && isDisabledDate(start)) return;
    if (end && isDisabledDate(end)) return;

    if (start && end) {
      let temp = new Date(start);
      while (temp <= end) {
        if (isDisabledDate(temp)) {
          toast.error(t.YourselectedrangeincludesunavailabledatesPleasechooseanotherrange);
          setStartDate(null);
          setEndDate(null);
          return;
        }
        temp.setDate(temp.getDate() + 1);
      }
    }

    setStartDate(start);
    setEndDate(end);
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
    localStorage.setItem("userData", JSON.stringify({
      ...(userData || {}),
      checkInDate: null,
      checkOutDate: null
    }));
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleSave = () => {
    if (startDate && endDate) {
      const totalNights = calculateDays(startDate, endDate);

      // `nightMins` was accepted as a prop and declared in propTypes, but never
      // checked — so the minimum stay was enforced nowhere in the checkout flow.
      const minNights = Math.max(1, Number(nightMins) || 1);
      if (totalNights < minNights) {
        toast.error(`${t.Theminimumnumberofnightsallowedis} ${minNights}. ${t.Pleaseadjustyourdates}.`);
        return;
      }

      if (totalNights > (Number(nightMaxs) || 15)) {
        toast.error(`${t.Themaximumnumberofnightsallowedis} ${nightMaxs}. ${t.Pleaseadjustyourdates}.`);
        return;
      }

      // Save to localStorage
      const newUserData = {
        ...(userData || {}),
        checkInDate: startDate.toISOString(),
        checkOutDate: endDate.toISOString(),
        nights: totalNights,
        pricePerNight: computedPricePerNight,
        total: computedTotal
      };
      localStorage.setItem("userData", JSON.stringify(newUserData));
      setUserData(newUserData);
    }

    closeModal();
    window.location.reload();
  };

  return (
    <>
      {renderChildren ? renderChildren({ openModal }) : <button onClick={openModal}>Select Date</button>}

      <Transition appear show={showModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">

              {/* HEADER */}
              <div className="flex justify-between items-center px-6 py-4 border-b">
                <h2 className="text-xl font-semibold">{t.Whenyourtrip}</h2>
                <button type="button" className="flex h-11 w-11 items-center justify-center -m-1.5 hover:bg-neutral-100 rounded-full" onClick={closeModal} aria-label="Zavrieť výber dátumu">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* CALENDAR */}
              <div className="p-4 max-h-[70vh] overflow-auto">
                <DatePicker
                  calendarClassName={`checkout-date-calendar checkout-date-calendar--${lang === "en" ? "en" : "sk"} listing-reservation-calendar`}
                  selected={startDate}
                  onChange={onChangeDate}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  monthsShown={2}
                  inline
                  locale={lang === "en" ? "en" : "sk"}
                  formatWeekDay={formatCompactWeekday}
                  showPopperArrow={false}
                  minDate={new Date()}

                  // ⭐ ranges (existing)
                  excludeDateIntervals={disabledDateRanges}

                  // ⭐ NEW: exact single-day disables
                  excludeDates={disabledSingleDates}

                  renderCustomHeader={(props) => <DatePickerCustomHeaderTwoMonth {...props} />}
                  renderDayContents={(day, date) => (
                    <div className={isDisabledDate(date) ? "listing-date-status--unavailable" : "listing-date-status--available"}>
                      <DatePickerCustomDay dayOfMonth={day} date={date} />
                    </div>
                  )}
                />
              </div>

              {/* FOOTER */}
              <div className="flex justify-between items-center px-6 py-4 border-t bg-neutral-50">
                <button type="button" className="font-semibold underline" onClick={clearDates}>
                  {t.clearDates}
                </button>
                <ButtonPrimary sizeClass="px-6 py-3 !rounded-xl" onClick={handleSave}>
                  {t.Save}
                </ButtonPrimary>
              </div>

            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

ModalSelectDate.propTypes = {
  renderChildren: PropTypes.func,
  nightMaxs: PropTypes.number.isRequired,
  nightMins: PropTypes.number.isRequired,
  excludedDates: PropTypes.array,
  occupancyCalendar: PropTypes.array,
};

export default ModalSelectDate;