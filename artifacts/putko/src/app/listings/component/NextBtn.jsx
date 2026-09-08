import twFocusClass from "../../utlis/twFocusClass";
import React from "react";
import { ChevronRight } from "lucide-react";

const NextBtn = ({ className = "w-10 h-10 text-lg", ...args }) => {
  return (
    <button
      className={`NextBtn ${className} bg-[#238869] border border-neutral-200 rounded-full inline-flex items-center justify-center hover:border-neutral-300 ${twFocusClass()}`}
      {...args}
    >
      <ChevronRight className="text-white" style={{ color: "white" }}/>
    </button>
  );
};

export default NextBtn;
