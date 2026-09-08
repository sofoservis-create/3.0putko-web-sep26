"use client";

import React, { useContext, useEffect, useState } from "react";
import CardCategory3 from "./CardCategory3";
import Heading from "../../Shared/Heading/Heading";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import PrevBtn from "./PrevBtn";
import NextBtn from "./NextBtn";
import { variants } from "../../utlis/animationVariants";
import { useWindowSize } from "react-use";
import { FormContext } from "../../FormContext";
import { useRouter } from "@/app/components/NextNavigation";
import en from "../../locales/en";
import sk from "../../locales/sk";

// Categories with English and Slovak translations
const DEMO_CATS = [
  {
    id: "1",
    name_en: "Nature House",
    name_sk: "Prírodný dom",
    taxonomy: "category",
    thumbnail:
      "https://i.pinimg.com/originals/2c/a8/1b/2ca81bef9e4b63ec8e65ce453b49241a.jpg",
  },
  { 
    id: "2",
    name_en: "Wooden House",
    name_sk: "Drevený dom",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769439515/accommodations/683ad15a79bd041780c0ecc3/image-2.jpg",
  },
  {
    id: "3",
    name_en: "Houseboats",
    name_sk: "Hausbóty",
    taxonomy: "category",
    thumbnail:
      "https://i.ytimg.com/vi/CBA_-Ij1s38/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGGUgRyg-MA8=&rs=AOn4CLA8ksVAj1ZOwskXMHJ4X8obOdGvFA",
  },
  {
    id: "4",
    name_en: "Farm House",
    name_sk: "Vidiecky dom",
    taxonomy: "category",
    thumbnail:
      "https://images.pexels.com/photos/248837/pexels-photo-248837.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
  },
  {
    id: "5",
    name_en: "Dome House",
    name_sk: "Kupolovitý dom",
    taxonomy: "category",
    thumbnail:
      "https://tse1.mm.bing.net/th/id/OIP.YA-bnh0SHqW6tJCSnyDGIgHaEK?pid=Api",
  },
  {
    id: "6",
    name_en: "Wooden Dome",
    name_sk: "Drevená kupola",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769270593/accommodations/67ee38a70c462ad120de927d/image-21.jpg"
  },
  {
    id: "7",
    name_en: "Apartment",
    name_sk: "Apartmán",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1765444205/dt3njxcbjzs6pmbnmago.jpg",
  },
  {
    id: "8",
    name_en: "Glamping",
    name_sk: "Glamping",
    taxonomy: "category",
    thumbnail:
      "https://tse2.mm.bing.net/th/id/OIP.N1qfa51sLhkhgqR2abjQiAHaE8?pid=Api&P=0&h=220",
  },
  {
    id: "9",
    name_en: "Cottages",
    name_sk: "Chaty",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1748949050/w0d80djlm092lcurdhgw.jpg",
  },
  {
    id: "10",
    name_en: "Motels/Hostel",
    name_sk: "Motel/Hostel",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769421954/accommodations/68e695f88a1c4901f0487f14/image-25.jpg",
  },
  {
    id: "11",
    name_en: "Wooden Houses",
    name_sk: "Drevené domy",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769361815/accommodations/68e696038a1c4901f0487f28/image-1.jpg", 
  },
  {
    id: "12",
    name_en: "Guest Houses",
    name_sk: "Penzióny",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769423316/accommodations/68ca9f23d8c8a518ed913734/image-1.jpg",
  },
  {
    id: "13",
    name_en: "Secluded Accommodation",
    name_sk: "Osamotené ubytovanie",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769355151/accommodations/68c1be0a190c2977d1013401/image-1.jpg",
  },
  {
    id: "14",
    name_en: "Hotels",
    name_sk: "Hotely",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769420114/accommodations/68fa412fbdaa53df2579b824/image-2.jpg",
  },
  {
    id: "15",
    name_en: "Dormitories",
    name_sk: "Internáty",
    taxonomy: "category",
    thumbnail:
      "/Dormitories.jpg",
  },
  {
    id: "16",
    name_en: "Campsites",
    name_sk: "Kempingy",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769436601/accommodations/685a9ca6b9bd0788c3bae6d1/image-1.jpg",
  },
  {
    id: "17",
    name_en: "Treehouses",
    name_sk: "Domy na strome",
    taxonomy: "category",
    thumbnail:
      "/treehouse.jpg",
  },
  {
    id: "18",
    name_en: "Rooms",
    name_sk: "Izby",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769422302/accommodations/68de116ad06ab4e0dfaa6382/image-1.jpg",
  },
  {
    id: "19",
    name_en: "Entire Homes",
    name_sk: "Celé domy",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1769419016/accommodations/691220c1d09260a2f8051685/image-1.jpg",
  },
  {
    id: "20",
    name_en: "Luxury Accommodation",
    name_sk: "Luxusné ubytovanie",
    taxonomy: "category",
    thumbnail:
      "https://res.cloudinary.com/dekgv22nb/image/upload/v1743576422/tuouelbnsntlfnmzlkwa.jpg",
  },
];


