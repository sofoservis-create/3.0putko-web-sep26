"use client";
import React from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  Users,
  Wallet,
} from "lucide-react";
import FeeBreakdown from "../../components/FeeBreakdown";
import { formatCalendarDate } from "../../utlis/calendarDate";

/**
 * One booking's payout, and the sections they are grouped into.
 *
 * Split out of Payments.js because the rows there said almost nothing: the
 * guest's name and an amount. A host with six properties could not tell WHICH
 * property a payout belonged to, which stay it covered, or — now that a host may
 * hold several Stripe accounts — which account the money was about to land in.
 * Every one of those is already on the reservation; none of it was shown.
 */

/** Money, in the booking's own currency rather than a hardcoded euro sign. */
export const formatMoney = (cents, currency = "eur", locale = "sk-SK") => {
  const amount = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: String(currency || "eur").toUpperCase(),
    }).format(amount);
  } catch {
    // An unknown currency code must not blank the figure out.
    return `${amount.toFixed(2)} ${String(currency || "eur").toUpperCase()}`;
  }
};

/** Whole nights between two calendar dates. */
const nightsBetween = (checkIn, checkOut) => {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
};

/** A booking reference a host can actually quote at us — the tail of the id. */
const shortRef = (id) => String(id || "").slice(-6).toUpperCase();

/**
 * The host's share, and whether it is known at all.
 *
 * `hostAmountCents` is written at booking time. When it is missing — a booking
 * that predates the fee split, or one whose webhook never completed — the old
 * row fell back to the GROSS and presented it as the payout. That is money the
 * host was never going to receive, on a button the server refuses with
 * `no_amount` the moment it is pressed. Reported as unknown instead.
 */
export const payoutAmountOf = (reservation) => {
  const hostCents = Math.round(Number(reservation.hostAmountCents) || 0);
  const grossCents =
    Math.round(Number(reservation.totalPriceCents) || 0) ||
    Math.round((Number(reservation.totalPrice) || 0) * 100);

  return { hostCents, grossCents, known: hostCents > 0 };
};

const TONES = {
  available: {
    card: "border-emerald-200 bg-emerald-50/60",
    chip: "bg-emerald-100 text-emerald-800",
    Icon: CheckCircle2,
  },
  locked: {
    card: "border-amber-200 bg-amber-50/50",
    chip: "bg-amber-100 text-amber-800",
    Icon: Clock,
  },
  failed: {
    card: "border-rose-200 bg-rose-50/60",
    chip: "bg-rose-100 text-rose-800",
    Icon: AlertTriangle,
  },
  released: {
    card: "border-gray-200 bg-gray-50",
    chip: "bg-gray-200 text-gray-700",
    Icon: Wallet,
  },
};

