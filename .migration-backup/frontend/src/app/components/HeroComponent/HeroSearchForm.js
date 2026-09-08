"use client";

import React from "react";
import StaySearchForm from "./StaySearchForm";
import MobileStaySearchForm from "./MobileStaySearchForm";

const HeroSearchForm = ({ className = "" }) => {
  return (
    <div className={`nc-HeroSearchForm w-full max-w-8xl py-2 lg:py-0 ${className}`}>
      <div className="hidden md:block">
        <StaySearchForm />
      </div>
      <div className="md:hidden">
        <MobileStaySearchForm />
      </div>
    </div>
  );
};

export default HeroSearchForm;
