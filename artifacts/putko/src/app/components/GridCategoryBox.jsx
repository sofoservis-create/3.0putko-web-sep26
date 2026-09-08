"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/app/components/NextNavigation";
import { FormContext } from "../FormContext";
import Link from "@/app/components/NextLink";
import en from "../locales/en";
import sk from "../locales/sk";
import useFetchData from "../hooks/useFetchData";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import CardCategorySlider from "./CardCategorySlider";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { createSearchKey, resolveCanonicalCity } from "../utils/searchNormalization";

const DEMO_CATS = [
  { id: "1", name: "Bratislava", taxonomy: "category", count: 0, thumbnail: "/bratislava.avif" },
  { id: "2", name: "Košice", taxonomy: "category", count: 0, thumbnail: "/kosice.avif" },
  { id: "3", name: "Banská Bystrica", taxonomy: "category", count: 0, thumbnail: "/Banska_Bystrica.avif" },
  { id: "4", name: "Trenčín", taxonomy: "category", count: 0, thumbnail: "/trencin.avif" },
  { id: "5", name: "Žilina", taxonomy: "category", count: 0, thumbnail: "/zilina.avif" },
  { id: "6", name: "Prešov", taxonomy: "category", count: 0, thumbnail: "/presov.avif" },
  { id: "7", name: "Trnava", taxonomy: "category", count: 0, thumbnail: "/trnava.avif" },
  { id: "8", name: "Nitra", taxonomy: "category", count: 0, thumbnail: "/nitra.avif" },
];

const SectionGridCategoryBox = ({
  categories = DEMO_CATS,
  className = "",
}) => {
  const {
    updateCity, updatestartdate, updatendate, updateperson,
    updateAdults, updateChildren, updateInfants, updateAccommodationName,
    lang,
  } = useContext(FormContext);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { data: cityCounts } = useFetchData(
    `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodation/counts-by-city`
  );

  const sortedCategories = useMemo(() => {
    return categories
      .map((item) => {
        const cityCount = Array.isArray(cityCounts)
          ? cityCounts.find((entry) => createSearchKey(entry.city) === createSearchKey(item.name))?.count || 0
          : 0;
        return { ...item, count: cityCount };
      })
      .sort((a, b) => b.count - a.count);
  }, [categories, cityCounts]);

  const handleCardClick = async (cityName) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      updatestartdate(""); updatendate(""); updateperson("");
      updateAdults(0); updateChildren(0); updateInfants(0); updateAccommodationName("");

      const keysToRemove = ["checkin", "checkout", "guestValues", "guestAdults", "guestChildren", "guestInfants", "selectedAccommodation"];
      keysToRemove.forEach(k => localStorage.removeItem(k));

      const canonicalCity = resolveCanonicalCity(cityName);
      updateCity(canonicalCity);
      localStorage.setItem("selectedCity", canonicalCity);
      router.push(`/listing-stay-map`);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const headingText = t.Populardestinations || "Populárne destinácie";

  return (
    <div className={`nc-SectionGridCategoryBox relative py-12 lg:py-20 container mx-auto px-4 max-w-7xl ${className}`}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 lg:mb-10 gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] leading-tight">
            {headingText}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/listing-stay-map" className="hidden sm:flex items-center text-[#238869] font-inter font-semibold hover:text-[#1A3A2E] transition-colors">
            {t.Viewall || "Zobraziť všetky"}
            <ArrowRightIcon className="w-4 h-4 ml-1.5" />
          </Link>

          {/* Custom Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <button className="prev-btn w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors text-neutral-600 disabled:opacity-50">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button className="next-btn w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors text-neutral-600 disabled:opacity-50">
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="relative group">
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: ".prev-btn",
            nextEl: ".next-btn",
          }}
          spaceBetween={16}
          slidesPerView={1.2}
          loop={false}
          breakpoints={{
            480: { slidesPerView: 2.2, spaceBetween: 16 },
            768: { slidesPerView: 3.2, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 24 },
          }}
          className="!pb-6"
        >
          {sortedCategories.map((item) => (
            <SwiperSlide key={item.id}>
              <CardCategorySlider
                taxonomy={item}
                onClick={() => handleCardClick(item.name)}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Mobile View All */}
      <div className="mt-4 flex justify-center sm:hidden">
        <Link href="/listing-stay-map" className="flex items-center justify-center w-full py-3 px-6 rounded-xl border border-neutral-200 text-[#1A3A2E] font-inter font-semibold hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
          {t.Viewall || "Zobraziť všetky"}
        </Link>
      </div>
    </div>
  );
};

export default SectionGridCategoryBox;
