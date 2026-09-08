"use client"
import React, { useContext, useEffect, useState, useRef } from "react";
import { useSearchParams } from "@/app/components/NextNavigation";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import Head from "@/app/components/NextHead";

const ZeroFeeIcon = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
);
const VerifiedPhotoIcon = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
);
const HumanSupportIcon = ({ className = "w-4 h-4 shrink-0" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
);

const HeroSection = ({ className = "" }) => {
  const {
    city,
    acclen,
    accommodationName,
    lang,
    // filter params — same shape as SectionGridHasMapd
    drop,
    person,
    country,
    location,
    pricemins,
    pricemaxs,
    Bathroomss,
    rentalform,
    Bedss,
    Equipment,
    enddate,
    services,
    BathroomAmenities,
    KitchenDiningAmenities,
    HeatingCoolingAmenities,
    SafetyAmenities,
    WellnessAmenities,
    OutdoorAmenities,
    ParkingFacilities,
    CheckInOptions,
    Meals,
    Pets,
    Beds,
    smoking,
    PartyOrganizing,
    startdate,
  } = useContext(FormContext);

  const capitalizeFirstLetter = (s) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  const displaycity = accommodationName || capitalizeFirstLetter(city);

  const searchParams = useSearchParams();
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  // ── Live stats from the new API ───────────────────────────────────────────
  const [stats, setStats] = useState({
    propertyCount: null,   // real total from DB (not the paginated 6)
    totalReviews: null,
    averageRating: null,
  });

  // Debounce timer so we don't hammer the API on every filter keystroke
  const debounceRef = useRef(null);

  const formattedStartDate = startdate
    ? new Date(startdate).toISOString().split("T")[0]
    : "";
  const formattedEndDate = enddate
    ? new Date(enddate).toISOString().split("T")[0]
    : "";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (drop) params.set("propertyType", drop);
        if (city) params.set("city", city);
        if (country) params.set("country", country);
        if (location) params.set("location", location);
        if (pricemins) params.set("minPrice", pricemins);
        if (pricemaxs) params.set("maxPrice", pricemaxs);
        if (Pets) params.set("pet", Pets);
        if (smoking) params.set("smoking", smoking);
        if (rentalform) params.set("rentalform", rentalform);
        if (PartyOrganizing) params.set("partyOrganizing", PartyOrganizing);
        if (accommodationName) params.set("name", accommodationName);
        if (person > 0) params.set("person", person);
        if (Beds) params.set("beds", Beds);
        if (Bedss > 0) params.set("bedroomCount", Bedss);
        if (Bathroomss > 0) params.set("bathroomCount", Bathroomss);
        if (services) params.set("services", services);
        if (BathroomAmenities) params.set("bathroomAmenities", BathroomAmenities);
        if (KitchenDiningAmenities) params.set("kitchenDiningAmenities", KitchenDiningAmenities);
        if (HeatingCoolingAmenities) params.set("heatingCoolingAmenities", HeatingCoolingAmenities);
        if (SafetyAmenities) params.set("safetyAmenities", SafetyAmenities);
        if (WellnessAmenities) params.set("wellnessAmenities", WellnessAmenities);
        if (OutdoorAmenities) params.set("outdoorAmenities", OutdoorAmenities);
        if (ParkingFacilities) params.set("parkingFacilities", ParkingFacilities);
        if (CheckInOptions) params.set("checkIn", CheckInOptions);
        if (Meals) params.set("meals", Meals);
        if (formattedStartDate) params.set("startDate", formattedStartDate);
        if (formattedEndDate) params.set("endDate", formattedEndDate);

        const url = `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodation/listing-stats?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setStats({
          propertyCount: data.propertyCount ?? null,
          totalReviews: data.totalReviews ?? null,
          averageRating: data.averageRating ?? null,
        });
      } catch (err) {
        // silently ignore — fallback values will show
      }
    }, 600); // 600 ms debounce

    return () => clearTimeout(debounceRef.current);
  }, [
    city, country, location, drop, person, pricemins, pricemaxs, Pets, smoking,
    rentalform, PartyOrganizing, accommodationName, Beds, Bedss, Bathroomss,
    services, BathroomAmenities, KitchenDiningAmenities, HeatingCoolingAmenities,
    SafetyAmenities, WellnessAmenities, OutdoorAmenities, ParkingFacilities,
    CheckInOptions, Meals, formattedStartDate, formattedEndDate,
  ]);

  // ── Display helpers ──────────────────────────────────────────────────────
  // Format a number with a thin-space thousands separator, e.g. 4700 → "4 700"
  const fmtNum = (n) =>
    new Intl.NumberFormat("sk-SK").format(n); // "4 700", "367", etc.

  // Property count: prefer the real total from the stats API, fall back to
  // acclen set by SectionGridHasMap (may be 6 when demo data is shown)
  const displayCount =
    stats.propertyCount != null ? fmtNum(stats.propertyCount)
    : acclen ? fmtNum(acclen)
    : "";

  const displayRating =
    stats.averageRating != null && stats.averageRating > 0
      ? stats.averageRating.toFixed(1)
      : "4.8";

  // Review count: e.g. 4700 → "4 700+", 367 → "367+"
  const displayReviews =
    stats.totalReviews != null
      ? `${fmtNum(stats.totalReviews)}+`
      : "1 200+";

  return (
    <>
      <Head>
        <link rel="preload" as="image" href="/Hero.svg" type="image/svg+xml" />
      </Head>

      <div className={`flex w-full flex-col gap-3 bg-white px-1 lg:flex-row lg:items-center lg:justify-between ${className}`}>

        {/* Row 1: Destination Title & Result Count */}
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2 lg:flex-col lg:items-start lg:gap-1">
          <h2 className="truncate font-fraunces text-2xl font-bold leading-tight tracking-tight text-[#112A22] sm:text-3xl">
            {displaycity || "Slovensko"}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5 font-dmsans text-sm text-[#4A5D54] sm:text-[15px]">
            <span className="font-semibold text-[#238869]">{displayCount}</span>
            <span>{t.properties || "ubytovaní"}</span>
          </div>
        </div>

        {/* Row 2: Trust and rating badges */}
        <div className="hidden items-center gap-2.5 lg:flex lg:flex-wrap lg:justify-end">

          {/* Rating */}
          <div className="flex min-w-0 items-center gap-1 rounded-full border border-[#DCEAE5] bg-white px-2 py-1.5 shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] sm:shrink-0 sm:px-2.5">
            <div className="flex items-center text-[#FFB800]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            </div>
            <span className="font-inter font-bold text-[#112A22] text-[13px] leading-none">{displayRating}</span>
            <span className="text-[#849B90] text-[10px] font-bold leading-none">·</span>
            <span className="whitespace-nowrap font-inter text-[11px] font-semibold leading-none text-[#4A5D54] sm:text-[12.5px]">{displayReviews} {t.Hero_RatingLabel || "hodnotení"}</span>
          </div>

          {/* Zero fee */}
          <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#DCEAE5] bg-white px-2 py-1.5 shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] sm:shrink-0 sm:px-3">
            <ZeroFeeIcon className="w-3.5 h-3.5 text-[#238869]" />
            <span className="whitespace-nowrap font-dmsans text-[11px] font-semibold leading-none text-[#4A5D54] sm:text-[12.5px]">
              {language === "sk" ? "€0 servisný poplatok" : "€0 service fee"}
            </span>
          </div>

          {/* Verified photos */}
          <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#DCEAE5] bg-white px-2 py-1.5 shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] sm:shrink-0 sm:px-3">
            <VerifiedPhotoIcon className="w-3.5 h-3.5 text-[#238869]" />
            <span className="whitespace-nowrap font-dmsans text-[11px] font-semibold leading-none text-[#4A5D54] sm:text-[12.5px]">
              {language === "sk" ? "Fotky overené tímom" : "Verified photos"}
            </span>
          </div>

          {/* Human support */}
          <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#DCEAE5] bg-white px-2 py-1.5 shadow-[0_2px_8px_-4px_rgba(17,42,34,0.08)] sm:shrink-0 sm:px-3">
            <HumanSupportIcon className="w-3.5 h-3.5 text-[#238869]" />
            <span className="whitespace-nowrap font-dmsans text-[11px] font-semibold leading-none text-[#4A5D54] sm:text-[12.5px]">
              {language === "sk" ? "Ľudská podpora 24/7" : "24/7 support"}
            </span>
          </div>

        </div>

      </div>
    </>
  );
};

export default HeroSection;
