import React from "react";

const Label = ({ className = "", children, required = false }) => {
  return (
    <label
      className={`nc-Label text-sm font-medium text-neutral-700 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

export default Label;
