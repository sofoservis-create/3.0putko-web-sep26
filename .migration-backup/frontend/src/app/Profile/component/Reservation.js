import React, { useState, useContext, useEffect } from "react";
import TabNavigation from './TabNavigation';
import AccommodationForm from "./AccommodationForm";
import Calsync from "./Calsync";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import Header from "@/app/components/Header/Header";
import CancelBookingButton from "@/app/components/CancelBookingButton";
import { Plus, ArrowLeft, CalendarDays, Users, Mail, Phone, Globe, ClipboardList, ListFilter, ChevronRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatCalendarDate } from '../../utlis/calendarDate';

const Reservation = ({ onMenuClick }) => {
  const [showForm, setShowForm] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [showConfirmed, setShowConfirmed] = useState(false); // Initialize this state
  const [shows, setShows] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState([]);

  const translations = { en, sk }

  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

    // Update language state when `lang` changes in FormContext
    useEffect(() => {
      setLanguage(lang || "sk");
    }, [lang]);

  const t = translations[language];


  const handleButtonClick = () => setShowForm(true);
  const closeForm = () => setShowForm(false);

  const handleProcessClick = (reservation) => {
    setSelectedReservation(reservation);
    setShows(false);
    setShowPrice(true);
  };

  // ── Booking requests ────────────────────────────────────────────────────
  //
  // A request carries no payment: the guest sent dates and an email, nothing
  // was charged and the calendar is untouched. Approving is therefore the
  // moment money enters the picture, which is why the server refuses it until
  // the host has a payout account — the button here reflects that refusal
  // rather than trying to predict it.
  const [respondingTo, setRespondingTo] = useState(null);

  const respondToRequest = async (reservation, action) => {
    if (
      action === "decline" &&
      !window.confirm(`${t.DeclineRequest} — ${reservation.name}?`)
    ) {
      return;
    }

    setRespondingTo(`${reservation._id}:${action}`);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/reservation/${reservation._id}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // The one refusal worth handling specially: there is nowhere to send
        // the money yet, so send the host to onboarding instead of showing a
        // raw error they can do nothing with.
        if (result.code === "host_not_payout_ready") {
          if (window.confirm(t.ConnectPayoutBeforeAccepting)) {
            window.location.href = "/Profile?tab=payments";
          }
          return;
        }
        alert(result.error || t.Somethingwentwrong);
        return;
      }

      setReservations((prev) =>
        prev.map((r) =>
          r._id === reservation._id
            ? { ...r, ...(result.reservation || {}) }
            : r
        )
      );
      alert(action === "approve" ? t.RequestApprovedGuestEmailed : t.RequestDeclinedGuestEmailed);
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      alert(t.Somethingwentwrong);
    } finally {
      setRespondingTo(null);
    }
  };

  useEffect(() => {
    const userr = localStorage.getItem('user');
    if (userr) {
      const users = JSON.parse(userr);
      const userId = users._id;

      const fetchReservations = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reservation/provider/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) throw new Error('Failed to fetch reservations');
          const result = await response.json();
          // Sort reservations by `createdAt` in descending order (latest first)
         const sortedReservations = result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

         setReservations(sortedReservations);

        } catch (error) {
          console.error('Error fetching reservations:', error);
        }
      };

      fetchReservations();
    }
  }, []);

  if (showForm) {
    return (
      <div className="space-y-5">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#1E3E2B] bg-white border border-[#1E3E2B]/10 rounded-xl shadow-xs hover:border-[#DFBA73]/50 hover:shadow-md transition-all duration-200 active:scale-95"
          onClick={closeForm}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.CloseForm}
        </button>
        <AccommodationForm onClose={() => setShowForm(false)} />
      </div>
    );
  }

  const handleShowBookedToggle = () => {
    setShowConfirmed(!showConfirmed); // Toggle between showing confirmed or all bookings
  };

  const filteredReservations = showConfirmed
    ? reservations.filter((reservation) => reservation.isApproved === 'approved') // Filter confirmed reservations
    : reservations;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Header
        title={`${t.ReservationRequests}`}
        // subtitle={`${filteredReservations.length} ${t.requests}`}
        showAddButton={true}
      />

      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Action Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#1E3E2B] bg-white border border-[#1E3E2B]/10 rounded-xl shadow-xs hover:border-[#DFBA73]/50 hover:shadow-md transition-all duration-200 active:scale-95"
            onClick={handleShowBookedToggle}
          >
            <ListFilter className="w-4 h-4 text-[#319A81]" />
            <span className="block lg:hidden">{showConfirmed ? `${t.All}` : `${t.Confirmed}`}</span> {/* Short text on mobile */}
            <span className="hidden lg:block">{showConfirmed ? `${t.ShowAllBooking}` : `${t.ShowallConfirmedBooking}`}</span>
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95"
            onClick={handleButtonClick}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.AddYourOwnDate}</span>
          </button>
        </div>

        {/* Reservation List or Price Component */}
        {!showPrice ? (
          <div className="flex flex-col gap-5">
            {filteredReservations.length > 0 ? (
              filteredReservations.map((reservation, index) => {
                const status = reservation.isApproved;
                // A request the host has not answered yet. Once approved the
                // guest holds a payment link, so it is no longer answerable.
                const isRequest = reservation.bookingMode === "request";
                const isOpenRequest =
                  isRequest && status === "pending" && reservation.paymentStatus !== "paid";
                const statusConfig =
                  isOpenRequest
                    ? { label: `${t.AwaitingYourAnswer}`, Icon: Clock, badge: "bg-[#DFBA73]/15 text-[#9a7a3a] border-[#DFBA73]/30", strip: "bg-[#DFBA73]" }
                    : isRequest && status === "approved" && reservation.paymentStatus !== "paid"
                    ? { label: `${t.AwaitingGuestPayment}`, Icon: Clock, badge: "bg-[#319A81]/10 text-[#257562] border-[#319A81]/20", strip: "bg-[#319A81]" }
                    : status === "approved"
                    ? { label: `${t.Confirmed}`, Icon: CheckCircle2, badge: "bg-[#319A81]/10 text-[#257562] border-[#319A81]/20", strip: "bg-[#319A81]" }
                    : status === "cancelled"
                    ? { label: `${t.Cancelled}`, Icon: XCircle, badge: "bg-slate-100 text-slate-500 border-slate-200", strip: "bg-slate-400" }
                    : { label: `${t.Raw}`, Icon: Clock, badge: "bg-[#DFBA73]/15 text-[#9a7a3a] border-[#DFBA73]/30", strip: "bg-[#DFBA73]" };
                const StatusIcon = statusConfig.Icon;

                return (
                  <div
                    key={index}
                    className="group relative flex flex-col overflow-hidden bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300"
                  >
                    {/* Status Accent Strip */}
                    <div className={`absolute top-0 left-0 h-full w-1.5 ${statusConfig.strip}`} />

                    <div className="flex flex-col gap-5 p-5 pl-7 lg:flex-row lg:items-center lg:justify-between">
                      {/* Left: Guest + Stay details */}
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-10">
                        {/* Status badge */}
                        <div className="flex">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${statusConfig.badge}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:gap-12">
                          {/* Guest + dates */}
                          <div className="flex flex-col gap-1.5">
                            <h1 className="font-extrabold text-base text-[#1E3E2B] tracking-tight">
                              {reservation.name || "Unknown User"}
                            </h1>
                            <p className="flex items-center gap-2 text-sm text-slate-600">
                              <CalendarDays className="w-4 h-4 text-[#319A81] shrink-0" />
                              {formatCalendarDate(reservation.checkInDate)} —{" "}
                              {formatCalendarDate(reservation.checkOutDate)}
                            </p>
                            <p className="flex items-center gap-2 text-sm text-slate-600">
                              <Users className="w-4 h-4 text-[#319A81] shrink-0" />
                              {reservation.numberOfPersons} {t.persons}
                            </p>
                            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {reservation.source || "N/A"}
                            </p>
                          </div>

                          {/* Contact */}
                          <div className="flex flex-col gap-1.5 sm:border-l sm:border-slate-100 sm:pl-12">
                            <p className="flex items-center gap-2 text-sm font-bold text-[#319A81] break-all">
                              <Mail className="w-4 h-4 shrink-0" />
                              {reservation.email || "No Email"}
                            </p>
                            <p className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                              +{reservation.phone || "No Phone"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Process action */}
                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        {/* An open booking request: approve to send the guest a
                            payment link, or decline. Nothing has been charged
                            either way, so neither button touches money here. */}
                        {isOpenRequest && (
                          <>
                            <button
                              type="button"
                              disabled={Boolean(respondingTo)}
                              onClick={() => respondToRequest(reservation, "approve")}
                              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {respondingTo === `${reservation._id}:approve`
                                ? t.Approving
                                : t.ApproveRequest}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(respondingTo)}
                              onClick={() => respondToRequest(reservation, "decline")}
                              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl shadow-xs transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <XCircle className="w-4 h-4" />
                              {respondingTo === `${reservation._id}:decline`
                                ? t.Declining
                                : t.DeclineRequest}
                            </button>
                          </>
                        )}

                        {/* A host cancelling always refunds the guest in full.
                            Only meaningful once money has changed hands — an
                            unpaid request is declined, not cancelled. */}
                        {status !== "cancelled" && !isOpenRequest && (
                          <CancelBookingButton
                            reservationId={reservation._id}
                            cancelledBy="host"
                            labels={t}
                            onCancelled={() =>
                              setReservations((prev) =>
                                prev.map((r) =>
                                  r._id === reservation._id
                                    ? { ...r, isApproved: "cancelled" }
                                    : r
                                )
                              )
                            }
                          />
                        )}
                        <button
                          className="inline-flex items-center justify-center gap-2 w-full lg:w-auto px-8 py-2.5 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95"
                          onClick={() => handleProcessClick(reservation)}
                        >
                          {t.Process}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center bg-white shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#1E3E2B]/5 flex items-center justify-center text-[#1E3E2B]/40 mb-4 border border-[#1E3E2B]/10">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <p className="text-slate-700 font-bold text-base">{t.Noreservationsfound}.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs overflow-hidden">
            <TabNavigation reservationData={selectedReservation} />
          </div>
        )}

        {shows && <Calsync />}  
      </div>
    </div>
  );
};

export default Reservation;
