"use client";
import React, { useContext } from "react";
import { useRouter } from "@/app/components/NextNavigation";
import GallerySlider from "./GallerySlider";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";

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
  const { lang } = useContext(FormContext);
  const language = lang || "sk";

  const t = translations[language];

  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const safeAverage = typeof averageRating === "number" ? averageRating : 0.0;
  
  // Format price
  const price = pricePerNight; 


  const formatCountry = (country) => {
    if (!country) return language === "sk" ? "Slovensko" : "Slovakia";

    const normalized = country.trim().toLowerCase();

    if (normalized === "slovakia" || normalized === "slovak republic") {
      return language === "sk" ? "Slovensko" : "Slovakia";
    }

    return country; // other countries stay as they are
  };

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
         <GallerySlider
          uniqueID={`StayCardFeatured_${_id}`}
          ratioClass="aspect-[3/2]"
          galleryImgs={images}
          href={`/listings/${slug}`}
          stayId={_id}
        />
        
        {/* Badge - Top Right */}
        <div className="absolute top-4 right-1 z-10">
          <span
            className="inline-flex items-center gap-2
                      w-auto h-[38px] px-4 py-2 rounded-[50px]
                      bg-white shadow-[0_4px_12px_0_rgba(0,0,0,0.1)]
                      text-[#1A3A2E] font-semibold text-[13.6px]"
          >
            

            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M4 12L9 17L20 6"
                stroke="#0A7F3F"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t.PutkoVerified || "Putko overené"}
          </span>
          
        </div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <h2 className="text-[22px] font-bold text-[#000000] font-fraunces capitalize truncate">
            {name}
          </h2>
          <div className="text-sm text-[#64748B] font-inter truncate capitalize">
            {locationDetails?.city}
            {locationDetails?.city && (locationDetails?.country || true) ? ", " : ""}
            {formatCountry(locationDetails?.country)}
          </div>
        </div>

        {/* Divider Line */}
        <div className="border-t-[0.8px] border-[#2A2A2A0F]" />
        
        <div className="flex items-center justify-between pt-2">
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-dmsans text-[#2C8360]">€{price}</span>
                <span className="text-sm font-inter font-normal text-[#64748B]">/{t.night}</span>
            </div>

              <a
                href={`/listings/${slug}#reviews`}
                onClick={(e) => e.stopPropagation()} // 👈 prevents card click conflict
                className="flex items-center gap-1 text-base font-medium text-[#2A2A2A] font-dmsans cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-500">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
                {safeAverage > 0 ? safeAverage.toFixed(1) : "4.9"}
            </a>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={() => router.push(`/listings/${slug}`)}
      className={`nc-StayCardFeatured group relative bg-white border border-neutral-100 rounded-[20px] overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer ${className}`}
    >
      {renderSliderGallery()}
      {renderContent()}
    </div>
  );
};

export default StayCardFeatured;
