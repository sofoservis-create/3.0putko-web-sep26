"use client";

import React, { useContext, useState, useMemo } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import ButtonPrimary from "../Shared/ButtonPrimary";
import { ThumbsUp, ThumbsDown } from "lucide-react";

const categoryTranslation = {
  "Location": "Poloha",
  "Communication": "Komunikácia",
  "Equipment": "Vybavenie",
  "Cleanliness": "Čistota",
  "ClientCare": "Starostlivosť o hosťa",
  "WiFi": "Wi-Fi",
  "Activities": "Aktivity",
  "PriceQuality": "Pomer cena/kvalita"
};

const CommentListing = ({ reviewsRating }) => {
  const reviews = (Array.isArray(reviewsRating?.data) ? reviewsRating.data : []).filter(r => !r.reviewText?.includes("Very good 2"));
  const [visibleCount, setVisibleCount] = useState(3);
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const t = { en, sk }[language];

  if (!reviews.length) {
    return (
      <p className="text-center text-neutral-500 py-6">
        {t.Noreviewyet || "Zatiaľ žiadne hodnotenia."}
      </p>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Slovak formatting: 7. feb 2026
    const formatter = new Intl.DateTimeFormat('sk-SK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return formatter.format(date);
  };

  const { averageCategories, overallAverage, topPluses, topCons } = useMemo(() => {
    let sumOverall = 0;
    const totals = {};
    const count = {};
    const plusesCount = {};
    const consCount = {};

    reviews.forEach((review) => {
      sumOverall += review.overallRating || 0;
      
      if (review.categoryRatings) {
        Object.entries(review.categoryRatings).forEach(([key, value]) => {
          if (!value || value <= 0) return;
          totals[key] = (totals[key] || 0) + value;
          count[key] = (count[key] || 0) + 1;
        });
      }

      if (review.pluses) {
        const plusList = review.pluses.split(',').map(s => s.trim()).filter(Boolean);
        plusList.forEach(p => { plusesCount[p] = (plusesCount[p] || 0) + 1; });
      }
      if (review.cons) {
        const conList = review.cons.split(',').map(s => s.trim()).filter(Boolean);
        conList.forEach(c => { consCount[c] = (consCount[c] || 0) + 1; });
      }
    });

    const averages = {};
    Object.keys(totals).forEach((key) => {
      const avg = totals[key] / count[key];
      if (avg > 0) averages[key] = avg;
    });

    const sortedPluses = Object.entries(plusesCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sortedCons = Object.entries(consCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return {
      averageCategories: Object.keys(averages).length ? averages : null,
      overallAverage: reviews.length ? sumOverall / reviews.length : 0,
      topPluses: sortedPluses,
      topCons: sortedCons
    };
  }, [reviews]);

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasKeywords = topPluses.length > 0 || topCons.length > 0;

  return (
    <div className="space-y-6 lg:space-y-8 font-inter antialiased">
      {hasKeywords && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 tracking-tight">Čo hostia najčastejšie spomínajú</h3>
          <div className="flex flex-wrap gap-2">
            {topPluses.map(([text, count]) => (
              <span key={text} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-3xs">
                <div className="flex items-center gap-1"><ThumbsUp size={12} /><span>{text}</span></div>
                <span className="opacity-50">({count})</span>
              </span>
            ))}
            {topCons.map(([text, count]) => (
              <span key={text} className="bg-red-50 text-red-700 border border-red-100 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-3xs">
                <div className="flex items-center gap-1"><ThumbsDown size={12} /><span>{text}</span></div>
                <span className="opacity-50">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {averageCategories && (
          <div className="lg:col-span-1 lg:order-2">
            <div className="bg-neutral-50/70 border border-neutral-100 p-5 rounded-2xl shadow-3xs lg:sticky lg:top-28">
              <h3 className="font-bold text-base mb-1 text-[#1e4636] font-fraunces">
                Hodnotenia kategórií
              </h3>
              <div className="w-10 h-[3px] bg-[#319a7a] rounded-full mb-4" />

              <div className="space-y-3">
                {Object.entries(averageCategories).map(([category, value]) => {
                  const percentage = (value / 5) * 100;
                  const label = categoryTranslation[category] || category;
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1">
                        <span className="truncate pr-2">{label}</span>
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

              <div className="flex items-center gap-1 mt-5 pt-4 border-t border-neutral-100">
                <div className="flex">
                  {[...Array(Math.round(overallAverage))].map((_, i) => (
                    <StarIcon key={i} className="w-4 h-4 text-yellow-500" />
                  ))}
                </div>
                <div className="flex flex-col ml-2">
                  <span className="text-xs font-bold text-[#1e4636]">
                    {overallAverage.toFixed(1)} / 5
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
                    Celkové hodnotenie
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`space-y-5 ${averageCategories ? "lg:col-span-2 lg:order-1" : "lg:col-span-3"}`}>
          {visibleReviews.map((review, idx) => (
            <div
              key={idx}
              className="bg-white border border-neutral-100 shadow-3xs rounded-2xl p-5 sm:p-6 transition hover:shadow-sm"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-neutral-900">
                  {review.name || "Anonym"}
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
                      <div className="flex items-center gap-1"><ThumbsUp size={12} /><span>{review.pluses}</span></div>
                    </span>
                  )}
                  {review.cons && (
                    <span className="bg-red-50 text-red-700 border border-red-100 px-3 py-1 rounded-full text-xs font-semibold">
                      <div className="flex items-center gap-1"><ThumbsDown size={12} /><span>{review.cons}</span></div>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {visibleCount < reviews.length && (
            <div className="flex justify-center pt-1">
              <ButtonPrimary
                className="bg-[#357965] hover:bg-[#1e4636] transition-colors"
                onClick={() => setVisibleCount((prev) => prev + 5)}
              >
                Zobraziť ďalšie recenzie
              </ButtonPrimary>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentListing;
