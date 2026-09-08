import React from "react";
import NextPrev from "./Heading";

const Heading = ({
  children,
  desc = "Discover the most outstanding articles in all topics of life.",
  className = "mb-10 md:mb-12 text-neutral-900",
  isCenter = false,
  hasNextPrev = false,
  ...args
}) => {
  return (
    <div
      className={`nc-Section-Heading relative flex flex-col sm:flex-row sm:items-end justify-between ${className}`}
    >
      <div
        className={
          isCenter ? "text-center w-full max-w-2xl mx-auto mb-4" : "max-w-2xl"
        }
      >
        <h2 className={`text-3xl md:text-4xl font-semibold`} {...args}>
          {children || `Section Heading`}
        </h2>
        {desc && (
          <span className="block mt-2 text-base font-normal md:mt-4 sm:text-lg text-neutral-500">
            {desc}
          </span>
        )}
      </div>
      {hasNextPrev && !isCenter && (
        <div className="flex justify-end flex-shrink-0 mt-4 sm:ml-2 sm:mt-0">
          <NextPrev onClickNext={() => {}} onClickPrev={() => {}} />
        </div>
      )}
    </div>
  );
};

export default Heading;
