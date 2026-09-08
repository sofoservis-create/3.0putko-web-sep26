"use client";

import Button from "./Button";
import React from "react";

const ButtonSecondary = ({ className = "", ...args }) => {
  return (
    <Button
      className={`ttnc-ButtonSecondary font-medium border bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100 ${className}`}
      {...args}
    />
  );
};

export default ButtonSecondary;
