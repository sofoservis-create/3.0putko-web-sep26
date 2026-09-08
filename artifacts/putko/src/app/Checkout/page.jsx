"use client";

import { Tab } from "@headlessui/react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import React, { useState, useEffect, useContext } from "react";
import Input from "../Shared/Input";
import Textarea from "../Shared/Textarea";
import { useRouter } from "@/app/components/NextNavigation";
import ButtonPrimary from "../Shared/ButtonPrimary";
import StartRating from "../listings/component/StartRating";
import NcModal from "../Shared/NcModal/NcModal";
import ModalMobileSelectionDate from "./component/ModalMobileSelectionDate";
import converSelectedDateToString from "../utlis/converSelectedDateToString";
import Label from "../Shared/Label";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer/Footer";
import FooterNav from "../Shared/FooterNav";
import HeroSearchForm2Mobile from "../components/HeroSearchForm2Mobile";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";
import MenuBar from "../Shared/MenuBar";
import { buildFlexiblePriceResolver } from "../utlis/flexiblePricing";
import apiFetch, { rememberReservationToken } from "../utlis/apiFetch";

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const Page = ({ className = "" }) => {
  const router = useRouter();

  useEffect(() => {
    const isValidFlow = sessionStorage.getItem("fromValidFlow");

    if (!isValidFlow) {
      window.location.replace("/");
    }
  }, []);

  // Returning from Stripe without paying.
  //
  // Only the "Back to Putko" link inside Stripe Checkout hits cancel_url and
  // reaches /payment-cancel; the browser's own Back button lands straight back
  // here and tells the server nothing. The hold taken when the session was
  // created then survives its full window, and the guest sees their own dates
  // as unavailable.
  //
  // So release it from here too. /payments/cancel is idempotent and refuses to
  // touch a booking that has been paid, which makes this safe to fire on any
  // arrival — a fresh visit simply has nothing to release. The pageshow
  // listener covers a bfcache restore, where React never remounts and the
  // effect body would not run a second time.
  useEffect(() => {
    const releaseAbandonedHold = () => {
      const reservationId = sessionStorage.getItem("reservationId");
      if (!reservationId) return;

      apiFetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/payments/cancel`, {
        method: "POST",
        reservationId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      })
        .then(() => sessionStorage.removeItem("reservationId"))
        .catch((err) => console.error("Release checkout hold failed:", err));
    };

    releaseAbandonedHold();

    const onPageShow = (event) => {
      if (event.persisted) releaseAbandonedHold();
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const user = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [guests, setGuests] = useState({
    guestAdults: 0,
    guestChildren: 0,
    guestInfants: 0,
  });

  const [reservation, setReservation] = useState({
    checkInDate: "",
    checkOutDate: "",
    numberOfPersons: 1,
    totalPrice: 0,
    totalPriceCents: 0,
    name: "",
    email: "",
    phone: "",
    message: "",
    accommodationProvider: "",
    accommodationId: "",
    language: "",
    isApproved: "pending",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReservation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhoneChange = (value) => {
    setReservation((prev) => ({
      ...prev,
      phone: value,
    }));
  };

  // Whether this booking takes a payment or sends a request. Decided by the
  // server (utils/requestToBook.js) and carried on the listing, so the checkout
  // never re-derives the rule — it only has to say the right thing and, on
  // submit, skip Stripe. The listing snapshot the listing page stored is the
  // source; `userData.data` is that snapshot.
  const isRequestMode = userData?.data?.bookingMode === "request";

  // Fetching the user data from localStorage
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("userData"));
    if (data) {
      setUserData(data);
      setStartDate(new Date(data.checkInDate));
      setEndDate(new Date(data.checkOutDate));
      setGuests({
        guestAdults: data.guests?.adults || 0,
        guestChildren: data.guests?.children || 0,
        guestInfants: data.guests?.infants || 0,
      });
    }
  }, []);

  // Fire Meta Pixel InitiateCheckout event when userData is loaded
  // Add this new useEffect for Lead event - fires when user enters info
useEffect(() => {
  if (!userData) return;

  // Check if user has started entering information
  const hasStartedEnteringInfo = () => {
    return (
      reservation.name?.length > 0 || 
      reservation.email?.length > 0 || 
      reservation.phone?.length > 0
    );
  };

  const fireLeadEvent = () => {
    if (typeof window === "undefined" || !window.fbq) return false;

    const totalGuests =
      (userData.guests?.adults || 0) +
      (userData.guests?.children || 0) +
      (userData.guests?.infants || 0);

    // Generate unique event ID for deduplication
    const eventId = `Lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Fire Lead event in browser
    window.fbq("track", "Lead", {
      content_name: userData.data?.name || "",
      content_category: "Booking",
      content_type: "hotel",
      value: userData.total || 0,
      currency: "EUR",
      num_guests: totalGuests,
      checkin_date: userData.checkInDate || "",
      checkout_date: userData.checkOutDate || "",
      city: userData.data?.locationDetails?.city || "",
      event_id: eventId
    });

    // Also send via CAPI to your backend
    fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/api/facebook-events`, { // Replace with your actual backend URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'Lead',
        eventData: {
          contentName: userData.data?.name,
          contentId: userData.listingId,
          value: userData.total,
          currency: 'EUR',
          num_items: totalGuests,
          checkin_date: userData.checkInDate,
          checkout_date: userData.checkOutDate,
          city: userData.data?.locationDetails?.city
        },
        userPayload: {
          email: reservation.email || userData.email,
          phone: reservation.phone,
          fbp: getCookie("_fbp"),
          fbc: getCookie("_fbc")
        },
        eventId: eventId
      })
    }).catch(err => console.error('Failed to send Lead CAPI:', err));

    return true;
  };

  // Fire Lead event when user starts typing
  if (hasStartedEnteringInfo() && window.fbq) {
    // Use a flag to prevent firing multiple times
    if (!window.__LEAD_FIRED__) {
      fireLeadEvent();
      window.__LEAD_FIRED__ = true;
    }
  }
}, [reservation.name, reservation.email, reservation.phone, userData]);

  const propertyName = userData?.data?.name;

  // Update reservation state when userData is available
  useEffect(() => {
    if (userData) {
      const numberOfPersons =
        (userData.guests?.adults || 0) +
        (userData.guests?.children || 0) +
        (userData.guests?.infants || 0);

      const totalPrice = userData.total || 0;

      setReservation((prev) => ({
        ...prev,
        checkInDate: userData.checkInDate || "",
        checkOutDate: userData.checkOutDate || "",
        numberOfPersons: numberOfPersons,
        totalPrice: totalPrice,
        totalPriceCents: Math.round(totalPrice * 100),
        accommodationProvider: userData.data.userId._id || "",
        accommodationId: userData.listingId || "",
        isApproved: "pending",
      }));
    }
  }, [userData]);

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
    setReservation((prev) => ({ ...prev, language: lang || "sk" }));
  }, [lang]);

  const t = translations[language];

  const validateReservation = () => {
    // Date validation
    const checkIn = new Date(userData?.checkInDate);
    const checkOut = new Date(userData?.checkOutDate);
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      toast.error(t.Checkindatemustbebeforecheckoutdate);
      return false;
    }

    // Listing-level minimum/maximum stay.
    //
    // This is the last gate before the reservation is created, and the only one
    // a guest cannot skip: the date modals validate on save, but dates also
    // arrive here straight from localStorage (set on the listing page, or left
    // over from an earlier visit) without either modal ever being opened.
    //
    // Nights are recomputed from the dates rather than read off `userData.nights`,
    // which is whatever the previous page happened to store.
    const stayNights = Math.round(
      (new Date(userData?.checkOutDate).setHours(0, 0, 0, 0) -
        new Date(userData?.checkInDate).setHours(0, 0, 0, 0)) /
        86400000
    );
    const listingNightMin = Math.max(1, Number(userData?.data?.nightMin) || 1);
    const listingNightMax = Number(userData?.data?.nightMax) || 15;

    if (stayNights < listingNightMin) {
      toast.error(
        `${t.Theminimumnumberofnightsallowedis} ${listingNightMin}. ${t.Pleaseadjustyourdates}.`
      );
      return false;
    }

    if (stayNights > listingNightMax) {
      toast.error(
        `${t.Themaximumnumberofnightsallowedis} ${listingNightMax}. ${t.Pleaseadjustyourdates}.`
      );
      return false;
    }

    // Check minimum nights for offer
    const toLocalDateOnly = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const offers = [];

    const startDateOnly = toLocalDateOnly(userData?.checkInDate);
    const endDateOnly = toLocalDateOnly(userData?.checkOutDate);
    endDateOnly.setDate(endDateOnly.getDate() - 1);

    let matchingOffer = null;
    let date = new Date(startDateOnly);
    let sameOffer = true;

    while (date <= endDateOnly) {
      const found = offers.find((o) => {
        const offerStart = toLocalDateOnly(o.start);
        const offerEnd = toLocalDateOnly(o.end);
        return date >= offerStart && date < offerEnd;
      });

      if (!found) {
        sameOffer = false;
        break;
      }

      if (!matchingOffer) {
        matchingOffer = found;
      } else if (matchingOffer.name !== found.name) {
        sameOffer = false;
        break;
      }

      date.setDate(date.getDate() + 1);
    }

    if (sameOffer && matchingOffer) {
      if (userData.nights < (matchingOffer.Minnumberofnights || 0)) {
        toast.error(
          `${t.Thisofferrequiresaminimumstayof} ${matchingOffer.Minnumberofnights} ${t.nights}.`,
        );
        return false;
      }

      const totalGuests =
        userData.guests.adults +
        userData.guests.children +
        userData.guests.infants;
      const person = userData?.data?.person || "";

      if (totalGuests > person) {
        toast.error(`${t.MaxGuestsReached} ${person}.`);
        return false;
      }

      if (totalGuests < (matchingOffer.Minnumberofpersons || 0)) {
        toast.error(
          `${t.Thisofferrequiresaminimumof} ${matchingOffer.Minnumberofpersons} ${t.guests}.`,
        );
        return false;
      }
    }

    // Email validation
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email_regex.test(reservation.email)) {
      toast.error(t.subscribe_error);
      return false;
    }

    // Required fields validation
    if (!reservation.name || !reservation.phone || !reservation.email) {
      toast.error(t.Pleasefillinallrequiredfieldscorrectly);
      return false;
    }

    return true;
  };

  const handleCreateReservationAndCheckout = async () => {
  if (isSubmitting) return;
  
  // FIRE INITIATECHECKOUT HERE - on button click
  if (window.fbq && userData) {
    const totalGuests =
      (userData.guests?.adults || 0) +
      (userData.guests?.children || 0) +
      (userData.guests?.infants || 0);

    const eventId = `InitiateCheckout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Browser pixel event
    window.fbq("track", "InitiateCheckout", {
      content_name: userData.data?.name || "",
      content_ids: [userData.listingId || ""],
      content_type: "product",
      value: userData.total || 0,
      currency: "EUR",
      num_items: totalGuests || 1,
      checkin_date: userData.checkInDate || "",
      checkout_date: userData.checkOutDate || "",
      num_adults: userData.guests?.adults || 0,
      num_children: userData.guests?.children || 0,
      event_id: eventId
    });

    // Also send via CAPI to your backend
    try {
      await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/facebook-events`, { // Replace with your actual backend URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'InitiateCheckout',
          eventData: {
            contentName: userData.data?.name,
            contentId: userData.listingId,
            value: userData.total,
            currency: 'EUR',
            num_items: totalGuests,
            checkin_date: userData.checkInDate,
            checkout_date: userData.checkOutDate,
            num_adults: userData.guests?.adults,
            num_children: userData.guests?.children
          },
          userPayload: {
            email: reservation.email,
            phone: reservation.phone,
            fbp: getCookie("_fbp"),
            fbc: getCookie("_fbc")
          },
          eventId: eventId
        })
      });
    } catch (error) {
      console.error('Failed to send InitiateCheckout CAPI:', error);
    }
  }

  setIsSubmitting(true);
  
  try {
    // Validate first
    if (!validateReservation()) {
      setIsSubmitting(false);
      return;
    }

    // 1. Create reservation in database
    const fbp = getCookie("_fbp");
    const fbc = getCookie("_fbc");

    const reservationPayload = {
      ...reservation,
      fbp,
      fbc,
    };

    const reservationResponse = await fetch(
      `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/reservation`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationPayload),
      }
    );

    if (!reservationResponse.ok) {
      toast.error(t.Failedtosendreservation);
      setIsSubmitting(false);
      return;
    }

    const reservationData = await reservationResponse.json();
    const reservationId = reservationData._id;

    // Issued once, on creation. Guests can book without an account, so this is
    // the only proof this browser has that the booking is theirs — it is what
    // authorises checkout, the receipt download and cancellation from here on.
    rememberReservationToken(reservationId, reservationData.accessToken);

    sessionStorage.setItem("reservationId", reservationId);
    sessionStorage.setItem("fromValidFlow", "true");

    // The server prices the stay from the listing and ignores whatever the
    // browser calculated. If they disagree, the server figure is the one that
    // will be charged, so show it rather than the stale local total.
    if (
      reservationData.totalPriceCents &&
      reservationData.totalPriceCents !== Math.round((userData?.total || 0) * 100)
    ) {
      console.warn(
        `[pricing] server priced this stay at ${reservationData.totalPriceCents}c, ` +
          `browser showed ${Math.round((userData?.total || 0) * 100)}c`
      );
    }

    // 1b. Request to book — no payment at all.
    //
    // The host has no usable payout account, so there is nowhere to send the
    // money and taking a card would leave it stranded on the platform balance.
    // The server has already recorded the request and emailed the host; the
    // guest goes straight to a confirmation page instead of Stripe.
    if (reservationData.bookingMode === "request") {
      window.location.href = `/request-sent?reservationId=${reservationId}`;
      return;
    }

    // 2. Create Stripe Checkout Session
    const checkoutResponse = await apiFetch(
      `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/payments/create-checkout-session`,
      {
        method: "POST",
        reservationId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, language, fbp, fbc }),
      }
    );

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      toast.error(errorData.error || t.Failedtocreatepayment);
      setIsSubmitting(false);
      return;
    }

    const checkoutData = await checkoutResponse.json();

    // 3. Redirect to Stripe Checkout
    window.location.href = checkoutData.url;
  } catch (error) {
    console.error("Error:", error);
    toast.error(t.TherewasanerrorsendingyourreservationPleasetryagainlater);
    setIsSubmitting(false);
  }
};

  useEffect(() => {
    if (!userData || !userData.checkInDate || !userData.checkOutDate) return;

    const offers = [
      ...(userData?.data?.specialPrice ? [userData.data.specialPrice] : []),
    ];

    const getLocalDate = (d) => {
      const date = new Date(d);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const startDateOnly = getLocalDate(userData.checkInDate);
    const nights = userData.nights || 0;

    // Default base price from listing data
    const basePrice = Number(userData.data?.pricePerNight) || 0;

    // pricePerPerson floor logic (same as listing page)
    // effectiveNightly = max(pricePerNight, payingGuests * pricePerPerson)
    const payingGuests =
      (Number(userData.guests?.adults) || 0) +
      (Number(userData.guests?.children) || 0);
    const perPersonRate = Number(userData.data?.pricePerPerson) || 0;
    const effectiveNightlyRate =
      perPersonRate > 0 && payingGuests > 0
        ? Math.max(basePrice, perPersonRate * payingGuests)
        : basePrice;

    let dailyTotal = 0;
    let matchingOffer = null;
    let sameOffer = true;
    let usingOffer = false;

    // Seasonal rates win over the legacy single specialPrice offer
    const resolveFlexible = buildFlexiblePriceResolver(userData?.data, nights);

    for (let i = 0; i < nights; i++) {
      const currentCheckDate = new Date(startDateOnly);
      currentCheckDate.setDate(startDateOnly.getDate() + i);

      const found = resolveFlexible(currentCheckDate) || offers.find((o) => {
        const offerStart = getLocalDate(o.start);
        const offerEnd = getLocalDate(o.end);
        return currentCheckDate >= offerStart && currentCheckDate < offerEnd;
      });

      if (found) {
        dailyTotal += Number(found.price);
        usingOffer = true;

        if (!matchingOffer) {
          matchingOffer = found;
        } else if (matchingOffer.name !== found.name) {
          sameOffer = false;
        }
      } else {
        // Standard night → use effective rate
        dailyTotal += effectiveNightlyRate;
        sameOffer = false;
      }
    }

    // Pet fee on top
    const petFeePerNight = Number(userData.data?.petFeePerNight) || 0;
    const petFeeTotal =
      petFeePerNight > 0 && nights > 0
        ? Number((petFeePerNight * nights).toFixed(2))
        : 0;

    const calculatedTotal = Number((dailyTotal + petFeeTotal).toFixed(2));

    let displayPricePerNight = 0;
    let finalOfferMatched = null;

    if (usingOffer && sameOffer && matchingOffer) {
      displayPricePerNight = matchingOffer.price;
      finalOfferMatched = matchingOffer;
    } else {
      displayPricePerNight =
        nights > 0
          ? Number((dailyTotal / nights).toFixed(2))
          : effectiveNightlyRate;
      finalOfferMatched = null;
    }

    if (
      userData.total !== calculatedTotal ||
      userData.pricePerNight !== displayPricePerNight ||
      userData.petFeeTotal !== petFeeTotal
    ) {
      const updated = {
        ...userData,
        offerMatched: finalOfferMatched,
        pricePerNight: displayPricePerNight,
        petFeePerNight,
        petFeeTotal,
        total: calculatedTotal,
      };
      setUserData(updated);
      localStorage.setItem("userData", JSON.stringify(updated));
    }
  }, [
    userData?.checkInDate,
    userData?.checkOutDate,
    userData?.nights,
    userData?.guests,
    userData?.data,
  ]);

  const image = userData?.data?.images?.[0];
  const propertyType =
    userData?.data?.propertyType?.[language] ||
    userData?.data?.propertyType?.["sk"] ||
    "N/A";
  const city = userData?.data?.locationDetails?.city;
  const country = userData?.data?.locationDetails?.country;
  const rentalform =
    userData?.data?.rentalform?.[language] ||
    userData?.data?.rentalform?.["sk"] ||
    "N/A";
  const beds = userData?.data?.beds;
  const bathroom = userData?.data?.bathroom;
  const total = userData?.total;
  // Coerced to real numbers. `nightMin` defaulted to "", and `nights < ""`
  // coerces the empty string to 0 — so a minimum-stay check could never fire.
  const nightMaxs = Number(userData?.data?.nightMax) || 15;
  const nightMins = Math.max(1, Number(userData?.data?.nightMin) || 1);
  const person = userData?.data?.person || "";
  const excludedDates = userData?.data?.excludedDates;
  const occupancyCalendar = userData?.data?.occupancyCalendar;
  const reviews = userData?.data?.reviews || "";
  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;

  const averageRating = userData?.data?.averageRating || 0;
  const safeAverage = typeof averageRating === "number" ? averageRating : 0.0;

  const renderSidebar = () => {
    // Pricing logic is handled in useEffect now, refreshing userData
    const offerMatched = userData?.offerMatched;
    const offerName = offerMatched?.name || null;
    const offerPrice = offerMatched?.price ?? null;

    // Use values from userData (calculated in useEffect)
    const pricePerNight = userData?.pricePerNight || 0;
    const totalPrice = Number(userData?.total) || 0;

    // Mirror the listing page breakdown: nightly rate x nights, pet fee kept
    // on its own line, so the rows add up to the total charged
    const nights = userData?.nights || 0;
    const petFeePerNight = Number(userData?.petFeePerNight) || 0;
    const petFeeTotal = Number(userData?.petFeeTotal) || 0;
    const accommodationSubtotal = Number(
      (totalPrice - petFeeTotal).toFixed(2)
    );
    const nightlyRate =
      Number(offerPrice) > 0
        ? Number(offerPrice)
        : Number(pricePerNight) || 0;
    const nightsLabel = nights === 1 ? t.night : t.nights;

    return (
      <div className="flex flex-col w-full bg-transparent lg:bg-white lg:rounded-2xl border-0 lg:border lg:border-neutral-200/80 lg:shadow-xs space-y-6 lg:p-7 xl:p-8 font-inter antialiased lg:sticky lg:top-28">
        {/* Success Banner */}
        <div className="relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-200/20 rounded-full blur-xl pointer-events-none" />
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 z-10">
            <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-emerald-700 z-10">
            {t.GoodnewsThisaccommodationisavailable}
          </p>
        </div>

        {/* Property Card */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-2xl border border-neutral-100 bg-neutral-50/70">
          <div className="flex-shrink-0 w-full h-40 sm:w-24 sm:h-24 overflow-hidden rounded-xl border border-neutral-200/60">
            <img
              src={image}
              alt="Room Image"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <span className="block text-[10px] text-[#319a7a] font-bold uppercase tracking-widest line-clamp-1">
              {propertyType} {rentalform} · {city}, {country}
            </span>
            <span className="block mt-1 text-base font-bold text-neutral-900 leading-snug">
              {propertyName}
            </span>
            <div className="mt-1.5 text-sm text-neutral-500 font-medium">
              {beds} {t.beds} · {bathroom} {t.baths}
            </div>
            <div className="mt-2 w-10 h-[3px] bg-[#319a7a] rounded-full"></div>
          </div>
        </div>

        {/* Price Detail */}
        <div className="flex flex-col space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#1e4636] font-fraunces">
              {t.Pricedetail}
            </h3>
            <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mt-1.5" />
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-white p-4 sm:p-5 space-y-3.5 shadow-3xs">
            <div className="flex justify-between gap-4 text-sm text-neutral-600">
              <span>
                €{nightlyRate} × {nights} {nightsLabel}
              </span>
              <span className="font-semibold text-neutral-800 whitespace-nowrap">
                €{accommodationSubtotal}
              </span>
            </div>

            {offerMatched && offerName && (
              <div className="text-xs italic text-[#319a7a] font-medium">
                {t[offerName] || offerName}
              </div>
            )}

            {!offerMatched &&
              nightlyRate > 0 &&
              Math.abs(nightlyRate * nights - accommodationSubtotal) > 0.1 && (
                <div className="text-xs text-neutral-400">
                  (Check listing for daily price breakdown)
                </div>
              )}

            {petFeeTotal > 0 && (
              <div className="flex justify-between gap-4 text-sm text-neutral-600">
                <span>
                  {t.PetFee} · €{petFeePerNight} × {nights} {nightsLabel}
                </span>
                <span className="font-semibold text-neutral-800 whitespace-nowrap">
                  €{petFeeTotal}
                </span>
              </div>
            )}

            <div className="flex justify-between gap-4 text-sm text-neutral-600">
              <span>{t.Servicecharge}</span>
              <span className="font-semibold text-neutral-800 whitespace-nowrap">€0</span>
            </div>

            <div className="border-b border-neutral-100"></div>

            <div className="flex justify-between gap-4 items-baseline">
              <span className="text-base font-bold text-neutral-900">{t.Total}</span>
              <span className="text-xl font-extrabold text-[#1e4636] whitespace-nowrap">
                €{totalPrice}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMain = () => {
    return (
      <div className="flex flex-col w-full bg-transparent sm:bg-white sm:rounded-2xl border-0 sm:border sm:border-neutral-200/80 sm:shadow-xs sm:p-6 xl:p-8 font-inter antialiased space-y-7">
        {/* PAGE TITLE */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1e4636] font-fraunces leading-tight">
            {t.confirmAndPayment}
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full" />
        </div>

        {/* YOUR TRIP */}
        <div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#1e4636] font-fraunces mb-4">
            {t.yourTrip}
          </h3>
          <div className="z-10 flex flex-col overflow-hidden border divide-y border-neutral-200 rounded-2xl bg-white shadow-3xs sm:flex-row sm:divide-x sm:divide-y-0 divide-neutral-200">
            <ModalMobileSelectionDate
              renderChildren={({ openModal }) => (
                <>
                  <button
                    onClick={openModal}
                    className="flex items-center justify-between flex-1 p-4 sm:p-5 gap-4 text-left hover:bg-neutral-50/70 transition-colors"
                    type="button"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t.date}</span>
                      <span className="mt-1 text-base sm:text-lg font-bold text-neutral-900 truncate">
                        {converSelectedDateToString(
                          [startDate, endDate],
                          language,
                        )}
                      </span>
                    </div>
                    <span className="w-8 h-8 rounded-lg bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
                      <PencilSquareIcon className="w-4 h-4" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openModal}
                    className="flex items-center justify-between flex-1 p-4 sm:p-5 gap-4 text-left hover:bg-neutral-50/70 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t.guests}</span>
                      <span className="mt-1 text-base sm:text-lg font-bold text-neutral-900">
                        <span className="line-clamp-1">
                          {`${
                            (guests.guestAdults || 0) +
                            (guests.guestChildren || 0)
                          } ${t.Guests}, ${guests.guestInfants || 0} ${t.Infants}`}
                        </span>
                      </span>
                    </div>
                    <span className="w-8 h-8 rounded-lg bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
                      <PencilSquareIcon className="w-4 h-4" />
                    </span>
                  </button>
                </>
              )}
              guestValues={{
                adults: guests.guestAdults,
                children: guests.guestChildren,
                infants: guests.guestInfants,
              }}
              onGuestsChange={(nextGuests) => setGuests({
                guestAdults: nextGuests.adults,
                guestChildren: nextGuests.children,
                guestInfants: nextGuests.infants,
              })}
              capacity={person}
              checkoutMode
            />
          </div>
        </div>

        {/* CONTACT DETAILS */}
        <div className="pt-2 border-t border-neutral-100">
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[#1e4636] font-fraunces mt-6 mb-4">
            {t.Contactdetails}
          </h3>
          <Tab.Group>
            <Tab.Panels>
              <Tab.Panel className="space-y-5">
                <div className="space-y-1.5">
                  <Label required>{t.name}</Label>
                  <Input
                    name="name"
                    value={reservation.name}
                    onChange={handleInputChange}
                    placeholder={`${t.enterYourName}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label required>{t.email}</Label>
                  <Input
                    name="email"
                    value={reservation.email}
                    onChange={handleInputChange}
                    placeholder={`${t.input_placeholder}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label required>{t.phoneNumber}</Label>
                  <div className="border border-neutral-300 rounded-lg shadow-sm focus-within:border-[#319a7a] focus-within:ring-1 focus-within:ring-[#319a7a]/30 transition-all">
                    <PhoneInput
                      country={"sk"}
                      value={reservation.phone}
                      onChange={handlePhoneChange}
                      containerClass="!border-0"
                      inputProps={{
                        name: "phone",
                        required: true,
                      }}
                      inputClass="w-full  text-sm  px-12 rounded-lg !border-0"
                      buttonClass="mr-2"
                      dropdownClass="border border-gray-300 rounded-lg shadow-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{t.messageForAuthor}</Label>
                  <Textarea
                    name="message"
                    value={reservation.message}
                    onChange={handleInputChange}
                    placeholder={`${t.Writeyourmessagehere}`}
                  />
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>

        {/* SUBMIT */}
        <div className="pt-4">
          <ButtonPrimary
            className="w-full bg-[#357965] hover:bg-[#1e4636] transition-colors"
            onClick={handleCreateReservationAndCheckout}
            disabled={isSubmitting}
          >
            {/* In request mode nothing is charged, so "Proceed to payment"
                would be a straight lie — the next screen is a confirmation
                that the request was sent, not Stripe. */}
            {isSubmitting
              ? t.Processing
              : isRequestMode
              ? t.SendBookingRequest
              : t.ProceedToPayment}
          </ButtonPrimary>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
        style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <MenuBar />
      </div>
      <div className="hidden lg:block">
        <Header />
      </div>
      <div
        className={`nc-CheckOutPagePageMain relative lg:pt-24 ${className}`}
        data-nc-id="CheckOutPagePageMain"
      >
        <main className="container flex flex-col-reverse mt-6 mb-24 lg:mb-32 lg:flex-row">
          <div className="w-full lg:w-[60%] xl:w-[55%]">{renderMain()}</div>
          <div className="flex-shrink-0 lg:w-[40%] xl:w-[45%] lg:pl-8">
            {renderSidebar()}
          </div>
        </main>
      </div>
      <Footer />
      <div className="lg:hidden">
        <FooterNav />
      </div>
    </div>
  );
};

export default Page;