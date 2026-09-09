/**
 * Booking status, in Slovak, from the ONE status enum.
 *
 * The old system has no single booking state: it spreads the answer across
 * `isApproved`, `paymentStatus` and `payoutStatus` with no guard between
 * them (audit — eight illegal transitions were reachable), so a booking can
 * read "approved" and "unpaid" and "paid out" at once and every screen
 * renders a slightly different sentence about it. Here there is one column,
 * and this is the only place it is turned into words.
 */
const LABELS: Record<string, { text: string; className: string }> = {
  request_pending: {
    text: "Čaká na potvrdenie",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  awaiting_payment: {
    text: "Čaká na platbu",
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  confirmed: {
    text: "Potvrdené",
    className: "bg-brand/10 text-brand ring-brand/20",
  },
  completed: {
    text: "Ukončené",
    className: "bg-black/[0.04] text-ink-soft ring-black/10",
  },
  cancelled: {
    text: "Zrušené",
    className: "bg-red-50 text-red-800 ring-red-200",
  },
  draft: {
    text: "Rozpracované",
    className: "bg-black/[0.04] text-ink-muted ring-black/10",
  },
};

export function StatusBadge({ status }: { status: string }) {
  // An unknown status shows the raw value rather than nothing. If the enum
  // grows and this map does not, a visible oddity is far better than a
  // silently blank cell that everyone reads as "no status".
  const label = LABELS[status] ?? {
    text: status,
    className: "bg-black/[0.04] text-ink-muted ring-black/10",
  };
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${label.className}`}
    >
      {label.text}
    </span>
  );
}

const LISTING_LABELS: Record<string, { text: string; className: string }> = {
  published: { text: "Zverejnené", className: "bg-brand/10 text-brand ring-brand/20" },
  pending: { text: "Čaká na schválenie", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  draft: { text: "Koncept", className: "bg-black/[0.04] text-ink-muted ring-black/10" },
};

export function ListingStatusBadge({ status }: { status: string }) {
  const label = LISTING_LABELS[status] ?? {
    text: status,
    className: "bg-black/[0.04] text-ink-muted ring-black/10",
  };
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${label.className}`}
    >
      {label.text}
    </span>
  );
}
