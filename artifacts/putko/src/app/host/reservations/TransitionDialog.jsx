import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarCheck2, Loader2 } from "lucide-react";
import {
  actionCopy,
  conflictLines,
  formatMoney,
  formatStay,
  guestsLabel,
  nightsLabel,
  reservationErrorText,
} from "./reservationModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

/**
 * Confirmation for accept / decline / cancel. Bottom sheet on phones, centred
 * dialog from `sm` up. Names the guest and the stay, blocks duplicate submits
 * while pending, and stays open with a retry when the request fails. Decline
 * and cancel take an optional note for the host's own records.
 */
export default function TransitionDialog({
  reservation,
  action,
  language,
  pending,
  failure, // { error, conflicts } | null
  onCancel,
  onConfirm, // (note) => void
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const [note, setNote] = useState("");
  const open = Boolean(reservation && action);

  useEffect(() => {
    if (!open) return undefined;
    setNote("");
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!pendingRef.current) onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const copy = actionCopy(action, language);
  const destructive = copy.irreversible;
  const conflicts = failure ? conflictLines(failure.conflicts, language) : [];
  // Once the server says the reservation moved on, retrying cannot help.
  const retryable = failure && failure.error?.code !== "invalidTransition" && failure.error?.code !== "checkInPassed";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reservation-action-title"
        aria-describedby="reservation-action-description"
        className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6"
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${destructive ? "bg-red-50 text-red-600" : "bg-[#DFBA73]/15 text-[#1E3E2B]"}`}>
            {destructive ? <AlertTriangle size={24} /> : <CalendarCheck2 size={24} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="reservation-action-title" className="text-lg font-bold text-[#1E3E2B]">{copy.title}</h2>
            <p id="reservation-action-description" className="mt-1 text-sm leading-6 text-neutral-600">{copy.body}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="truncate text-[15px] font-bold text-[#1E3E2B]">{reservation.guest?.name}</p>
          <p className="mt-0.5 text-[13px] text-neutral-600">{reservation.listing?.name}</p>
          <p className="mt-2 text-[14px] font-semibold text-[#1E3E2B]">{formatStay(reservation, language)}</p>
          <p className="text-[13px] text-neutral-600">
            {nightsLabel(reservation.nights, language)} · {guestsLabel(reservation.guests, language)} · {formatMoney(reservation.totalCents, reservation.currency, language)}
          </p>
        </div>

        {action !== "accept" && (
          <label className="mt-4 block">
            <span className="text-[13px] font-bold text-[#1E3E2B]">{t(language, "Note for your records (optional)", "Poznámka pre vás (nepovinné)")}</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              disabled={pending}
              rows={2}
              placeholder={t(language, "e.g. dates already promised to family", "napr. termín je už sľúbený rodine")}
              className="mt-1.5 w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-[14px] outline-none focus:border-[#1E3E2B] focus:ring-2 focus:ring-[#1E3E2B]/15 disabled:bg-neutral-100"
            />
          </label>
        )}

        {failure && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-bold">{copy.failed}</p>
            <p className="mt-0.5">{reservationErrorText(failure.error, language)}</p>
            {conflicts.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px]">
                {conflicts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-neutral-200 px-5 py-3 text-sm font-bold text-[#1E3E2B] transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            {failure && !retryable ? t(language, "Close", "Zavrieť") : t(language, "Go back", "Späť")}
          </button>
          {(!failure || retryable) && (
            <button
              type="button"
              onClick={() => onConfirm(note.trim())}
              disabled={pending}
              aria-busy={pending || undefined}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                destructive ? "bg-red-600 hover:bg-red-700" : "bg-[#1E3E2B] hover:bg-[#163021]"
              }`}
            >
              {pending && <Loader2 size={18} className="animate-spin" />}
              {pending ? copy.pending : failure ? t(language, "Try again", "Skúsiť znova") : copy.confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
