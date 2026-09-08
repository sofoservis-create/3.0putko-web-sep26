import React from "react";
import Link from "next/link";

const Tag = ({ className = "", tag, hideCount = false }) => {
  return (
    <div
      className={`nc-Tag inline-block bg-white text-sm text-neutral-600 py-2 px-3 rounded-lg border border-neutral-100 md:py-2.5 md:px-4 hover:border-neutral-200 cursor-pointer ${className}`}
      data-nc-id="Tag"
    >
      {tag.name}
      {!hideCount && (
        <span className="text-xs font-normal"> ({tag.count})</span>
      )}
    </div>
  );
};

export default Tag;
