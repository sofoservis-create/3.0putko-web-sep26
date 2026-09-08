import React from "react";

const SkeletonCard = () => {
  return (
    <div className="animate-pulse bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div className="w-full h-48 bg-gray-100 rounded-xl"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
      <div className="h-4 bg-gray-100 rounded w-1/2"></div>
      <div className="flex gap-2 mt-2">
        <div className="h-4 w-1/3 bg-gray-100 rounded"></div>
        <div className="h-4 w-1/4 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
