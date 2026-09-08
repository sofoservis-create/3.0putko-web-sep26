import React from "react";
import twFocusClass from "../utlis/twFocusClass";
import { ChevronLeft } from "lucide-react";

const ButtonClose = ({ className = "", onClick = () => {} }) => {
  return (
    <button
      className={
        `w-8 h-8 flex items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 ${className} ` +
        twFocusClass()
      }
      onClick={onClick}
    >
      <span className="sr-only">Close</span>
      <ChevronLeft className="w-6 h-6" />
    </button>
  );
};

export default ButtonClose;
