"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import apiFetch from "../../utlis/apiFetch";
import { formatCalendarDate } from '../../utlis/calendarDate';

/**
 * Admin refund / cancellation.
 *
 * The refund the policy allows is always fetched from the server, which reads
 * the tier snapshot stored on the booking — the terms the guest agreed to when
 * they paid. An admin may override that amount, which is the whole point of the
 * screen (dispute resolution, goodwill, a host who cancelled late), but the
 * policy figure is shown first so an override is a deliberate decision rather
 * than a guess.
 */
export default function RefundDialog({ reservation, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [useOverride, setUseOverride] = useState(false);
  const [overrideEuros, setOverrideEuros] = useState("");
  const [reason, setReason] = useState("");

  const money = (cents) => `€${((cents || 0) / 100).toFixed(2)}`;
  const grossCents = reservation.totalPriceCents ?? Math.round((reservation.totalPrice || 0) * 100);

  useEffect(() => {
    let cancelled = false;

    apiFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/cancellation/preview/${reservation._id}`, {
      reservationId: reservation._id,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview({ error: "Could not load the policy for this booking" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reservation._id]);

  const overrideCents = Math.round(Number(overrideEuros || 0) * 100);
  const overrideInvalid =
    useOverride && (!Number.isFinite(overrideCents) || overrideCents < 0 || overrideCents > grossCents);

  const submit = async () => {
    if (overrideInvalid) return;
    setSubmitting(true);

    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/cancellation/${reservation._id}`,
        {
          method: "POST",
          reservationId: reservation._id,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: reason || undefined,
            // Omitted entirely unless the admin deliberately overrode it, so
            // the server applies the policy snapshot by default.
            ...(useOverride ? { overrideRefundCents: overrideCents } : {}),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Cancellation failed");
        return;
      }

      toast.success(`Cancelled. Refunded ${money(data.refundAmountCents)}.`);
      onDone?.(data);
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyPaidOut = Boolean(reservation.transferId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">Cancel and refund</h3>
        <p className="mt-1 text-sm text-gray-500">
          {reservation.name} · {formatCalendarDate(reservation.checkInDate)} →{" "}
          {formatCalendarDate(reservation.checkOutDate)} · paid {money(grossCents)}
        </p>

        {loading && <p className="mt-4 text-sm text-gray-500">Loading policy…</p>}

        {alreadyPaidOut && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            This booking has already been paid out to the host ({reservation.transferId}). It cannot
            be refunded from the platform balance — that needs a transfer reversal, which is a
            separate flow.
          </div>
        )}

        {!loading && preview && !preview.error && !alreadyPaidOut && (
          <>
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
              <div className="font-medium text-gray-800">
                Policy on this booking: {preview.policy}
              </div>
              <div className="mt-1 text-gray-600">
                Refund under that policy right now:{" "}
                <strong>{money(preview.refundAmountCents)}</strong> ({preview.refundPercent}%)
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {preview.hoursUntilCheckIn}h until check-in
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useOverride}
                onChange={(e) => setUseOverride(e.target.checked)}
              />
              Override the amount
            </label>

            {useOverride && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">€</span>
                  <input
                    type="number"
                    min={0}
                    max={grossCents / 100}
                    step="0.01"
                    value={overrideEuros}
                    onChange={(e) => setOverrideEuros(e.target.value)}
                    className="w-40 rounded-lg border border-gray-300 p-2"
                    placeholder={(preview.refundAmountCents / 100).toFixed(2)}
                  />
                  <span className="text-xs text-gray-500">max {money(grossCents)}</span>
                </div>
                {overrideInvalid && (
                  <p className="mt-1 text-xs text-red-600">
                    Enter an amount between €0.00 and {money(grossCents)}.
                  </p>
                )}
              </div>
            )}

            <textarea
              className="mt-4 w-full rounded-lg border border-gray-300 p-2 text-sm"
              rows={2}
              placeholder="Reason (recorded on the booking)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </>
        )}

        {preview?.error && <p className="mt-4 text-sm text-red-600">{preview.error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
          >
            Close
          </button>
          <button
            onClick={submit}
            disabled={submitting || loading || alreadyPaidOut || overrideInvalid || preview?.error}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Refunding…" : "Cancel and refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
