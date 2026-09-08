"use client";

import React, { useEffect, useState } from "react";
import { Receipt, ChevronDown } from "lucide-react";

/**
 * Payment split for a booking amount.
 *
 * The figures are always fetched from `/payments/fee-preview`, which runs the
 * same `calculateFees()` the payout actually uses. Nothing is recomputed in the
 * browser on purpose — a host being shown one number and paid another is the
 * exact class of bug worth designing out.
 *
 * This is host-facing. It is deliberately absent from the public listing page:
 * a guest pays one amount and has no use for how it is divided afterwards.
 *
 * @param {number} amount         gross stay amount in EUR (major units)
 * @param {number} amountCents    gross stay amount in cents (takes precedence)
 * @param {number} stripeFeeCents actual Stripe fee, when already known
 * @param {boolean} showHostPayout render the host-facing payout rows
 * @param {boolean} collapsible   start closed and only fetch once opened —
 *                                use in lists, where one request per row on
 *                                mount would mean dozens of calls per page
 */
export default function FeeBreakdown({
  amount,
  amountCents,
  stripeFeeCents = null,
  showHostPayout = true,
  collapsible = false,
  labels = {},
  className = "",
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(!collapsible);

  const cents =
    amountCents != null ? Math.round(amountCents) : Math.round((Number(amount) || 0) * 100);

  useEffect(() => {
    // Nothing is requested until the panel is actually visible.
    if (!open || !cents || cents <= 0) {
      if (!cents || cents <= 0) setData(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/payments/fee-preview?amountCents=${cents}`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [cents, open]);

  if (!cents || cents <= 0) return null;

  const toggleLabel = labels.PaymentBreakdown || "Payment breakdown";

  // Collapsed: a toggle only, with no data fetched yet.
  if (collapsible && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-between rounded-xl border border-neutral-200/80 bg-white px-4 py-2.5 text-left text-sm font-semibold text-[#1e4636] transition hover:bg-neutral-50 ${className}`}
      >
        <span className="flex items-center gap-2">
          <Receipt size={15} strokeWidth={2} className="text-[#319a7a]" />
          {toggleLabel}
        </span>
        <ChevronDown size={16} strokeWidth={2} className="text-neutral-400" />
      </button>
    );
  }

  if (error || !data) return null;

  const eur = (c) => `€${(Math.round(c || 0) / 100).toFixed(2)}`;

  const t = {
    title: labels.PaymentBreakdown || "Payment breakdown",
    stayAmount: labels.StayAmount || "Stay amount",
    stripeDeducts: labels.StripeDeducts || "Stripe deducts",
    putkoFee: labels.PutkoFee || "Putko fee",
    hostReceives: labels.HostReceives || "Amount paid to host",
    guestPays: labels.GuestPays || "You pay",
    estimated: labels.Estimated || "estimated",
    putkoFeeIncludes: labels.PutkoFeeIncludes || "includes",
    cardProcessing: labels.CardProcessing || "card processing",
    vat: labels.Vat || "VAT",
    feeShortfall:
      labels.FeeShortfall ||
      "more than this fee covers. Putko absorbs the {amount} difference; your payout is unaffected.",
    feeNote:
      labels.FeeNote ||
      "The Putko fee is calibrated to cover the card processing cost plus the VAT owed on it — Putko takes no margin on it.",
    guestNote:
      labels.GuestFeeNote ||
      "This is the full amount you pay. Service fees are settled between Putko and the host — nothing is added at checkout.",
  };

  // Actual Stripe fee if we have it; otherwise the server's estimate.
  const stripeCost = stripeFeeCents != null ? stripeFeeCents : data.stripeCostCents;

  // Of the Putko fee, the VAT portion goes to the state — only the rest is
  // available to cover Stripe. A positive shortfall means this booking cost
  // Putko money rather than breaking even. The host is unaffected either way:
  // they are paid `hostPayoutCents` regardless, so Putko absorbs the difference.
  const feeAvailableForStripe =
    (data.platformFeeCents || 0) - (data.platformFeeVatCents || 0);
  const shortfallCents = Math.max(0, Math.round(stripeCost) - feeAvailableForStripe);

  return (
    <div
      className={`rounded-2xl border border-neutral-200/80 bg-white p-5 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#319a7a]/10 text-[#319a7a]">
          <Receipt size={16} strokeWidth={2} />
        </span>
        <h3 className="text-sm font-bold text-[#1e4636]">{t.title}</h3>

        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={labels.Hide || "Hide"}
            className="ml-auto text-neutral-400 transition hover:text-neutral-600"
          >
            <ChevronDown size={16} strokeWidth={2} className="rotate-180" />
          </button>
        )}
      </div>

      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-neutral-500">
            {showHostPayout ? t.stayAmount : t.guestPays}
          </dt>
          <dd className="font-semibold text-neutral-800">{eur(data.totalAmountCents)}</dd>
        </div>

        {showHostPayout && (
          <>
            {/* Only the Putko fee is deducted from the host. The card
                processing cost is paid out of that fee, not charged on top —
                showing it as a separate deduction would imply the host is
                charged twice and would not add up to the payout below. */}
            <div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-500">{t.putkoFee}</dt>
                <dd className="font-semibold text-neutral-600">
                  −{eur(data.platformFeeCents)}
                </dd>
              </div>
              {/* The fee is only "made up of" the card cost and VAT while it
                  actually covers them. On a card Stripe charges more for than
                  the model assumes, saying the €5.27 fee "includes €12.90 card
                  processing" is arithmetically impossible — and hid the fact
                  that Putko is out of pocket on the booking. */}
              {shortfallCents > 0 ? (
                <p className="mt-1 text-[11px] text-amber-600">
                  {eur(stripeCost)} {t.cardProcessing} —{" "}
                  {t.feeShortfall.replace("{amount}", eur(shortfallCents))}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-neutral-400">
                  {t.putkoFeeIncludes} {eur(stripeCost)} {t.cardProcessing}
                  {data.stripeCostIsEstimate && stripeFeeCents == null
                    ? ` (${t.estimated})`
                    : ""}{" "}
                  + {eur(data.platformFeeVatCents)} {t.vat}
                </p>
              )}
            </div>

            {/* Deducted only when the host is configured to absorb Stripe's
                cost as well; hidden in the default (break-even) model. */}
            {data.hostPaysStripeFee && (
              <div className="flex items-center justify-between">
                <dt className="text-neutral-500">{t.stripeDeducts}</dt>
                <dd className="font-semibold text-neutral-600">−{eur(stripeCost)}</dd>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3">
              <dt className="font-bold text-[#1e4636]">{t.hostReceives}</dt>
              <dd className="text-lg font-extrabold text-[#2E7D32]">
                {eur(data.hostPayoutCents)}
              </dd>
            </div>
          </>
        )}
      </dl>

      <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">
        {showHostPayout ? t.feeNote : t.guestNote}
      </p>
    </div>
  );
}
