import React from "react";
import LocationInput from "./LocationInput";
import StayDatesRangeInput from "./StayDatesRangeInput"
import GuestsInput from "./GuestsInput"

const StaySearchForm = () => {  
  const renderForm = () => {
    return (
      <form className="relative flex h-[68px] w-full items-stretch rounded-[28px] border border-[#DCEAE5] bg-white/95 shadow-[0_14px_36px_-18px_rgba(17,42,34,0.35)] backdrop-blur-xl transition-shadow hover:shadow-[0_18px_42px_-18px_rgba(17,42,34,0.42)]">
        <LocationInput className="flex-[1.15]" />
        <div className="self-center h-6 border-r border-slate-200"></div>
        <StayDatesRangeInput className="flex-[1.15]" />
        <div className="self-center h-6 border-r border-slate-200"></div>
        <GuestsInput className="flex-1" />
      </form>
    );
  };

  return renderForm();
};

export default StaySearchForm;
