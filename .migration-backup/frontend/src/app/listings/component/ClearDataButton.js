"use client";

import { X } from "lucide-react";
import React from "react";

const ClearDataButton = ({ onClick }) => {
  return (
    <span
      onClick={() => onClick && onClick()}
      className="absolute z-10 flex items-center justify-center w-5 h-5 text-sm transform -translate-y-1/2 rounded-full lg:w-6 lg:h-6 bg-neutral-200 right-1 lg:right-3 top-1/2"
    >
      <X className="w-4 h-4" />
    </span>
  );
};

export default ClearDataButton;
