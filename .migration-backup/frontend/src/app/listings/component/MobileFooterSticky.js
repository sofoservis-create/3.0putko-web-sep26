"use client";
import React, { useContext, useEffect, useState } from "react";
import ModalMobileSelectionDate from "../../Checkout/component/ModalMobileSelectionDate";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import converSelectedDateToString from "../../utlis/converSelectedDateToString";
import ModalReserveMobile from "./ModalReserveMobile";
import { FormContext } from "../../FormContext";
import { format } from "date-fns";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { toast } from "react-toastify";
import { buildFlexiblePriceResolver } from "@/app/utlis/flexiblePricing";
import { blockingEntries } from "../../utlis/availability";

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
  } = useContext(FormContext);

  // translations
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  useEffect(() => setLanguage(lang || "sk"), [lang]);
  const t = translations[language];

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

    const excludedDates = Array.isArray(accdata?.excludedDates)
      ? accdata.excludedDates
      : [];
    const occupancyCalendar = blockingEntries(accdata?.occupancyCalendar);

    const getDatesInRange = (start, end) => {
      const dates = [];
      let currentDate = new Date(start);
      while (currentDate <= end) {
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

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 block py-2 bg-white border-t lg:hidden sm:py-3 border-neutral-200">
        <div className="container flex items-center justify-between">
          <div className="flex flex-col">
            {offerMatched && offerPrice ? (
              <>
                <div className="text-left">
                  <div className="text-xl font-semibold">€{totalPrice}</div>
                </div>
                <ModalMobileSelectionDate
                  renderChildren={({ openModal }) => (
                    <span
                      onClick={openModal}
                      className="block mt-1 text-sm font-medium underline"
                    >
                      {!startdate && !enddate
                        ? `${t.SelectDate}`
                        : converSelectedDateToString([startdate, enddate])}
                    </span>
                  )}
                  onDateChange={({ startDate, endDate }) => {
                    updatestartdate(startDate);
                    updatendate(endDate);
                  }}
                />
              </>
            ) : (
              <>
                {!startdate && !enddate ? (
                  <span className="block text-xl font-semibold">
                    €{accdata?.pricePerNight || 0}
                    <span className="ml-1 text-sm font-normal text-neutral-500">
                      /{t.night}
                    </span>
                  </span>
                ) : (
                  <div className="text-left">
                    <div className="text-xl font-semibold">€{totalPrice}</div>
                    <button
                      onClick={() => setShowPricePopup(true)}
                      className="text-xs underline text-neutral-500"
                    >
                      {t.Viewdetails || "View details"}
                    </button>
                  </div>
                )}
                <ModalMobileSelectionDate
                  renderChildren={({ openModal }) => (
                    <span
                      onClick={openModal}
                      className="block mt-1 text-sm font-medium underline"
                    >
                      {!startdate && !enddate
                        ? `${t.SelectDate}`
                        : converSelectedDateToString([startdate, enddate])}
                    </span>
                  )}
                  onDateChange={({ startDate, endDate }) => {
                    updatestartdate(startDate);
                    updatendate(endDate);
                  }}
                />
              </>
            )}
          </div>

          <ModalReserveMobile
            renderChildren={({ openModal }) => (
              <ButtonPrimary
                sizeClass="px-8 sm:px-10 py-4 !rounded-2xl"
                className={`bg-[#357965] ${
                  !canSubmit ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!canSubmit}
                onClick={canSubmit ? handleReserve : undefined}
              >
                {isRequestMode
                  ? t.RequestToBook
                  : canReserve
                  ? t.Reserve
                  : t.comingSoons || "Coming Soon"}
              </ButtonPrimary>
            )}
          />
        </div>
      </div>

      {showPricePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => setShowPricePopup(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPricePopup(false)}
              className="absolute text-gray-600 top-3 right-3 hover:text-black"
            >
              ✕
            </button>
            <h3 className="mb-4 text-xl font-semibold">
              {t.PriceDetails || "Price Details"}
            </h3>
            <div className="flex flex-col space-y-4 text-neutral-600">
              <div className="flex justify-between gap-4">
                <span>
                  €{nightlyRate} x {nights} {nightsLabel}
                  {offerMatched && offerName ? ` (${offerName})` : ""}
                </span>
                <span className="whitespace-nowrap">
                  €{accommodationSubtotal}
                </span>
              </div>
              {petFeeTotal > 0 && (
                <div className="flex justify-between gap-4">
                  <span>
                    {t.PetFee} · €{petFeePerNightVal} x {nights} {nightsLabel}
                  </span>
                  <span className="whitespace-nowrap">€{petFeeTotal}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span>{t.Servicecharge}</span>
                <span className="whitespace-nowrap">€0</span>
              </div>
              <div className="border-b border-neutral-200"></div>
              <div className="flex justify-between gap-4 font-semibold text-neutral-900">
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