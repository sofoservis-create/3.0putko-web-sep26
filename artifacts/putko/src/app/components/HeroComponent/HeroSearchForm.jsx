"use client";

import React from "react";
import StaySearchForm from "./StaySearchForm";
import MobileStaySearchForm from "./MobileStaySearchForm";

const HeroSearchForm = ({
  className = "",
  stats,
  displayCount,
  ratingLabel,
  verifiedLabel,
}) => {
  const statsFooter = (
    <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap px-1 pt-3 pb-1 font-inter text-[10px] text-[#4A5D54] sm:gap-3 sm:text-[11px]">
      <span className="inline-flex min-w-0 items-center gap-1">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <strong className="text-[#112A22]">{stats?.averageRating}</strong>
        <span>{stats?.totalReviews}+ {ratingLabel}</span>
      </span>
      <span className="h-3.5 w-px shrink-0 bg-[#DCEAE5]" aria-hidden="true" />
      <span>
        <strong className="font-fraunces text-[12px] text-[#238869] sm:text-[13px]">{displayCount}</strong>{" "}
        <span className="font-semibold text-[#112A22]">{verifiedLabel}</span>
      </span>
    </div>
  );

  return (
    <div className={`nc-HeroSearchForm w-full max-w-8xl py-2 lg:py-0 ${className}`}>
      <div className="hidden md:block">
        <StaySearchForm />
      </div>
      <div className="md:hidden">
        <MobileStaySearchForm statsFooter={statsFooter} />
      </div>
    </div>
  );
};

export default HeroSearchForm;
