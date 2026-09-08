"use client"
import React, { useContext, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import Head from "next/head";

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

  const trustItems =
    language === "sk"
      ? ["€0 servisný poplatok", "Fotky overené tímom", "Ľudská podpora 24/7"]
      : ["€0 service fee", "Verified photos", "24/7 support"];

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

        const url = `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/listing-stats?${params.toString()}`;
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
        <link rel="preload" as="image" href="/Hero.svg" type="image/svg" />
      </Head>

      <div className={`w-full py-3 ${className}`}>

        {/* Row 1: destination + result count */}
        <div className="flex items-baseline gap-2">
          <h2 className="font-fraunces font-bold text-xl lg:text-2xl text-[#1A3A2E] tracking-[-0.01em] leading-tight">
            {displaycity || "Slovensko"}
          </h2>
          <span className="text-neutral-300 text-sm">·</span>
          <span className="font-dmsans text-sm text-neutral-500">
            <span className="font-semibold text-[#2C8360]">{displayCount}</span>
            {displayCount && " "}{t.properties || "ubytovaní"}
          </span>
        </div>

        {/* Row 2: compact trust strip with middot separators */}
        <div className="flex items-center gap-2 mt-1.5 overflow-x-auto no-scrollbar">
          {trustItems.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span className="text-neutral-300 text-xs flex-shrink-0">·</span>}
              <span className="flex items-center gap-1 text-xs text-neutral-500 whitespace-nowrap font-inter">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12L9 17L20 6" stroke="#2C8360" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Row 3: aggregate star social proof — now live from API */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FBBF24" className="w-3.5 h-3.5 flex-shrink-0">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
            </svg>
          ))}
          <span className="text-sm font-semibold text-neutral-700 font-dmsans ml-0.5">
            {displayRating}
          </span>
          <span className="text-neutral-300 text-sm">·</span>
          <span className="text-xs text-neutral-500 font-inter">
            {displayReviews} {language === "sk" ? "hodnotení" : "reviews"}
          </span>
        </div>

      </div>
    </>
  );
};

export default HeroSection;
