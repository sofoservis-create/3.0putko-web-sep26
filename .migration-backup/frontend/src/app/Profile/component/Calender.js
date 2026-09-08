import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import AccomodationForm from "./AccommodationForm";
import { FormContext } from '../../FormContext';
import useFetchData from "../../hooks/useFetchData";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import Header from "@/app/components/Header/Header";
import CancelBookingButton from "@/app/components/CancelBookingButton";
import { CalendarDays, RefreshCcw, ChevronDown, X, Trash2, CalendarCheck } from "lucide-react";
import { blockingEntries } from "../../utlis/availability";

const isDateInRange = (date, dateRanges) =>
  dateRanges.some((range) => {
    const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const start = normalizeDate(new Date(range.startDate));
    const end = normalizeDate(new Date(range.endDate));
    const currentDate = normalizeDate(date);

    return currentDate >= start && currentDate <= end;
  });


const Calendar = ({ year, months = [] }) => {
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [occupancyDates, setOccupancyDates] = useState([]);
  const [excludedDates, setExcludedDates ] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [displayedMonths, setDisplayedMonths] = useState(6);
  const { lang } = useContext(FormContext);
  const { user } = useContext(AuthContext);
  const userId = user?._id;

  const [accommodationData, setAccommodationData] = useState([]);
  const [calendarId, setCalendarId] = useState(null);
  const [secretToken, setSecretToken] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Add this function to force re-render
  const refreshCalendar = () => {
    setSelectedDateDetails([]); // Close modals
    setOccupancyDates([]); // Clear current data to force refresh
    setRefreshTrigger(prev => prev + 1); // Trigger refetch
    console.log("🔄 Manual refresh triggered");
  };

  const translations = { en, sk }
              
      // const { lang } = useContext(FormContext);
      const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
                
        // Update language state when `lang` changes in FormContext
        useEffect(() => {
          setLanguage(lang || "sk");
        }, [lang]);
                
      const t = translations[language];

  const { data, loading, error: fetchError } = useFetchData(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`);

  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching accommodation data:", fetchError);
      setError("Failed to fetch accommodation data.");
    } else if (data) {
      setAccommodationData(data);
      // extractCalendarInfo(data);
    }
  }, [data, fetchError]);
 
//   const extractCalendarInfo = (data) => {
//     if (data && data.length > 0) {
//         let url = data[0]?.url; // Assuming the URL for the calendar is in the first accommodation object

//         if (url) {
//             // Add protocol if missing
//             if (!url.startsWith('http://') && !url.startsWith('https://')) {
//                 url = `https://${url}`;
//             }

//             try {
//                 const urlParts = new URL(url);
//                 const params = new URLSearchParams(urlParts.search);
                
//                 // Extract calendarId and secretToken from the URL
//                 const id = urlParts.pathname.split('/').pop().split('.')[0]; // Extracts the ID before .ics
//                 const token = params.get('s'); // Assuming 's' is the parameter for the secret token
                
//                 // Log URL, calendarId, and secretToken
//                 console.log('Calendar URL:', url);
//                 console.log('Extracted Calendar ID:', id);
//                 console.log('Extracted Secret Token:', token);
                
//                 setCalendarId(id);
//                 setSecretToken(token);
//             } catch (error) {
//                 console.error('Invalid URL format:', error);
//             }
//         }
//     }
// };
  // useEffect(() => {
  //   if (calendarId && secretToken) { 
  //     const fetchBookings = async () => {
  //       const fetchUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/calendar/${calendarId}/${secretToken}`;
  //       try {
  //         const response = await fetch(fetchUrl);
  //         if (!response.ok) throw new Error('Failed to fetch bookings');
  //         const data = await response.json();
  //         setBookings(data.bookings || []);
  //       } catch (error) {
  //         console.error("Error fetching bookings:", error);
  //         setError("Failed to fetch bookings.");
  //       }
  //     };

  //     fetchBookings();
  //   }
  // }, [calendarId, secretToken]);

  useEffect(() => {
    const fetchOccupancyDates = async () => {
      const t = translations[language];

      if (!userId) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`);
        const result = await response.json();
        console.log("result rd",result);
        if (!response.ok) throw new Error(result.message);
        setOccupancyDates(result || []);

        // Extract all excluded dates from all accommodations
        const allExcluded = result.flatMap(acc =>
          (acc.excludedDates || []).map(date => ({
            date,
            accommodationId: acc._id,
            accommodationName: acc.name,
          }))
        );
        setExcludedDates(allExcluded);
      } catch (error) {
        console.error("Error fetching occupancy dates:", error);
        setError({ message: t.AddNewAccommodation });
      }
    };

    fetchOccupancyDates();
  }, [user, refreshTrigger]);

  console.log("excludedDates",excludedDates);

  /**
   * Name of the connected calendar an imported row came from.
   *
   * Rows carry `calendarSyncId` since multi-calendar sync shipped, so normally
   * this is a straight lookup. Rows imported before that tag existed have no id
   * — but if the listing has exactly one feed, that feed is the only thing they
   * could have come from, so it is safe to name it. With several feeds and no
   * id there is no way to tell which, and guessing would put the wrong platform
   * in front of the host, so it stays unnamed.
   */
  const resolveSyncName = (accommodation, entry) => {
    if ((entry.source || "manual") !== "ics") return null;

    const feeds = accommodation.calendarSync || [];
    if (entry.calendarSyncId) {
      const feed = feeds.find(
        (f) => String(f._id) === String(entry.calendarSyncId)
      );
      if (feed) return feed.label || null;
      // The feed was disconnected but its dates were kept.
      return null;
    }

    return feeds.length === 1 ? feeds[0].label || null : null;
  };

  const handleAccommodationClick = (date) => {
    // Normalize clicked date
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);
  
    // Find all accommodations with overlapping date ranges
    const selectedOccs = occupancyDates
      .map((occ) => ({
        ...occ,
        matchingDates: blockingEntries(occ.occupancyCalendar).filter((range) => {
          const start = new Date(range.startDate);
          start.setHours(0, 0, 0, 0); // Ensure start date is at midnight
  
          const end = new Date(range.endDate);
          end.setHours(23, 59, 59, 999); // Extend end date to the end of the day
  
          return clickedDate >= start && clickedDate <= end;
        }),
      }))
      .filter((occ) => occ.matchingDates.length > 0);
  
    if (selectedOccs.length > 0) {
      // Convert to array format for multiple accommodations
      const details = selectedOccs.flatMap((occ) =>
        occ.matchingDates.map((dateRange) => ({
          accommodationId: occ._id,
          entryId: dateRange._id,
          name: occ.name,
          startDate: new Date(dateRange.startDate).toDateString(),
          endDate: new Date(dateRange.endDate).toDateString(),
          guestName: dateRange.guestName,
          // Which booking owns this row, when one does. Manual blocks and
          // imported (Airbnb/iCal) rows have no reservation behind them.
          //
          // This was previously dropped on the floor, which is why the popup's
          // Delete button could only ever do the dumb thing: erase the calendar
          // row and leave the reservation paid, approved and unrefunded.
          reservationId: dateRange.reservationId || null,
          // Where the row came from: 'ics' means an external calendar
          // (Airbnb/Booking) put it there and still owns it.
          source: dateRange.source || "manual",
          // Which of the host's connected calendars imported it, by the name
          // they gave it. A host syncing both Airbnb and Booking.com needs to
          // know which of the two is holding these dates.
          syncName: resolveSyncName(occ, dateRange),
          // The real row status ('booked' | 'held' | 'blocked' | 'available'),
          // not the hardcoded "booked" this used to report for everything.
          entryStatus: dateRange.status || "booked",
          status: dateRange.status || "booked",
        }))
      );
 
      // Remove duplicates by entryId
const uniqueDetails = details.filter(
  (item, index, self) =>
    index === self.findIndex((t) =>
      t.startDate === item.startDate &&
      t.endDate === item.endDate &&
      t.guestName === item.guestName
    )
);

setSelectedDateDetails(uniqueDetails);
      // setSelectedDateDetails(details);
    }
  };

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((acc) => {
      console.log("Accommodation ID:", acc._id);
  
      if (Array.isArray(acc.occupancyCalendar)) {
        acc.occupancyCalendar.forEach((entry) => {
          console.log(" - Occupancy Entry ID:", entry._id);
        });
      } else {
        console.log(" - No occupancyCalendar found for this accommodation.");
      }
    });
  } else {
    console.log("No accommodations found or data is not an array.");
  }
  

  const handleExcludedDateClick = (date) => {
    const clicked = new Date(date);
    clicked.setHours(0, 0, 0, 0);

    const details = excludedDates
      .filter((d) => {
        const ex = new Date(d.date); // access .date
        ex.setHours(0, 0, 0, 0);
        return ex.getTime() === clicked.getTime();
      })
      .map((d) => ({
        type: "excluded",
        guestName: "Own",
        accommodationId: d.accommodationId,
        name: d.accommodationName,
        startDate: new Date(d.date).toDateString(),
        endDate: new Date(d.date).toDateString(),
        status: "This date is blocked",
      }));

    setSelectedDateDetails(details);
  };



  const isDateExcluded = (date, excludedDates = []) => {
    const normalize = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const current = normalize(date);

    return excludedDates.some((d) => {
      const exDate = new Date(d.date); // access .date
      return current.getTime() === normalize(exDate).getTime();
    });
  };

  const handleDelete = async (accommodationId, entryId) => {
    console.log("Deleting entry with Accommodation ID:", accommodationId, "and Entry ID:", entryId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/${accommodationId}/occupancy/${entryId}`,
        {
          method: "DELETE",
        }
      );
  
      if (response.ok) {
        alert(t.Deletedsuccessfully);
      } else {
        const error = await response.json();
        throw new Error(error.message || t.Failedtodeleteentry);
      }
  
      // Update state after deletion
      setOccupancyDates((prevDates) =>
        prevDates.map((occ) =>
          occ._id === accommodationId
            ? {
                ...occ,
                occupancyCalendar: occ.occupancyCalendar.filter(
                  (range) => range._id !== entryId
                ),
              }
            : occ
        )
      );
  
      setSelectedDateDetails((prevDetails) =>
        prevDetails.filter((d) => d._id !== entryId)
      );

      // Auto-close the modal by clearing selectedDateDetails
      setSelectedDateDetails([]);
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert(t.FailedtodeletetheentryPleasetryagain);
    }
  };

  // const [months] = useState(Array.from({ length: 12 }, (_, i) => i));

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const todayDay = currentDate.getDate();

  const isToday = (year, month, day) =>
    year === currentYear && month === currentMonth && day === todayDay;

  const isDateBooked = (date) => {
    return bookings.some((booking) => {
      const bookingStart = new Date(booking.start); // Convert to Date object
      const bookingEnd = new Date(booking.end); // Convert to Date object
  
      bookingEnd.setDate(bookingEnd.getDate() - 1);

      // Normalize the times to avoid issues with hours, minutes, etc.
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(23, 59, 59, 999);
      date.setHours(0, 0, 0, 0); // Normalize the input date
  
      return date >= bookingStart && date <= bookingEnd;
    });
  };
  

  return (
    <div>
      {/* Navbar */}
      <Header
        title={`${t.OccupancyCalendar}`}
        subtitle=""
        showAddButton={true}
      />
      
      {/* Toolbar */}
      <div className="flex flex-col gap-4 p-4 mt-4 bg-white border border-gray-100 shadow-sm rounded-2xl sm:flex-row sm:items-center sm:justify-between">
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1E3E2B] rounded-xl shadow-sm hover:bg-[#1E3E2B]/90 hover:shadow-md transition-all duration-200 active:scale-95"
            onClick={() => setShowForm(true)}
          >
            <CalendarCheck className="w-4 h-4" />
            {t.AccommodationUpdate}
          </button>
          <button
            className="inline-flex items-center justify-center w-10 h-10 text-[#1E3E2B] bg-white border border-[#1E3E2B]/10 rounded-xl shadow-sm hover:border-[#DFBA73]/50 hover:text-[#DFBA73] hover:shadow-md transition-all duration-200 active:scale-95"
            onClick={refreshCalendar}
            title={t.Retry || "Refresh"}
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#1E3E2B]/70">
            <span className="w-3.5 h-3.5 rounded-md bg-[#1E3E2B]" />
            {t.Booked}
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#1E3E2B]/70">
            <span className="w-3.5 h-3.5 rounded-md border border-gray-200 bg-white" />
            {t.Available || "Available"}
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#1E3E2B]/70">
            <span className="w-3.5 h-3.5 rounded-md bg-white ring-2 ring-[#DFBA73] ring-inset" />
            {t.Today || "Today"}
          </span>
        </div>
      </div>

      {/* Accommodation Form Popup */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E3E2B]/40 backdrop-blur-sm">
          <div className="w-full max-w-lg p-8 bg-white border border-gray-100 rounded-2xl shadow-2xl">
            <AccomodationForm
              onClose={() => {
                setShowForm(false);
                refreshCalendar(); // Refresh when modal closes
              }}
              // No need to pass onCalendarUpdate
            />
          </div>
        </div>
      )}
      {/* Accommodation Details Popup */}
      {Array.isArray(selectedDateDetails) && selectedDateDetails.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E3E2B]/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-8 transition-transform transform scale-100 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <button
              className="absolute flex items-center justify-center w-8 h-8 text-[#1E3E2B]/60 transition-colors rounded-full top-4 right-4 hover:bg-[#FAFAFA] hover:text-[#1E3E2B]"
              onClick={() => setSelectedDateDetails([])}
              aria-label={t.Close}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-[#1E3E2B]/5">
              <CalendarDays className="w-6 h-6 text-[#1E3E2B]" />
            </div>
            <h2 className="text-2xl font-bold text-center text-[#1E3E2B]">
              {t.AccommodationDetails}
            </h2>
            <span className="block w-12 h-1 mx-auto mt-3 mb-6 rounded-full bg-[#DFBA73]" />

            {/* Loop Through Accommodations */}
            <div className="space-y-3 text-gray-600">
              {selectedDateDetails.map((detail, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-[#FAFAFA] border border-gray-100 rounded-xl">
                  {/* Show Counter Only If More Than One Booking */}
                  {selectedDateDetails.length > 1 && (
                    <span className="flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full bg-[#DFBA73] text-[#1E3E2B] shrink-0">
                      {index + 1}
                    </span>
                  )}

                  {/* Booking Details */}
                  <div className="flex-1">
                    {/* Accommodation Name (Bold & Aligned) */}
                    <p className="mb-1 text-lg font-bold text-[#1E3E2B]">
                      {detail.name}
                    </p>

                    {/* Other Details */}
                    <p className="text-sm">
                      <span className="font-semibold text-[#1E3E2B]/70">{t.GuestName}:</span>{" "}
                      {detail.guestName}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-[#1E3E2B]/70">{t.StartDate}:</span>{" "}
                      {detail.startDate}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-[#1E3E2B]/70">{t.EndDate}:</span>{" "}
                      {detail.endDate}
                    </p>
                    {/* Which calendar these dates came from, when they were
                        imported rather than blocked by the host. */}
                    {detail.source === "ics" && (
                      <p className="flex items-center gap-1.5 mt-1 text-sm">
                        <CalendarCheck className="w-4 h-4 shrink-0 text-[#319A81]" />
                        <span className="font-semibold text-[#1E3E2B]/70">{t.SyncedCalendar}:</span>
                        <span className="font-semibold text-[#1E3E2B] truncate">
                          {detail.syncName || t.UnnamedCalendar}
                        </span>
                      </p>
                    )}
                    {detail.guestName !== "Airbnb (Not available)" && detail.type !== "excluded" && (
                      detail.reservationId ? (
                        // A real booking sits behind these dates. Deleting the
                        // calendar row on its own would leave the reservation
                        // paid and approved, the guest un-refunded and un-told,
                        // and the payout sweep would still pay the host for a
                        // stay that is no longer on the calendar.
                        //
                        // So this goes through the same cancellation flow the
                        // reservations list uses: the server previews the refund
                        // from the policy snapshot frozen on the booking, then
                        // refunds, releases the dates and emails both parties.
                        <CancelBookingButton
                          reservationId={detail.reservationId}
                          cancelledBy="host"
                          labels={t}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 text-sm font-medium text-red-600 transition-colors bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                          triggerContent={
                            <>
                              <Trash2 className="w-4 h-4" />
                              {t.CancelBooking || t.Delete}
                            </>
                          }
                          onCancelled={() => {
                            // The cancellation already released the dates
                            // server-side; drop the row locally so the popup and
                            // the grid agree without a full reload.
                            setOccupancyDates((prev) =>
                              prev.map((occ) =>
                                occ._id === detail.accommodationId
                                  ? {
                                      ...occ,
                                      occupancyCalendar: (occ.occupancyCalendar || []).filter(
                                        (range) => range._id !== detail.entryId
                                      ),
                                    }
                                  : occ
                              )
                            );
                            refreshCalendar();
                          }}
                        />
                      ) : detail.source === "ics" ? (
                        // Imported from a connected calendar. The feed owns
                        // this row: deleting it here frees the dates only until
                        // the next sync puts them straight back, so the button
                        // is replaced by where the host can actually act on it.
                        <p className="px-3 py-2 mt-3 text-xs font-medium text-[#1E3E2B]/70 bg-[#1E3E2B]/[0.04] border border-[#1E3E2B]/10 rounded-lg">
                          {t.ImportedRowCannotBeDeleted}
                        </p>
                      ) : (
                        // No reservation and not imported: a manual block the
                        // host added. Removing it only frees the dates, so a
                        // plain delete is correct — but confirm first, because
                        // it was previously a single mis-click.
                        <button
                          onClick={() => {
                            if (
                              !window.confirm(
                                `${t.Delete} — ${detail.name}\n${detail.startDate} → ${detail.endDate}`
                              )
                            ) {
                              return;
                            }
                            handleDelete(detail.accommodationId, detail.entryId);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-3 text-sm font-medium text-red-600 transition-colors bg-red-50 rounded-lg hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t.Delete}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <button
                className="px-5 py-2.5 text-sm font-semibold text-[#1E3E2B] bg-white border border-[#1E3E2B]/10 rounded-xl shadow-sm hover:border-[#DFBA73]/50 hover:shadow-md transition-all duration-200 active:scale-95"
                onClick={() => setSelectedDateDetails([])}
              >
                {t.Close}
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center py-10">
    {/* Icon for visual feedback */}
    <div className="mb-4">
      <svg
        className="w-16 h-16 text-red-500"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M12 2.25c5.376 0 9.75 4.374 9.75 9.75 0 5.376-4.374 9.75-9.75 9.75-5.376 0-9.75-4.374-9.75-9.75 0-5.376 4.374-9.75 9.75-9.75zm0 1.5a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5zm-.75 6a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0V9.75zm.75 6.75a.75.75 0 100 1.5.75.75 0 000-1.5z"
          clipRule="evenodd"
        />
      </svg>
    </div>

    {/* Error Message Text */}
    <h2 className="mb-2 text-xl font-semibold text-red-500">
      {t.SomethingWentWrong}
    </h2>
    <p className="mb-4 text-gray-600">
      {error.message}. {t.Pleasetryrefreshingthepageorcontactsupportiftheissuepersists}
    </p>

    {/* Retry Button */}
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-2 font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
    >
      {t.Retry}
    </button>
  </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-3">
        {months
          // Filter months based on the current year and month
          .filter(({ year, month }) => {
            return (
              year > currentYear || (year === currentYear && month >= currentMonth)
            );
          })
          .slice(0, displayedMonths) // Limit to the number of months to display
          .map(({ year, month }, index) => {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDay = new Date(year, month, 1).getDay();
      
            return (
              <div key={index} className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md hover:border-[#DFBA73]/30 transition-all duration-300">
                <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-gray-100">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E3E2B]/5">
                    <CalendarDays className="w-4 h-4 text-[#1E3E2B]" />
                  </span>
                  <h2 className="text-base font-bold text-[#1E3E2B] capitalize">
                    {new Date(year, month).toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {/* Weekday Headers */}
                  {["MON", "TUES", "WED", "THUR", "FRI", "SAT", "SUN"].map((day, di) => (
                    <div key={day} className={`text-[11px] font-semibold tracking-wide uppercase pb-1 ${di >= 5 ? "text-[#DFBA73]/60" : "text-[#DFBA73]"}`}>
                      {day}
                    </div>
                  ))}
      
                  {/* Empty Days for Leading Space */}
                  {[...Array(firstDay === 0 ? 6 : firstDay - 1)].map((_, i) => (
                    <div key={i}></div> 
                  ))}
      
                  {/* Days of the Month */}
                  {[...Array(daysInMonth)].map((_, i) => {
                    const date = i + 1;
                    const currentDate = new Date(year, month, date);
                    // Only rows that genuinely occupy the dates — a paid
                    // booking, a manual block, an imported iCal night. A `held`
                    // row is a 30-minute checkout claim on an UNPAID booking,
                    // and greying those out showed the host dates as taken
                    // before any money had moved. The guest-facing calendars
                    // have always filtered this way; this one had not.
                    const occupancy = occupancyDates.find((occ) =>
                      isDateInRange(currentDate, blockingEntries(occ.occupancyCalendar))
                    );
                    const isInRange = !!occupancy;
                    const isBooked = isDateBooked(currentDate);
                    const isExcluded = isDateExcluded(currentDate, excludedDates);
                    const isHighlighted = isExcluded || isBooked || isInRange;
                    const highlightToday = isToday(year, month, date);

                    return (
                      <div
                        key={i}
                        title={isHighlighted ? t.Booked : undefined}
                        className={`flex items-center justify-center aspect-square text-sm rounded-lg transition-all duration-150 ${
                          isHighlighted
                            ? "bg-[#1E3E2B] text-white font-semibold cursor-pointer hover:bg-[#1E3E2B]/85 hover:scale-105 shadow-sm"
                            : "text-[#1E3E2B]/70 hover:bg-[#FAFAFA]"
                        } ${highlightToday ? "ring-2 ring-[#DFBA73] ring-inset font-bold" : ""}`}
                        onClick={() => {
                          if (isExcluded) {
                            handleExcludedDateClick(currentDate);
                          } else if (isInRange) {
                            handleAccommodationClick(currentDate);
                          }
                        }}
                      >
                        {date}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
      
      )}

      {/* Show More Months Button */}
       <div className="mt-8 text-center">
        <button
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#1E3E2B] bg-white border border-[#1E3E2B]/10 rounded-xl shadow-sm hover:border-[#DFBA73]/50 hover:shadow-md transition-all duration-200 active:scale-95"
          onClick={() => setDisplayedMonths(displayedMonths + 4)}
        >
          {t.ShowMoreMonths}
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const App = () => {
  // const currentYear = new Date().getFullYear();
  const monthsToShow = [
    // 2024
    { year: 2024, month: 8 },
    { year: 2024, month: 9 },
    { year: 2024, month: 10 },
    { year: 2024, month: 11 },
    // 2025
    { year: 2025, month: 0 },
    { year: 2025, month: 1 },
    { year: 2025, month: 2 },
    { year: 2025, month: 3 },
    { year: 2025, month: 4 },
    { year: 2025, month: 5 },
    { year: 2025, month: 6 },
    { year: 2025, month: 7 },
    { year: 2025, month: 8 },
    { year: 2025, month: 9 },
    { year: 2025, month: 10 },
    { year: 2025, month: 11 },
    // 2026
    { year: 2026, month: 0 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
    { year: 2026, month: 4 },
    { year: 2026, month: 5 },
    { year: 2026, month: 6 },
    { year: 2026, month: 7 },
    { year: 2026, month: 8 },
    { year: 2026, month: 9 },
    { year: 2026, month: 10 },
    { year: 2026, month: 11 },
    // 2027
    { year: 2027, month: 0 },
    { year: 2027, month: 1 },
    { year: 2027, month: 2 },
    { year: 2027, month: 3 },
    { year: 2027, month: 4 },
    { year: 2027, month: 5 },
    { year: 2027, month: 6 },
    { year: 2027, month: 7 },
    { year: 2027, month: 8 },
    { year: 2027, month: 9 },
    { year: 2027, month: 10 },
    { year: 2027, month: 11 },
  ];
  const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth();

  return <Calendar year={currentYear} months={monthsToShow} />;
};

export default App;