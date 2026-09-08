"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import apiFetch from "../utlis/apiFetch";

/**
 * Guest-facing cancellation.
 *
 * The refund figure is always fetched from the server, which computes it from
 * the policy snapshot stored on the booking — the terms the guest agreed to when
 * they paid. It is never derived from the listing, which the host may have
 * edited since, and never computed here in the browser.
 *
 * `cancelledBy` is presentational only. The server takes the actor from the
 * verified identity behind the request, because a client-supplied role was
 * exactly what let anyone claim to be the host and force a full refund.
 */
export default function CancelBookingButton({
  reservationId,
  cancelledBy = "guest",
  labels = {},
  onCancelled,
  // Optional trigger styling, so this can sit inside a host's calendar popup
  // without looking like a stray link. Both default to the original rendering,
  // so existing call sites are unaffected.
  className,
  triggerContent,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const t = {
    cancel: labels.CancelBooking || "Cancel booking",
    policy: labels.CancellationPolicy || "Cancellation policy",
    refund: labels.RefundIfCancelledNow || "Refund if cancelled now",
    confirm: labels.ConfirmCancellation || "Confirm cancellation",
    keep: labels.KeepBooking || "Keep booking",
    noRefund: labels.CancellationNoRefund || "No refund is due under the policy you agreed to.",
  };

  const money = (cents, currency = "EUR") =>
    `${((cents || 0) / 100).toFixed(2)} ${String(currency).toUpperCase()}`;

  const openDialog = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/cancellation/preview/${reservationId}`,
        { reservationId }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Could not load cancellation details");
        return;
      }
      if (data.cancellable === false) {
        toast.info(data.message || "This booking cannot be cancelled online. Please contact support.");
        return;
      }

      setPreview(data);
      setOpen(true);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/cancellation/${reservationId}`,
        {
          method: "POST",
          reservationId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Cancellation failed");
        return;
      }

      // The amount here is whatever the server actually refunded, which is the
      // same figure the dialog showed — both now come from the same rule.
      toast.success(
        data.refundAmountCents > 0
          ? `Booking cancelled. Refund of ${money(data.refundAmountCents, preview?.currency)} is on its way.`
          : "Booking cancelled. No refund is due."
      );
      setOpen(false);
      onCancelled?.(data);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={loading}
        className={
          className ||
          "text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        }
      >
        {loading && !open ? "…" : triggerContent || t.cancel}
      </button>

      {open && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-[#1e4636]">{t.cancel}</h3>
            <p className="mb-4 text-xs uppercase tracking-wide text-neutral-400">
              {t.policy}: {preview.policy}
            </p>

            <ul className="mb-4 space-y-1 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
              {(preview.tiers || []).map((tier, i) => (
                <li key={i}>• {tier.label}</li>
              ))}
            </ul>

            <div className="mb-5 flex items-baseline justify-between border-t border-neutral-200 pt-4">
              <span className="text-sm text-neutral-600">{t.refund}</span>
              <span className="text-xl font-bold text-[#2E7D32]">
                {money(preview.refundAmountCents, preview.currency)}
              </span>
            </div>

            {preview.refundAmountCents === 0 && (
              <p className="mb-4 text-xs text-neutral-500">{t.noRefund}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-[#1e4636] hover:bg-neutral-50 disabled:opacity-50"
              >
                {t.keep}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "…" : t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
