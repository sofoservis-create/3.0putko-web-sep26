import React from "react";

export default function PlaceholderState({ title, description, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-md mx-auto animate-fadeIn">
      <div className="w-24 h-24 bg-white text-[#DFBA73] rounded-[2rem] flex items-center justify-center mb-8 shadow-sm border border-neutral-100">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold text-[#1E3E2B] mb-3 tracking-tight">{title}</h2>
      <p className="text-neutral-500 text-[16px] leading-relaxed">{description}</p>
    </div>
  );
}
