"use client";
import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import GallerySlider from "../../components/GridFeaturePlaces/GallerySlider";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-yellow-400">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const HeartButton = ({ isWishlisted, onToggle }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className="absolute top-3 left-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:scale-110 transition-transform duration-150"
    aria-label="Uložiť do obľúbených"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={isWishlisted ? "#E53E3E" : "none"}
      stroke={isWishlisted ? "#E53E3E" : "#1A3A2E"}
      strokeWidth="2"
      className="w-4 h-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  </button>
);

const getContextBadge = (averageRating, reviews, pricePerNight, language) => {
  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  if (typeof averageRating === "number" && averageRating >= 4.9 && reviewCount > 0) {
    return { label: language === "sk" ? "Obľúbené" : "Popular", color: "bg-[#2C8360] text-white" };
  }
  if (reviewCount === 0) {
    return { label: language === "sk" ? "Nové" : "New", color: "bg-[#1A3A2E] text-white" };
  }
  if (typeof pricePerNight === "number" && pricePerNight <= 75) {
    return { label: language === "sk" ? "Výhodná cena" : "Great value", color: "bg-amber-500 text-white" };
  }
  return null;
};

const StayCardFeatured = ({ data, className = "" }) => {
  const router = useRouter();
  const {
    _id,
    images = [],
    propertyType = {},
    locationDetails,
    name,
    slug,
    pricePerNight,
    averageRating,
    reviews = [],
    bedroom,
  } = data;

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const safeAverage = typeof averageRating === "number" && averageRating > 0
    ? averageRating
    : null;

  const price = pricePerNight;
  const currentPropertyType = propertyType?.[language] || propertyType?.["sk"] || propertyType?.["en"] || null;
  const contextBadge = getContextBadge(averageRating, reviews, pricePerNight, language);

  const formatCountry = (country) => {
    if (!country) return language === "sk" ? "Slovensko" : "Slovakia";

    const normalized = country.trim().toLowerCase();

    if (normalized === "slovakia" || normalized === "slovak republic") {
      return language === "sk" ? "Slovensko" : "Slovakia";
    }

    return country;
  };

  const renderSliderGallery = () => (
    <div className="relative w-full border-t rounded-t-[20px]">
      <GallerySlider
        uniqueID={`StayCardFeatured_${_id}`}
        ratioClass="aspect-[4/3]"
        galleryImgs={images}
        href={`/listings/${slug}`}
        stayId={_id}
      />

      {/* Heart/wishlist — top-left */}
      <HeartButton isWishlisted={isWishlisted} onToggle={() => setIsWishlisted(prev => !prev)} />

      {/* Putko Verified badge — top-right */}
      <div className="absolute top-3 right-2 z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md text-[#1A3A2E] font-semibold text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 12L9 17L20 6" stroke="#0A7F3F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.PutkoVerified || "Putko overené"}
        </span>
      </div>

      {/* Contextual badge — bottom-left, above dots */}
      {contextBadge && (
        <div className="absolute bottom-9 left-3 z-10">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm ${contextBadge.color}`}>
            {contextBadge.label}
          </span>
        </div>
      )}
    </div>
  );

  const renderContent = () => (
    <div className="p-4 space-y-2.5 border-l border-r border-b rounded-b-[20px]">

      {/* Property meta: type + bedrooms */}
      {(currentPropertyType || bedroom) && (
        <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-inter">
          {currentPropertyType && <span>{currentPropertyType}</span>}
          {currentPropertyType && bedroom && <span className="text-[#CBD5E1]">·</span>}
          {bedroom && <span>{bedroom} {t.beds || "lôžok"}</span>}
        </div>
      )}

      {/* Name */}
      <h2 className="text-[17px] font-bold text-[#000000] font-fraunces capitalize leading-snug line-clamp-2">
        {name}
      </h2>

      {/* Location */}
      <div className="flex items-center gap-1 text-xs text-[#64748B] font-inter capitalize">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-[#94A3B8] shrink-0">
          <path fillRule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 8c0 2.255 1.19 4.235 2.29 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .19.153l.012.01ZM8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
        </svg>
        <span className="truncate">
          {locationDetails?.city}
          {locationDetails?.city && (locationDetails?.country || true) ? ", " : ""}
          {formatCountry(locationDetails?.country)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-[#F1F5F9]" />

      {/* Price + Rating row */}
      <div className="flex items-end justify-between gap-2">

        {/* Price block */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-bold font-dmsans text-[#2C8360]">€{price}</span>
            <span className="text-xs font-inter font-normal text-[#94A3B8]">/{t.night || "noc"}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#2C8360] text-[10px] font-semibold font-inter w-fit">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L9 17L20 6" stroke="#2C8360" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t.FinalPrice || "Bez poplatkov"}
          </span>
        </div>

        {/* Rating block */}
        <div className="flex items-center gap-1 shrink-0">
          <StarIcon />
          {safeAverage ? (
            <span className="text-sm font-semibold text-[#2A2A2A] font-dmsans">
              {safeAverage.toFixed(1)}
              {reviewCount > 0 && (
                <span className="text-xs font-normal text-[#94A3B8] ml-0.5">({reviewCount})</span>
              )}
            </span>
          ) : (
            <span className="text-xs font-medium text-[#64748B] font-inter">
              {t.New || "Nové"}
            </span>
          )}
        </div>
      </div>

      {/* CTA button: always on mobile, reveal on hover on desktop */}
      <button
        onClick={(e) => { e.stopPropagation(); router.push(`/listings/${slug}`); }}
        className="w-full py-2 rounded-xl bg-[#1A3A2E] text-white text-sm font-semibold font-inter hover:bg-[#2C8360] transition-all duration-200 lg:opacity-0 lg:max-h-0 lg:py-0 lg:overflow-hidden group-hover:opacity-100 group-hover:max-h-10 group-hover:py-2"
      >
        {language === "sk" ? "Zobraziť detail" : "View details"} →
      </button>

    </div>
  );

  return (
    <div
      onClick={() => router.push(`/listings/${slug}`)}
      className={`nc-StayCardFeatured group relative bg-white rounded-[20px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-200 cursor-pointer border border-[#F1F5F9] hover:border-[#2C8360]/40 hover:-translate-y-1 ${className}`}
    >
      {renderSliderGallery()}
      {renderContent()}
    </div>
  );
};

export default StayCardFeatured;