function Meta({ Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400" />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

export function PayoutRow({
  reservation,
  t,
  tone,
  locale,
  statusLabel,
  destinationAccount,
  busy = false,
  onWithdraw,
  withdrawDisabledReason,
}) {
  const style = TONES[tone] || TONES.released;
  const { hostCents, grossCents, known } = payoutAmountOf(reservation);
  const currency = reservation.currency || "eur";

  const property = reservation.accommodationId?.name || t.PayoutPropertyUnknown;
  const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);

  const unlocksAt = reservation.payoutUnlocksAt
    ? new Date(reservation.payoutUnlocksAt)
    : null;
  const releasedAt = reservation.transferredAt
    ? new Date(reservation.transferredAt)
    : null;

  // The Withdraw button is refused for a reason the host can read, rather than
  // being rendered live and failing server-side.
  const blocked = withdrawDisabledReason || (!known ? t.PayoutAmountUnknownHint : null);

  return (
    <div className={`rounded-xl border p-4 ${style.card}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Identity of the booking — property first, because that is what a host
            with more than one property looks for. */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-gray-900 break-words">{property}</h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.chip}`}
            >
              <style.Icon className="w-3 h-3" />
              {statusLabel}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            <Meta Icon={CalendarDays}>
              {formatCalendarDate(reservation.checkInDate, locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" → "}
              {formatCalendarDate(reservation.checkOutDate, locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {nights ? ` · ${nights} ${nights === 1 ? t.PayoutNight : t.PayoutNights}` : ""}
            </Meta>

            <Meta Icon={Users}>
              {reservation.name}
              {reservation.numberOfPersons
                ? ` · ${reservation.numberOfPersons} ${
                    reservation.numberOfPersons === 1 ? t.PayoutGuest : t.PayoutGuests
                  }`
                : ""}
            </Meta>

            {/* Which of the host's Stripe accounts this booking pays. Silent
                before, and it is the one detail a multi-account host cannot
                infer from anything else on the row. */}
            <Meta Icon={Home}>
              {t.PayoutRef}: {shortRef(reservation._id)}
              {destinationAccount
                ? ` · ${t.PaysOutTo} ${
                    destinationAccount.label ||
                    destinationAccount.payoutIban ||
                    destinationAccount.accountId
                  }`
                : ""}
            </Meta>

            {tone === "locked" && unlocksAt && (
              <Meta Icon={Clock}>
                {t.PayoutUnlocksOn}{" "}
                {unlocksAt.toLocaleString(locale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Meta>
            )}

            {tone === "released" && releasedAt && (
              <Meta Icon={CheckCircle2}>
                {t.PayoutSentOn}{" "}
                {releasedAt.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Meta>
            )}
          </div>
        </div>

        {/* Amount + action */}
        <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
          <div className="sm:text-right">
            <p className="text-lg font-bold leading-tight text-gray-900">
              {known ? formatMoney(hostCents, currency, locale) : "—"}
            </p>
            {/* The gross is shown as the gross, never as the payout. */}
            <p className="text-[11px] text-gray-500">
              {known
                ? `${t.PayoutOfGross} ${formatMoney(grossCents, currency, locale)}`
                : t.PayoutAmountUnknown}
            </p>
          </div>

          {onWithdraw && (
            <button
              type="button"
              onClick={() => onWithdraw(reservation._id)}
              disabled={busy || Boolean(blocked)}
              title={blocked || undefined}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? t.PayoutProcessing : t.PayoutWithdraw}
            </button>
          )}
        </div>
      </div>

      {/* Why a payout could not be sent. `payoutLastError` was recorded on every
          failed attempt and displayed nowhere — the booking simply sat in the
          available list looking withdrawable. */}
      {tone === "failed" && (
        <p className="mt-3 rounded-lg bg-rose-100/70 px-3 py-2 text-xs text-rose-800">
          <span className="font-semibold">{t.PayoutFailedLabel}:</span>{" "}
          {reservation.payoutLastError || t.PayoutFailedUnknown}
          {reservation.payoutAttempts > 1 && (
            <span className="block mt-0.5 text-rose-700">
              {t.PayoutAttempts.replace("{n}", reservation.payoutAttempts)}
            </span>
          )}
          <span className="block mt-1 text-rose-700">{t.PayoutFailedRetryNote}</span>
        </p>
      )}

      {blocked && tone === "available" && (
        <p className="mt-3 text-xs text-gray-600">{blocked}</p>
      )}

      {grossCents > 0 && (
        <div className="mt-3">
          <FeeBreakdown
            collapsible
            amountCents={grossCents}
            stripeFeeCents={
              reservation.paymentStatus === "paid" ? reservation.stripeFeeCents ?? null : null
            }
            labels={t}
            className="bg-white/70"
          />
        </div>
      )}
    </div>
  );
}

/** A titled group of payout rows, with its own count and total. */
export function PayoutSection({ title, hint, rows, totalCents, currency, locale, emptyText, t, children }) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900">
          {title}
          {rows.length > 0 && (
            <span className="ml-2 text-xs font-semibold text-gray-400">({rows.length})</span>
          )}
        </h3>
        {rows.length > 0 && totalCents > 0 && (
          <span className="text-sm font-semibold text-gray-700">
            {formatMoney(totalCents, currency, locale)}
          </span>
        )}
      </div>
      {hint && <p className="mb-3 text-xs text-gray-500">{hint}</p>}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

/**
 * The three figures a host actually opens this page for.
 *
 * Previously nothing on the page added anything up — the totals existed only in
 * the host's head, one row at a time.
 */
export function PayoutSummary({ availableCents, lockedCents, releasedCents, currency, locale, t }) {
  const tiles = [
    {
      key: "available",
      label: t.PayoutSummaryAvailable,
      value: availableCents,
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    {
      key: "locked",
      label: t.PayoutSummaryLocked,
      value: lockedCents,
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      key: "released",
      label: t.PayoutSummaryReleased,
      value: releasedCents,
      className: "border-gray-200 bg-gray-50 text-gray-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <div key={tile.key} className={`rounded-xl border p-4 ${tile.className}`}>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            {tile.label}
          </p>
          <p className="mt-1 text-xl font-bold">
            {formatMoney(tile.value, currency, locale)}
          </p>
        </div>
      ))}
    </div>
  );
}
