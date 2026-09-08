import React from "react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const maxVisiblePages = 5;
  const currentGroup = Math.floor((currentPage - 1) / maxVisiblePages);
  const startPage = currentGroup * maxVisiblePages + 1;
  const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

  const baseClasses =
  "inline-flex items-center justify-center rounded-full font-bold font-fraunces transition-all duration-200 " +
  "w-10 h-10 text-base sm:w-12 sm:h-12 sm:text-lg md:w-14 md:h-14 md:text-[22px]";

  const renderPaginationItems = () => {
    const pages = [];

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === currentPage;

      pages.push(
        isActive ? (
          <span
            key={i}
            className={`${baseClasses} bg-[#238869] text-white`}
          >
            {i}
          </span>
        ) : (
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`${baseClasses} bg-white text-[#1A3A2E] shadow-[0px_0px_10px_0px_#0000000D] hover:scale-105`}
          >
            {i}
          </button>
        )
      );
    }

    return pages;
  };

  return (
    <nav className="inline-flex items-center gap-3">
      {startPage > 1 && (
        <button
          onClick={() => onPageChange(startPage - 1)}
          className={`${baseClasses} bg-[#238869] text-white`}
        >
          ‹
        </button>
      )}

      {renderPaginationItems()}

      {endPage < totalPages && (
        <button
          onClick={() => onPageChange(endPage + 1)}
          className={`${baseClasses} bg-[#238869] text-white`}
        >
          ›
        </button>
      )}
    </nav>
  );
};

export default Pagination;