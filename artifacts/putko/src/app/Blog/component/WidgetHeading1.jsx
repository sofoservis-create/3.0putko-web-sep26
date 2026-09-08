import React from "react";

const WidgetHeading1 = ({ title, viewAll, onClick }) => {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-200">
      <h2 className="font-semibold text-neutral-800">{title}</h2>
      {viewAll && (
        <button
          onClick={onClick}
          className="text-sm text-primary-600 hover:underline"
        >
          {viewAll.label}
        </button>
      )}
    </div>
  );
};

export default WidgetHeading1;
