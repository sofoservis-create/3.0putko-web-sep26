"use client";
import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "@/app/components/NextNavigation";
import GallerySlider from "../../components/GridFeaturePlaces/GallerySlider";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";
import { AuthContext } from "@/app/context/AuthContext";
import {
  addGuestFavorite,
  announceFavoritesChanged,
  getGuestFavorites,
  isTestGuestToken,
  removeGuestFavorite,
} from "@/app/utlis/guestAccountApi";
import { toast } from "react-toastify";

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-400">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const HeartButton = ({ isWishlisted, onToggle }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className="absolute top-3 right-3 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm hover:scale-105 active:scale-95 transition-transform duration-150"
    aria-label="Uložiť do obľúbených"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={isWishlisted ? "#E53E3E" : "none"}
      stroke={isWishlisted ? "#E53E3E" : "#1A3A2E"}
      strokeWidth="2"
      className="w-5 h-5"
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
    locationDetails,
    name,
    slug,
    pricePerNight,
    averageRating,
    reviews = [],
  } = data;

  const translations = { en, sk };
  const { lang, startdate, enddate } = useContext(FormContext);
  const { user, role, token } = useContext(AuthContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const usesSecureGuestFavorites = Boolean(
    user && role === "guest" && isTestGuestToken(token),
  );

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  useEffect(() => {
    if (!usesSecureGuestFavorites) return undefined;
    getGuestFavorites()
      .then(({ favorites }) => setIsWishlisted(favorites.includes(_id)))
      .catch(() => setIsWishlisted(false));
    const sync = (event) => setIsWishlisted((event.detail || []).includes(_id));
    window.addEventListener("putko:favorites-changed", sync);
    return () => window.removeEventListener("putko:favorites-changed", sync);
  }, [_id, usesSecureGuestFavorites]);

  const toggleWishlist = async () => {
    if (!usesSecureGuestFavorites) {
      setIsWishlisted((value) => !value);
      return;
    }
    try {
      const result = isWishlisted
        ? await removeGuestFavorite(_id)
        : await addGuestFavorite(_id);
      announceFavoritesChanged(result.favorites);
      toast.success(
        isWishlisted
          ? language === "en" ? "Removed from saved stays" : "Odstránené z uložených"
          : language === "en" ? "Saved to favorites" : "Uložené do obľúbených",
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const t = translations[language];

  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const safeAverage = typeof averageRating === "number" && averageRating > 0
    ? averageRating
    : null;

  const price = pricePerNight;
  const contextBadge = getContextBadge(averageRating, reviews, pricePerNight, language);
  const hasSelectedDates = Boolean(startdate && enddate);

  const formatCountry = (country) => {
    if (!country) return language === "sk" ? "Slovensko" : "Slovakia";
    const normalized = country.trim().toLowerCase();
    if (normalized === "slovakia" || normalized === "slovak republic") {
      return language === "sk" ? "Slovensko" : "Slovakia";
    }
    return country;
  };

  const renderSliderGallery = () => (
    <div className="relative w-full border-b border-neutral-100">
      <GallerySlider
        uniqueID={`StayCardFeatured_${_id}`}
        ratioClass="aspect-[4/3] sm:aspect-[4/3]"
        galleryImgs={images}
        href={`/listings/${slug}`}
        stayId={_id}
      />

      <HeartButton isWishlisted={isWishlisted} onToggle={toggleWishlist} />

      {/* Putko Verified badge */}
      <div className="absolute top-3 left-3 z-10">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 backdrop-blur-sm shadow-sm text-[#1A3A2E] font-semibold text-[11px]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 12L9 17L20 6" stroke="#0A7F3F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.PutkoVerified || "Putko overené"}
        </span>
      </div>

      {contextBadge && (
        <div className="absolute bottom-3 left-3 z-10">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm ${contextBadge.color}`}>
            {contextBadge.label}
          </span>
        </div>
      )}
    </div>
  );

  const renderContent = () => (
    <div className="p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <h2 className="text-[16px] sm:text-[17px] font-bold text-neutral-900 font-fraunces leading-snug line-clamp-2">
            {name}
          </h2>
          <div className="flex items-center gap-1 text-[13px] text-neutral-500 font-medium">
            <span className="truncate">
              {locationDetails?.city}
              {locationDetails?.city && (locationDetails?.country || true) ? ", " : ""}
              {formatCountry(locationDetails?.country)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1">
            <StarIcon />
            {safeAverage ? (
              <span className="text-[14px] font-semibold text-neutral-900">
                {safeAverage.toFixed(1)}
              </span>
            ) : (
              <span className="text-[13px] font-semibold text-neutral-500">
                {t.New || "Nové"}
              </span>
            )}
          </div>
          {reviewCount > 0 && (
            <span className="text-[11px] text-neutral-500 underline decoration-neutral-300 underline-offset-2 mt-0.5 whitespace-nowrap">
              {reviewCount} {reviewCount === 1 ? (language === "sk" ? "recenzia" : "review") : (language === "sk" ? "recenzií" : "reviews")}
            </span>
          )}
        </div>
      </div>

      {hasSelectedDates && (
        <div className="flex items-center gap-2 bg-[#E8F5EF]/60 rounded-md px-2.5 py-1.5 w-fit">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2C8360] text-white">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L9 17L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-xs font-semibold text-[#1F7559]">
            {language === "sk"
              ? "Dostupné vo vybranom termíne"
              : "Available for selected dates"}
          </span>
        </div>
      )}

      <div className="flex flex-wrap sm:flex-nowrap items-end justify-between gap-3 mt-1">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-[22px] font-bold text-neutral-900 tracking-tight">€{price}</span>
            <span className="text-[13px] text-neutral-500 font-medium">/{t.night || "noc"}</span>
          </div>
          <span className="text-[11px] font-semibold text-[#2C8360] mt-0.5">
            {language === "sk" ? "Konečná cena bez poplatkov" : "Final price, no fees"}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/listings/${slug}`); }}
          className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#1A3A2E] text-white text-[13px] font-semibold hover:bg-[#2C8360] transition-colors active:scale-95 text-center flex items-center justify-center gap-1.5 group/btn"
          style={{ minHeight: "44px" }}
        >
          {language === "sk" ? "Zobraziť" : "View"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-70 group-hover/btn:opacity-100 transition-opacity group-hover/btn:translate-x-0.5 duration-200">
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div
      onClick={() => router.push(`/listings/${slug}`)}
      className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-neutral-200 hover:border-neutral-300 flex flex-col h-full ${className}`}
    >
      {renderSliderGallery()}
      <div className="flex-1 flex flex-col bg-white">
         {renderContent()}
      </div>
    </div>
  );
};

export default StayCardFeatured;
