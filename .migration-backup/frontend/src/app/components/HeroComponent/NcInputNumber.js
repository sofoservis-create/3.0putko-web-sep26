"use client"
import React, { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

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
    setValue((state) => state - 1);
    onChange && onChange(value - 1);
  };

  const handleClickIncrement = () => {
    if (max && max <= value) return;
    setValue((state) => state + 1);
    onChange && onChange(value + 1);
  };

  const renderLabel = () => {
    return (
      <div className="flex flex-col">
        <span className="font-medium text-neutral-800">
          {label}
        </span>
        {desc && (
          <span className="text-xs text-neutral-500 font-normal">
            {desc}
          </span>
        )}
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
          className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-400 bg-white focus:outline-none hover:border-neutral-700 disabled:hover:border-neutral-400  disabled:opacity-50 disabled:cursor-default"
          type="button"
          onClick={handleClickDecrement}
          disabled={min >= value}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span>{value}</span>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-400 bg-white focus:outline-none hover:border-neutral-700 disabled:hover:border-neutral-400 disabled:opacity-50 disabled:cursor-default"
          type="button"
          onClick={handleClickIncrement}
          disabled={max ? max <= value : false}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NcInputNumber;
