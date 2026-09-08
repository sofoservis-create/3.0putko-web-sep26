import React from "react";
import LocationInput from "./LocationInput";
import StayDatesRangeInput from "./StayDatesRangeInput"
import GuestsInput from "./GuestsInput"

const StaySearchForm = () => {  
  const renderForm = () => {
    return (
      <form className="relative flex w-full mt-3 bg-white rounded-full shadow">
        <LocationInput className="flex-[1.5]" />
        <div className="self-center h-6 border-r border-slate-200"></div>
        <StayDatesRangeInput className="flex-1" />
        <div className="self-center h-6 border-r border-slate-200"></div>
        <GuestsInput className="flex-1" />
      </form>
    );
  };

  return renderForm();
};

export default StaySearchForm;
