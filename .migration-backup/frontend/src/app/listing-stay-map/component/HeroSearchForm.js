"use client";

import React from "react";
import StaySearchForm from "./StaySearchForm";

const HeroSearchForm = ({ className = "" }) => {
  return (
    <div className={`nc-HeroSearchForm w-full max-w-7xl py-0 ${className}`}>
      <StaySearchForm />
    </div>
  );
};

export default HeroSearchForm;
