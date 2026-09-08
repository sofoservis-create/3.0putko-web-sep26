"use client";

import React, { Fragment, useEffect, useState, useContext, useCallback } from "react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/zoom";
import { Dialog, Transition } from "@headlessui/react";
import Avatar from "../../Shared/Avatar";
import Badge from "../../Shared/Badge";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import ButtonSecondary from "../../Shared/ButtonSecondary";
import '../styless.css'
import LikeSaveBtns from "../component/LikeSaveBtns";
import { usePathname, useRouter } from "next/navigation";
import StayDatesRangeInput from "../StayDatesRangeInput";
import GuestsInput from "../GuestsInput";
import { FormContext } from "../../FormContext";
import { toast } from "react-toastify";
import { format } from "date-fns";
import en from "../../locales/en";
import sk from "../../locales/sk";
import Head from "next/head";
import ReactMarkdown from "react-markdown";
import Section1Skeleton from "../component/Section1Skeleton";
import { buildFlexiblePriceResolver } from "../../utlis/flexiblePricing";
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
} from "lucide-react";


//dynamic import
import dynamic from "next/dynamic";
import { blockingEntries } from "../../utlis/availability";
const CommentListing = dynamic(() => import("../component/CommentListing"), { ssr: false });
const SectionDateRange = dynamic(() => import("../SectionDateRange"), { ssr: false });

