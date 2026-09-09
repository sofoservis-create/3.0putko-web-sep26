import React, { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { listingLocation, listingName, statusPresentation } from "../../host/hostListingModel";

/**
 * In-app delete confirmation. Renders as a bottom sheet on phones and a
 * centred dialog from `sm` up. Names the property, blocks duplicate submits
 * while the request is pending, and keeps the dialog open with a retry
 * action when the request fails.
 */
export default function DeleteListingDialog({
  listing,
  language,
  pending,
  error,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    if (!listing) return undefined;
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!pendingRef.current) onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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
  }, [listing]);

  if (!listing) return null;

  const name = listingName(listing, language);
  const status = statusPresentation(listing.status, language);
  const en = language === "en";

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
        aria-labelledby="delete-listing-title"
        aria-describedby="delete-listing-description"
        className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-listing-title" className="text-lg font-bold text-[#1E3E2B]">
              {en ? "Delete this listing?" : "Vymazať túto ponuku?"}
            </h2>
            <p id="delete-listing-description" className="mt-1 text-sm leading-6 text-neutral-600">
              {en
                ? "This permanently removes the listing and its setup progress. This cannot be undone."
                : "Ponuka a jej rozpracované nastavenie sa natrvalo odstránia. Túto akciu nie je možné vrátiť späť."}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-[#1E3E2B]">{name}</p>
              <p className="mt-0.5 truncate text-[13px] text-neutral-500">{listingLocation(listing, language)}</p>
            </div>
            <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${status.badge}`}>
              {status.label}
            </span>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-bold">{en ? "The listing wasn't deleted." : "Ponuka nebola vymazaná."}</p>
            <p className="mt-0.5">
              {en ? "Check your connection and try again." : "Skontrolujte pripojenie a skúste to znova."}
            </p>
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
            {en ? "Keep listing" : "Ponechať ponuku"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            {pending
              ? (en ? "Deleting…" : "Odstraňuje sa…")
              : error
                ? (en ? "Try again" : "Skúsiť znova")
                : (en ? "Delete listing" : "Vymazať ponuku")}
          </button>
        </div>
      </div>
    </div>
  );
}
