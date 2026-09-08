import React from "react";

export default function Section1Skeleton() {
  return (
    <div className="listingSection__wrap !space-y-6">
      {/* 1: Badge + Like buttons */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 rounded-full relative skeleton" />
        <div className="h-8 w-8 rounded-full relative skeleton" />
      </div>

      {/* 2: Title */}
      <div className="h-8 w-3/4 rounded-md relative skeleton" />

      {/* 3: Rating + Location */}
      <div className="flex items-center space-x-4">
        <div className="h-5 w-24 rounded-md relative skeleton" />
        <div className="h-5 w-32 rounded-md relative skeleton" />
      </div>

      {/* 4: Host info */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full relative skeleton" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-md relative skeleton" />
          <div className="h-4 w-20 rounded-md relative skeleton" />
        </div>
      </div>

      {/* 5: Divider */}
      <div className="w-full h-px bg-neutral-200" />

      {/* 6: Icons row */}
      <div className="hidden sm:flex justify-between text-sm text-neutral-700">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-6 w-6 rounded-md relative skeleton" />
            <div className="h-4 w-16 rounded-md relative skeleton" />
          </div>
        ))}
      </div>

      {/* Mobile bubbles */}
      <div className="flex flex-wrap gap-2 sm:hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 min-w-[48%] rounded-full py-3 relative skeleton"
          />
        ))}
      </div>
    </div>
  );
}
