"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormContext } from "../FormContext";
import Link from "next/link";
import en from "../locales/en";
import sk from "../locales/sk";
import useFetchData from "../hooks/useFetchData";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import CardCategorySlider from "./CardCategorySlider";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

const DEMO_CATS = [
  {
    id: "1",
    name: "Bratislava",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/bratislava.avif",
  },
  {
    id: "2",
    name: "Košice",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/kosice.avif",
  },
  {
    id: "3",
    name: "Banská Bystrica",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/Banska_Bystrica.avif",
  },
  {
    id: "4",
    name: "Trenčín",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/trencin.avif",
  },
  {
    id: "5",
    name: "žilina",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/zilina.avif",
  },
  {
    id: "6",
    name: "prešov",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/presov.avif",
  },
  {
    id: "7",
    name: "trnava",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/trnava.avif",
  },
  {
    id: "8",
    name: "Nitra",
    taxonomy: "category",
    count: 0,
    thumbnail:
      "/nitra.avif",
  },
  {
    id: "9",
    name: "Poprad",
    taxonomy: "category",
    count: 0,
    thumbnail: "/poprad.avif",
  },
  {
    id: "10",
    name: "Martin",
    taxonomy: "category",
    count: 0,
    thumbnail: "/martin-city.avif",
  },
  {
    id: "11",
    name: "Ružomberok",
    taxonomy: "category",
    count: 0,
    thumbnail: "/Ružomberok.avif",
  },
  {
    id: "12",
    name: "Spišská Nová Ves",
    taxonomy: "category",
    count: 0,
    thumbnail: "/Spišská-Nová-Ves.avif",
  },  
];

const SectionGridCategoryBox = ({
  categories = DEMO_CATS,
  headingCenter = false, // Changed default to false to match design
  className = "",
  gridClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}) => {
  const {
    updateCity,
    updatestartdate,
    updatendate,
    updateperson,
    updateAdults,
    updateChildren,
    updateInfants,
    updateAccommodationName,
    city,
    lang,
  } = useContext(FormContext);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  // 🔥 CALL YOUR COUNT API
  const { data: cityCounts } = useFetchData(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/counts-by-city`
  );

  // 🔥 helper to get count
  const getCityCount = (cityName) => {
    if (!Array.isArray(cityCounts)) return 0;

    const found = cityCounts.find(
      (c) => c.city.toLowerCase() === cityName.toLowerCase()
    );

    return found ? found.count : 0;
  };

  const handleCardClick = async (cityName) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Browsing a popular destination is a fresh search: drop any leftover
      // check-in / check-out and guest values, otherwise they keep narrowing
      // (and disturbing) the results for the city that was just clicked.
      updatestartdate("");
      updatendate("");
      updateperson("");
      updateAdults(0);
      updateChildren(0);
      updateInfants(0);
      updateAccommodationName("");

      localStorage.removeItem("checkin");
      localStorage.removeItem("checkout");
      localStorage.removeItem("guestValues");
      localStorage.removeItem("guestAdults");
      localStorage.removeItem("guestChildren");
      localStorage.removeItem("guestInfants");
      localStorage.removeItem("selectedAccommodation");

      updateCity(cityName);
      localStorage.setItem("selectedCity", cityName);

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
  const headingText = t.Populardestinations || "Popular destinations";
  const [firstWord, ...rest] = headingText.split(" ");

  return (
    <div
      className={`nc-SectionGridCategoryBox relative py-8 lg:py-14 container mx-auto px-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 lg:mb-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-[56px] md:leading-[61.6px] font-bold font-fraunces text-[#1A3A2E] leading-tight whitespace-nowrap">
            {headingText}
          </h2>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Link href="/listing-stay-map" className="flex items-center text-[#2C8360] font-medium hover:text-[#246b4e] transition-colors">
            {t.Viewall || "View all"}
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <Swiper
          modules={[Navigation]}
          navigation={{
            prevEl: ".prev-btn",
            nextEl: ".next-btn",
          }}
          spaceBetween={20}
          slidesPerView={1.2}
          centeredSlides={true}
          loop={false}
          breakpoints={{
            640: {
              slidesPerView: 2.2,
              spaceBetween: 20,
              centeredSlides: false,
            },
            1024: {
              slidesPerView: 3.2,
              spaceBetween: 24,
              centeredSlides: false,
            },
            1200: {
              slidesPerView: 4,
              spaceBetween: 24,
              centeredSlides: false,
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 24,
              centeredSlides: false,
            },
          }}
        >
          {DEMO_CATS.map((item, i) => {
            const count = getCityCount(item.name);
            return (
              <SwiperSlide key={i}>
                <CardCategorySlider
                  taxonomy={{
                    ...item,
                    ...(count > 0 && { count }), // ✅ only include if > 0
                  }}
                  onClick={() => handleCardClick(item.name.toLowerCase())}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>

        {/* Mobile View All */}
        <div className="mt-8 flex justify-center sm:hidden">
          <Link href="/listing-stay-map" className="flex items-center text-[#2C8360] font-medium hover:text-[#246b4e] transition-colors">
            {t.Viewall || "View all"}
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SectionGridCategoryBox;
