"use client";

import React from "react";

const Checkbox = ({
  subLabel = "",
  label = "",
  name,
  checked,
  onChange,
}) => {
  return (
    <div className="flex text-sm sm:text-base">
      <input
        id={name}
        name={name}
        type="checkbox"
        className="h-6 w-6 border border-neutral-400 bg-white rounded focus:ring-[#357965] checked:bg-[#357965] checked:border-[#357965] checked:text-white appearance-none"
        checked={checked}
        onChange={(e) => onChange && onChange(e.target.checked)}
      />
      {label && (
        <label
          htmlFor={name}
          className="ml-3.5 flex flex-col flex-1 justify-center"
        >
          <span className="text-neutral-900">{label}</span>
          {subLabel && (
            <p className="mt-1 text-neutral-500 text-sm font-light">
              {subLabel}
            </p>
          )}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
