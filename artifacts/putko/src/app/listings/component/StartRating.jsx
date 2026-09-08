"use client";

import React from "react";
import { StarIcon } from "@heroicons/react/24/solid";

const StartRating = ({ className = "", averageRating, reviewCount }) => {
  return (
    <div
      className={`nc-StartRating flex items-center space-x-1 text-sm ${className}`}
      data-nc-id="StartRating"
    >
      <div className="pb-[2px]">
        <StarIcon className="w-[18px] h-[18px] text-orange-500" />
      </div>
      <span className="font-medium">{averageRating.toFixed(1)}</span>
      <span className="text-neutral-500">
        ({reviewCount})
      </span>
    </div>
  );
};

export default StartRating;
