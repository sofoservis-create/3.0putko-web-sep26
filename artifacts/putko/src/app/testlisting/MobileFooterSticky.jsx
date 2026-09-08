"use client";
import React, { useContext, useEffect, useRef, useState } from "react";
import ModalMobileSelectionDate from "../Checkout/component/ModalMobileSelectionDate";
import { FormContext } from "../FormContext";
import { format } from "date-fns";
import { sk as skLocale } from "date-fns/locale";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { toast } from "react-toastify";
import { buildFlexiblePriceResolver } from "@/app/utlis/flexiblePricing";
import { blockingEntries } from "../utlis/availability";

const MobileFooterSticky = () => {
  const {
    pricenight,
    ida,
    accdata,
    updatendate,
    enddate,
    startdate,
    updatestartdate,
    lang,
    isFullscreenModalOpen,
  } = useContext(FormContext);

  // translations
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  useEffect(() => setLanguage(lang || "sk"), [lang]);
  const t = translations[language];
  const compactDateRange = [startdate, enddate]
    .filter(Boolean)
    .map((date) =>
      format(
        new Date(date),
        language === "sk" ? "d. MMM" : "MMM d",
        language === "sk" ? { locale: skLocale } : undefined
      )
    )
    .join(" → ");

  // ────────────────────────────────────────────────
  // GUESTS
  // ────────────────────────────────────────────────
  const [guestValues, setGuestValues] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  // State (not ref) so persist only runs AFTER the load re-render
  const [guestsReady, setGuestsReady] = useState(false);

  useEffect(() => {
    // Prefer individual keys from search form
    const adultsKey = localStorage.getItem("guestAdults");
    const childrenKey = localStorage.getItem("guestChildren");
    const infantsKey = localStorage.getItem("guestInfants");

    const hasIndividualKeys =
      adultsKey !== null || childrenKey !== null || infantsKey !== null;

    let next = { adults: 1, children: 0, infants: 0 };

    if (hasIndividualKeys) {
      const adults = parseInt(adultsKey || "0", 10) || 0;
      const children = parseInt(childrenKey || "0", 10) || 0;
      const infants = parseInt(infantsKey || "0", 10) || 0;

      if (adults === 0 && children === 0 && infants === 0) {
        next = { adults: 1, children: 0, infants: 0 };
      } else {
        next = { adults, children, infants };
      }
    } else {
      const storedObject = localStorage.getItem("guestValues");
      if (storedObject) {
        try {
          const parsed = JSON.parse(storedObject);
          if (parsed && typeof parsed === "object") {
            const adults = Number(parsed.adults) || 0;
            const children = Number(parsed.children) || 0;
            const infants = Number(parsed.infants) || 0;

            if (adults === 0 && children === 0 && infants === 0) {
              next = { adults: 1, children: 0, infants: 0 };
            } else {
              next = { adults, children, infants };
            }
          }
        } catch (_) {}
      }
    }

    setGuestValues(next);
    setGuestsReady(true); // only after values are applied
  }, []);

  useEffect(() => {
    const syncGuestValues = (event) => {
      if (event.detail?.source !== "listing-summary") return;
      const values = event.detail?.values;
      if (values) setGuestValues(values);
    };

    window.addEventListener("putko:guest-values", syncGuestValues);
    return () =>
      window.removeEventListener("putko:guest-values", syncGuestValues);
  }, []);

  // Restore dates
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCheckin = localStorage.getItem("checkin");
      const storedCheckout = localStorage.getItem("checkout");
      if (storedCheckin) updatestartdate(new Date(storedCheckin));
      if (storedCheckout) updatendate(new Date(storedCheckout));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  };

  const calculateNumberOfDays = () => {
    if (!startdate || !enddate) return 0;
    return Math.ceil(
      Math.abs(new Date(enddate) - new Date(startdate)) / (1000 * 60 * 60 * 24)
    );
  };

  const toLocalDateOnly = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const [offerMatched, setOfferMatched] = useState(false);
  const [offerName, setOfferName] = useState(null);
  const [offerPrice, setOfferPrice] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [petFeeTotal, setPetFeeTotal] = useState(0);
  const [computedPricePerNight, setComputedPricePerNight] = useState(
    pricenight || 0
  );
  const [showPricePopup, setShowPricePopup] = useState(false);
  const openBookingSheetRef = useRef(null);

  useEffect(() => {
    const nights = calculateDays(startdate || "", enddate || "");
    if (!startdate || !enddate || nights <= 0) {
      setOfferMatched(false);
      setOfferName(null);
      setOfferPrice(null);
      setTotalPrice(0);
      setPetFeeTotal(0);
      setComputedPricePerNight(accdata?.pricePerNight || 0);
      return;
    }

    const offers = [
      ...(accdata?.specialPrice ? [accdata.specialPrice] : []),
    ];

    const getLocalDate = (d) => {
      const date = new Date(d);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const startDateOnly = getLocalDate(startdate);
    const basePrice = Number(accdata?.pricePerNight) || 0;

    const payingGuests =
      (Number(guestValues?.adults) || 0) +
      (Number(guestValues?.children) || 0);
    const perPersonRate = Number(accdata?.pricePerPerson) || 0;
    const effectiveNightlyRate =
      perPersonRate > 0 && payingGuests > 0
        ? Math.max(basePrice, perPersonRate * payingGuests)
        : basePrice;

    let matchedOffer = null;
    let sameOffer = true;
    let usingOffer = false;
    let dailyTotal = 0;

    const resolveFlexible = buildFlexiblePriceResolver(accdata, nights);

    for (let i = 0; i < nights; i++) {
      const currentCheckDate = new Date(startDateOnly);
      currentCheckDate.setDate(startDateOnly.getDate() + i);

      const found =
        resolveFlexible(currentCheckDate) ||
        offers.find((o) => {
          const offerStart = getLocalDate(o.start);
          const offerEnd = getLocalDate(o.end);
          return currentCheckDate >= offerStart && currentCheckDate < offerEnd;
        });

      if (found) {
        dailyTotal += Number(found.price);
        usingOffer = true;
        if (!matchedOffer) matchedOffer = found;
        else if (matchedOffer.name !== found.name) sameOffer = false;
      } else {
        dailyTotal += effectiveNightlyRate;
        sameOffer = false;
      }
    }

    const petFeePerNightVal = Number(accdata?.petFeePerNight) || 0;
    const computedPetFeeTotal =
      petFeePerNightVal > 0
        ? Number((petFeePerNightVal * nights).toFixed(2))
        : 0;

    const computedTotal = Number((dailyTotal + computedPetFeeTotal).toFixed(2));
    setPetFeeTotal(computedPetFeeTotal);
    setTotalPrice(computedTotal);

    if (usingOffer && sameOffer && matchedOffer) {
      setOfferMatched(true);
      setOfferName(matchedOffer.name);
      setOfferPrice(Number(matchedOffer.price));
      setComputedPricePerNight(Number(matchedOffer.price));
    } else {
      setOfferMatched(false);
      setOfferName(null);
      setOfferPrice(null);
      const avg =
        nights > 0
          ? Number((dailyTotal / nights).toFixed(2))
          : effectiveNightlyRate;
      setComputedPricePerNight(avg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startdate, enddate, accdata, guestValues]);

  // Persist ONLY after guests have been loaded (guestsReady = true)
  useEffect(() => {
    if (!guestsReady) return;
    if (typeof window === "undefined") return;

    if (startdate)
      localStorage.setItem("checkin", format(startdate, "yyyy-MM-dd"));
    else localStorage.removeItem("checkin");

    if (enddate)
      localStorage.setItem("checkout", format(enddate, "yyyy-MM-dd"));
    else localStorage.removeItem("checkout");

    localStorage.setItem("guestValues", JSON.stringify(guestValues));
    localStorage.setItem("guestAdults", String(guestValues.adults || 0));
    localStorage.setItem("guestChildren", String(guestValues.children || 0));
    localStorage.setItem("guestInfants", String(guestValues.infants || 0));
    window.dispatchEvent(
      new CustomEvent("putko:guest-values", {
        detail: { values: guestValues, source: "sticky-footer" },
      }),
    );

    const userData = {
      checkInDate: startdate ? format(startdate, "yyyy-MM-dd") : null,
      checkOutDate: enddate ? format(enddate, "yyyy-MM-dd") : null,
      guests: guestValues,
      total: totalPrice || calculateTotalPrice(),
      listingId: ida,
      data: accdata,
      nights: calculateNumberOfDays(),
      pricePerNight: computedPricePerNight,
      petFeePerNight: Number(accdata?.petFeePerNight) || 0,
      petFeeTotal,
    };
    localStorage.setItem("userData", JSON.stringify(userData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    guestsReady,
    startdate,
    enddate,
    guestValues,
    ida,
    accdata,
    totalPrice,
    petFeeTotal,
    computedPricePerNight,
  ]);

  const calculateTotalPrice = () => {
    const days = calculateNumberOfDays();
    return days * (pricenight || 0);
  };

  const handleReserve = () => {
    const nightMaxs = Number(accdata?.nightMax) || 15;
    const nightMins = Math.max(1, Number(accdata?.nightMin) || 1);
    const accommodationData =
      JSON.parse(localStorage.getItem("accommodation")) || accdata || {};

    const nights = calculateDays(startdate || "", enddate || "");

    if (!startdate || !enddate) {
      toast.error(t.SelectRDates || "Please select reservation dates");
      const section = document.getElementById("date-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (nights > nightMaxs) {
      toast.error(`${t.Themaximumnumberofnightsallowedis} ${nightMaxs}. ${t.Pleaseadjustyourdates}.`);
      return;
    }
    const partySize = (Number(guestValues.adults) || 0) + (Number(guestValues.children) || 0) + (Number(guestValues.infants) || 0);
    const capacity = Number(accdata?.person) || 0;
    if ((Number(guestValues.adults) || 0) < 1 || (capacity > 0 && partySize > capacity)) {
      toast.error(t.MaxGuestsReached || "Please adjust the number of guests for this accommodation.");
      return;
    }

    const excludedDates = Array.isArray(accdata?.excludedDates)
      ? accdata.excludedDates
      : [];
    const occupancyCalendar = blockingEntries(accdata?.occupancyCalendar);

    const getDatesInRange = (start, end) => {
      const dates = [];
      let currentDate = new Date(start);
      // Checkout is a boundary, not an occupied night.
      while (currentDate < end) {
        dates.push(currentDate.setHours(0, 0, 0, 0));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    };

    const selectedDates = getDatesInRange(
      new Date(startdate),
      new Date(enddate)
    );
    const disabledDatesTimestamps = excludedDates.map((date) =>
      new Date(date).setHours(0, 0, 0, 0)
    );
    const isExcludedDateConflict = selectedDates.some((date) =>
      disabledDatesTimestamps.includes(date)
    );

    const isOccupancyConflict = occupancyCalendar.some(
      ({ startDate, endDate }) => {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(0, 0, 0, 0);
        return selectedDates.some((date) => date >= start && date <= end);
      }
    );

    if (isExcludedDateConflict || isOccupancyConflict) {
      toast.error(
        t.PleaseselectdifferentdatesSomedatesareunavailable ||
          "Please select different dates. Some dates are unavailable."
      );
      return;
    }

    if (nights < nightMins) {
      toast.error(
        `${t.Theminimumnumberofnightsallowedis} ${nightMins}. ${t.Pleaseadjustyourdates}.`
      );
      return;
    }

    try {
      const userData = {
        checkInDate: format(startdate, "yyyy-MM-dd"),
        checkOutDate: format(enddate, "yyyy-MM-dd"),
        guests: guestValues,
        total: totalPrice || calculateTotalPrice(),
        listingId: ida || accommodationData?._id,
        data: accdata || accommodationData,
        nights: calculateNumberOfDays(),
        pricePerNight:
          offerMatched && offerPrice ? offerPrice : computedPricePerNight,
        petFeePerNight: Number(accdata?.petFeePerNight) || 0,
        petFeeTotal,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      sessionStorage.setItem("fromValidFlow", "true");
      window.location.href = "/Checkout";
    } catch (error) {
      console.error(
        "Failed to store reservation data in localStorage:",
        error
      );
    }
  };

  const nights = calculateNumberOfDays();
  const grandTotal = Number((totalPrice || calculateTotalPrice()).toFixed(2));
  const petFeePerNightVal = Number(accdata?.petFeePerNight) || 0;
  const accommodationSubtotal = Number(
    (grandTotal - petFeeTotal).toFixed(2)
  );

  const nightlyRate =
    offerMatched && Number(offerPrice) > 0
      ? Number(offerPrice)
      : Number(computedPricePerNight) ||
        Number(accdata?.pricePerNight) ||
        0;
  const nightsLabel = nights === 1 ? t.night : t.nights;

  const canReserve = accdata?.bookable === true;
  const isRequestMode = accdata?.bookingMode === "request";
  const canSubmit = canReserve || isRequestMode;
  const openOrReserve = () => {
    if (!startdate || !enddate) {
      openBookingSheetRef.current?.();
      return;
    }
    handleReserve();
  };

  if (!accdata || !ida) {
    return null;
  }

  return (
    <>
      <div className={`fixed inset-x-0 bottom-0 ${isFullscreenModalOpen ? "hidden" : "block"} z-40 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] border-t border-neutral-100 lg:hidden transition-all duration-300`}>
        <div className="flex items-center justify-between px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] gap-4">
          <div className="flex flex-col min-w-0 flex-1">
            {offerMatched && offerPrice ? (
              <>
                <span className="text-[17px] sm:text-lg font-bold text-[#112A22] leading-none tracking-tight">
                  €{totalPrice}
                </span>
                <button
                  onClick={() => setShowPricePopup(true)}
                  className="block w-fit text-[13px] text-neutral-500 underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-500 hover:text-neutral-700 text-left mt-1.5 leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2 rounded-sm"
                >
                  {t.Viewdetails || "View details"}
                </button>
              </>
            ) : (
              <>
                {!startdate && !enddate ? (
                  <span className="text-[17px] sm:text-lg font-bold text-[#112A22] leading-none tracking-tight mt-0.5">
                    €{accdata?.pricePerNight || 0}
                    <span className="ml-1 text-[13px] font-normal text-neutral-500 tracking-normal">
                      /{t.night}
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="text-[17px] sm:text-lg font-bold text-[#112A22] leading-none tracking-tight">
                      €{totalPrice}
                    </span>
                    <button
                      onClick={() => setShowPricePopup(true)}
                      className="block w-fit text-[13px] text-neutral-500 underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-500 hover:text-neutral-700 text-left mt-1.5 leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2 rounded-sm"
                    >
                      {t.Viewdetails || "View details"}
                    </button>
                  </>
                )}
              </>
            )}

            <ModalMobileSelectionDate
              renderChildren={({ openModal }) => {
                openBookingSheetRef.current = openModal;
                return (
                  <button
                    type="button"
                    onClick={openModal}
                    className="block w-full truncate text-[13px] underline decoration-neutral-300 hover:decoration-[#112A22] text-left leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2 rounded-sm mt-1 font-normal underline-offset-4 text-[#1c1b1b]"
                  >
                    {!startdate && !enddate ? `${t.SelectDate}` : compactDateRange}
                  </button>
                );
              }}
              onDateChange={({ startDate, endDate }) => {
                updatestartdate(startDate);
                updatendate(endDate);
              }}
              guestValues={guestValues}
              onGuestsChange={setGuestValues}
              capacity={accdata?.person}
            />
          </div>

          <div className="flex-shrink-0">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={canSubmit ? openOrReserve : undefined}
              className={`
                relative flex items-center justify-center px-6 sm:px-8 py-3.5
                bg-[#238869] text-white text-[15px] font-semibold rounded-2xl
                transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869] focus-visible:ring-offset-2
                ${!canSubmit ? "opacity-50 cursor-not-allowed" : "hover:bg-[#1f775d] active:scale-[0.97] shadow-[0_8px_24px_rgba(35,136,105,0.35)]"}
              `}
            >
              {isRequestMode
                ? t.RequestToBook
                : canReserve
                ? t.Reserve
                : t.comingSoons || "Coming Soon"}
            </button>
          </div>
        </div>
      </div>
      {showPricePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity p-4"
          onClick={() => setShowPricePopup(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-scaleIn overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPricePopup(false)}
              className="absolute text-neutral-400 top-4 right-4 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full w-11 h-11 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#238869]"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h3 className="mb-5 text-xl font-semibold text-[#112A22] pr-8">
              {t.PriceDetails || "Price Details"}
            </h3>
            <div className="flex flex-col space-y-4 text-[15px] text-neutral-600">
              <div className="flex justify-between gap-4">
                <span>
                  €{nightlyRate} x {nights} {nightsLabel}
                  {offerMatched && offerName ? <span className="block text-xs text-[#238869] font-medium mt-0.5">{offerName}</span> : ""}
                </span>
                <span className="whitespace-nowrap font-medium text-[#112A22]">
                  €{accommodationSubtotal}
                </span>
              </div>
              {petFeeTotal > 0 && (
                <div className="flex justify-between gap-4">
                  <span>
                    {t.PetFee}
                    <span className="block text-xs text-neutral-500 mt-0.5">€{petFeePerNightVal} x {nights} {nightsLabel}</span>
                  </span>
                  <span className="whitespace-nowrap font-medium text-[#112A22]">€{petFeeTotal}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span>{t.Servicecharge}</span>
                <span className="whitespace-nowrap font-medium text-[#112A22]">€0</span>
              </div>
              <div className="border-b border-neutral-100 my-2"></div>
              <div className="flex justify-between gap-4 text-base font-bold text-[#112A22]">
                <span>{t.Total}</span>
                <span className="whitespace-nowrap">€{grandTotal}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileFooterSticky;