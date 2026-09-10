import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  compareDates,
  dayCoverage,
  formatMonthTitle,
  isInRange,
  monthGrid,
  shiftMonth,
  weekdayLabels,
} from "./calendarModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

/**
 * Touch-first month view. Each day is a ≥44px button; tapping twice selects a
 * range (the parent owns the selection). Past days are visible but inert.
 * Manual blocks and feed-imported dates use different fills so the host can
 * tell what they can change here from what comes from another calendar.
 */
export default function MonthGrid({
  month,
  today,
  blocks,
  selection,
  anchor,
  language,
  onPrev,
  onNext,
  onTapDay,
  canGoPrev,
  disabled,
}) {
  const weeks = useMemo(() => monthGrid(month), [month]);
  const labels = useMemo(() => weekdayLabels(language), [language]);
  const nextMonth = shiftMonth(month, 1);
  const prevMonth = shiftMonth(month, -1);

  return (
    <section aria-label={t(language, "Month view", "Mesačný prehľad")} className="rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label={`${t(language, "Previous month", "Predchádzajúci mesiac")}: ${formatMonthTitle(prevMonth, language)}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 text-[#1E3E2B] transition-colors hover:bg-neutral-50 disabled:opacity-40"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 aria-live="polite" className="text-center text-[17px] font-bold text-[#1E3E2B]">
          {formatMonthTitle(month, language)}
        </h2>
        <button
          type="button"
          onClick={onNext}
          aria-label={`${t(language, "Next month", "Nasledujúci mesiac")}: ${formatMonthTitle(nextMonth, language)}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 text-[#1E3E2B] transition-colors hover:bg-neutral-50"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div role="grid" aria-readonly={disabled || undefined} className="select-none">
        <div role="row" className="mb-1 grid grid-cols-7">
          {labels.map((label) => (
            <div key={label} role="columnheader" className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-400">
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div role="row" key={weekIndex} className="grid grid-cols-7 gap-y-1">
            {week.map((cell) => {
              const past = compareDates(cell.iso, today) < 0;
              const isToday = cell.iso === today;
              const coverage = dayCoverage(blocks, cell.iso);
              const manual = Boolean(coverage.manual);
              const fromFeed = coverage.feeds.length > 0;
              const selected = isInRange(cell.iso, selection);
              const isAnchor = anchor === cell.iso && !selection;
              const interactive = !past && !disabled;

              const state = manual
                ? t(language, "blocked", "blokované")
                : fromFeed
                  ? t(language, "blocked by a connected calendar", "blokované pripojeným kalendárom")
                  : t(language, "available", "voľné");

              let fill = "bg-white text-[#1E3E2B]";
              if (manual) fill = "bg-[#1E3E2B] text-white";
              else if (fromFeed) fill = "bg-[repeating-linear-gradient(135deg,#E5E7EB_0,#E5E7EB_4px,#F5F5F5_4px,#F5F5F5_8px)] text-neutral-600";
              if (!cell.inMonth) fill += " opacity-40";
              if (past) fill += " opacity-35";

              return (
                <div role="gridcell" key={cell.iso} className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => interactive && onTapDay(cell.iso)}
                    disabled={!interactive}
                    aria-pressed={selected || isAnchor || undefined}
                    aria-label={`${cell.iso} · ${state}`}
                    className={`relative flex h-11 w-full min-w-11 items-center justify-center rounded-xl text-[14px] font-bold transition-colors sm:h-12 ${fill} ${
                      selected || isAnchor ? "ring-[3px] ring-[#DFBA73] ring-offset-1" : ""
                    } ${interactive ? "hover:ring-2 hover:ring-[#DFBA73]/60" : "cursor-default"}`}
                  >
                    {cell.day}
                    {isToday && <span aria-hidden="true" className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-[#DFBA73]" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-semibold text-neutral-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded border border-neutral-300 bg-white" /> {t(language, "Available", "Voľné")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-[#1E3E2B]" /> {t(language, "Blocked by you", "Blokované vami")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-[repeating-linear-gradient(135deg,#E5E7EB_0,#E5E7EB_3px,#F5F5F5_3px,#F5F5F5_6px)] border border-neutral-300" /> {t(language, "From a connected calendar", "Z pripojeného kalendára")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded border-2 border-[#DFBA73]" /> {t(language, "Selected", "Vybrané")}</span>
      </div>
    </section>
  );
}
