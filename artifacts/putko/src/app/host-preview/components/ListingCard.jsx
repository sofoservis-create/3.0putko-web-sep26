import React from "react";
import { Home, MapPin, Trash2, ChevronRight, Loader2 } from "lucide-react";
import {
  formatSavedAt,
  listingCoverUrl,
  listingDisplayPercent,
  listingLocation,
  listingName,
  nextStepTitle,
  primaryActionFor,
  statusPresentation,
} from "../../host/hostListingModel";

/**
 * Compact, touch-first listing card. The whole action row stays reachable at
 * phone width: one full-width primary action plus a 44px delete target.
 */
export default function ListingCard({ listing, language, onOpen, onDelete, deleting }) {
  const en = language === "en";
  const name = listingName(listing, language);
  const status = statusPresentation(listing.status, language);
  const action = primaryActionFor(listing, language);
  const percent = listingDisplayPercent(listing);
  const savedAt = formatSavedAt(listing.updatedAt, language);
  const nextStep = nextStepTitle(listing, language);
  const cover = listingCoverUrl(listing);
  const isDraft = listing.status === "DRAFT";

  return (
    <article
      aria-labelledby={`listing-${listing.id}-name`}
      className={`relative flex flex-col rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${deleting ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3.5">
        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <Home size={28} strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {/* Badge sits above the name so long names keep the full width at phone size. */}
          <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.badge}`}>
            {status.label}
          </span>
          <h3
            id={`listing-${listing.id}-name`}
            className="mt-1 line-clamp-2 break-words text-[16px] font-bold leading-6 text-[#1E3E2B]"
          >
            {name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-neutral-500">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{listingLocation(listing, language)}</span>
          </p>
          {savedAt && (
            <p className="mt-1 text-[12px] text-neutral-400">
              {en ? "Saved " : "Uložené "}
              <time dateTime={listing.updatedAt}>{savedAt}</time>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[12px] font-bold text-neutral-600">
          <span>{isDraft ? (en ? "Setup progress" : "Priebeh nastavenia") : status.description}</span>
          <span>{percent}%</span>
        </div>
        <div
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={en ? "Setup progress" : "Priebeh nastavenia"}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${isDraft ? "bg-[#DFBA73]" : "bg-green-500"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {isDraft && nextStep && (
          <p className="mt-2 text-[12px] font-medium text-neutral-500">
            {en ? "Next: " : "Ďalej: "}
            <span className="font-bold text-[#1E3E2B]">{nextStep}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-neutral-100 pt-4">
        <button
          type="button"
          onClick={() => onOpen(listing.id, { review: action.review })}
          disabled={deleting}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-4 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#163021] disabled:opacity-60"
        >
          {action.label}
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(listing)}
          disabled={deleting}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          title={en ? `Delete ${name}` : `Vymazať ${name}`}
          aria-label={en ? `Delete ${name}` : `Vymazať ${name}`}
        >
          {deleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
        </button>
      </div>
    </article>
  );
}
