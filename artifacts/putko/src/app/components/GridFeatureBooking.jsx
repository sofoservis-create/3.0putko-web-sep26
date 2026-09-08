"use client";
import React, { useEffect, useState, useContext } from "react";
import StayCardFeatured from "./GridFeaturePlaces/StayCardFeatured";
import useFetchData from "../hooks/useFetchData";
import SkeletonCard from "../Shared/SkeletonCard";
import Link from "@/app/components/NextLink";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";

const GridFeatureBooking = ({
  gridClass = "",
}) => {
  const { lang } = useContext(FormContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  const [stayListings, setStayListings] = useState([]);
  const [displayCount, setDisplayCount] = useState(6);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  // Fetch all accommodations
  const { data: accommodationData, loading } = useFetchData(
    `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodation/latest`
  );

  useEffect(() => {
    if (accommodationData) setStayListings(accommodationData);
  }, [accommodationData]);

  const renderCard = (stay) => <StayCardFeatured key={stay._id} data={stay} />;

  return (
    <div className="relative py-12 lg:py-24 container mx-auto px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 lg:mb-12 gap-6">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] leading-tight">
          {t.Otherbookings || "Najnovšie ponuky"}
        </h2>
        <div className="hidden sm:block flex-shrink-0">
          <Link
            href="/listing-stay-map"
            className="flex items-center text-[#238869] font-inter font-semibold hover:text-[#1A3A2E] transition-colors"
          >
            {t.Viewall || "Zobraziť všetky"}
            <ArrowRightIcon className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className={`grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 ${gridClass}`}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : stayListings.length > 0 ? (
        <div className={`grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 ${gridClass}`}>
          {stayListings.slice(0, displayCount).map(renderCard)}
        </div>
      ) : (
        <div className="flex items-center justify-center py-16 bg-neutral-50 rounded-2xl">
          <p className="text-lg text-neutral-500 font-inter">{t.Noaccommodationfound || "Nenašli sa žiadne ubytovania"}</p>
        </div>
      )}

      {/* Show More Button */}
      {stayListings.length > 0 && !loading && (
        <div className="mt-10 md:mt-14 flex justify-center">
          <Link href="/listing-stay-map" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-[#238869] hover:bg-[#1A3A2E] text-white text-base font-inter font-semibold px-8 py-4 rounded-xl transition-colors">
              {t.ShowAllListing || "Zobraziť všetky ubytovania"}
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default GridFeatureBooking;
