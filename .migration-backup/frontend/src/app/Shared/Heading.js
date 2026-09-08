import React from "react";

const Heading = ({
  children,
  desc = "",
  className = "mb-10 text-neutral-900",
  isCenter = false,
  ...args
}) => {
  return (
    <div className={`nc-Section-Heading relative ${className}`}>
      <div
        className={
          isCenter ? "text-center w-full max-w-2xl mx-auto mb-4" : "max-w-2xl"
        }
      >
        <h2 className={`text-3xl md:text-4xl font-semibold`} {...args}>
          {children || `Section Heading`}
        </h2>
        {desc && (
          <span className="block mt-2 md:mt-3 font-normal text-base sm:text-lg text-neutral-500">
            {desc}
          </span>
        )}
      </div>
    </div>
  );
};

export default Heading;
