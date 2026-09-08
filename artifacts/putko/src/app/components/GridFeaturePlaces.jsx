"use client";
import React, { useContext, useEffect, useState } from "react";
import StayCardFeatured from "./GridFeaturePlaces/StayCardFeatured";
import { FormContext } from "../FormContext";
import useFetchData from "../hooks/useFetchData";
import en from "../locales/en";
import sk from "../locales/sk";
import SkeletonCard from "../Shared/SkeletonCard";
import Link from "@/app/components/NextLink";
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
}) => {
  const [stayListings, setStayListings] = useState([]);
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const translations = { en, sk };
  const t = translations[language];

  const { data: accommodationData, loading } = useFetchData(
    `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodation/recommended`
  );

  useEffect(() => {
    if (Array.isArray(accommodationData) && accommodationData.length > 0) {
      setStayListings(accommodationData);
    } else if (!loading && Array.isArray(accommodationData) && accommodationData.length === 0) {
      setStayListings(DEMO_STAYS);
    }
  }, [accommodationData, loading]);

  const [displayCount, setDisplayCount] = useState(6);

  const renderCard = (stay) => <StayCardFeatured key={stay._id} data={stay} />;

  const sectionHeading = t.RecommendedStay || "Odporúčané ubytovania";

  return (
    <div className="relative py-12 lg:py-24 container mx-auto px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 lg:mb-12 gap-6">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] leading-tight">
          {sectionHeading}
        </h2>
        <div className="hidden sm:block flex-shrink-0">
          <Link href="/listing-stay-map" className="flex items-center text-[#238869] font-inter font-semibold hover:text-[#1A3A2E] transition-colors">
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

      {/* Show More / View All Button */}
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

export default GridFeaturePlaces;
