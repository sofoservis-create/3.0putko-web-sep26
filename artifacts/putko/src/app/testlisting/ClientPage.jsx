"use client";

import React, { Fragment, useEffect, useState, useContext, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/zoom";
import { Dialog, Transition } from "@headlessui/react";
import Avatar from "../Shared/Avatar";
import Badge from "../Shared/Badge";
import ButtonPrimary from "../Shared/ButtonPrimary";
import ButtonSecondary from "../Shared/ButtonSecondary";
import '../listings/styless.css'
import LikeSaveBtns from "../listings/component/LikeSaveBtns";
import { usePathname, useRouter, useSearchParams } from "@/app/components/NextNavigation";
import StayDatesRangeInput from "../listings/StayDatesRangeInput";
import GuestsInput from "../listings/GuestsInput";
import { FormContext } from "../FormContext";
import { toast } from "react-toastify";
import { format } from "date-fns";
import en from "../locales/en";
import sk from "../locales/sk";
import Head from "@/app/components/NextHead";
import ReactMarkdown from "react-markdown";
import StayCardFeatured from "../components/GridFeaturePlaces/StayCardFeatured";
import Section1Skeleton from "../listings/component/Section1Skeleton";
import { buildFlexiblePriceResolver } from "../utlis/flexiblePricing";
import ModalMobileSelectionDate from "../Checkout/component/ModalMobileSelectionDate";
import {
  Wifi,
  Tv,
  Flame,
  Table,
  SatelliteDish,
  ShowerHead,
  Heater,
  Thermometer,
  Coffee,
  Utensils,
  Bath,
  Umbrella,
  Building,
  DollarSign,
  Wind,
  WashingMachine,
  Refrigerator,
  FireExtinguisher,
  DoorOpen,
  ConciergeBell,
  Handshake,
  Star,
  ParkingCircle,
  Snowflake,
  BriefcaseMedical,
  Building2,
  Table2,
  Microwave,
  UtensilsCrossed,
  UtensilsCrossedIcon,
  CalendarDays,
  Waves,
  ChevronLeft,
  ChevronDown,
  User,
  Users,
  MapPin,
  X,
  Rotate3d,
  LayoutGrid,
  Layers,
  Footprints,
  GlassWater,
  Cigarette,
  Calendar,
  Clock,
  MessageCircle,
  ShieldCheck,
  Info,
  LogIn,
  LogOut,
  Check,
} from "lucide-react";


//dynamic import
import dynamic from "@/app/components/NextDynamic";
import { blockingEntries } from "../utlis/availability";
const CommentListing = dynamic(() => import("../listings/component/CommentListing"), { ssr: false });
const SectionDateRange = dynamic(() => import("./SectionDateRange"), { ssr: false });

const optimizeListingImage = (url, width) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url || "";
  }

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto:good,c_limit,w_${width}/`,
  );
};

function ClientPage({ accommodation, userAccommodations, similarAccommodations, host, reviewsRating, secondaryLoading = false, similarError = false }) {
  // State for modal visibility
  const { isFullscreenModalOpen, setIsFullscreenModalOpen } = useContext(FormContext);
  const [isOpenModalAmenities, setIsOpenModalAmenities] = useState(false);
  const [isOpenModalDetails, setIsOpenModalDetails] = useState(false);
  const [accommodationData, setAccommodationData] = useState(accommodation);
  // The refund tiers a booking on this listing would actually be bound by,
  // read from the same source the booking snapshot is taken from.
  const [bindingPolicy, setBindingPolicy] = useState(null);
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });
  const [total, setTotal] = useState(0);
  // Set initial values if not already set
  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(1);
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(0);
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(0);
  const [visibleReviews, setVisibleReviews] = useState(4); // Number of reviews to initially show

  const [mobileGuestValues, setMobileGuestValues] = useState({
    adults: 1, children: 0, infants: 0
  });

  const handleMobileGuestsChange = useCallback((v) => {
    setMobileGuestValues(v);
    setGuestAdultsInputValue(v.adults);
    setGuestChildrenInputValue(v.children);
    setGuestInfantsInputValue(v.infants);
    if (typeof window !== "undefined") {
      localStorage.setItem("guestValues", JSON.stringify(v));
      localStorage.setItem("guestAdults", String(v.adults || 0));
      localStorage.setItem("guestChildren", String(v.children || 0));
      localStorage.setItem("guestInfants", String(v.infants || 0));
      window.dispatchEvent(
        new CustomEvent("putko:guest-values", {
          detail: { values: v, source: "listing-summary" },
        }),
      );
    }
  }, []);
  const thisPathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [failedGalleryImages, setFailedGalleryImages] = useState([]);

  useEffect(() => {
    const storedAdults = parseInt(localStorage.getItem("guestAdults"), 10) || 1;
    const storedChildren = parseInt(localStorage.getItem("guestChildren"), 10) || 0;
    const storedInfants = parseInt(localStorage.getItem("guestInfants"), 10) || 0;

    setGuestAdultsInputValue(storedAdults);
    setGuestChildrenInputValue(storedChildren);
    setGuestInfantsInputValue(storedInfants);

    setMobileGuestValues({
      adults: storedAdults,
      children: storedChildren,
      infants: storedInfants
    });
  }, []);

  useEffect(() => {
    const syncGuestValues = (event) => {
      if (event.detail?.source !== "sticky-footer") return;
      const values = event.detail?.values;
      if (!values) return;
      setMobileGuestValues(values);
      setGuestAdultsInputValue(values.adults);
      setGuestChildrenInputValue(values.children);
      setGuestInfantsInputValue(values.infants);
    };

    window.addEventListener("putko:guest-values", syncGuestValues);
    return () =>
      window.removeEventListener("putko:guest-values", syncGuestValues);
  }, []);

  // The refund tiers this listing would actually bind a guest to. Fetched from
  // the server rather than derived here, so the guest cannot be shown terms
  // that differ from the ones snapshotted onto their booking at payment time.
  useEffect(() => {
    const listingId = accommodationData?._id;
    if (!listingId) return;

    let cancelled = false;

    fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/cancellation/policy/${listingId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.tiers) setBindingPolicy(data);
      })
      .catch(() => {
        // Non-fatal: the free-text description still renders.
      });

    return () => {
      cancelled = true;
    };
  }, [accommodationData?._id]);

  useEffect(() => {
    if (window.location.hash === "#reviews") {
      const el = document.getElementById("reviews");

      if (el) {
        el.scrollIntoView(); // no smooth → feels instant
      }
    }
  }, [accommodationData]); // 👈 VERY IMPORTANT

  // Handle "View more reviews" button click
  const handleViewMore = () => {
    setVisibleReviews(reviewCount); // Show all reviews
  };

  const userId = accommodationData?.userId?._id;
  const aboutYou = userAccommodations?.aboutYou || "";

  // A guest can only book once the listing is PUBLISHED — its host's Stripe
  // account is verified — AND Putko holds the billing details it needs to
  // invoice its fee. Otherwise there is either nowhere to send the money, or a
  // fee that can never be invoiced.
  //
  // `bookable` is that whole decision, made server-side in
  // AccommodationController's withHostBookingReady, from the listing's own
  // status (DRAFT / PENDING / PUBLISHED) and its Stripe switch. It replaces the
  // ENFORCE_* rollout flags this used to read: there is no global switch any
  // more, each listing goes live when its own host finishes onboarding.
  //
  // Always a real boolean, so this fails CLOSED — anything other than an
  // explicit `true` blocks the button. That matters: the check this replaced
  // read `userId.onboardingComplete !== false`, and that field is absent (not
  // false) on almost every host record, so it passed every listing on the
  // platform.
  const canReserve = accommodationData?.bookable === true;

  // "Request to book" — the host has no usable payout account yet, so this
  // listing takes a request instead of a payment. The guest sends dates, party
  // size and an email; nothing is charged and the dates are not held. The
  // server decides this (utils/requestToBook.js) and sends it down as
  // `bookingMode`, so the button never has to re-derive the rule.
  const isRequestMode = accommodationData?.bookingMode === "request";
  // Either flow makes the button live. Only a listing whose own Stripe switch
  // is off stays disabled.
  const canSubmit = canReserve || isRequestMode;

  // Assuming `useraccommodationData` is an array of accommodations
  const accommodationCount = userAccommodations?.length || 0;

  const nightMin = accommodationData?.nightMin || 1; // Default to 1 night
  const [computedPricePerNight, setComputedPricePerNight] = useState(accommodationData?.priceMonThus || 0);
  const [pricePerNight, setpricePerNight] = useState(0);

  // const pricePerNight = accommodationData?.priceMonThus || 0; // Single nightly price

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Set the time to midnight to avoid time zone issues
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate - startDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // console.log("Accommodation Data:", accommodationData);
  if (accommodationData) {
    localStorage.setItem("accommodation", JSON.stringify(accommodationData));
  }

  const virtualTourUrl = accommodationData?.virtualTourUrl || "";
  const Images = accommodationData?.images || [];
  const imageCount = Images.length;

  const [isVirtualTourOpen, setIsVirtualTourOpen] = useState(false);
  const [view, setView] = useState("360");
  const openVirtualTour = () => setIsVirtualTourOpen(true);
  const closeVirtualTour = () => setIsVirtualTourOpen(false);

  const { Rating, images, updateimages, updatepricenight, updateid, ida, updateDatas, commentleght,
    overallRating, updatedate, updatendate, enddate, startdate, updatestartdate,
    date } = useContext(FormContext);


  const idas = accommodationData?._id || ""
  const slug = accommodationData?.slug || ""
  useEffect(() => {
    const nights = calculateDays(startdate || "", enddate || "") || nightMin;
    const nightTotal = nights * computedPricePerNight;
    setTotal(nightTotal);
    updatepricenight(computedPricePerNight)
    updateid(idas)
    updateDatas(accommodationData)
  }, [selectedRange, computedPricePerNight, nightMin]);

  useEffect(() => {
    const nights = calculateDays(startdate || "", enddate || "") || nightMin;
    const nightTotal = nights * computedPricePerNight;
    setTotal(nightTotal);
  }, [nightMin, startdate, enddate]);


  function closeModalAmenities() {
    setIsOpenModalAmenities(false);
  }

  function openModalAmenities() {
    setIsOpenModalAmenities(true);
  }

  function closeModalDetails() {
    setIsOpenModalDetails(false);
  }

  function openModalDetails() {
    setIsOpenModalDetails(true);
  }

  const handleOpenModalImageGallery = useCallback(() => {
    updateimages(Images);
    router.push(`${thisPathname}?modal=PHOTO_TOUR_SCROLLABLE`);
  }, [Images, updateimages, router, thisPathname]);

  const translations = { en, sk };
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  // Facebook ViewContent Tracking
  useEffect(() => {
    if (accommodationData) {
      const propertyId = accommodationData._id;
      const propertyName = accommodationData.name || "";
      const city = accommodationData.locationDetails?.city || "";
      const price = computedPricePerNight || accommodationData.pricePerNight || 0;

      // 1. Meta Pixel - ViewContent (Browser)
      if (window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_name: propertyName,
          content_ids: [propertyId],
          content_type: 'product',
          value: price,
          currency: 'EUR',
          content_category: city
        });
      }

      // 2. Meta CAPI - ViewContent (Backend)
      const userPayload = {
          email: localStorage.getItem("userEmail") || "",
          phone: localStorage.getItem("userPhone") || "",
          fbp: document.cookie.split('; ').find(row => row.startsWith('_fbp='))?.split('=')[1],
          fbc: document.cookie.split('; ').find(row => row.startsWith('_fbc='))?.split('=')[1],
      };

      fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/facebook-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              eventName: 'ViewContent',
              eventData: {
                  contentId: propertyId,
                  contentName: propertyName,
                  city: city,
                  value: price,
                  currency: 'EUR'
              },
              userPayload
          })
      }).catch(err => console.error("Error sending ViewContent CAPI:", err));
    }
  }, [accommodationData]);

  const t = translations[language];

  const name = accommodationData?.name || "";

  // Helper to Title-Case city/country/street for display
  const toTitleCase = (value) => {
    if (typeof value !== "string") return "";
    return value
      .split(" ")
      .map((segment) =>
        segment
          .split("-")
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
          .join("-")
      )
      .join(" ");
  };


  const [currentOffer, setCurrentOffer] = useState(null);
  const [computedTotal, setComputedTotal] = useState(0);


  useEffect(() => {
    if (startdate && enddate) {
      let total = 0;
      let currentDate = new Date(startdate);
      const endDateObj = new Date(enddate);
      let allInSameOffer = true;
      let commonOffer = null;

      const offers = [
        ...(accommodationData?.specialPrice ? [accommodationData.specialPrice] : []),

      ];

      // Seasonal rates are tier-priced by the total length of the stay, so the
      // resolver is built once per date selection and takes precedence over
      // the legacy single specialPrice offer.
      const totalNights = calculateDays(startdate, enddate);
      const resolveFlexible = buildFlexiblePriceResolver(accommodationData, totalNights);

      let hasAnyFlexibleDay = false;
      const pricePerNightVal = Number(accommodationData?.pricePerNight) || 0;

      while (currentDate < endDateObj) {
        const checkDate = new Date(currentDate);
        // Reset time to avoid mismatch issues
        checkDate.setHours(0, 0, 0, 0);

        const offer = resolveFlexible(checkDate) || offers.find(o => {
          const offerStart = new Date(o.start);
          const offerEnd = new Date(o.end);
          offerStart.setHours(0, 0, 0, 0);
          offerEnd.setHours(0, 0, 0, 0);
          return checkDate >= offerStart && checkDate < offerEnd;
        });

        if (offer) {
          total += Number(offer.price);
          hasAnyFlexibleDay = true;

          if (!commonOffer) {
            commonOffer = offer;
          } else if (commonOffer.name !== offer.name) {
            allInSameOffer = false;
          }
        } else {
          total += pricePerNightVal;
          allInSameOffer = false;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const nights = calculateDays(startdate, enddate);
      setComputedTotal(total);

      if (hasAnyFlexibleDay && allInSameOffer && commonOffer) {
        setComputedPricePerNight(Number(commonOffer.price));
        setpricePerNight(Number(commonOffer.price));
        setCurrentOffer(commonOffer);
      } else if (!hasAnyFlexibleDay && nights > 0) {
        setComputedPricePerNight(pricePerNightVal);
        setpricePerNight(pricePerNightVal);
        setCurrentOffer(null);
      } else {
        const avgPrice = nights > 0 ? Number((total / nights).toFixed(2)) : 0;
        setComputedPricePerNight(avgPrice);
        setpricePerNight(avgPrice);
        setCurrentOffer(null);
      }
    } else {
      // Default state when dates are not selected
      const pricePerNightVal = Number(accommodationData?.pricePerNight) || 0;
      setComputedPricePerNight(pricePerNightVal);
      setpricePerNight(pricePerNightVal);
      setComputedTotal(0);
      setCurrentOffer(null);
    }
  }, [startdate, enddate, accommodationData]);

  const renderSection1 = () => {
    const name = accommodationData?.name || "";
    const propertyType = accommodationData?.propertyType ? accommodationData.propertyType[language] : "";
    const city = accommodationData?.locationDetails?.city || "";
    const description = accommodationData?.description;
    const country = accommodationData?.locationDetails?.country || "";
    const person = accommodationData?.person || "";
    const bath = accommodationData?.bathroom || 0;
    const bedroom = accommodationData?.bedroom || 0;
    const WCs = accommodationData?.WCs || 0;
    const kitchen = accommodationData?.kitchen || 0;
    const SocialRoom = accommodationData?.SocialRoom || 0;
    const id = accommodationData?.userId || "";
    const bathroom = accommodationData?.bathoom || 0;
    const totalbath = bath + bathroom;
    const userName = host?.name || "Host";
    const photo = host?.photo;
    const isVerified = host?.isVerified;

    const computedHostId = id && typeof id === "object" ? id._id : id;

    const formatCountry = (country) => {
      if (!country) return language === "sk" ? "Slovensko" : "Slovakia";
      const normalized = country.trim().toLowerCase();
      if (normalized === "slovakia" || normalized === "slovak republic") {
        return language === "sk" ? "Slovensko" : "Slovakia";
      }
      return country;
    };

    const reviews = Array.isArray(reviewsRating?.data) ? reviewsRating.data : [];
    const reviewCount = reviews.length;
    const overallAverage = reviewCount > 0 ? (reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviewCount) : 0;
    const displayedAverage = overallAverage || Number(accommodationData?.averageRating) || 0;

    const renderMobileRating = () => {
      if (secondaryLoading) {
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 border border-neutral-100/50 rounded-md lg:hidden animate-pulse">
            <div className="w-3.5 h-3.5 bg-neutral-200 rounded-sm"></div>
            <div className="w-6 h-3 bg-neutral-200 rounded-sm"></div>
          </div>
        );
      }
      if (reviewCount === 0) {
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 rounded-md lg:hidden text-xs font-medium text-neutral-500">
            <Star size={14} className="text-neutral-300" />
            <span>{t.Noreviewyet || "No reviews"}</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50/50 border border-yellow-100/50 rounded-md lg:hidden">
          <Star size={14} className="text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-bold text-neutral-800">{overallAverage.toFixed(1)}</span>
          <span className="text-xs text-neutral-500">({reviewCount})</span>
        </div>
      );
    };

    return (
      /* Frameless on mobile, premium structured card for tablet/desktop (sm and up) */
      <div className="w-full bg-transparent sm:bg-white rounded-2xl border-0 sm:border border-neutral-200/80 sm:shadow-xs p-0 sm:p-6 md:p-8 font-inter antialiased">

        {/* 1. Meta Category & Action Trigger Utility Row */}
        <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 bg-[#1e4636]/10 text-[#1e4636] text-xs font-bold uppercase tracking-wider rounded-md">
              {propertyType || "Ubytovanie"}
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-200">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                Overený
              </span>
            )}
          </div>

          <div className="shrink-0 transition-transform active:scale-95">
            <LikeSaveBtns data={idas} slug={slug} />
          </div>
        </div>

        {/* 2. Main Title Header & Geo Context */}
        <div className="space-y-2.5 pb-4 sm:pb-5">
          <div className="flex justify-between items-start gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1e4636] font-fraunces leading-tight">
              {name}
            </h1>
            <div className="lg:hidden shrink-0 mt-1.5">
               {renderMobileRating()}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-600 text-sm font-medium">
            <MapPin size={15} className="text-[#319a7a] shrink-0" />
            <span>
              {accommodationData?.locationDetails?.district ? `${toTitleCase(accommodationData.locationDetails.district)}, ` : ""}
              {toTitleCase(city)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="text-neutral-700 text-sm font-medium">
              {person} {t.guests || "hostia"} &middot; {bedroom} {t.bedrooms || "spálne"} &middot; {accommodationData?.beds || 0} postele &middot; {totalbath} {t.Bathroom || "kúpeľne"}
            </div>
            {displayedAverage > 0 && (
              <div className="hidden lg:inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-neutral-800" aria-label={`Hodnotenie ${displayedAverage.toFixed(1)} z 5`}>
                <Star size={16} className="fill-yellow-500 text-yellow-500" aria-hidden="true" />
                <span>{displayedAverage.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Highlights Row */}
        {(() => {
          const highlights = [];
          if (isVerified) highlights.push({ icon: ShieldCheck, label: "Overený hostiteľ" });
          if (overallAverage >= 4.8 && reviewCount >= 5) highlights.push({ icon: Star, label: "Vysoko hodnotené" });
          
          const responseTime = host?.responseTime;
          if (responseTime === "under_hour" || responseTime === "within_few_hours") highlights.push({ icon: Clock, label: "Rýchla odpoveď" });
          
          const responseRate = host?.responseRate;
          if (responseRate === 100) highlights.push({ icon: MessageCircle, label: "100 % miera odpovede" });
          
          const getAmenityMatch = () => {
            const amens = accommodationData?.amenities?.sk || [];
            if (amens.includes("Klimatizácia")) return { icon: Snowflake, label: "Klimatizácia" };
            if (amens.includes("Práčka")) return { icon: WashingMachine, label: "Práčka" };
            if (amens.includes("Parkovanie")) return { icon: ParkingCircle, label: "Parkovanie" };
            if (amens.includes("Wi-Fi")) return { icon: Wifi, label: "Wi-Fi" };
            return null;
          };
          
          const amenityMatch = getAmenityMatch();
          if (amenityMatch) highlights.push(amenityMatch);
          
          const selectedHighlights = highlights.slice(0, 3);
          if (selectedHighlights.length === 0) return null;
          
          return (
            <div className="flex items-center gap-4 py-4 sm:py-5 border-t border-b border-neutral-100 overflow-x-auto no-scrollbar">
              {selectedHighlights.map((hl, i) => {
                const Icon = hl.icon;
                return (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <Icon size={20} className="text-[#319a7a]" strokeWidth={2} />
                    <span className="text-sm font-semibold text-neutral-800">{hl.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
        {/* 4. Host Trust Profile Footer Card */}
          {secondaryLoading ? (
            <div className="hidden lg:flex items-center gap-3 pt-4" aria-label="Loading host information">
              <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-200" />
              <div className="space-y-2"><div className="h-2 w-16 animate-pulse rounded bg-neutral-200" /><div className="h-3 w-28 animate-pulse rounded bg-neutral-200" /></div>
            </div>
          ) : <div className="hidden lg:flex pt-4 items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <a href={`/host-detail/${computedHostId}`} className="relative block shrink-0 group">
              <Avatar
                hasChecked={false}
                id={computedHostId}
                userName={userName}
                imgUrl={photo}
                isVerified={isVerified}
                sizeClass="h-9 w-9 ring-2 ring-neutral-100 sm:group-hover:ring-[#319a7a]/30 transition-all"
                radius="rounded-full"
              />
            </a>
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">{t.hostedBy || "Hostiteľ"}</span>
              <a href={`/host-detail/${computedHostId}`} className="text-xs sm:text-sm font-bold text-neutral-900 hover:text-[#319a7a] transition-colors">
                {userName}
              </a>
            </div>
          </div>

          <a
            href={`/host-detail/${computedHostId}`}
            className="text-xs font-bold text-[#1e4636] bg-white sm:bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Kontaktovať
          </a>
        </div>}

      </div>
    );
  };

  const renderSection2 = () => {
    const description = accommodationData?.description || "Accommodation discription";
    const bed = accommodationData?.beds || 0;
    const singlebed = accommodationData?.singlebed || 0;
    const doublebed = accommodationData?.doublebed || 0;
    const bedroom = accommodationData?.bedroom || 0;
    const WCs = accommodationData?.WCs || 0;
    const kitchen = accommodationData?.kitchen || 0;
    const LivingRoom = accommodationData?.LivingRoom || 0;
    const commonRoom = accommodationData?.CommonRoom || 0;
    const SocialRoom = accommodationData?.SocialRoom || 0;
    const Price = accommodationData?.specialPrice?.price;
    const StartDateRaw = accommodationData?.specialPrice?.start;
    const EndDateRaw = accommodationData?.specialPrice?.end;
    const name = accommodationData?.name;

    const formatDate = (isoString) => {
      if (!isoString) return null;
      return format(new Date(isoString), 'dd.MM.yy');
    };

    const StartDate = formatDate(StartDateRaw);
    const EndDate = formatDate(EndDateRaw);

    const [isDescExpanded, setIsDescExpanded] = useState(false);

    return (
      <div className="w-full bg-transparent sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8 font-inter antialiased space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.Stayinformation || "Informácie o pobyte"}
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        {Price > 0 && StartDate && EndDate && (
          <div className="relative overflow-hidden w-full bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 hover:shadow-2xs">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-emerald-200/20 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2.5 z-10">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  {t.SpecialOffers}
                </span>
                <span className="text-sm font-bold text-[#1e4636]">
                  {name && name.trim() ? name : t.SpecialOffers}
                </span>
              </div>
            </div>
            <div className="bg-white border border-emerald-100 rounded-lg px-3 py-1.5 shadow-3xs flex items-center justify-between sm:justify-start gap-4 z-10">
              <div className="flex flex-col text-left">
                <span className="text-[11px] text-neutral-400 font-semibold uppercase">{t.Termin || "Termín"}</span>
                <span className="text-xs font-bold text-neutral-700">{StartDate} — {EndDate}</span>
              </div>
              <div className="h-6 w-[1px] bg-neutral-200" />
              <div className="text-right">
                <span className="text-sm font-extrabold text-[#1e4636]">€{Price}</span>
                <span className="text-xs text-neutral-500 font-medium"> / {t.night || "noc"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="prose prose-neutral max-w-none text-neutral-600 font-normal leading-relaxed text-sm sm:text-base">
          <div className={!isDescExpanded ? "line-clamp-4" : ""}>
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p {...props} className="whitespace-pre-line text-neutral-600 text-justify mb-4 last:mb-0" />,
                strong: ({ node, ...props }) => <strong {...props} className="font-bold text-[#1e4636]" />,
                em: ({ node, ...props }) => <em {...props} className="italic text-neutral-500" />,
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
          <button
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="text-[#319a7a] font-semibold text-sm underline underline-offset-2 hover:text-[#1e4636] transition-colors mt-2 focus:outline-none"
          >
            {isDescExpanded ? "Zobraziť menej" : "Zobraziť viac"}
          </button>
        </div>

        <div className="pt-6 border-t border-neutral-100 space-y-4">
          <h3 className="text-lg font-bold text-neutral-900">Rozloženie postelí a izieb</h3>
          <div className="flex flex-wrap gap-2">
            {bedroom > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{bedroom}x Spálňa</span>}
            {doublebed > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{doublebed}x Manželská posteľ</span>}
            {singlebed > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{singlebed}x Jednolôžková posteľ</span>}
            {bed > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{bed}x Prístelka</span>}
            {kitchen > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{kitchen}x Kuchyňa</span>}
            {LivingRoom > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{LivingRoom}x Obývačka</span>}
            {SocialRoom > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{SocialRoom}x Spoločenská miestnosť</span>}
            {commonRoom > 0 && <span className="inline-flex items-center text-sm font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-lg">{commonRoom}x Spoločná miestnosť</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderSection3 = () => {
    const extractAmenities = (amenitiesObj) => {
      return (amenitiesObj?.[language] || [])
        .filter((item) => typeof item === "string" && item.trim() !== "")
        .filter((item) => {
          const normalized = item.trim().toLowerCase();
          return !["none", "ziadne", "žiadne"].includes(normalized);
        });
    };

    const categories = {
      "Kúpeľňa": extractAmenities(accommodationData?.bathroomAmenities),
      "Kuchyňa a jedáleň": [...extractAmenities(accommodationData?.kitchenDiningAmenities), ...extractAmenities(accommodationData?.meals)],
      "Kúrenie a chladenie": extractAmenities(accommodationData?.heatingCoolingAmenities),
      "Parkovanie": extractAmenities(accommodationData?.parkingFacilities),
      "Vonkajšie priestory": extractAmenities(accommodationData?.outdoorAmenities),
      "Ostatné": [
        ...extractAmenities(accommodationData?.safetyAmenities),
        ...extractAmenities(accommodationData?.wellnessAmenities),
        ...extractAmenities(accommodationData?.checkIn),
      ],
      "Internet a pracovňa": extractAmenities(accommodationData?.services)
    };

    const amenityIcons = {
      "wifi": Wifi,
      "tv": Tv,
      "televízia": Tv,
      "umývačka riadu": SatelliteDish,
      "počítačový stôl": Table,
      "pc stôl(pracovný priestor)": Table,
      "vaňa": Bath,
      "sprcha": ShowerHead,
      "klimatizácia": Snowflake,
      "práčka": WashingMachine,
      "sušička": WashingMachine,
      "jedálenský stôl": Utensils,
      "chladnička": Refrigerator,
      "kávovar": Coffee,
      "vnútorný krb": Flame,
      "krb": Flame,
      "gril": Flame,
      "ústredné kúrenie": Thermometer,
      "bezplatné parkovanie v areáli": ParkingCircle,
      "parkovanie": ParkingCircle,
      "výťah": Building,
      "balkón/terasa": Umbrella
    };

    const getIconForAmenity = (name) => {
      const normalized = name.toLowerCase().trim();
      for (const [key, Icon] of Object.entries(amenityIcons)) {
        if (normalized.includes(key)) return Icon;
      }
      return Check; // fallback, wait we don't have Check imported. Let's use Info or Star. Let's use Sparkles if available, or just a small dot.
    };

    // Priority amenities for collapsed view and not-have list
    const priorityList = ["Wi-Fi", "Parkovanie", "Klimatizácia", "Kuchyňa", "Práčka", "Umývačka riadu", "Balkón/terasa", "Výťah"];

    // Flatten all amenities to find what we have
    const allAmenitiesMap = new Map();
    Object.entries(categories).forEach(([cat, items]) => {
      items.forEach(item => {
        allAmenitiesMap.set(item.trim().toLowerCase(), { name: item, category: cat });
      });
    });
    const allAmenities = Array.from(allAmenitiesMap.values());

    // 8 highest-value amenities first
    const collapsedAmenities = [];
    const missingAmenities = [];
    
    priorityList.forEach(priority => {
      const pNorm = priority.toLowerCase();
      const found = allAmenities.find(a => a.name.toLowerCase().includes(pNorm));
      if (found) {
        collapsedAmenities.push(found.name);
      } else {
        missingAmenities.push(priority);
      }
    });

    // Fill the rest up to 8 if needed
    for (const a of allAmenities) {
      if (collapsedAmenities.length >= 8) break;
      if (!collapsedAmenities.includes(a.name)) {
        collapsedAmenities.push(a.name);
      }
    }

    const { isFullscreenModalOpen, setIsFullscreenModalOpen } = useContext(FormContext);
  const [isOpenModalAmenities, setIsOpenModalAmenities] = useState(false);
  useEffect(() => {
    if (setIsFullscreenModalOpen) setIsFullscreenModalOpen(isOpenModalAmenities || isOpenModalDetails || isVirtualTourOpen);
  }, [isOpenModalAmenities, isOpenModalDetails, isVirtualTourOpen, setIsFullscreenModalOpen]);
    function openModalAmenities() { setIsOpenModalAmenities(true); }
    function closeModalAmenities() { setIsOpenModalAmenities(false); }

    const renderItem = (name, isMissing = false) => {
      let Icon = getIconForAmenity(name);
      if (Icon === undefined) Icon = Info;
      return (
        <div key={name} className={`flex items-center gap-3 ${isMissing ? 'opacity-40 line-through' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
            <Icon size={18} strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold text-neutral-800">{name}</span>
        </div>
      );
    };

    return (
      <div className="w-full bg-transparent sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8 font-inter antialiased space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            Vybavenie
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4">
          {collapsedAmenities.map(name => renderItem(name))}
        </div>

        {allAmenities.length > 8 && (
          <div className="pt-2">
            <button
              onClick={openModalAmenities}
              className="text-[#319a7a] font-semibold text-sm underline underline-offset-2 hover:text-[#1e4636] transition-colors focus:outline-none"
            >
              Zobraziť všetkých {allAmenities.length} vybavení
            </button>
          </div>
        )}

        <Transition appear show={isOpenModalAmenities} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={closeModalAmenities}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all font-inter">
                    <div className="flex justify-between items-center mb-6">
                      <Dialog.Title as="h3" className="text-2xl font-bold text-[#1e4636] font-fraunces">
                        Čo toto ubytovanie ponúka
                      </Dialog.Title>
                      <button
                        onClick={closeModalAmenities}
                        className="p-2 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-full transition-colors focus:outline-none"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-8 no-scrollbar">
                      {["Kúpeľňa", "Kuchyňa a jedáleň", "Kúrenie a chladenie", "Internet a pracovňa", "Parkovanie", "Vonkajšie priestory", "Ostatné"].map(cat => {
                        const items = categories[cat] || [];
                        if (items.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-4">
                            <h4 className="text-lg font-bold text-neutral-900">{cat}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4">
                              {items.map(item => renderItem(item))}
                            </div>
                          </div>
                        );
                      })}

                      {missingAmenities.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-neutral-200">
                          <h4 className="text-lg font-bold text-neutral-900">Nie je k dispozícii</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4">
                            {missingAmenities.map(item => renderItem(item, true))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    );
  };

  const renderMergedAvailabilityAndPrice = () => {
    const {
      pricePerNight,
      pricePerPerson,
      flexiblePrices = [],
    } = accommodationData || {};

    const formatDate = (date) => {
      if (!date) return "";
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    const formatTierLabel = (tier) => {
      const min = Number(tier?.minNights) || 1;
      const hasMax =
        tier?.maxNights !== null &&
        tier?.maxNights !== undefined &&
        tier?.maxNights !== "";

      if (!hasMax) {
        return min === 1 ? `1+ ${t.nights || "noc"}` : `${min}+ ${t.nights || "nocí"}`;
      }
      const max = Number(tier.maxNights);
      if (min === max) return `${min} ${t.nights || "nocí"}`;
      return `${min}–${max} ${t.nights || "nocí"}`;
    };

    const validFlexiblePrices = (Array.isArray(flexiblePrices) ? flexiblePrices : [])
      .filter((period) => {
        if (!period?.start || !period?.end) return false;
        const tiers = Array.isArray(period.tiers) ? period.tiers : [];
        return tiers.some((t) => Number(t?.price) > 0);
      });

    const nights = startdate && enddate ? calculateDays(startdate, enddate) : 0;

    return (
      <div className="w-full bg-transparent sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8 font-inter antialiased space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            Dostupnosť a cena
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        <div className="block -mx-4 sm:mx-0 px-4 sm:px-0">
          <SectionDateRange data={accommodationData} />
        </div>

        <div className="p-4 sm:p-6 bg-neutral-50/70 border border-neutral-100 rounded-2xl">
          {nights > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between text-neutral-600 text-sm sm:text-base">
                <span>€{computedPricePerNight} × {nights} {nights === 1 ? "noc" : "noci"}</span>
                <span>€{computedTotal}</span>
              </div>
              <div className="flex justify-between text-neutral-600 text-sm sm:text-base">
                <span>Poplatky Putko</span>
                <span>€0</span>
              </div>
              <div className="pt-3 mt-3 border-t border-neutral-200 flex justify-between font-bold text-neutral-900 text-base sm:text-lg">
                <span>Spolu</span>
                <span>€{computedTotal}</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="block text-xl font-bold text-neutral-900 mb-1">
                €{pricePerNight} <span className="text-sm font-normal text-neutral-500">/ {t.night || "noc"}</span>
              </span>
              <span className="text-sm text-neutral-500">Vyberte dátumy a uvidíte celkovú cenu</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {pricePerPerson > 0 && (
            <div className="flex items-center justify-between gap-4 p-4 sm:p-5 border border-neutral-100 rounded-2xl bg-white shadow-3xs">
              <span className="text-sm sm:text-base font-bold text-neutral-800">
                Cena za osobu
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-extrabold text-[#1e4636]">
                  €{pricePerPerson}
                </span>
                <span className="text-xs text-neutral-400 font-medium">
                  / osoba
                </span>
              </div>
            </div>
          )}
          
          {validFlexiblePrices.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CalendarDays size={16} strokeWidth={2.2} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#1e4636]">
                  Sezónne ceny
                </h3>
              </div>
              
              <div className="space-y-4">
                {validFlexiblePrices.map((period, idx) => {
                  const tiers = (Array.isArray(period.tiers) ? period.tiers : [])
                    .filter((t) => Number(t?.price) > 0)
                    .sort((a, b) => (Number(a.minNights) || 1) - (Number(b.minNights) || 1));
                  
                  return (
                    <div key={idx} className="overflow-hidden rounded-2xl border border-neutral-200/60 shadow-3xs">
                      <div className="bg-neutral-50/50 px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          {period.name || `Sezóna ${idx + 1}`}
                        </span>
                        <div className="flex-1" />
                        <span className="text-xs font-semibold text-neutral-700 bg-white px-2 py-1 rounded-md border border-neutral-200">
                          {formatDate(period.start)} — {formatDate(period.end)}
                        </span>
                      </div>
                      
                      <div className="divide-y divide-neutral-100">
                        {tiers.map((tier, tIdx) => (
                          <div key={tIdx} className="flex justify-between items-center p-4 bg-white">
                            <span className="text-sm font-medium text-neutral-700">
                              {formatTierLabel(tier)}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-[#1e4636]">
                                €{tier.price}
                              </span>
                              <span className="text-xs text-neutral-400 font-medium">/ {t.night || "noc"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  const renderSection5 = () => {
    if (secondaryLoading) {
      return <div className="w-full space-y-4 sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8" aria-label="Loading host information">
        <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 p-4"><div className="h-16 w-16 animate-pulse rounded-full bg-neutral-200" /><div className="space-y-2"><div className="h-3 w-20 animate-pulse rounded bg-neutral-200" /><div className="h-5 w-36 animate-pulse rounded bg-neutral-200" /></div></div>
      </div>;
    }
    const id = accommodationData?.userId || ""
    const averageRating = accommodationData?.averageRating || '';
    const reviews = accommodationData?.reviews || '';
    const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
    const safeAverage = typeof averageRating === "number" ? averageRating : 0.0;
    const userName = host?.name;
    const photo = host?.photo;
    const isVerified = host?.isVerified;
    const formattedDate = host?.createdAt
      ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(host.createdAt)
      )
      : "Unknown";

    return (
      /* Base Container Architecture: matches premium section design */
      <div className="w-full bg-transparent sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8 font-inter antialiased space-y-4 sm:space-y-6">

        {/* SECTION HEADER */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.HostInformation}
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mt-2" />
        </div>

        {/* HOST PROFILE CARD */}
        <div className="flex items-center gap-4 p-4 sm:p-5 bg-neutral-50/70 border border-neutral-100 rounded-2xl">
          <a href={`/host-detail/${userId}`} className="shrink-0 group">
            <Avatar
              hasChecked
              hasCheckedClass="w-4 h-4 -top-0.5 right-0.5"
              sizeClass="h-16 w-16 ring-2 ring-white shadow-sm sm:group-hover:ring-[#319a7a]/30 transition-all"
              id={id._id}
              userName={userName}
              imgUrl={photo}
              isVerified={isVerified}
              radius="rounded-full"
            />
          </a>
          <div className="min-w-0">
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
              {t.hostedBy || "Hostiteľ"}
            </span>
            <a
              href={`/host-detail/${userId}`}
              className="block text-lg sm:text-xl font-bold text-neutral-900 hover:text-[#319a7a] transition-colors leading-tight truncate"
            >
              {userName}
            </a>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e4636] bg-[#319a7a]/10 px-3 py-1.5 rounded-md">
              <Building size={13} className="text-[#319a7a]" />
              <span>{accommodationCount} {accommodationCount === 1 ? `${t.place}` : `${t.places}`}</span>
            </div>
          </div>
        </div>

        {/* HOST DESCRIPTION */}
        {aboutYou && (
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed whitespace-pre-line">
            {aboutYou}
          </p>
        )}

        {/* HOST TRUST/INFO ROWS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="flex items-center gap-3 p-3.5 bg-white border border-neutral-200/60 rounded-xl shadow-3xs">
            <div className="w-9 h-9 rounded-lg bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
              <Calendar size={18} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">{t.Joinedin}</span>
              {/* Third card of the same three-up row — wraps like the other
                  two so the row behaves consistently. */}
              <span className="text-sm font-bold text-neutral-800 leading-snug break-words">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-white border border-neutral-200/60 rounded-xl shadow-3xs">
            <div className="w-9 h-9 rounded-lg bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
              <MessageCircle size={18} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Odozva</span>
              {/* Wraps like its sibling card below, so the pair behave alike
                  instead of one truncating and one wrapping. */}
              <span className="text-sm font-bold text-neutral-800 leading-snug break-words">{t.Responserate100}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-white border border-neutral-200/60 rounded-xl shadow-3xs">
            <div className="w-9 h-9 rounded-lg bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
              <Clock size={18} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Rýchlosť</span>
              {/* "Rýchla odpoveď - do niekoľkých hodín" was being cut to
                  "Rýchla odpoveď - do", which reads as an unfinished sentence.
                  It wraps freely now so the whole phrase is always shown. */}
              <span className="text-sm font-bold text-neutral-800 leading-snug break-words">{t.Fastresponsewithinafewhours}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <ButtonSecondary href={`/host-detail/${userId}`}>{t.Seehostprofile}</ButtonSecondary>
        </div>
      </div>
    );
  };

  const renderSection6 = () => {
    const reviews = accommodationData?.reviews || '';
    const reviewCount = Array.isArray(reviews) ? reviews.length : 0;

    return (
      <div id="reviews" className="w-full bg-transparent sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8 font-inter antialiased space-y-4 sm:space-y-6">

        {/* SECTION HEADER */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
              {t.Reviews}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e4636] bg-[#319a7a]/10 px-3 py-1.5 rounded-md">
              <Star size={13} className="text-[#319a7a] fill-[#319a7a]" />
              {reviewCount}
            </span>
          </div>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mt-2" />
        </div>

        <div className="divide-y divide-neutral-100">
          {/* ✅ Only fetch and display reviews */}
          {secondaryLoading ? <div className="space-y-3 py-5" aria-label="Loading reviews"><div className="h-4 w-full animate-pulse rounded bg-neutral-200" /><div className="h-4 w-4/5 animate-pulse rounded bg-neutral-200" /></div> : <CommentListing className="py-8" reviewsRating={reviewsRating} />}
        </div>
      </div>
    );
  };



  const renderSection7 = () => {
    const defaultLocation = language === "sk" ? "Bratislava, Slovensko" : "Bratislava, Slovakia";
    const city = accommodationData?.locationDetails?.city;
    const district = accommodationData?.locationDetails?.district;
    
    const displayLocation = [district, city].filter(Boolean).map(toTitleCase).join(", ") || defaultLocation;
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    // Use Maps Javascript API approach to draw a circle for approximate location, or we can use a static map with a circle.
    // Actually, drawing a circle requires a bit of code if we use the API, but since we are just using iframe embed:
    // iframe embed doesn't support circles easily. We can just zoom out and drop a pin on the city center or district center, not the street.
    const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey || ""}&q=${encodeURIComponent(displayLocation)}&zoom=13`;

    return (
      <div className="w-full bg-transparent sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8 font-inter antialiased space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            Miesto
          </h2>
          <div className="flex items-center gap-1.5 text-neutral-600 text-xs sm:text-sm font-medium">
            <MapPin size={15} className="text-[#319a7a] shrink-0" />
            <span>{displayLocation}</span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">Presná adresa bude poskytnutá po potvrdení rezervácie.</div>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        <div className="relative z-0 aspect-square overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-100 shadow-3xs sm:aspect-[5/3]">
          {googleMapsApiKey ? (
            <>
              {!mapLoaded && <div className="skeleton rounded-2xl" />}
              <iframe
                title={`Miesto: ${displayLocation}`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc}
                onLoad={() => setMapLoaded(true)}
                className={`absolute inset-0 h-full w-full fade-in ${mapLoaded ? "loaded" : ""}`}
              />
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-neutral-500">
              <MapPin className="h-8 w-8 text-[#319a7a]" aria-hidden="true" />
              <p className="text-sm font-medium">
                Mapa vyžaduje Google Maps API kľúč, ktorý nie je momentálne nakonfigurovaný v prostredí.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMergedRulesAndInfo = () => {
    function formatTime(timeString) {
      if (!timeString) return "Invalid time";
      const today = new Date().toISOString().split("T")[0];
      const fullDateTime = timeString.includes("T") ? timeString : `${today}T${timeString}`;
      const date = new Date(fullDateTime);
      return isNaN(date.getTime())
        ? "Invalid time"
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const arrivalFrom = accommodationData.arrivalFrom;
    const arrivalTo = accommodationData.arrivalTo;
    const departureFrom = accommodationData.departureFrom;
    const departureTo = accommodationData.departureTo;
    const specialNote = accommodationData.specialNote;
    const cancellationPolicy = accommodationData.cancellationPolicy;

    const getLocalizedText = (data) => data?.[language] || "";
    const pet = getLocalizedText(accommodationData?.pet);
    const partyOrganizing = getLocalizedText(accommodationData?.partyOrganizing);
    const smoking = getLocalizedText(accommodationData?.smoking);
    const petFeePerNight = accommodationData?.petFeePerNight;
    const petValue = pet && petFeePerNight > 0 ? `${pet} — €${petFeePerNight}/${t.night || "noc"}` : pet;

    const rules = [
      { icon: Footprints, label: t.Pets || "Domáce zvieratá", value: petValue },
      { icon: GlassWater, label: t.PartyOrganizing || "Večierky/podujatia", value: partyOrganizing },
      { icon: Cigarette, label: t.Smoking || "Fajčenie", value: smoking },
    ];

    const extraRulesRaw = accommodationData?.tags ?? [];
    const extraRules = (Array.isArray(extraRulesRaw) ? extraRulesRaw : [extraRulesRaw])
      .map((r) => (typeof r === "string" ? r.trim() : getLocalizedText(r)))
      .filter(Boolean);

    const POLICY_LABEL_KEYS = {
      flexible: "PolicyFlexible",
      standard: "PolicyStandard",
      strict: "PolicyStrict",
      custom: "PolicyCustom",
    };
    const policyName = bindingPolicy?.policy
      ? t[POLICY_LABEL_KEYS[bindingPolicy.policy]] || bindingPolicy.policy.charAt(0).toUpperCase() + bindingPolicy.policy.slice(1)
      : null;

    // Check-in and check-out logic
    const checkInTime = arrivalFrom === arrivalTo ? formatTime(arrivalFrom) : `${formatTime(arrivalFrom)} – ${formatTime(arrivalTo)}`;
    const checkOutTime = departureFrom === departureTo ? formatTime(departureFrom) : `${formatTime(departureFrom)} – ${formatTime(departureTo)}`;

    return (
      <div className="w-full bg-transparent sm:bg-white sm:rounded-2xl border-t sm:border border-neutral-200/80 sm:shadow-xs pt-4 sm:p-6 md:p-8 font-inter antialiased space-y-6 sm:space-y-8">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            Veci, ktoré by ste mali vedieť
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mt-2" />
        </div>

        {/* 1. Čas prihlásenia / Čas odhlásenia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-neutral-50/70 p-4 rounded-xl border border-neutral-100">
            <div className="w-10 h-10 rounded-xl bg-[#319a7a]/10 text-[#319a7a] flex items-center justify-center shrink-0">
              <LogIn size={20} strokeWidth={2.5} />
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                {t.Checkin || "Check-in"}
              </span>
              <span className="text-sm sm:text-base font-semibold text-neutral-900">
                {checkInTime}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-neutral-50/70 p-4 rounded-xl border border-neutral-100">
            <div className="w-10 h-10 rounded-xl bg-[#319a7a]/10 text-[#319a7a] flex items-center justify-center shrink-0">
              <LogOut size={20} strokeWidth={2.5} />
            </div>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                {t.Checkout || "Check-out"}
              </span>
              <span className="text-sm sm:text-base font-semibold text-neutral-900">
                {checkOutTime}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Pravidlá domu */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-neutral-900">Pravidlá domu</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rules.map(({ icon: Icon, label, value }, index) => (
              <div key={index} className="flex flex-col gap-3 p-4 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-100 rounded-2xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-bold text-neutral-800">{label}</span>
                </div>
                <span className="inline-flex items-center self-start text-xs sm:text-sm font-semibold text-[#1e4636] bg-white border border-neutral-200/70 px-3 py-1.5 rounded-lg shadow-3xs">
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          {extraRules.length > 0 && (
            <ul className="space-y-2 mt-3 pl-1">
              {extraRules.map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#319a7a] shrink-0" />
                  <span className="text-sm text-neutral-700 leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 3. Storno podmienky */}
        {(bindingPolicy || cancellationPolicy) && (
          <div className="space-y-3 border-t border-neutral-100 pt-6">
            <h3 className="text-lg font-bold text-neutral-900">Storno podmienky</h3>
            <div className="bg-neutral-50/70 border border-neutral-100 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-[#1e4636]">{t.Cancellationpolicy || "Storno podmienky"}</h4>
                {policyName && (
                  <span className="ml-auto shrink-0 rounded-lg border border-[#319a7a]/20 bg-[#319a7a]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#257562]">
                    {policyName}
                  </span>
                )}
              </div>

              {bindingPolicy?.tiers?.length > 0 && (
                <ul className="pl-12 space-y-1.5 mb-3">
                  {bindingPolicy.tiers.map((tier) => (
                    <li key={tier.hoursBefore} className="text-sm text-neutral-700 flex items-baseline gap-2">
                      <span className="font-semibold text-[#1e4636] tabular-nums shrink-0">{tier.refundPercent}%</span>
                      <span className="text-neutral-600">
                        {tier.hoursBefore === 0
                          ? "ak zrušíte neskôr"
                          : `ak zrušíte aspoň ${Math.round(tier.hoursBefore / 24)} dní pred príchodom`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {cancellationPolicy && (
                <div className="pl-12">
                  <p className="text-sm text-neutral-600 leading-relaxed">{cancellationPolicy}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Poznámky od hostiteľa */}
        {specialNote && (
          <div className="space-y-3 border-t border-neutral-100 pt-6">
            <h3 className="text-lg font-bold text-neutral-900">Poznámky od hostiteľa</h3>
            <div className="bg-amber-50/50 border border-amber-100/60 rounded-2xl p-4 sm:p-5 flex gap-3.5">
              <div className="mt-0.5 shrink-0 text-amber-500">
                <Info size={20} strokeWidth={2.5} />
              </div>
              <p className="text-sm sm:text-base text-neutral-700 leading-relaxed break-words">{specialNote}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSidebar = () => {
    // Coerced to real numbers. `nightMin` used to default to "", and `nights < ""`
    // coerces the empty string to 0 — so the minimum-stay check could never fire
    // even once it was written. `nightMax` defaulted to the string "15" for the
    // same reason it worked by accident: `>` coerces, `<` against "" does not.
    const nightMaxs = Number(accommodationData?.nightMax) || 15;
    const nightMins = Math.max(1, Number(accommodationData?.nightMin) || 1);
    const phoneNumber = accommodationData.phoneNumber || "";
    const person = accommodationData?.person || "";
    const averageRating = accommodationData?.averageRating || "";
    const reviews = accommodationData?.reviews || "";
    const pricePerPerson = accommodationData?.pricePerPerson || "";
    const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
    const safeAverage = typeof averageRating === "number" ? averageRating : 0.0;

    const toLocalDateOnly = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const offers = [
      ...(accommodationData?.specialPrice ? [accommodationData.specialPrice] : []),
    ];

    // Compute pricing info based on selected dates
    let offerMatched = false;
    let offerName = null;
    let offerPrice = null;
    let totalPrice = 0;

    // Default base price
    const pricePerNightVal = Number(accommodationData?.pricePerNight) || 0;

    // pricePerPerson logic: floor is pricePerNight
    // effectiveNightly = max(pricePerNight, payingGuests * pricePerPerson)
    const payingGuests =
      (Number(guestAdultsInputValue) || 0) +
      (Number(guestChildrenInputValue) || 0);
    const perPersonRate = Number(pricePerPerson) || 0;
    const effectiveNightlyRate =
      perPersonRate > 0 && payingGuests > 0
        ? Math.max(pricePerNightVal, perPersonRate * payingGuests)
        : pricePerNightVal;

    const startDateOnly = toLocalDateOnly(startdate);
    const endDateOnly = toLocalDateOnly(enddate);
    const nights = calculateDays(startdate || "", enddate || "");

    // Pet fee is charged for every night of the stay when the host set one
    const petFeePerNightVal = Number(accommodationData?.petFeePerNight) || 0;
    const petFeeTotal =
      startdate && enddate && nights > 0 && petFeePerNightVal > 0
        ? Number((petFeePerNightVal * nights).toFixed(2))
        : 0;

    if (startdate && enddate && nights > 0) {
      // Create independent date object for iteration
      let checkDate = new Date(startDateOnly);
      const endDateCheck = new Date(endDateOnly);
      // Loop loop condition should check DATE < CHECKOUT_DATE (nights logic)

      let matchedOffer = null;
      let sameOffer = true;
      let dailyTotal = 0;
      let usingOffer = false; // Track if we found ANY offer during the stay

      const resolveFlexible = buildFlexiblePriceResolver(accommodationData, nights);

      // Iterate through nights
      for (let i = 0; i < nights; i++) {
        const currentCheckDate = new Date(checkDate);
        currentCheckDate.setDate(checkDate.getDate() + i);

        const found = resolveFlexible(currentCheckDate) || offers.find((o) => {
          const offerStart = toLocalDateOnly(o.start);
          const offerEnd = toLocalDateOnly(o.end);
          return currentCheckDate >= offerStart && currentCheckDate <= offerEnd;
        });

        if (found) {
          dailyTotal += Number(found.price);
          usingOffer = true;

          if (!matchedOffer) {
            matchedOffer = found;
          } else if (matchedOffer.name !== found.name) {
            sameOffer = false;
          }
        } else {
          // Standard night → use effective rate (max of pricePerNight and guests × pricePerPerson)
          dailyTotal += effectiveNightlyRate;
          sameOffer = false;
        }
      }

      totalPrice = dailyTotal;

      // If we used offers and they were all the same one
      if (usingOffer && sameOffer && matchedOffer) {
        offerMatched = true;
        offerName = matchedOffer.name;
        offerPrice = matchedOffer.price;
      } else {
        if (!usingOffer) {
          offerPrice = effectiveNightlyRate;
        } else {
          offerPrice = (totalPrice / nights).toFixed(2);
        }
      }
    }

    // Pet fee on top
    if (petFeeTotal > 0) {
      totalPrice = Number((totalPrice + petFeeTotal).toFixed(2));
    }

    const nightlyRate =
      Number(offerPrice) > 0 ? Number(offerPrice) : effectiveNightlyRate;
    const accommodationSubtotal = Number((totalPrice - petFeeTotal).toFixed(2));
    const nightsLabel = nights === 1 ? t.night : t.nights;

    const handleDateChange = (dates) => {
      const [start, end] = dates;
      setSelectedRange({ startdate: start, enddate: end });

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
    };

    const handleGuestChange = (value, key) => {
      if (key === "guestAdults") {
        setGuestAdultsInputValue(value);
        localStorage.setItem("guestAdults", value);
      } else if (key === "guestChildren") {
        setGuestChildrenInputValue(value);
        localStorage.setItem("guestChildren", value);
      } else if (key === "guestInfants") {
        setGuestInfantsInputValue(value);
        localStorage.setItem("guestInfants", value);
      }
    };

    const handleReserve = () => {
      if (!startdate || !enddate) {
        console.error("Please select valid check-in and check-out dates.");
        toast.error(`${t.Pleaseselectvalidcheckinandcheckoutdates}.`);
        return;
      }

      const excludedDates = Array.isArray(accommodationData?.excludedDates)
        ? accommodationData.excludedDates
        : [];
      // Checkout holds do not block the guest here either — the server makes
      // the final availability decision when the payment session is created.
      const occupancyCalendar = blockingEntries(accommodationData?.occupancyCalendar);

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
        toast.error(t.PleaseselectdifferentdatesSomedatesareunavailable);
        return;
      }

      // Minimum stay. The listing's `nightMin` was read but never enforced, so a
      // host requiring 3 nights would still take a 1-night booking.
      if (nights < nightMins) {
        toast.error(
          `${t.Theminimumnumberofnightsallowedis} ${nightMins}. ${t.Pleaseadjustyourdates}.`
        );
        return;
      }

      if (nights > nightMaxs) {
        toast.error(
          `${t.Themaximumnumberofnightsallowedis} ${nightMaxs}. ${t.Pleaseadjustyourdates}.`
        );
        return;
      }

      const totalGuests =
        guestAdultsInputValue +
        guestChildrenInputValue +
        guestInfantsInputValue;

      if (totalGuests > person) {
        toast.error(`${t.MaxGuestsReached} ${person}.`);
        return;
      }

      const getLocalDate = (d) => {
        const date = new Date(d);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      };

      const offers = [
        ...(accommodationData?.specialPrice
          ? [accommodationData.specialPrice]
          : []),
      ];
      const startDateOnly = getLocalDate(startdate);
      const days = calculateDays(startdate || "", enddate || "");

      let dailyTotal = 0;
      let matchingOffer = null;
      let sameOffer = true;
      let usingOffer = false;
      const pricePerNightVal = Number(accommodationData?.pricePerNight) || 0;

      // Same pricePerPerson floor logic for reserve
      const reservePayingGuests =
        (Number(guestAdultsInputValue) || 0) +
        (Number(guestChildrenInputValue) || 0);
      const reservePerPersonRate =
        Number(accommodationData?.pricePerPerson) || 0;
      const reserveEffectiveNightly =
        reservePerPersonRate > 0 && reservePayingGuests > 0
          ? Math.max(
              pricePerNightVal,
              reservePerPersonRate * reservePayingGuests
            )
          : pricePerNightVal;

      const resolveFlexible = buildFlexiblePriceResolver(accommodationData, days);

      for (let i = 0; i < days; i++) {
        const currentCheckDate = new Date(startDateOnly);
        currentCheckDate.setDate(startDateOnly.getDate() + i);

        const found = resolveFlexible(currentCheckDate) || offers.find((o) => {
          const offerStart = getLocalDate(o.start);
          const offerEnd = getLocalDate(o.end);
          return (
            currentCheckDate >= offerStart && currentCheckDate <= offerEnd
          );
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
          dailyTotal += reserveEffectiveNightly;
          sameOffer = false;
        }
      }

      const reservePetFeePerNight =
        Number(accommodationData?.petFeePerNight) || 0;
      const reservePetFeeTotal =
        days > 0 && reservePetFeePerNight > 0
          ? Number((reservePetFeePerNight * days).toFixed(2))
          : 0;

      const calculatedTotalPrice = Number(
        (dailyTotal + reservePetFeeTotal).toFixed(2)
      );
      let finalOfferPrice = 0;

      if (usingOffer && sameOffer && matchingOffer) {
        finalOfferPrice = matchingOffer.price;
        if (nights < (matchingOffer.Minnumberofnights || 0)) {
          toast.error(
            `${t.Thisofferrequiresaminimumstayof} ${matchingOffer.Minnumberofnights} ${t.nights}.`
          );
          return;
        }
        const totalGuestsCheck =
          guestAdultsInputValue +
          guestChildrenInputValue +
          guestInfantsInputValue;
        if (totalGuestsCheck < (matchingOffer.Minnumberofpersons || 0)) {
          toast.error(
            `${t.Thisofferrequiresaminimumof} ${matchingOffer.Minnumberofpersons} ${t.guests}.`
          );
          return;
        }
      } else {
        finalOfferPrice =
          days > 0
            ? (dailyTotal / days).toFixed(2)
            : reserveEffectiveNightly;
      }

      if (accommodationData?.Minnumberofpersons) {
        const totalGuestsCheck =
          guestAdultsInputValue +
          guestChildrenInputValue +
          guestInfantsInputValue;
        if (totalGuestsCheck < accommodationData.Minnumberofpersons) {
          toast.error(
            `${t.Aminimumof} ${accommodationData.Minnumberofpersons} ${t.guestsisrequired}.`
          );
          return;
        }
      }

      try {
        localStorage.setItem(
          "userData",
          JSON.stringify({
            checkInDate: startdate.toLocaleDateString("en-US"),
            checkOutDate: enddate.toLocaleDateString("en-US"),
            guests: {
              adults: guestAdultsInputValue,
              children: guestChildrenInputValue,
              infants: guestInfantsInputValue,
            },
            listingId: accommodationData?._id,
            data: accommodationData,
            nights,
            pricePerNight: finalOfferPrice,
            petFeePerNight: reservePetFeePerNight,
            petFeeTotal: reservePetFeeTotal,
            total: calculatedTotalPrice,
          })
        );

        sessionStorage.setItem("fromValidFlow", "true");
        router.push("/Checkout");
      } catch (error) {
        console.error("Reservation failed. Please try again.", error);
      }
    };

    return (
      <div className="w-full bg-white rounded-3xl border border-neutral-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 sm:p-6 font-inter antialiased space-y-5">

        {/* PRICE & VERIFIED BADGE */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            {totalPrice > 0 ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#1e4636] tracking-tight">
                    €{totalPrice}
                  </span>
                  {nights > 0 && (
                    <span className="text-sm font-medium text-neutral-400">
                      / {nights} {t.nights}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowPricePopup(true)}
                  className="mt-0.5 inline-flex min-h-11 self-start items-center text-sm font-bold text-[#319a7a] transition-colors hover:text-[#1e4636] hover:underline"
                >
                  {t.Viewdetails || "View details"}
                </button>
              </>
            ) : (
              <span className="text-2xl font-bold text-[#1e4636]">
                {nights} {t.night}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shrink-0">
            <ShieldCheck
              size={13}
              strokeWidth={2.5}
              className="text-emerald-600"
            />
            {t.putkoVerified}
          </span>
        </div>

        {offerMatched && offerName && (
          <div className="-mt-2 inline-flex items-center text-xs font-semibold text-[#1e4636] bg-[#319a7a]/10 px-3 py-1.5 rounded-md">
            {t[offerName] || offerName}
          </div>
        )}

        {/* FORM */}
        <form className="flex flex-col border border-neutral-200 rounded-3xl shadow-3xs">
          <StayDatesRangeInput
            className="flex-1 z-[11]"
            onDateChange={handleDateChange}
            data={accommodationData}
          />
          <div className="w-full border-b border-neutral-200"></div>
          <GuestsInput
            className="flex-1"
            person={person}
            guestAdultsInputValue={guestAdultsInputValue}
            guestChildrenInputValue={guestChildrenInputValue}
            guestInfantsInputValue={guestInfantsInputValue}
            handleChangeData={handleGuestChange}
          />
        </form>

        {showPricePopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4"
            onClick={() => setShowPricePopup(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-neutral-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPricePopup(false)}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
                aria-label="Close"
              >
                ✕
              </button>

              <h3 className="text-lg font-bold text-[#1e4636] font-fraunces mb-4">
                {t.PriceDetails || "Price Details"}
              </h3>

              <div className="flex flex-col space-y-3.5 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <span>
                    €{nightlyRate} x {nights} {nightsLabel}
                    {offerMatched && offerName ? ` (${offerName})` : ""}
                  </span>
                  <span className="font-medium text-neutral-800 whitespace-nowrap">
                    €{accommodationSubtotal}
                  </span>
                </div>

                {petFeeTotal > 0 && (
                  <div className="flex justify-between gap-4">
                    <span>
                      {t.PetFee} · €{petFeePerNightVal} x {nights}{" "}
                      {nightsLabel}
                    </span>
                    <span className="font-medium text-neutral-800 whitespace-nowrap">
                      €{petFeeTotal}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4">
                  <span>{t.Servicecharge}</span>
                  <span className="font-medium text-neutral-800 whitespace-nowrap">
                    €0
                  </span>
                </div>

                <div className="border-b border-neutral-100"></div>

                <div className="flex justify-between gap-4 text-base font-bold text-[#1e4636]">
                  <span>{t.Total}</span>
                  <span className="whitespace-nowrap">€{totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT */}
        <ButtonPrimary
          className={`w-full bg-[#357965] hover:bg-[#1e4636] transition-colors ${
            !canSubmit ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!canSubmit}
          onClick={canSubmit ? handleReserve : undefined}
        >
          {/* Request mode is checked FIRST. A listing can be both bookable and
              on the request flow — that is the whole of the "published" mode,
              where an onboarded host vets the guest before any money moves —
              and testing `canReserve` first would label those "Reserve" and
              promise a payment that checkout does not take. */}
          {isRequestMode
            ? t.RequestToBook
            : canReserve
            ? t.Reserve
            : t.comingSoon || "Coming Soon"}
        </ButtonPrimary>
        {canSubmit && (
          <span className="block text-center text-xs text-neutral-400 font-medium">
            {isRequestMode ? t.RequestNoPaymentNote : t.Youwontbechargeyet}
          </span>
        )}
      </div>
    );
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const comparableListings = Array.isArray(similarAccommodations) ? similarAccommodations.slice(0, 4) : [];
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 350);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const renderContextualHeader = () => {
    if (!isScrolled || searchParams?.get("modal") === "PHOTO_TOUR_SCROLLABLE") return null;
    const revs = Array.isArray(reviewsRating?.data) ? reviewsRating.data : [];
    const avg = revs.length > 0
      ? revs.reduce((sum, r) => sum + (r.overallRating || 0), 0) / revs.length
      : Number(accommodationData?.averageRating) || 0;
    const c = accommodationData?.locationDetails?.city || "";
    return (
      <div className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-neutral-100 px-4 h-16 flex items-center justify-between transition-all duration-300 animate-slideDown lg:hidden">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            aria-label={language === "en" ? "Back to results" : "Späť na výsledky"}
            onClick={() => router.push("/listing-stay-map")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors focus:outline-none"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col max-w-[180px] sm:max-w-md overflow-hidden">
            <span className="text-sm font-bold text-[#1e4636] truncate">{accommodationData?.name || ""}</span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
              <Star size={12} className="text-yellow-500 fill-yellow-500" />
              <span>{avg.toFixed(1)}</span>
              <span className="truncate">· {c}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <LikeSaveBtns data={accommodationData?._id} slug={accommodationData?.slug} />
        </div>
      </div>
    );
  };
  return (
    <>
      {renderContextualHeader()}
      <Head>
        <title>{name ? `${name} – Putko` : "Detail ubytovania – Putko"}</title>
        <meta
          name="description"
          content={(accommodationData?.description || "Objavte toto overené ubytovanie na Putku.").slice(0, 160)}
        />
        <link rel="canonical" href={`https://putko.sk${thisPathname}`} />
        <meta property="og:title" content={name ? `${name} – Putko` : "Detail ubytovania – Putko"} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://putko.sk${thisPathname}`} />
        <link
          rel="preload"
          href="/fonts/e4af272ccee01ff0-s.p.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </Head>

      <div className="lg:pt-24 nc-ListingStayDetailPage">
        {/* HEADER */}
        <header className="relative rounded-md sm:rounded-xl">
          <button
            className="absolute z-20 flex items-center justify-center w-11 h-11 bg-white rounded-full shadow-md top-4 left-4 text-neutral-500 hover:bg-neutral-200 sm:hidden"
            type="button"
            aria-label={language === "en" ? "Back to results" : "Späť na výsledky"}
            onClick={() => router.push("/listing-stay-map")}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="relative grid h-[clamp(280px,82vw,420px)] grid-cols-3 grid-rows-3 gap-1 sm:h-[520px] sm:grid-cols-4 sm:grid-rows-2 sm:gap-2 lg:h-[560px]">

            {/* Main image */}
            <button
              type="button"
              aria-label={virtualTourUrl ? "Open virtual tour" : "Open photo gallery"}
              className="relative col-span-2 row-span-3 overflow-hidden rounded-md cursor-pointer sm:row-span-2 sm:rounded-xl"
              onClick={virtualTourUrl ? openVirtualTour : handleOpenModalImageGallery}
            >
              {failedGalleryImages.includes(0) ? <div className="flex h-full items-center justify-center bg-[#1e4636] text-center font-semibold text-white">Putko<br /><span className="text-xs font-normal">Fotografia nie je dostupná</span></div> : <img
                src={virtualTourUrl ? "/virtual_Tour.jpeg" : optimizeListingImage(Images[0], 1400)}
                alt={`${name} - ${accommodationData?.propertyType?.en || "accommodation"} in ${accommodationData?.locationDetails?.city || ""}`}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover rounded-md sm:rounded-xl fade-in"
                onLoad={(e) => e.currentTarget.classList.add("loaded")}
                onError={(e) => { e.currentTarget.classList.add("loaded"); setFailedGalleryImages((current) => [...new Set([...current, 0])]); }}
              />}
              {!failedGalleryImages.includes(0) && <div className="skeleton" />}
              <div className="absolute inset-0 transition-opacity opacity-0 bg-neutral-900 bg-opacity-20 hover:opacity-100" />
            </button>


            {/* Thumbnails */}
            {Images.slice(1, 5).map((item, index) => (
              <div
                key={index}
                className={`relative rounded-md sm:rounded-xl overflow-hidden ${index >= 3 ? "hidden sm:block" : ""}`}
              >
                <div className="relative h-full w-full">
                  {!failedGalleryImages.includes(index + 1) && <div className="skeleton absolute inset-0" />}
                    {failedGalleryImages.includes(index + 1) ? <div className="flex h-full items-center justify-center bg-[#1e4636] p-2 text-center text-xs font-semibold text-white">Putko<br />Fotografia nie je dostupná</div> : <img
                      src={optimizeListingImage(item, 700)}
                      alt={`${name} photo ${index + 2}`}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover rounded-md sm:rounded-xl fade-in"
                      onLoad={(e) => e.currentTarget.classList.add("loaded")}
                      onError={(e) => { e.currentTarget.classList.add("loaded"); setFailedGalleryImages((current) => [...new Set([...current, index + 1])]); }}
                    />}

                </div>
                <button
                  type="button"
                  aria-label={`Open photo ${index + 2} in gallery`}
                  className="absolute inset-0 transition-opacity opacity-0 cursor-pointer bg-neutral-900 bg-opacity-20 hover:opacity-100"
                  onClick={handleOpenModalImageGallery}
                />
              </div>
            ))}

            {/* Buttons */}
            <button
              className={`absolute hidden md:flex md:items-center md:justify-center right-4 bottom-4 px-4 min-h-[44px] rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 z-10 shadow-sm ${language === "sk" ? "w-40" : "w-52"}`}
              onClick={handleOpenModalImageGallery}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="ml-2 text-sm font-medium truncate text-neutral-800">
                {t.Showallphotos} +{imageCount}
              </span>
            </button>

            <button
              className="absolute flex md:hidden items-center justify-center left-4 bottom-4 px-4 min-h-[44px] rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 z-10 w-auto min-w-[120px] shadow-sm"
              onClick={handleOpenModalImageGallery}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="ml-2 text-sm font-medium text-neutral-800">{t.Show}</span>
            </button>

            {virtualTourUrl && (
              <button
                className={`absolute z-10 hidden px-4 min-h-[44px] md:flex md:items-center md:justify-center bottom-4 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 shadow-sm ${language === "sk" ? "w-44 left-4" : "w-36 left-4"}`}
                onClick={openVirtualTour}
              >
                <Rotate3d className="w-5 h-5" />
                <span className="ml-2 text-sm font-medium text-neutral-800">{t.Tour}</span>
              </button>
            )}
          </div>
        </header>

        {/* Virtual Tour Modal */}
        {isVirtualTourOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="relative w-11/12 bg-white rounded-lg shadow-lg sm:w-4/5 lg:w-3/4 xl:w-3/5 h-[85vh] fade-in loaded">
              <button
                className="absolute flex items-center justify-center w-11 h-11 text-gray-700 transform -translate-x-1/2 bg-gray-200 rounded-full hover:text-black top-4 left-1/2 sm:top-4 sm:right-4 shadow-sm"
                onClick={closeVirtualTour}
                title="Close"
              >
                <X size={24} />
              </button>
              <div className="w-full h-full">
                {virtualTourUrl ? (
                  <iframe
                    src={virtualTourUrl}
                    title="360° Virtual Tour"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 bg-gray-800">
                    <Rotate3d size={48} />
                    <span className="ml-4">{t.Virtualtournotavailable}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <main className="relative z-10 mt-6 flex flex-col px-4 sm:px-0 lg:mt-11 lg:flex-row">

          {/* CONTENT */}
          <div className="w-full space-y-8 lg:w-3/5 xl:w-2/3 lg:space-y-10 lg:pr-10">
            {!accommodationData ? <Section1Skeleton /> : <div className="fade-in loaded">{renderSection1()}</div>}
            {renderMergedAvailabilityAndPrice()}
            {renderSection2()}
            {renderSection3()}
            {renderSection6()}
            {renderSection7()}
            {renderSection5()}
            {renderMergedRulesAndInfo()}
          </div>

          {/* SIDEBAR */}
          <div className="flex-grow hidden lg:block mt-14 lg:mt-0">
            <div className="sticky top-28">{renderSidebar()}</div>
          </div>
        </main>
        <div className="w-full mt-12 lg:mt-16 pb-8 border-t border-neutral-100 pt-12">
          <h2 className="text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces mb-6">
            Podobné ubytovania v okolí
          </h2>
          <div className="w-full min-w-0 overflow-hidden">
            {secondaryLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Načítavajú sa podobné ubytovania">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="overflow-hidden rounded-[20px] border border-neutral-100 bg-white">
                    <div className="aspect-[3/2] animate-pulse bg-neutral-200" />
                    <div className="space-y-3 p-5">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-200" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : similarError ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-600" role="status">
                Podobné ubytovania sa momentálne nepodarilo načítať.
              </div>
            ) : comparableListings.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-600">
                Nenašli sa žiadne podobné ubytovania.
              </div>
            ) : (
              <>
              <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={16}
              slidesPerView={1.2}
              breakpoints={{
                640: { slidesPerView: 2.2, spaceBetween: 16 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                1024: { slidesPerView: 4, spaceBetween: 24 }
              }}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
            >
                {comparableListings.map((acc) => (
                  <SwiperSlide key={acc._id}>
                    <StayCardFeatured data={acc} />
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="swiper-button-prev !text-[#319a7a] !bg-white !w-10 !h-10 !rounded-full shadow-md after:!text-lg"></div>
              <div className="swiper-button-next !text-[#319a7a] !bg-white !w-10 !h-10 !rounded-full shadow-md after:!text-lg"></div>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  )
}

export default ClientPage