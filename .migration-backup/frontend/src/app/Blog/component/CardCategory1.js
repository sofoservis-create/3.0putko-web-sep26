import React from "react";
import Link from "next/link"; 
import NcImage from "../../Shared/NcImage/NcImage";

// ✅ Category → Image URL mapping (from Pexels)
const categoryImages = {
  "Travel": "https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg",
  "Food": "https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg",
  "Technology": "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
  "Health": "https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg",
  "Business": "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg",
  "Lifestyle": "https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg",
  "Education": "https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg",
  "Sports": "https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg",
  "Art": "https://images.pexels.com/photos/102127/pexels-photo-102127.jpeg",
  "Science": "https://images.pexels.com/photos/2280547/pexels-photo-2280547.jpeg",

  // ✅ Fallback if category not found
  "default": "https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg",
};

const CardCategory1 = ({
  className = "",
  size = "normal",
  taxonomy,
  onSelectCategory
}) => {
  // Destructure properties with fallback values
  const { count = 0, name, href = "#", thumbnail = "" } = taxonomy || {};

  // ✅ Pick thumbnail → If taxonomy.thumbnail missing, use mapping
  const imageUrl = thumbnail || categoryImages[name] || categoryImages["default"];

  return (
    <Link
      href={href || "#"}
      onClick={(e) => {
        if (onSelectCategory) {
          e.preventDefault(); // stop navigation
          onSelectCategory(name);
        }
      }}
      className={`nc-CardCategory1 flex items-center ${className}`}
      data-nc-id="CardCategory1"
    >
      {/* Render image (from DB or fallback mapping) */}
      {imageUrl && (
        <NcImage
          containerClassName={`flex-shrink-0 ${
            size === "large" ? "w-20 h-20" : "w-12 h-12"
          } rounded-lg mr-4 overflow-hidden`}
          src={imageUrl}
          alt={`${name} thumbnail`}
        />
      )}
      <div>
        <h2
          className={`${
            size === "large" ? "text-lg" : "text-base"
          } nc-card-title text-neutral-900 font-semibold`}
        >
          {name}
        </h2>
        <span
          className={`${
            size === "large" ? "text-sm" : "text-xs"
          } block mt-[2px] text-neutral-500`}
        >
          {count} Blogov
        </span>
      </div>
    </Link>
  );
};

export default CardCategory1;