function ClientPage({ accommodation, userAccommodations, host, reviewsRating }) {
  // State for modal visibility
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
  const thisPathname = usePathname();
  const router = useRouter();
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const storedAdults = parseInt(localStorage.getItem("guestAdults"), 10) || 1;
    const storedChildren = parseInt(localStorage.getItem("guestChildren"), 10) || 0;
    const storedInfants = parseInt(localStorage.getItem("guestInfants"), 10) || 0;

    setGuestAdultsInputValue(storedAdults);
    setGuestChildrenInputValue(storedChildren);
    setGuestInfantsInputValue(storedInfants);
  }, []);

  // The refund tiers this listing would actually bind a guest to. Fetched from
  // the server rather than derived here, so the guest cannot be shown terms
  // that differ from the ones snapshotted onto their booking at payment time.
  useEffect(() => {
    const listingId = accommodationData?._id;
    if (!listingId) return;

    let cancelled = false;

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/cancellation/policy/${listingId}`)
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
    // console.log('handleOpenModalImageGallery called');
    updateimages(Images);
    router.push(`${thisPathname}/?modal=PHOTO_TOUR_SCROLLABLE`);
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

      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/facebook-events`, {
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
    console.log("city", city);
    const description = accommodationData?.description;
    console.log("description", description);
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

    return (
      /* Frameless on mobile, premium structured card for tablet/desktop (sm and up) */
      <div className="w-full bg-transparent sm:bg-white rounded-2xl border-0 sm:border border-neutral-200/80 sm:shadow-xs p-0 sm:p-6 md:p-8 font-inter antialiased">
        
        {/* 1. Meta Category & Action Trigger Utility Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-[#1e4636]/10 text-[#1e4636] text-[11px] font-bold uppercase tracking-wider rounded-md">
              {propertyType || "Ubytovanie"}
            </span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-md border border-emerald-200">
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
        <div className="space-y-2.5 pb-5 border-b border-neutral-100">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1e4636] font-fraunces leading-tight">
            {name}
          </h1>
          
          <div className="flex items-center gap-1.5 text-neutral-600 text-xs sm:text-sm font-medium">
            <MapPin size={15} className="text-[#319a7a] shrink-0" />
            <span>
              {toTitleCase(city)}
              {city && (country || true) ? ", " : ""}
              {toTitleCase(formatCountry(country))}
            </span>
          </div>
        </div>

        {/* 3. Capacity Specs Module */}
        <div className="py-5 border-b border-neutral-100">
          
          {/* TABLET & DESKTOP VIEWPORT: Clean Grid Specs Layout */}
          <div className="hidden sm:grid grid-cols-4 gap-2 text-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-[#319a7a]">
                <User size={18} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">{t.guests || "Hostia"}</span>
                <span className="text-sm font-bold text-neutral-900">{person}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-[#319a7a]">
                <DoorOpen size={18} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">{t.bedrooms || "Spálne"}</span>
                <span className="text-sm font-bold text-neutral-900">{bedroom}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-[#319a7a]">
                <Layers size={18} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">{t.Bathroom || "Kúpeľňa"}</span>
                <span className="text-sm font-bold text-neutral-900 truncate">
                  {totalbath} <span className="text-xs text-neutral-400 font-normal">({WCs} WC)</span>
                </span>
              </div>
            </div>

            {kitchen > 0 || SocialRoom > 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-[#319a7a]">
                  <Utensils size={18} strokeWidth={2} />
                </div>
                {/* min-w-0 lets this column shrink below its content width —
                    without it a flex child refuses to wrap and the clamp never
                    gets a chance to work. */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Vybavenie</span>
                  {/* Never cut this label. "Kuchyňa + Spoločenská miestnosť"
                      needs three lines in a narrow grid column, so any clamp
                      puts an ellipsis on it — it wraps as far as it needs to
                      instead. break-words is the guard for the one case
                      wrapping cannot solve: a single word wider than the
                      column, which would otherwise overflow the card. */}
                  <span className="text-sm font-bold text-neutral-900 leading-snug break-words">
                    {kitchen > 0 && t.Kitchen} {SocialRoom > 0 && `+ ${t.SocialRoom || "Spoločenská"}`}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* NEW MOBILE VIEWPORT: No Slider, Frameless Wrap-Around Chip Matrix */}
          <div className="flex sm:hidden flex-wrap items-center gap-2 text-neutral-800">
            
            <div className="flex items-center gap-2 bg-white border border-neutral-200/60 rounded-lg px-3 py-1.5 shadow-3xs">
              <User size={14} className="text-[#319a7a]" />
              <span className="text-xs font-bold text-neutral-800">{person} {t.guests || "Hostia"}</span>
            </div>

            <div className="flex items-center gap-2 bg-white border border-neutral-200/60 rounded-lg px-3 py-1.5 shadow-3xs">
              <DoorOpen size={14} className="text-[#319a7a]" />
              <span className="text-xs font-bold text-neutral-800">{bedroom} {t.bedrooms || "Spálne"}</span>
            </div>

            <div className="flex items-center gap-2 bg-white border border-neutral-200/60 rounded-lg px-3 py-1.5 shadow-3xs">
              <Layers size={14} className="text-[#319a7a]" />
              <span className="text-xs font-bold text-neutral-800">
                {totalbath} Kúpeľňa <span className="text-neutral-400 font-normal">({WCs} WC)</span>
              </span>
            </div>

            {kitchen > 0 && (
              <div className="flex items-center gap-2 bg-white border border-neutral-200/60 rounded-lg px-3 py-1.5 shadow-3xs">
                <Utensils size={14} className="text-[#319a7a]" />
                <span className="text-xs font-bold text-neutral-800">{t.Kitchen || "Kuchyňa"}</span>
              </div>
            )}

            {SocialRoom > 0 && (
              <div className="flex items-center gap-2 bg-white border border-neutral-200/60 rounded-lg px-3 py-1.5 shadow-3xs">
                <Users size={14} className="text-[#319a7a]" />
                <span className="text-xs font-bold text-neutral-800">{t.SocialRoom || "Spoločenská"}</span>
              </div>
            )}

          </div>
        </div>

        {/* 4. Host Trust Profile Footer Card */}
        <div className="pt-4 flex items-center justify-between gap-4">
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
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t.hostedBy || "Hostiteľ"}</span>
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
        </div>

      </div>
    );
  };

  const renderSection2 = () => {

    const description = accommodationData?.description || "Accommodation discription";
    const person = accommodationData.person || "";
    const bed = accommodationData?.beds || 0;
    const singlebed = accommodationData?.singlebed || 0;
    const doublebed = accommodationData?.doublebed || 0;
    const bath = accommodationData?.bathroom || 0;
    const bedroom = accommodationData?.bedroom || 0;
    const WCs = accommodationData?.WCs || 0;
    const kitchen = accommodationData?.kitchen || 0;
    const LivingRoom = accommodationData?.LivingRoom || 0;
    const commonRoom = accommodationData?.CommonRoom || 0;   // already extracted
    const SocialRoom = accommodationData?.SocialRoom || 0;
    const propertyType = accommodationData?.propertyType ? accommodationData.propertyType[language] : "";
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

    return (
      <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">
        
        {/* SECTION HEADER */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.Stayinformation}
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full" />
        </div>

        {/* 1. SPECIAL OFFERS ACCENT BANNER */}
        {Price > 0 && StartDate && EndDate && (
          <div className="relative overflow-hidden w-full bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 hover:shadow-2xs">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-emerald-200/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-2.5 z-10">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  {t.SpecialOffers}
                </span>
                <span className="text-sm font-bold text-[#1e4636]">
                  {name && name.trim() ? name : t.SpecialOffers}
                </span>
              </div>
            </div>

            <div className="bg-white border border-emerald-100 rounded-lg px-3 py-1.5 shadow-3xs flex items-center justify-between sm:justify-start gap-4 z-10">
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase">{t.Termin || "Termín"}</span>
                <span className="text-xs font-bold text-neutral-700">{StartDate} — {EndDate}</span>
              </div>
              <div className="h-6 w-[1px] bg-neutral-200" />
              <div className="text-right">
                <span className="text-sm font-extrabold text-[#1e4636]">€{Price}</span>
                <span className="text-[11px] text-neutral-500 font-medium"> / {t.night}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. RICH TEXT RENDER CANVAS */}
        <div className="prose prose-neutral max-w-none text-neutral-600 font-normal leading-relaxed text-sm sm:text-base">
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <p {...props} className="whitespace-pre-line text-neutral-600 text-justify mb-4 last:mb-0" />
              ),
              strong: ({ node, ...props }) => (
                <strong {...props} className="font-bold text-[#1e4636]" />
              ),
              em: ({ node, ...props }) => (
                <em {...props} className="italic text-neutral-500" />
              ),
            }}
          >
            {description}
          </ReactMarkdown>
        </div>

        {/* 3. DESKTOP-ALIGNED ASYMMETRICAL SPLIT COMPOSER */}
        <div className="pt-5 border-t border-neutral-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Interactive Image: Perfectly fits height aspect and grid alignments on desktop */}
            <div 
              className="md:col-span-5 w-full aspect-video md:aspect-auto md:min-h-[220px] rounded-xl overflow-hidden cursor-pointer relative group bg-neutral-100 border border-neutral-200/60 shadow-3xs"
              onClick={handleOpenModalImageGallery}
            >
              <img
                src={Images[0] || ""}
                alt="Accommodation structural layout preview"
                loading="lazy"
                className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/95 backdrop-blur-xs text-xs font-bold text-neutral-800 px-3 py-1.5 rounded-lg shadow-sm">
                  Zobraziť galériu
                </span>
              </div>
            </div>

            {/* Right Layout: Seamlessly aligned vertically with the image container */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4 md:space-y-0">
              
              <div className="space-y-3.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[#319a7a] font-bold uppercase tracking-widest block">
                    {propertyType || "Ubytovanie"}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                    {name || "Dispozícia objektu"}
                  </h3>
                </div>

                {/* Capacity Overview Display Boxes */}
                <div className="grid grid-cols-2 gap-3 max-w-sm text-xs sm:text-sm">
                  <div className="flex flex-col p-2.5 bg-neutral-50/80 rounded-xl border border-neutral-100/70">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t.Totalcapacity}</span>
                    <span className="font-bold text-neutral-800 mt-0.5">{person} {t.Guests}</span>
                  </div>

                  <div className="flex flex-col p-2.5 bg-neutral-50/80 rounded-xl border border-neutral-100/70">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Dispozícia spální</span>
                    <span className="font-bold text-neutral-800 mt-0.5">
                      {bedroom > 0 ? `${bedroom}x ${t.Bedroom}` : "Spálne neuvedené"}
                    </span>
                  </div>
                </div>

                {/* Dynamic Pill Container Array */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {doublebed > 0 && (
                    <span className="inline-flex items-center text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {doublebed}x {t.DoubleBed}
                    </span>
                  )}
                  {singlebed > 0 && (
                    <span className="inline-flex items-center text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {singlebed}x {t.SingleBed}
                    </span>
                  )}
                  {bed > 0 && (
                    <span className="inline-flex items-center text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {bed}x {t.Beds}
                    </span>
                  )}
                  {LivingRoom > 0 && (
                    <span className="inline-flex items-center text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {LivingRoom}x {t.LivingRoom}
                    </span>
                  )}
                  {commonRoom > 0 && (
                    <span className="inline-flex items-center text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {commonRoom}x {t.commonRoom || "Common Room"}
                    </span>
                  )}
                </div>
              </div>

              {/* Micro-trigger Button aligned neatly to the bottom of the column context */}
              <div className="pt-2 md:pt-0">
                <button 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#319a7a] bg-[#319a7a]/5 hover:bg-[#319a7a]/10 border border-[#319a7a]/20 rounded-lg px-3 py-2 transition-all active:scale-98"
                  onClick={openModalDetails}
                >
                  <Wifi size={14} strokeWidth={2.5} />
                  <span>{t.Showdetails}</span>
                  <ChevronDown size={14} strokeWidth={2.5} className="text-[#319a7a]/70" />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* 4. MODAL DIALOG PORTAL LAYER */}
        <Dialog open={isOpenModalDetails} onClose={() => setIsOpenModalDetails(false)} as={Fragment}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
            <Dialog.Panel className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all border border-neutral-100 max-h-[90vh] flex flex-col">
              
              {/* Header Sticky Container */}
              <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-white shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-[#319a7a] uppercase tracking-wider">{propertyType}</span>
                  <Dialog.Title className="text-base sm:text-lg font-bold text-neutral-900 font-fraunces">
                    {name || t.Stayinformation}
                  </Dialog.Title>
                </div>
                <button
                  onClick={() => setIsOpenModalDetails(false)}
                  className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 text-lg font-light transition-all"
                >
                  &times;
                </button>
              </div>

              {/* Scrollable Room Detail Specifications Matrix */}
              <div className="p-6 overflow-y-auto space-y-5 text-sm text-neutral-700">
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-1">
                  <p className="font-bold text-[#1e4636]">
                    1x {propertyType || "Objekt"} {t.formax ? `${t.formax}.` : "pre"} {person} {t.Guests}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">{t.Rooms || "Prehľad miestností"}:</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(doublebed > 0 || bed > 0 || singlebed > 0) && (
                      <li className="flex flex-col p-3 bg-white border border-neutral-200/80 rounded-xl">
                        <span className="font-bold text-neutral-900 mb-1">1x {t.Bedroom}</span>
                        <div className="text-xs text-neutral-500 space-y-0.5">
                          {doublebed > 0 && <p>• {doublebed}x {t.DoubleBed}</p>}
                          {bed > 0 && <p>• {bed}x {t.Beds}</p>}
                          {singlebed > 0 && <p>• {singlebed}x {t.SingleBed}</p>}
                          {commonRoom > 0 && <p>• {commonRoom}x {t.commonRoom}</p>}
                        </div>
                      </li>
                    )}

                    {LivingRoom > 0 && (
                      <li className="p-3 bg-white border border-neutral-200/80 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{t.LivingRoom}</span>
                        <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md text-xs font-bold">{LivingRoom}x</span>
                      </li>
                    )}

                    {kitchen > 0 && (
                      <li className="p-3 bg-white border border-neutral-200/80 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{t.Kitchenette || "Kuchyňa"}</span>
                        <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md text-xs font-bold">{kitchen}x</span>
                      </li>
                    )}

                    {SocialRoom > 0 && (
                      <li className="p-3 bg-white border border-neutral-200/80 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{t.SocialRoom}</span>
                        <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md text-xs font-bold">{SocialRoom}x</span>
                      </li>
                    )}

                    {bath > 0 && (
                      <li className="p-3 bg-white border border-neutral-200/80 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{t.Bathroom}</span>
                        <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md text-xs font-bold">{bath}x</span>
                      </li>
                    )}

                    {WCs > 0 && (
                      <li className="p-3 bg-white border border-neutral-200/80 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-neutral-900">{t.WashRoom || "WC"}</span>
                        <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded-md text-xs font-bold">{WCs}x</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Asset Snapshot Component Frame */}
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 mt-2">
                  <img
                    src={Images?.[0] || ""}
                    alt="Accommodation architectural spatial configuration detail view"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

      </div>
    );
  };

 const renderSection3 = () => {
    const extractAmenities = (amenitiesObj) => {
      return amenitiesObj?.[language] || [];
    };

    const allAmenities = [
      ...extractAmenities(accommodationData?.bathroomAmenities),
      ...extractAmenities(accommodationData?.heatingCoolingAmenities),
      ...extractAmenities(accommodationData?.kitchenDiningAmenities),
      ...extractAmenities(accommodationData?.outdoorAmenities),
      ...extractAmenities(accommodationData?.parkingFacilities),
      ...extractAmenities(accommodationData?.safetyAmenities),
      ...extractAmenities(accommodationData?.services),
      ...extractAmenities(accommodationData?.wellnessAmenities),
      ...extractAmenities(accommodationData?.checkIn),
      ...extractAmenities(accommodationData?.meals),
    ].filter((item) => typeof item === "string" && item.trim() !== "")
    // ── Hide any “none / nothing / no meals” values ───────────────────────
    .filter((item) => {
      const normalized = item.trim().toLowerCase();
      const noneValues = [
        "none",
        "ziadne",
        "žiadne",
        "ziadne",
      ];
      return !noneValues.includes(normalized);
    });

    // Map of amenities to icons (All keys strictly lowercase to prevent normalization lookup drops)
    const amenityIcons = {
      "wifi": Wifi,
      "tv": Tv,
      "televízia": Tv,
      "dishwasher": SatelliteDish,
      "umývačka riadu": SatelliteDish,
      "pc desk(workspace)": Table2,
      "počítačový stôl": Table,
      "pc stôl(pracovný priestor)": Table,
      "bathtub": Bath,
      "vaňa": Bath,
      "sauna": Bath,
      "vírivka": Bath,
      "hot tub": Bath,
      "shower": ShowerHead,
      "sprcha": ShowerHead,
      "air conditioning": Wind,
      "klimatizácia": Wind,
      "washing machine": WashingMachine,
      "práčka": WashingMachine,
      "dryer": WashingMachine,
      "sušička": WashingMachine,
      "žehlenie": WashingMachine,
      "dining table": Utensils,
      "jedálenský stôl": Utensils,
      "stovetop": Utensils,
      "vonkajší jedálenský priestor": Utensils,
      "vonkajšie stolovanie": Utensils,
      "oven": Microwave,
      "refrigerator": Refrigerator,
      "chladnička": Refrigerator,
      "freezer": Snowflake,
      "mraznička": Snowflake,
      "coffee maker": Coffee,
      "kávovar": Coffee,
      "breakfast": Coffee,
      "ziadne": Coffee,
      "indoor fireplace": Flame,
      "vnútorný krb": Flame,
      "varná doska": Flame,
      "sporák": Flame,
      "rúra": Flame,
      "krb": Flame,
      "ohnisko": Flame,
      "firepit": Flame,
      "gril": Flame,
      "grill": Flame,
      "central heating": Heater,
      "ústredné kúrenie": Thermometer,
      "fire extinguisher": FireExtinguisher,
      "hasiaci prístroj": FireExtinguisher,
      "first aid kit": BriefcaseMedical,
      "lekárnička": BriefcaseMedical,
      "prvá pomoc": BriefcaseMedical,
      "indoor pool": Waves,
      "vnútorný bazén": Waves,
      "outdoor pool": Umbrella,
      "vonkajší bazén": Umbrella,
      "balcony": Building2,
      "balkón": Building,
      "terrace": Building2,
      "terasa": Building,
      "free parking on-site": ParkingCircle,
      "bezplatné parkovanie na mieste": ParkingCircle,
      "paid parking on-site": ParkingCircle,
      "platené parkovanie": ParkingCircle,
      "platené parkovanie na mieste": DollarSign,
      "public parking": ParkingCircle,
      "verejné parkovanie": ParkingCircle,
      "self check-in": DoorOpen,
      "samoobslužný check-in": DoorOpen,
      "samoobslužné ubytovanie": DoorOpen,
      "reception": ConciergeBell,
      "recepcia": ConciergeBell,
      "bez stravy": ConciergeBell,
      "host greeting": Handshake,
      "privítanie hostiteľom": Handshake,
      "privítanie hostiteľa": Handshake,
      "no meals": UtensilsCrossed,
      "žiadne jedlá": UtensilsCrossed,
      "half board": Utensils,
      "polpenzia": Utensils,
      "full board": Utensils,
      "plná penzia": Utensils,
      "all-inclusive": Star,
    };

    return (
      /* Base Container Architecture */
      <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">
        
        {/* SECTION HEADER CONTENT */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.Amenities}
          </h2>
          <span className="block text-xs sm:text-sm text-neutral-400 font-normal">
            {t.Aboutthepropertysamenitiesandservices}
          </span>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        {/* AMENITIES DISPLAY MATRIX COMPONENT */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4 pt-2">
          {allAmenities.slice(0, 12).map((item, index) => {
            const normalizedItem = item.trim().toLowerCase();
            const IconComponent = amenityIcons[normalizedItem] || Star;

            return (
              <div 
                key={index} 
                className="flex items-center gap-3 p-3 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-100/80 rounded-xl transition-all duration-200 group"
              >
                <div className="text-neutral-500 group-hover:text-[#319a7a] transition-colors shrink-0">
                  <IconComponent size={20} strokeWidth={1.8} />
                </div>
                {/* Amenity names run long in Slovak ("Bezbariérový prístup",
                    "Práčka a sušička") and two of these sit side by side on
                    mobile, so `truncate` cut most of them mid-word. They now
                    wrap to however many lines they need — never an ellipsis.
                    min-w-0 is what lets the flex child shrink far enough to
                    wrap at all. */}
                <span className="min-w-0 text-xs sm:text-sm text-neutral-700 font-medium leading-snug break-words">
                  {item}
                </span>
              </div>
            );
          })}
        </div>

        {/* DYNAMIC FOOTER ACTION CONTROL */}
        {allAmenities.length > 12 && (
          <div className="pt-3">
            <button
              onClick={openModalAmenities}
              className="inline-flex items-center justify-center text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl px-4 py-2.5 transition-all shadow-3xs active:scale-98"
            >
              {t.Viewmoreamenities} ({allAmenities.length})
            </button>
          </div>
        )}

        {/* HIGH-FIDELITY OVERLAY MODAL CANVAS */}
        {isOpenModalAmenities && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all border border-neutral-100 max-h-[85vh] flex flex-col">
              
              {/* Modal Header Module */}
              <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-white shrink-0">
                <div className="space-y-0.5">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 font-fraunces">
                    {t.Amenities}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-medium tracking-wide uppercase">
                    Kompletné vybavenie objektu
                  </p>
                </div>
                <button
                  onClick={closeModalAmenities}
                  className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 text-lg font-light transition-all"
                >
                  &times;
                </button>
              </div>

              {/* Modal Scrollable Matrix Body */}
              <div className="p-6 overflow-y-auto bg-neutral-50/30 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allAmenities.map((item, index) => {
                    const normalizedItem = item.trim().toLowerCase();
                    const IconComponent = amenityIcons[normalizedItem] || Star;

                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-3.5 p-3.5 bg-white border border-neutral-200/60 rounded-xl shadow-3xs"
                      >
                        <div className="text-[#319a7a] bg-[#319a7a]/5 p-1.5 rounded-lg shrink-0">
                          <IconComponent size={18} strokeWidth={2} />
                        </div>
                        <span className="text-xs sm:text-sm text-neutral-700 font-medium">
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Spacer Boundary */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end shrink-0">
                <button
                  onClick={closeModalAmenities}
                  className="text-xs font-bold text-neutral-600 bg-white border border-neutral-200 rounded-lg px-4 py-2 hover:bg-neutral-50 transition-all"
                >
                  Zavrieť
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  };

  const renderSection9 = () => {
    const getLocalizedText = (data) => data?.[language] || "";

    const pet = getLocalizedText(accommodationData?.pet);
    const partyOrganizing = getLocalizedText(accommodationData?.partyOrganizing);
    const smoking = getLocalizedText(accommodationData?.smoking);

    const petFeePerNight = accommodationData?.petFeePerNight;
    const petValue =
      pet && petFeePerNight > 0
        ? `${pet} — €${petFeePerNight}/${t.night}`
        : pet;

    const rules = [
      { icon: Footprints, label: t.Pets, value: petValue },
      { icon: GlassWater, label: t.PartyOrganizing, value: partyOrganizing },
      { icon: Cigarette, label: t.Smoking, value: smoking },
    ];

    // ── Extra rules ──────────────────────────────────────────────
    const extraRulesRaw =
      accommodationData?.tags ??
      [];

    // Normalize to an array of non-empty strings
    const extraRules = (Array.isArray(extraRulesRaw) ? extraRulesRaw : [extraRulesRaw])
      .map((r) => (typeof r === "string" ? r.trim() : getLocalizedText(r)))
      .filter(Boolean);

    return (
      <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">
        {/* SECTION HEADER */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.AccommodationRules}
          </h2>
          <span className="block text-xs sm:text-sm text-neutral-400 font-normal">
            {t.HouseRuleapplyinaccommodation}
          </span>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        {/* HOUSE RULES CARD GRID (Pets / Party / Smoking) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {rules.map(({ icon: Icon, label, value }, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 p-4 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-100 rounded-2xl transition-colors"
            >
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

        {/* ── ADDITIONAL RULES (only when they exist) ───────────────────────── */}
        {extraRules.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-neutral-700 tracking-tight">
              {t.AdditionalRules || "Additional rules"}
            </h3>

            <ul className="space-y-2">
              {extraRules.map((rule, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-xl"
                >
                  {/* small green bullet / check */}
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#319a7a] shrink-0" />
                  <span className="text-sm text-neutral-700 leading-relaxed">
                    {rule}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  const renderSection44 = () => {
    const {
      pricePerNight,
      pricePerPerson,
      flexiblePrices = [],
    } = accommodationData || {};

    // Helper: format a date nicely
    const formatDate = (date) => {
      if (!date) return "";
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    // Helper: format tier label (e.g. "1–3 nights", "7+ nights")
    const formatTierLabel = (tier) => {
      const min = Number(tier?.minNights) || 1;
      const hasMax =
        tier?.maxNights !== null &&
        tier?.maxNights !== undefined &&
        tier?.maxNights !== "";

      if (!hasMax) {
        return min === 1 ? `1+ ${t.nights || "nights"}` : `${min}+ ${t.nights || "nights"}`;
      }
      const max = Number(tier.maxNights);
      if (min === max) return `${min} ${t.nights || "nights"}`;
      return `${min}–${max} ${t.nights || "nights"}`;
    };

    // Filter valid periods (must have dates + at least one priced tier)
    const validFlexiblePrices = (Array.isArray(flexiblePrices) ? flexiblePrices : [])
      .filter((period) => {
        if (!period?.start || !period?.end) return false;
        const tiers = Array.isArray(period.tiers) ? period.tiers : [];
        return tiers.some((t) => Number(t?.price) > 0);
      });

    // If no base price and no flexible prices
    if (!pricePerNight && validFlexiblePrices.length === 0) {
      return (
        <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
              {t.RoomRates}
            </h2>
            <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mt-2" />
          </div>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            {t.ContactTheLandlord || "Contact the landlord."}
          </p>
        </div>
      );
    }

    return (
      <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">

        {/* SECTION HEADER */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.RoomRates}
          </h2>
          <span className="block text-xs sm:text-sm text-neutral-400 font-normal leading-relaxed">
            {t.Pricesaresetbytheaccommodationownerwithoutanyincreasebyourportal}
            <br />
            {t.Checkitoutandcalltheownernow}
          </span>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        {/* BASE PRICE PER NIGHT */}
        {pricePerNight > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5 bg-neutral-50/70 border border-neutral-100 rounded-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
                <DollarSign size={20} strokeWidth={2} />
              </div>
              <div>
                <span className="text-sm sm:text-base font-bold text-neutral-800 block">
                  {t.PricePerNight}
                </span>
                <span className="text-xs text-neutral-400">
                  {t.BaseRate || "Base rate"}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-extrabold text-[#1e4636]">
                €{pricePerNight}
              </span>
              <span className="text-xs text-neutral-400 font-medium">/ {t.night}</span>
            </div>
          </div>
        )}

        {/*
          The payment split (platform fee, Stripe cost, host payout) is
          deliberately NOT shown here. This page is public, and a guest has no
          use for how the money is divided afterwards — they pay one amount. The
          breakdown belongs to the host, and now lives in Profile → Reservations
          and Profile → Payments, where it is scoped to their own bookings.
        */}

        {/* PRICE PER PERSON (only when > 0) */}
        {pricePerPerson > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5 bg-neutral-50/70 border border-neutral-100 rounded-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
                <DollarSign size={20} strokeWidth={2} />
              </div>
              <span className="text-sm sm:text-base font-bold text-neutral-800">
                {t.PricePerPerson}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-extrabold text-[#1e4636]">
                €{pricePerPerson}
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                / {t.person || "person"}
              </span>
            </div>
          </div>
        )}

        {/* FLEXIBLE / SEASONAL PRICES */}
        {validFlexiblePrices.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <CalendarDays size={16} strokeWidth={2.2} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#1e4636]">
                {t.SeasonalPrices || t.FlexiblePrices || "Seasonal prices"}
              </h3>
            </div>

            <div className="space-y-4">
              {validFlexiblePrices.map((period, idx) => {
                const tiers = (Array.isArray(period.tiers) ? period.tiers : [])
                  .filter((t) => Number(t?.price) > 0)
                  .sort((a, b) => (Number(a.minNights) || 1) - (Number(b.minNights) || 1));

                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-neutral-100 bg-white overflow-hidden shadow-sm"
                  >
                    {/* Period header */}
                    <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#319a7a]/8 to-transparent border-b border-neutral-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="text-sm font-bold text-[#1e4636]">
                          {period.name || `${t.Period || "Period"} ${idx + 1}`}
                        </span>
                        <span className="text-xs font-medium text-neutral-500">
                          {formatDate(period.start)} – {formatDate(period.end)}
                        </span>
                      </div>
                      {period.note && (
                        <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                          {period.note}
                        </p>
                      )}
                    </div>

                    {/* Tiers */}
                    <div className="divide-y divide-neutral-50">
                      {tiers.map((tier, tIdx) => (
                        <div
                          key={tIdx}
                          className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-neutral-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#319a7a]" />
                            <span className="text-sm font-medium text-neutral-700">
                              {formatTierLabel(tier)}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base sm:text-lg font-extrabold text-[#1e4636]">
                              €{Number(tier.price)}
                            </span>
                            <span className="text-xs text-neutral-400 font-medium">
                              / {t.night}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Small note */}
            <p className="text-xs text-neutral-400 leading-relaxed px-1">
              {t.FlexiblePriceNote ||
                "The price for each night is determined by the total length of your stay and the season it falls into."}
            </p>
          </div>
        )}
      </div>
    );
  };


  const renderSection5 = () => {
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
      <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">

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
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              {t.hostedBy || "Hostiteľ"}
            </span>
            <a
              href={`/host-detail/${userId}`}
              className="block text-lg sm:text-xl font-bold text-neutral-900 hover:text-[#319a7a] transition-colors leading-tight truncate"
            >
              {userName}
            </a>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e4636] bg-[#319a7a]/10 px-2.5 py-1 rounded-md">
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
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t.Joinedin}</span>
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
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Odozva</span>
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
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Rýchlosť</span>
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
      <div id="reviews" className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">

        {/* SECTION HEADER */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
              {t.Reviews}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e4636] bg-[#319a7a]/10 px-2.5 py-1 rounded-md">
              <Star size={13} className="text-[#319a7a] fill-[#319a7a]" />
              {reviewCount}
            </span>
          </div>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mt-2" />
        </div>

        <div className="divide-y divide-neutral-100">
          {/* ✅ Only fetch and display reviews */}
          <CommentListing className="py-8" reviewsRating={reviewsRating} />
        </div>
      </div>
    );
  };



  const renderSection7 = () => {
    const locationDetails =
      accommodationData?.locationDetails?.streetAndNumber || "";

    const defaultLocation =
      language === "sk" ? "Bratislava, Slovensko" : "Bratislava, Slovakia";

    const formatLocationText = (text) => {
      if (!text) return defaultLocation;

      if (language === "sk") {
        return text
          .replace(/\bSlovakia\b/gi, "Slovensko")
          .replace(/\bSlovak Republic\b/gi, "Slovensko");
      }

      return text
        .replace(/\bSlovensko\b/gi, "Slovakia")
        .replace(/\bSlovak Republic\b/gi, "Slovakia");
    };

    const displayLocation = locationDetails
      ? formatLocationText(locationDetails)
      : defaultLocation;

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Keep original data for the map query (better geocoding)
    const mapSrc = locationDetails
      ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(locationDetails)}`
      : `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(defaultLocation)}`;

    return (
      <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">

        {/* SECTION HEADER */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.Location}
          </h2>
          {locationDetails && (
            <div className="flex items-center gap-1.5 text-neutral-600 text-xs sm:text-sm font-medium">
              <MapPin size={15} className="text-[#319a7a] shrink-0" />
              <span>{toTitleCase(displayLocation)}</span>
            </div>
          )}
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full pt-0.5 mt-1" />
        </div>

        {/* MAP */}
        <div className="z-0 aspect-w-5 aspect-h-5 sm:aspect-h-3 rounded-2xl overflow-hidden border border-neutral-200/70 shadow-3xs">
          <div className="z-0 overflow-hidden rounded-2xl">
            {!mapLoaded && <div className="skeleton rounded-2xl" />}
            <iframe
              width="100%"
              height="100%"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={mapSrc}
              onLoad={() => setMapLoaded(true)}
              className={`fade-in ${mapLoaded ? "loaded" : ""}`}
            ></iframe>
          </div>
        </div>
      </div>
    );
  };

  const renderSection8 = () => {
    function formatTime(timeString) {
      // Check if the input is valid and not empty or null
      if (!timeString) {
        return "Invalid time";
      }

      // Ensure the timeString has a valid date context
      const today = new Date().toISOString().split("T")[0]; // Get today's date in ISO format
      const fullDateTime = timeString.includes("T") ? timeString : `${today}T${timeString}`; // Append date if only time is provided

      const date = new Date(fullDateTime);

      // Validate if the Date object is valid
      return isNaN(date.getTime())
        ? "Invalid time"
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Format times using the formatTime function
    const arrivalFrom = accommodationData.arrivalFrom;
    const arrivalTo = accommodationData.arrivalTo;
    const departureFrom = accommodationData.departureFrom;
    const departureTo = accommodationData.departureTo;
    const specialNote = accommodationData.specialNote;
    const cancellationPolicy = accommodationData.cancellationPolicy;

    // The policy the host picked — "Standard", "Flexible", etc. Comes from the
    // server alongside the tiers, so it is the policy a booking would actually
    // be bound by, not the free-text description the host typed.
    const POLICY_LABEL_KEYS = {
      flexible: "PolicyFlexible",
      standard: "PolicyStandard",
      strict: "PolicyStrict",
      custom: "PolicyCustom",
    };
    const policyName = bindingPolicy?.policy
      ? t[POLICY_LABEL_KEYS[bindingPolicy.policy]] ||
        bindingPolicy.policy.charAt(0).toUpperCase() + bindingPolicy.policy.slice(1)
      : null;

    return (
      <div className="w-full bg-transparent md:bg-white md:rounded-2xl border-t border-neutral-200/70 md:border border-0 md:shadow-xs pt-6 md:p-8 font-inter antialiased space-y-6">

        {/* SECTION HEADER */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1e4636] font-fraunces">
            {t.Thingstoknow}
          </h2>
          <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mt-2" />
        </div>

        {/*
          CANCELLATION POLICY

          The refund tiers come from the server, which is the same source the
          booking is snapshotted from — so what the guest reads here is what they
          will actually be bound by. Previously only the host's free text was
          shown, while every booking silently used the `standard` policy, so the
          two could say entirely different things.
        */}
        {(bindingPolicy || cancellationPolicy) && (
          <div className="bg-neutral-50/70 border border-neutral-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
                <ShieldCheck size={18} strokeWidth={2} />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1e4636]">{t.Cancellationpolicy}</h4>
              {policyName && (
                <span className="ml-auto shrink-0 rounded-lg border border-[#319a7a]/20 bg-[#319a7a]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#257562]">
                  {policyName}
                </span>
              )}
            </div>

            {bindingPolicy?.tiers?.length > 0 && (
              <ul className="pl-12 space-y-1.5 mb-3">
                {bindingPolicy.tiers.map((tier) => (
                  <li
                    key={tier.hoursBefore}
                    className="text-sm text-neutral-700 flex items-baseline gap-2"
                  >
                    <span className="font-semibold text-[#1e4636] tabular-nums shrink-0">
                      {tier.refundPercent}%
                    </span>
                    <span className="text-neutral-600">
                      {tier.hoursBefore === 0
                        ? t.CancellationCloserThan ||
                          "closer to check-in than the window above"
                        : `${t.CancellationFrom || "if cancelled at least"} ${Math.round(
                            tier.hoursBefore / 24
                          )} ${t.daysBeforeCheckIn || "days before check-in"}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {cancellationPolicy && (
              <p className="text-sm text-neutral-600 leading-relaxed pl-12">
                {cancellationPolicy}
              </p>
            )}
          </div>
        )}

        {/* CHECK-IN / CHECK-OUT TIMES */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#319a7a]/5 text-[#319a7a] flex items-center justify-center shrink-0">
              <Clock size={18} strokeWidth={2} />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-[#1e4636]">{t.Checkintime}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3.5 bg-white border border-neutral-200/60 rounded-xl shadow-3xs">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700">
                <LogIn size={15} className="text-[#319a7a]" />
                {t.Checkintime}
              </span>
              <span className="text-sm font-bold text-neutral-900">{arrivalFrom} - {arrivalTo}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white border border-neutral-200/60 rounded-xl shadow-3xs">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700">
                <LogOut size={15} className="text-[#319a7a]" />
                {t.Checkout}
              </span>
              <span className="text-sm font-bold text-neutral-900">{departureFrom} - {departureTo}</span>
            </div>
          </div>
        </div>

        {/* SPECIAL NOTE */}
        {specialNote && (
          <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                <Info size={18} strokeWidth={2} />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1e4636]">{t.SpecialNote}</h4>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed pl-12 whitespace-pre-line">
              {specialNote}
            </p>
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
                  className="mt-0.5 self-start text-xs font-bold text-[#319a7a] hover:text-[#1e4636] hover:underline transition-colors"
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
          <div className="-mt-2 inline-flex items-center text-xs font-semibold text-[#1e4636] bg-[#319a7a]/10 px-2.5 py-1 rounded-md">
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
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
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

  return (
    <>
      <Head>
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
            className="absolute z-20 flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-md top-2 left-2 text-neutral-500 hover:bg-neutral-200 sm:hidden"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="relative grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">

            {/* Main image */}
            <div
              className="relative col-span-2 row-span-3 overflow-hidden rounded-md cursor-pointer sm:row-span-2 sm:rounded-xl"
              onClick={virtualTourUrl ? openVirtualTour : handleOpenModalImageGallery}
            >
              <img
                src={virtualTourUrl ? "/virtual_Tour.jpeg" : Images[0] || ""}
                alt={`${name} - ${accommodationData?.propertyType?.en || "accommodation"} in ${accommodationData?.locationDetails?.city || ""}`}
                loading="eager"
                fetchpriority="high"
                className="absolute inset-0 w-full h-full object-cover rounded-md sm:rounded-xl fade-in"
                onLoad={(e) => e.currentTarget.classList.add("loaded")}
              />
              <div className="skeleton" />
              <div className="absolute inset-0 transition-opacity opacity-0 bg-neutral-900 bg-opacity-20 hover:opacity-100" />
            </div>


            {/* Thumbnails */}
            {Images.slice(1, 5).map((item, index) => (
              <div
                key={index}
                className={`relative rounded-md sm:rounded-xl overflow-hidden ${index >= 3 ? "hidden sm:block" : ""}`}
              >
                <div className="aspect-w-4 aspect-h-3 sm:aspect-w-6 sm:aspect-h-5">
                  <div className="skeleton absolute inset-0" />
                    <img
                      src={item || ""}
                      alt={`${name} photo ${index + 2}`}
                      loading="eager"
                      fetchpriority="high"
                      className="absolute inset-0 w-full h-full object-cover rounded-md sm:rounded-xl fade-in"
                      onLoad={(e) => e.currentTarget.classList.add("loaded")}
                    />

                </div>
                <div
                  className="absolute inset-0 transition-opacity opacity-0 cursor-pointer bg-neutral-900 bg-opacity-20 hover:opacity-100"
                  onClick={handleOpenModalImageGallery}
                />
              </div>
            ))}

            {/* Buttons */}
            <button
              className={`absolute hidden md:flex md:items-center md:justify-center right-3 bottom-3 px-4 py-2 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 z-10 ${language === "sk" ? "w-40" : "w-52"}`}
              onClick={handleOpenModalImageGallery}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="ml-2 text-sm font-medium truncate text-neutral-800">
                {t.Showallphotos} +{imageCount}
              </span>
            </button>

            <button
              className="absolute flex md:hidden items-center justify-center left-3 bottom-3 px-3 py-2 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 z-10 w-auto min-w-[120px]"
              onClick={handleOpenModalImageGallery}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="ml-2 text-sm font-medium text-neutral-800">{t.Show}</span>
            </button>

            {virtualTourUrl && (
              <button
                className={`absolute z-10 hidden px-4 py-2 md:flex md:items-center md:justify-center bottom-3 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 ${language === "sk" ? "w-44 left-2" : "w-36 left-3"}`}
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
                className="absolute flex items-center justify-center w-10 h-10 text-gray-700 transform -translate-x-1/2 bg-gray-200 rounded-full hover:text-black top-2 left-1/2 sm:top-4 sm:right-4"
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

        <main className="relative z-10 flex flex-col mt-11 lg:flex-row">

          {/* CONTENT */}
          <div className="w-full space-y-8 lg:w-3/5 xl:w-2/3 lg:space-y-10 lg:pr-10">
            {!accommodationData ? <Section1Skeleton /> : <div className="fade-in loaded">{renderSection1()}</div>}
            {renderSection2()}
            {renderSection3()}
            {renderSection9()}
            {renderSection44()}
            <SectionDateRange data={accommodationData} />
            {renderSection5()}
            {renderSection6()}
            {renderSection7()}
            {renderSection8()}
          </div>

          {/* SIDEBAR */}
          <div className="flex-grow hidden lg:block mt-14 lg:mt-0">
            <div className="sticky top-28">{renderSidebar()}</div>
          </div>
        </main>

      </div>
    </>
  )
}

export default ClientPage 