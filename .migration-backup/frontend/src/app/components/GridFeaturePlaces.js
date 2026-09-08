"use client";
import React, { useContext, useEffect, useState } from "react";
import StayCardFeatured from "./GridFeaturePlaces/StayCardFeatured";
import { FormContext } from "../FormContext";
import useFetchData from "../hooks/useFetchData";
import en from "../locales/en";
import sk from "../locales/sk";
import SkeletonCard from "../Shared/SkeletonCard";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

const DEMO_STAYS = [
  {
    _id: "demo-1",
    name: "Panoramatická vila Bratislava",
    slug: "demo-1",
    images: ["/bratislava.avif", "/House.avif", "/bila.avif"],
    locationDetails: { city: "Bratislava", country: "Slovensko" },
    propertyType: { name: "Vila" },
    pricePerNight: 145,
    averageRating: 4.9,
    reviews: [1, 2, 3, 4, 5],
    stripeEnabled: false,
  },
  {
    _id: "demo-2",
    name: "Historický apartmán Košice",
    slug: "demo-2",
    images: ["/kosice.avif", "/bila.avif", "/House.avif"],
    locationDetails: { city: "Košice", country: "Slovensko" },
    propertyType: { name: "Apartmán" },
    pricePerNight: 89,
    averageRating: 4.8,
    reviews: [1, 2, 3, 4],
    stripeEnabled: false,
  },
  {
    _id: "demo-3",
    name: "Horský dom Banská Bystrica",
    slug: "demo-3",
    images: ["/Banska_Bystrica.avif", "/House.avif", "/bila.avif"],
    locationDetails: { city: "Banská Bystrica", country: "Slovensko" },
    propertyType: { name: "Dom" },
    pricePerNight: 112,
    averageRating: 5.0,
    reviews: [1, 2, 3, 4, 5, 6],
    stripeEnabled: false,
  },
  {
    _id: "demo-4",
    name: "Útulný byt Žilina",
    slug: "demo-4",
    images: ["/zilina.avif", "/bila.avif", "/House.avif"],
    locationDetails: { city: "Žilina", country: "Slovensko" },
    propertyType: { name: "Byt" },
    pricePerNight: 74,
    averageRating: 4.7,
    reviews: [1, 2, 3],
    stripeEnabled: false,
  },
  {
    _id: "demo-5",
    name: "Luxusný dom Trenčín",
    slug: "demo-5",
    images: ["/trencin.avif", "/House.avif", "/bila.avif"],
    locationDetails: { city: "Trenčín", country: "Slovensko" },
    propertyType: { name: "Dom" },
    pricePerNight: 130,
    averageRating: 4.9,
    reviews: [1, 2, 3, 4, 5],
    stripeEnabled: false,
  },
  {
    _id: "demo-6",
    name: "Moderný apartmán Poprad",
    slug: "demo-6",
    images: ["/poprad.avif", "/bila.avif", "/House.avif"],
    locationDetails: { city: "Poprad", country: "Slovensko" },
    propertyType: { name: "Apartmán" },
    pricePerNight: 98,
    averageRating: 4.8,
    reviews: [1, 2, 3, 4],
    stripeEnabled: false,
  },
];

const GridFeaturePlaces = ({
  gridClass = "",
  heading = "",
  subHeading = "",
  headingIsCenter,
  tabs = [],
}) => {
  const [stayListings, setStayListings] = useState([]);
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const translations = { en, sk };
  const t = translations[language];

  const { data: accommodationData, loading } = useFetchData(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/recommended`
  );

  useEffect(() => {
    if (Array.isArray(accommodationData) && accommodationData.length > 0) {
      setStayListings(accommodationData);
    } else if (!loading && Array.isArray(accommodationData) && accommodationData.length === 0) {
      setStayListings(DEMO_STAYS);
    }
  }, [accommodationData, loading]);

  const [displayCount, setDisplayCount] = useState(6);

  const handleShowMore = () => {
    setDisplayCount((prev) => prev + 6);
  };

  const renderCard = (stay) => <StayCardFeatured key={stay._id} data={stay} />;

  const sectionHeading = t.RecommendedStay || "Recommended stay";

  return (
    <div className="relative nc-SectionGridFeaturePlaces py-8 lg:py-14 container mx-auto px-4">
      {/* Header */}
      <div className="flex items-end justify-between mb-12">
        <h2 className="text-3xl md:text-5xl font-bold font-fraunces text-[#1A3A2E]">
          {sectionHeading}
        </h2>
        <div className="hidden sm:block flex-shrink-0">
          <Link
            href="/listing-stay-map"
            className="flex items-center text-[#2C8360] font-dmsans font-semibold text-base hover:text-[#246b4e] transition-colors"
          >
            {t.Viewall || "View all"}
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>

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
          <p className="text-lg text-gray-500">{t.Noaccommodationfound}</p>
        </div>
      )}

      {/* Show All Listing Button */}
      {stayListings.length > displayCount && (
        <div className="flex items-center justify-center mt-6">
          <Link href="/listing-stay-map">
          <button
            // onClick={handleShowMore}
            className="bg-[#238869] hover:bg-[#1f775d] font-inter text-white text-base font-semibold px-8 py-4 rounded-2xl shadow-[0px_8px_20px_0px_#4FBE9F40] transition-all"
          >
            {t.ShowAllListing || "show all listing"}
          </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default GridFeaturePlaces;