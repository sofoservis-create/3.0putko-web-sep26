import React, { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

const t = (language, en, sk) => (language === "en" ? en : sk);

/**
 * Confirmation shown when the host tries to leave the listing editor with
 * unsaved changes. Rendered by the Host shell so it survives whatever
 * navigation was attempted. Bottom sheet on phones, dialog from `sm` up.
 */
export default function LeaveEditorDialog({ open, language, saving, saveInFlight = false, saveError, onStay, onDiscard, onSaveAndLeave }) {
  const dialogRef = useRef(null);
  const stayRef = useRef(null);
  const onStayRef = useRef(onStay);
  onStayRef.current = onStay;
  const savingRef = useRef(saving);
  savingRef.current = saving;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    stayRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!savingRef.current) onStayRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
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
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onStay();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-editor-title"
        aria-describedby="leave-editor-description"
        className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="leave-editor-title" className="text-lg font-bold text-[#1E3E2B]">
              {t(language, "Unsaved changes", "Neuložené zmeny")}
            </h2>
            <p id="leave-editor-description" className="mt-1 text-sm leading-6 text-neutral-600">
              {t(
                language,
                "Some of your edits haven't been saved to this listing yet. Save them before leaving, or discard them.",
                "Niektoré úpravy tejto ponuky ešte nie sú uložené. Pred odchodom ich uložte, alebo ich zahoďte.",
              )}
            </p>
          </div>
        </div>

        {saveInFlight && !saving && (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            <Loader2 size={16} className="shrink-0 animate-spin" />
            {t(language, "A save that started earlier is still running. Wait for it before discarding.", "Skoršie ukladanie ešte prebieha. Pred zahodením počkajte, kým skončí.")}
          </p>
        )}

        {saveError && (
          <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-bold">{t(language, "The changes couldn't be saved.", "Zmeny sa nepodarilo uložiť.")}</p>
            <p className="mt-0.5">
              {t(language, "Check your connection and try again, or stay and keep editing.", "Skontrolujte pripojenie a skúste to znova, alebo zostaňte a pokračujte v úprave.")}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onSaveAndLeave}
            disabled={saving}
            aria-busy={saving || undefined}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#163021] disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {saving
              ? t(language, "Saving…", "Ukladá sa…")
              : saveError
                ? t(language, "Try saving again", "Skúsiť uložiť znova")
                : t(language, "Save and leave", "Uložiť a odísť")}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving || saveInFlight}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-red-200 px-5 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {t(language, "Discard unsaved changes", "Zahodiť neuložené zmeny")}
          </button>
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-neutral-200 px-5 py-3 text-sm font-bold text-[#1E3E2B] transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            {t(language, "Stay and keep editing", "Zostať a pokračovať")}
          </button>
        </div>
      </div>
    </div>
  );
}
