import twFocusClass from "../../utlis/twFocusClass";
import React from "react";
import { ChevronLeft } from "lucide-react";

const PrevBtn = ({ className = "w-10 h-10 text-lg", ...args }) => {
  return (
    <button
      className={`PrevBtn ${className} bg-[#238869] border border-neutral-200 rounded-full inline-flex items-center justify-center hover:border-neutral-300 ${twFocusClass()}`}
      {...args}
    >
      <ChevronLeft className="text-white" style={{ color: "white" }}/>
    </button>
  );
};

export default PrevBtn;
