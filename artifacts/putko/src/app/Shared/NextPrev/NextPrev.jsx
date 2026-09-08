import React from "react";
import twFocusClass from "../../utlis/twFocusClass";
import { ChevronLeft, ChevronRight } from "lucide-react";

const NextPrev = ({
  className = "",
  onClickNext = () => {},
  onClickPrev = () => {},
  btnClassName = "w-10 h-10",
  onlyNext = false,
  onlyPrev = false,
}) => {
  return (
    <div
      className={`nc-NextPrev relative flex items-center text-neutral-900 ${className}`}
      data-nc-id="NextPrev"
      data-glide-el="controls"
    >
      {!onlyNext && (
        <button
          className={`${btnClassName} ${
            !onlyPrev ? "mr-[6px]" : ""
          } bg-white border border-neutral-200 rounded-full flex items-center justify-center hover:border-neutral-300 ${twFocusClass()}`}
          onClick={onClickPrev}
          title="Prev"
          data-glide-dir="<"
        >
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
      )}
      {!onlyPrev && (
        <button
          className={`${btnClassName} bg-white border border-neutral-200 rounded-full flex items-center justify-center hover:border-neutral-300 ${twFocusClass()}`}
          onClick={onClickNext}
          title="Next"
          data-glide-dir=">"
        >
          <ChevronRight size={22} className="text-gray-700" />
        </button>
      )}
    </div>
  );
};

export default NextPrev;
