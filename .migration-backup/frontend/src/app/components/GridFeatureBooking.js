"use client";
import React, { useEffect, useState, useContext } from "react";
import StayCardFeatured from "./GridFeaturePlaces/StayCardFeatured";
import useFetchData from "../hooks/useFetchData";
import SkeletonCard from "../Shared/SkeletonCard";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";

const GridFeatureBooking = ({
  gridClass = "",
  heading = "",
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
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/latest`
  );

  useEffect(() => {
    if (accommodationData) setStayListings(accommodationData);
  }, [accommodationData]);

  const handleShowMore = () => setDisplayCount((prev) => prev + 6);

  const renderCard = (stay) => <StayCardFeatured key={stay._id} data={stay} />;

  return (
    <div className="relative nc-SectionGridFeaturePlaces pb-16 container mx-auto px-4">
      {/* Header */}
      <div className="flex items-end justify-between mb-12">
        <h2 className="text-3xl md:text-6xl font-bold font-fraunces text-[#0F291E]">
          {t.Otherbookings || "Other bookings"}
        </h2>
        <div className="hidden sm:block flex-shrink-0">
          <Link
            href="/listing-stay-map"
            className="flex items-center text-[#2C8360] font-medium hover:text-[#246b4e] transition-colors"
          >
            {t.Viewall || "View all"}
            <ArrowRightIcon className="w-5 h-5 ml-2" />
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
        <div className="flex items-center justify-center mt-16">
          <p className="text-lg text-gray-500">{t.Noaccommodationfound || "No accommodations found"}</p>
        </div>
      )}

      {/* Show More Button */}
      {stayListings.length > displayCount && !loading && (
        <div className="flex items-center justify-center mt-6">
          <Link href="/listing-stay-map">
          <button
            // onClick={handleShowMore}
            className="bg-[#238869] hover:bg-[#1f775d] text-white text-base font-semibold px-8 py-4 rounded-2xl shadow-[0px_8px_20px_0px_#4FBE9F40] transition-all"
          >
            {t.ShowAllListing || "Show all listing"}
          </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default GridFeatureBooking;