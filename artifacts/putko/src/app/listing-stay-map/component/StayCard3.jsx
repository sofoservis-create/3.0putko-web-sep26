import React from "react";
import Link from "@/app/components/NextLink";
import StartRating from "@/app/listings/component/StartRating";

const StayCard3 = ({ data, className = "" }) => {
  
  
  const {
    _id, // Using _id as the propertyId
    images = [],
    name,
    description,
    slug,
    averageRating,
    reviews = [],
    // priceMonThus,
  } = data;

  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const safeAverage = typeof averageRating === "number" ? averageRating : 0.0;

  return (
    <div className={`flex rounded-lg overflow-hidden ${className}`}>
      {/* Left: Image */}
      <div className="relative w-1/3">
        <img
          src={images[0]}
          alt={name}
          className="object-cover w-full h-full"
        />
       
      </div>

      {/* Right: Content */}
      <Link
        href={`/listings/${slug}`}
        className="w-2/3 p-4 transition hover:bg-gray-100"
      >
        <h2 className="text-lg font-semibold line-clamp-1">{name}</h2>
        <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-lg font-bold">
            {/* €{priceMonThus}/{t.night} */}
            </span>
          <div className="flex items-center text-sm text-yellow-500">
            <StartRating reviewCount={reviewCount} averageRating={safeAverage}/>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default StayCard3;
