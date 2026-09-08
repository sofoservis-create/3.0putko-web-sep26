"use client";
import React from "react";
import { CircleSlash, Loader, CheckCircle2 } from "lucide-react";

/**
 * A listing's lifecycle badge — Nepripojené / Overuje sa / Aktívne.
 *
 * The status is decided entirely server-side from the host's Stripe account
 * (backend/utils/listingStatus.js) and flipped by the account.updated webhook,
 * so this only renders what it is handed. It never derives the status itself:
 * two screens showing the same listing must never disagree about whether it is
 * live.
 *
 * No value means DRAFT — a listing with nothing stored has never had a payout
 * account linked, which is what DRAFT says.
 *
 * This is a LABEL, not a gate. Whether a listing can actually be booked is
 * decided server-side from the host's live Stripe state (`bookable`), never
 * from this value, so a blank or stale status here can never take a live
 * property off sale.
 */

export const LISTING_STATUS_STYLES = {
  DRAFT: {
    key: "DRAFT",
    labelKey: "ListingStatusDraft",
    Icon: CircleSlash,
    className: "bg-slate-100 text-slate-600 border-slate-200",
    // Opaque enough to read over a photo — see the `onImage` prop below.
    onImage: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-400",
  },
  PENDING: {
    key: "PENDING",
    labelKey: "ListingStatusPending",
    Icon: Loader,
    className: "bg-[#DFBA73]/15 text-[#9a7a3a] border-[#DFBA73]/30",
    onImage: "bg-[#FDF4E7] text-[#8a6a2a] border-[#DFBA73]",
    dot: "bg-[#DFBA73]",
  },
  PUBLISHED: {
    key: "PUBLISHED",
    labelKey: "ListingStatusPublished",
    Icon: CheckCircle2,
    className: "bg-[#319A81]/10 text-[#257562] border-[#319A81]/20",
    onImage: "bg-[#E8F4F0] text-[#1d6653] border-[#319A81]",
    dot: "bg-[#319A81]",
  },
};

export const styleForStatus = (status) =>
  LISTING_STATUS_STYLES[status] || LISTING_STATUS_STYLES.DRAFT;

/**
 * @param {boolean} onImage  sitting on a photo rather than a white panel. The
 *   default palette is deliberately faint — 10–15% tints that look right in a
 *   list — and would be unreadable over an image, so this swaps in opaque
 *   equivalents. Callers must NOT pass their own `bg-*` to solve this: two
 *   competing Tailwind background classes do not resolve by their order in the
 *   class attribute, so the status colour would win or lose at random.
 */
function ListingStatusBadge({
  status,
  t,
  size = "sm",
  showIcon = true,
  onImage = false,
  className = "",
}) {
  const config = styleForStatus(status);
  const { Icon } = config;

  const sizing =
    size === "xs"
      ? "px-2 py-1 text-[10px] gap-1"
      : "px-3 py-1.5 text-[11px] gap-1.5";

  const palette = onImage ? config.onImage : config.className;

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-lg border ${sizing} ${palette} ${className}`}
      title={t?.[`${config.labelKey}Hint`] || undefined}
    >
      {showIcon && (
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${
            // Only the verifying state spins — it is the one that is genuinely
            // waiting on something.
            config.key === "PENDING" ? "animate-spin [animation-duration:2.5s]" : ""
          }`}
        />
      )}
      {t?.[config.labelKey] || config.key}
    </span>
  );
}

export default ListingStatusBadge;
