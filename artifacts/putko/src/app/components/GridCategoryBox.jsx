"use client";

import React, { useContext, useEffect, useState } from "react";
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
import { resolveCanonicalCity } from "../utils/searchNormalization";

const SectionGridCategoryBox = ({
  className = "",
}) => {
  const {
    updateCity, updatestartdate, updatendate, updateperson,
    updateAdults, updateChildren, updateInfants, updateAccommodationName,
    lang,
  } = useContext(FormContext);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { data, loading, error } = useFetchData("/api/destinations");
  const destinations = Array.isArray(data?.destinations) ? data.destinations : [];

  const handleCardClick = async (destination) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      updateAccommodationName("");
      localStorage.removeItem("selectedAccommodation");

      const canonicalCity = resolveCanonicalCity(destination.nameSk);
      updateCity(canonicalCity);
      localStorage.setItem("selectedCity", canonicalCity);
      localStorage.setItem("selectedDestination", destination.id);
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
  const headingText = t.PopularDestinations_Title || "Obľúbené destinácie";
  const clearDestination = () => {
    localStorage.removeItem("selectedDestination");
    localStorage.removeItem("selectedCity");
    updateCity("");
  };

  return (
    <div className={`nc-SectionGridCategoryBox relative py-12 lg:py-20 container mx-auto px-4 max-w-7xl ${className}`}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 lg:mb-10 gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-fraunces text-[#1A3A2E] leading-tight">
            {headingText}
          </h2>
          <p className="mt-3 text-base text-[#64776F]">
            {t.PopularDestinations_Subtitle || "Objavte miesta s aktuálne dostupnými pobytmi."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/listing-stay-map" onClick={clearDestination} className="hidden sm:flex items-center text-[#238869] font-inter font-semibold hover:text-[#1A3A2E] transition-colors">
            {t.Viewall || "Zobraziť všetky"}
            <ArrowRightIcon className="w-4 h-4 ml-1.5" />
          </Link>

          {/* Custom Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <button aria-label={language === "en" ? "Previous destinations" : "Predchádzajúce destinácie"} className="prev-btn w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors text-neutral-600 disabled:opacity-50">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button aria-label={language === "en" ? "Next destinations" : "Ďalšie destinácie"} className="next-btn w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors text-neutral-600 disabled:opacity-50">
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="relative group min-h-[210px] sm:min-h-[250px]" aria-live="polite">
        {loading && (
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="aspect-[16/10] min-w-[78%] animate-pulse rounded-2xl bg-neutral-200 sm:min-w-[44%] lg:min-w-[23%]" />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-[#F3F7F5] px-6 text-center text-[#4A5D54]">
            {t.PopularDestinations_Error || "Destinácie sa momentálne nepodarilo načítať."}
          </div>
        )}
        {!loading && !error && destinations.length === 0 && (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-[#F3F7F5] px-6 text-center text-[#4A5D54]">
            {t.PopularDestinations_Empty || "Momentálne nie sú dostupné žiadne destinácie."}
          </div>
        )}
        {!loading && !error && destinations.length > 0 && (
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: ".prev-btn",
            nextEl: ".next-btn",
          }}
          spaceBetween={16}
          slidesPerView={1.22}
          loop={false}
          breakpoints={{
            480: { slidesPerView: 2.2, spaceBetween: 16 },
            768: { slidesPerView: 3.2, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 24 },
          }}
          className="!pb-6"
        >
          {destinations.map((item) => (
            <SwiperSlide key={item.id}>
              <CardCategorySlider
                taxonomy={{
                  ...item,
                  name: language === "en" ? item.nameEn : item.nameSk,
                  thumbnail: item.image,
                }}
                onClick={() => handleCardClick(item)}
              />
            </SwiperSlide>
          ))}
        </Swiper>
        )}
      </div>

      {/* Mobile View All */}
      <div className="mt-4 flex justify-center sm:hidden">
        <Link href="/listing-stay-map" onClick={clearDestination} className="flex items-center justify-center w-full py-3 px-6 rounded-xl border border-neutral-200 text-[#1A3A2E] font-inter font-semibold hover:bg-neutral-50 active:bg-neutral-100 transition-colors">
          {t.Viewall || "Zobraziť všetky"}
        </Link>
      </div>
    </div>
  );
};

export default SectionGridCategoryBox;