const SectionSliderNewCategories = ({
  heading = "Suggestions for discovery",
  className = "",
  itemClassName = "",
  categories = DEMO_CATS,
  itemPerRow = 5,
  categoryCardType = "card3",
  sliderStyle = "style1",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { drop, updatedrop, lang } = useContext(FormContext);
  const [numberOfItems, setNumberOfItems] = useState(0);
  const router = useRouter();

  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  heading = t.Explorebytypesofstays;

  const windowWidth = useWindowSize().width;
  useEffect(() => {
    if (windowWidth < 320) return setNumberOfItems(1);
    if (windowWidth < 500) return setNumberOfItems(itemPerRow - 3);
    if (windowWidth < 1024) return setNumberOfItems(itemPerRow - 2);
    if (windowWidth < 1280) return setNumberOfItems(itemPerRow - 1);
    setNumberOfItems(itemPerRow);
  }, [itemPerRow, windowWidth]);

  function changeItemId(newVal) {
    setDirection(newVal > currentIndex ? 1 : -1);
    setCurrentIndex(newVal);
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < categories.length - 1) {
        changeItemId(currentIndex + 1);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        changeItemId(currentIndex - 1);
      }
    },
    trackMouse: true,
  });

  const renderCard = (item) => {
    const handleCardClick = () => {
      updatedrop(item.name_en); // Always store English name in updatedrop
      router.push("/listing-stay-map");
    };

    return (
      <div onClick={handleCardClick}>
        <CardCategory3 taxonomy={{ ...item, name: language === "sk" ? item.name_sk : item.name_en }} />
      </div>
    );
  };

  if (!numberOfItems) return null;

  return (
    <div className={`nc-SectionSliderNewCategories ${className}`}>
      <Heading desc="" isCenter={sliderStyle === "style2"}>{heading}</Heading>
      <MotionConfig
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
      >
        <div className="relative flow-root" {...handlers}>
          <div className="flow-root overflow-hidden rounded-xl">
            <motion.ul initial={false} className="relative -mx-2 whitespace-nowrap xl:-mx-4">
              <AnimatePresence initial={false} custom={direction}>
                {categories.map((item, indx) => (
                  <motion.li
                    className={`relative inline-block px-2 xl:px-4 ${itemClassName}`}
                    custom={direction}
                    initial={{ x: `${(currentIndex - 1) * -100}%` }}
                    animate={{ x: `${currentIndex * -100}%` }}
                    variants={variants(200, 1)}
                    key={indx}
                    style={{ width: `calc(1/${numberOfItems} * 100%)` }}
                  >
                    {renderCard(item)}
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          </div>

          {currentIndex > 0 && (
            <PrevBtn
              style={{ transform: "translate3d(0, 0, 0)" }}
              onClick={() => changeItemId(currentIndex - 1)}
              className="w-9 h-9 xl:w-12 xl:h-12 text-lg absolute -left-3 xl:-left-6 top-1/3 -translate-y-1/2 z-[1]"
            />
          )}

          {categories.length > currentIndex + numberOfItems && (
            <NextBtn
              style={{ transform: "translate3d(0, 0, 0)" }}
              onClick={() => changeItemId(currentIndex + 1)}
              className="w-9 h-9 xl:w-12 xl:h-12 text-lg absolute -right-3 xl:-right-6 top-1/3 -translate-y-1/2 z-[1]"
            />
          )}
        </div>
      </MotionConfig>
    </div>
  );
};

export default SectionSliderNewCategories;
