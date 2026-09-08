import React, { useContext, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { FormContext } from "../../FormContext";

const AccomodationForm = ({ onClose }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [selectedAccommodationId, setSelectedAccommodationId] = useState("");
  const [occupancyCalendar, setOccupancyCalendar] = useState([]);
  const [selectedCalendarIndex, setSelectedCalendarIndex] = useState(null);
  const [isCustomDate, setIsCustomDate] = useState(true);
  const [guestName, setGuestName] = useState("");
  const { lang } = useContext(FormContext);
  const translations = { en, sk };

  const [language, setLanguage] = useState(lang || "sk");
  useEffect(() => setLanguage(lang || "sk"), [lang]);
  const t = translations[language];

  const onDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
  };

  const handleSelectChange = async (e) => {
    const accommodationId = e.target.value;
    setSelectedAccommodationId(accommodationId);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${accommodationId}`
      );
      if (!response.ok) throw new Error("Failed to fetch occupancy calendar");

      const result = await response.json();
      setOccupancyCalendar(result.occupancyCalendar || []);
      if (result.occupancyCalendar.length > 0) {
        setSelectedCalendarIndex(0);
        setStartDate(new Date(result.occupancyCalendar[0].startDate));
        setEndDate(new Date(result.occupancyCalendar[0].endDate));
      } else {
        setSelectedCalendarIndex(null);
        setStartDate(null);
        setEndDate(null);
      }
    } catch (error) {
      console.error("Error fetching occupancy calendar:", error);
    }
  };

  const handleCalendarSelect = (e) => {
    const selectedIndex = e.target.value;

    if (selectedIndex === "custom") {
      setIsCustomDate(true);
      setSelectedCalendarIndex(null);
      setStartDate(null);
      setEndDate(null);
      setGuestName("");
    } else {
      setIsCustomDate(false);
      const index = parseInt(selectedIndex, 10);
      setSelectedCalendarIndex(index);
      const selectedEntry = occupancyCalendar[index];
      if (selectedEntry) {
        setStartDate(new Date(selectedEntry.startDate));
        setEndDate(new Date(selectedEntry.endDate));
      }
    }
  };

  useEffect(() => {
    const userr = localStorage.getItem("user");
    if (userr) {
      const users = JSON.parse(userr);
      const userId = users._id;

      const fetchAccommodations = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`,
            { method: "GET", headers: { "Content-Type": "application/json" } }
          );
          if (!response.ok) throw new Error("Failed to fetch accommodations");
          const result = await response.json();
          setAccommodations(result);
        } catch (error) {
          console.error("Error fetching accommodations:", error);
        }
      };
      fetchAccommodations();
    }
  }, []);

  const handleSave = async () => {
    if (!startDate || !endDate) {
      alert(t.Pleaseselectbothadaterangeandanaccommodation);
      return;
    }

    try {
      if (isCustomDate) {
        if (!guestName) {
          alert(t.Pleaseentertheguestnameforthecustomdate);
          return;
        }

        const normalizeDate = (date) => {
          const d = new Date(date);
          d.setHours(12, 0, 0, 0);
          return d.toISOString().split("T")[0];
        };

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${selectedAccommodationId}/occupancyCalendar`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: normalizeDate(startDate),
              endDate: normalizeDate(endDate),
              guestName,
              status: "booked",
            }),
          }
        );

        if (!response.ok)
          throw new Error("Failed to add custom date to occupancy calendar");
        alert(t.Customdateandguestnameaddedsuccessfully);
      } else {
        const updatedCalendar = [...occupancyCalendar];
        updatedCalendar[selectedCalendarIndex] = {
          ...updatedCalendar[selectedCalendarIndex],
          startDate,
          endDate,
        };

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${selectedAccommodationId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ occupancyCalendar: updatedCalendar }),
          }
        );

        if (!response.ok) throw new Error("Failed to update occupancy calendar");
        alert(t.Calendarupdatedsuccessfully);
      }

      if (onClose) onClose();
    } catch (error) {
      console.error("Error updating accommodation:", error);
      alert(t.Failedtoupdateaccommodation);
    }
  };

  // ✅ Function to disable Airbnb (Not available) dates in calendar
  // ✅ Disable all booked dates
  const isDateDisabled = (date) => {
    return occupancyCalendar.some((entry) => {
      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);
      return date >= start && date <= end; // disables all booked dates
    });
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl p-6 bg-white shadow-2xl rounded-2xl animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute text-gray-400 top-3 right-3 hover:text-gray-600"
        >
          ✕
        </button>

        {/* Header */}
        <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">
          🏡 {t.accommodationForm}
        </h2>

        <div className="space-y-5">
          {/* Accommodation Selection */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              {t.selectAccommodation} <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none"
              value={selectedAccommodationId}
              onChange={handleSelectChange}
            >
              <option value="">{t.chooseAccommodation}</option>
              {accommodations.length > 0 ? (
                accommodations.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))
              ) : (
                <option>{t.noAccommodations}</option>
              )}
            </select>
          </div>

          {/* Occupancy Calendar */}
          <div>
            <label className="block mb-2 font-medium text-gray-700">
              {t.occupancyCalendar}
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none"
              onChange={handleCalendarSelect}
              value={selectedCalendarIndex !== null ? selectedCalendarIndex : "custom"}
            >
              <option value="custom">{t.enterCustomDate}</option>
              {/* {occupancyCalendar.map((entry, index) => (
                <option
                  key={index}
                  value={index}
                  disabled={entry.guestName === "Airbnb (Not available)"}
                >
                  {new Date(entry.startDate).toLocaleDateString()} -{" "}
                  {new Date(entry.endDate).toLocaleDateString()}{" "}
                  {entry.guestName === "Airbnb (Not available)"
                    ? "🚫 (Not available)"
                    : entry.guestName
                    ? `(${entry.guestName})`
                    : ""}
                </option>
              ))} */}
            </select>
          </div>

          {/* Guest Name (Custom Date Only) */}
          {isCustomDate && (
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                {t.guestName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t.enterGuestName}
              />
            </div>
          )}

          {/* Date Range Picker */}
          <div className="relative w-full">
          <label className="block mb-2 font-medium text-gray-700">
            {t.selectPeriod} <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <DatePicker
              selected={startDate}
              onChange={onDateChange}
              startDate={startDate}
              endDate={endDate}
              selectsRange
              monthsShown={window.innerWidth > 768 ? 2 : 1}
              dateFormat="dd.MM.yyyy"
              placeholderText={t.selectDateRange}
              calendarClassName="modern-datepicker"
              dayClassName={(date) =>
                isDateDisabled(date)
                  ? "day-disabled" // ✅ disabled dates
                  : date >= new Date()
                  ? "day-available"
                  : "day-disabled"
              }
              wrapperClassName="w-full"
              popperPlacement="bottom"
              popperClassName="z-50"
              className="
                w-full px-4 py-3 text-gray-800 placeholder-gray-400
                rounded-2xl border border-gray-200
                focus:border-green-800 focus:ring-2 focus:ring-green-800
                shadow-sm hover:shadow-md
                transition-all duration-200 ease-in-out cursor-pointer
              "
            />

            {/* Calendar Icon */}
            <CalendarDaysIcon
              className="absolute w-5 h-5 text-gray-400 right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>

          {/* ✅ Custom Calendar Styling */}
          <style>{`
            .modern-datepicker {
              border: none !important;
              border-radius: 16px !important;
              box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important;
              padding: 10px !important;
              background-color: white !important;
              font-family: 'Inter', sans-serif !important;
            }

            .react-datepicker__month-container {
              padding: 8px !important;
            }

            .react-datepicker__day {
              border-radius: 10px !important;
              transition: all 0.2s ease-in-out;
              padding: 6px 0 !important;
            }

            /* ✅ Hover effect */
            .react-datepicker__day:hover {
              background-color: #d1fae5 !important; /* green-100 */
              color: #065f46 !important; /* green-800 */
            }

            /* ✅ Range selection */
            .react-datepicker__day--in-range {
              background-color: #bbf7d0 !important; /* green-200 */
              color: #065f46 !important; /* green-800 */
            }

            .react-datepicker__day--in-selecting-range {
              background-color: #34d399 !important; /* green-400 */
              color: white !important;
            }

            /* ✅ Selected, range start, range end */
            .react-datepicker__day--selected,
            .react-datepicker__day--range-start,
            .react-datepicker__day--range-end {
              background-color: #065f46 !important; /* green-800 */
              color: white !important;
            }

            /* ✅ Prevent default blue highlight on open */
            .react-datepicker__day--keyboard-selected {
              background-color: #065f46 !important; /* green-400 */
              color: white !important;
            }

            .react-datepicker__current-month {
              color: #1f2937 !important;
              font-weight: 600 !important;
            }

            .react-datepicker__header {
              background-color: transparent !important;
              border-bottom: none !important;
            }

            .day-disabled {
              color: #cbd5e1 !important;
              pointer-events: none !important;
            }
          `}</style>
        </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSave}
              className="px-8 py-3 text-white transition-all duration-300 rounded-lg shadow-lg bg-gradient-to-r from-green-700 to-green-800 hover:shadow-xl hover:scale-105"
            >
              💾 {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccomodationForm;
