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
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleClickDecrement = () => {
    if (min >= value) return;
    const newValue = value - 1;
    setValue(newValue);
    onChange && onChange(newValue);
  };

  const handleClickIncrement = () => {
    if (max && max <= value) return;
    const newValue = value + 1;
    setValue(newValue);
    onChange && onChange(newValue);
  };

  const handleInputChange = (e) => {
    const inputValue = parseInt(e.target.value, 10);

    if (isNaN(inputValue)) {
      setValue("");
      return;
    }

    if ((min !== undefined && inputValue < min) || (max !== undefined && inputValue > max)) {
      return;
    }

    setValue(inputValue);
    onChange && onChange(inputValue);
  };

  const renderLabel = () => {
    return (
      <div className="flex flex-col">
        <span className="font-medium text-neutral-800">{label}</span>
        {desc && <span className="text-xs text-neutral-500 font-normal">{desc}</span>}
      </div>
    );
  };

  return (
    <div
      className={`nc-NcInputNumber flex items-center justify-between space-x-5 ${className}`}
      data-nc-id="NcInputNumber"
    >
      {label && renderLabel()}

      <div
        className={`nc-NcInputNumber flex items-center justify-between w-28`}
      >
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[#357965] bg-white focus:outline-none hover:border-neutral-500 disabled:hover:border-neutral-400 disabled:opacity-50 disabled:cursor-default"
          type="button"
          onClick={handleClickDecrement}
          disabled={min >= value}
        >
          <MinusIcon className="w-4 h-4 text-[#357965]" />
        </button>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="w-8 text-center border-none focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          min={min}
          max={max}
        />
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[#357965] bg-white focus:outline-none hover:border-neutral-500 disabled:hover:border-neutral-400 disabled:opacity-50 disabled:cursor-default"
          type="button"
          onClick={handleClickIncrement}
          disabled={max ? max <= value : false}
        >
          <PlusIcon className="w-4 h-4 text-[#357965]" />
        </button>
      </div>
    </div>
  );
};

export default NcInputNumber;
