"use client";

import Button from "./Button";
import React from "react";

const ButtonPrimary = ({ className = "", ...args }) => {
  return (
    <Button
      className={`ttnc-ButtonPrimary disabled:bg-opacity-70 bg-[#357965] hover:bg-[#29725c] text-neutral-50 ${className}`}
      {...args}
    />
  );
};

export default ButtonPrimary;
