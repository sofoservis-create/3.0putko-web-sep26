"use client";

import React, { useContext, useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import ButtonPrimary from "@/app/Shared/ButtonPrimary";

const CommentListing = ({ reviewsRating }) => {
  // ✅ Fix: get data from reviewsRating.data
  const reviews = Array.isArray(reviewsRating?.data)
    ? reviewsRating.data
    : [];

  const [visibleCount, setVisibleCount] = useState(3);
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const t = { en, sk }[language];

  // ✅ Handle empty state
  if (!reviews.length) {
    return (
      <p className="text-center text-neutral-500 py-6">
        {t.Noreviewyet || "No reviews yet."}
      </p>
    );
  }

  // ✅ Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ✅ Calculate average per category
  const calculateAverageCategories = () => {
    if (!reviews.length) return null;

    const totals = {};
    const count = {};

    reviews.forEach((review) => {
      if (review.categoryRatings) {
        Object.entries(review.categoryRatings).forEach(([key, value]) => {
          // ❌ Skip if value is 0 or not valid
          if (!value || value <= 0) return;

          totals[key] = (totals[key] || 0) + value;
          count[key] = (count[key] || 0) + 1;
        });
      }
    });

    const averages = {};
    Object.keys(totals).forEach((key) => {
      const avg = totals[key] / count[key];

      // ❌ Skip categories that end up 0
      if (avg > 0) {
        averages[key] = avg;
      }
    });

    return Object.keys(averages).length ? averages : null;
  };

  const averageCategories = calculateAverageCategories();

  // ✅ Calculate overall average
  const overallAverage =
    reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) /
    reviews.length;

  // ✅ Limit visible reviews
  const visibleReviews = reviews.slice(0, visibleCount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 font-inter antialiased">
      {/* ✅ Combined category ratings — narrow right column on desktop */}
      {averageCategories && (
        <div className="lg:col-span-1 lg:order-2">
          <div className="bg-neutral-50/70 border border-neutral-100 p-5 rounded-2xl shadow-3xs lg:sticky lg:top-28">
            <h3 className="font-bold text-base mb-1 text-[#1e4636] font-fraunces">
              {t.AverageCategoryRatings || "Average Category Ratings"}
            </h3>
            <div className="w-10 h-[3px] bg-[#319a7a] rounded-full mb-4" />

            <div className="space-y-3">
              {Object.entries(averageCategories).map(([category, value]) => {
                const percentage = (value / 5) * 100;
                return (
                  <div key={category}>
                    <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1">
                      <span className="truncate pr-2">{category}</span>
                      <span className="font-bold text-[#1e4636] shrink-0">{value.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-200/80 rounded-full">
                      <div
                        className="h-1.5 bg-[#319a7a] rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ✅ Overall stars */}
            <div className="flex items-center gap-1 mt-5 pt-4 border-t border-neutral-100">
              {[...Array(Math.round(overallAverage))].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 text-yellow-500" />
              ))}
              <span className="text-xs font-bold text-[#1e4636] ml-2">
                {overallAverage.toFixed(1)} / 5
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Individual Reviews — wider left column */}
      <div className={`space-y-5 ${averageCategories ? "lg:col-span-2 lg:order-1" : "lg:col-span-3"}`}>
        {visibleReviews.map((review, idx) => (
          <div
            key={idx}
            className="bg-white border border-neutral-100 shadow-3xs rounded-2xl p-5 sm:p-6 transition hover:shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-neutral-900">
                {review.name || "Anonymous"}
              </h4>
              <p className="text-xs text-neutral-400 font-medium">
                {formatDate(review.createdAt)}
              </p>
            </div>

            <div className="flex items-center mb-3">
              {[...Array(review.overallRating || 0)].map((_, i) => (
                <StarIcon key={i} className="w-4 h-4 text-yellow-500" />
              ))}
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed mb-3">{review.reviewText}</p>

            {(review.pluses || review.cons) && (
              <div className="flex flex-wrap gap-2">
                {review.pluses && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-semibold">
                    👍 {review.pluses}
                  </span>
                )}
                {review.cons && (
                  <span className="bg-red-50 text-red-700 border border-red-100 px-3 py-1 rounded-full text-xs font-semibold">
                    👎 {review.cons}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* ✅ Show More */}
        {visibleCount < reviews.length && (
          <div className="flex justify-center pt-1">
            <ButtonPrimary
              className="bg-[#357965] hover:bg-[#1e4636] transition-colors"
              onClick={() => setVisibleCount((prev) => prev + 3)}
            >
              {t.Showmemore || "Show More"}
            </ButtonPrimary>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentListing;
