"use client";
import React, { useEffect, useState } from "react";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";

const NcInputNumber = ({
  className = "w-full",
  defaultValue = 0,
  min = 0,
  max,
  onChange,
  label,
  desc,
  totalGuests,
  person, // Maximum allowed guests
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleClickDecrement = () => {
    if (min >= value) return; // Prevent decrement if value is at min
    setValue((state) => {
      const newValue = state - 1;
      onChange && onChange(newValue);
      return newValue;
    });
  };

  const handleClickIncrement = () => {
    if (max && max <= value) return; // Prevent increment if value is at max
    if (totalGuests >= person) return; // Prevent increment if total guests reach the limit
    setValue((state) => {
      const newValue = state + 1;
      onChange && onChange(newValue);
      return newValue;
    });
  };

  const renderLabel = () => {
    return (
      <div className="flex flex-col">
        <span className="font-medium text-neutral-800">{label}</span>
        {desc && <span className="text-xs font-normal text-neutral-500">{desc}</span>}
      </div>
    );
  };

  return (
    <div className={`nc-NcInputNumber flex items-center justify-between space-x-5 ${className}`} data-nc-id="NcInputNumber">
      {label && renderLabel()}
      <div className="flex items-center justify-between nc-NcInputNumber w-28">
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[#357965] bg-white focus:outline-none hover:border-neutral-500 disabled:hover:border-neutral-400 disabled:opacity-50 disabled:cursor-default"
          type="button"
          onClick={handleClickDecrement}
          disabled={min >= value}
        >
          <MinusIcon className="w-4 h-4 text-[#357965]" />
        </button>
        <span>{value}</span>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[#357965] bg-white focus:outline-none hover:border-neutral-500 disabled:hover:border-neutral-400 disabled:opacity-50 disabled:cursor-default"
          type="button"
          onClick={handleClickIncrement}
          disabled={max ? max <= value || totalGuests >= person : totalGuests >= person}
        >
          <PlusIcon className="w-4 h-4 text-[#357965]" />
        </button>
      </div>
    </div>
  );
};

export default NcInputNumber;
