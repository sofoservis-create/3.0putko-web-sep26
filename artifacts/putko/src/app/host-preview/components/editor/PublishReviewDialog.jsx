import React, { useEffect, useRef } from "react";
import { AlertCircle, BedDouble, CheckCircle2, ChevronRight, Home, Image as ImageIcon, Loader2 } from "lucide-react";
import { EDITOR_STEP_TITLES } from "../../../host/hostListingModel";
import { REQUIREMENTS, requirementLabel } from "../../../host/hostEditorValidation";
import { AMENITIES_LIST } from "./EditorSteps";

const t = (language, en, sk) => (language === "en" ? en : sk);

/**
 * Publish review: bottom sheet on phones, centred dialog from `sm` up. Every
 * missing requirement reported by the server is a button that opens its step
 * and field (`onFixRequirement`); the editor then offers a way back here.
 */
export default function PublishReviewDialog({
  open,
  language,
  data,
  status,
  completion,
  publishing,
  unsaved = false,
  onClose,
  onPublish,
  onFixRequirement,
}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  const missing = completion.missing || [];
  const cover = Array.isArray(data.photoUrls) ? data.photoUrls[0] : null;
  const coverUrl = typeof cover === "string" ? cover : cover?.url;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-review-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-4 sm:px-6">
          <h2 id="publish-review-title" className="text-xl font-bold text-[#1E3E2B]">
            {t(language, "Publish Review", "Kontrola pred zverejnením")}
          </h2>
          <button
            autoFocus
            type="button"
            onClick={onClose}
            aria-label={t(language, "Close publish review", "Zavrieť kontrolu pred zverejnením")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-sm hover:text-neutral-900"
          >
            <span className="text-xl font-bold leading-none">&times;</span>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {!completion.canPublish ? (
            <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-red-900">
              <div className="flex gap-3">
                <AlertCircle size={24} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold">{t(language, "Missing requirements", "Chýbajúce požiadavky")}</h3>
                  <p className="mt-1 text-[14px] font-medium opacity-90">
                    {t(language, "Open an item to fix it; you will be brought back here.", "Otvorte položku a opravte ju; potom sa sem vrátite.")}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {missing.map((requirement) => {
                  const stepId = REQUIREMENTS[requirement]?.step;
                  const stepTitle = stepId ? EDITOR_STEP_TITLES[stepId]?.[language === "en" ? "en" : "sk"] : null;
                  return (
                    <li key={requirement}>
                      <button
                        type="button"
                        onClick={() => onFixRequirement(requirement)}
                        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-red-300 hover:bg-red-50/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-bold text-[#1E3E2B]">{requirementLabel(requirement, language)}</span>
                          {stepTitle && (
                            <span className="block text-[12px] font-semibold text-neutral-500">
                              {t(language, "Step", "Krok")}: {stepTitle}
                            </span>
                          )}
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-neutral-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-4 rounded-3xl border border-green-100 bg-green-50 p-5 text-green-900">
              <CheckCircle2 size={32} className="shrink-0" />
              <div>
                <h3 className="text-lg font-bold">
                  {status === "LIVE"
                    ? t(language, "This listing is live", "Táto ponuka je zverejnená")
                    : t(language, "Ready to publish!", "Pripravené na zverejnenie!")}
                </h3>
                <p className="text-[15px] font-medium opacity-90">
                  {t(language, "All requirements are met.", "Všetky požiadavky sú splnené.")}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="border-b border-neutral-200 pb-3 font-bold text-[#1E3E2B]">
              {t(language, "Guest preview", "Náhľad pre hostí")}
            </h4>
            <div className="mx-auto mt-4 max-w-sm overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-lg">
              <div className="relative aspect-[4/3] bg-neutral-100">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-300">
                    <ImageIcon size={48} strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1E3E2B] shadow-sm backdrop-blur">
                  {t(language, "Preview", "Náhľad")}
                </div>
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <h3 className="line-clamp-1 text-lg font-bold text-[#1E3E2B]">
                    {data.name || t(language, "Property name", "Názov ubytovania")}
                  </h3>
                  <div className="flex items-center gap-1 whitespace-nowrap text-[15px] font-bold">
                    <span className="text-[#1E3E2B]">€{data.nightlyPrice || "0"}</span>
                    <span className="font-medium text-neutral-500">/{t(language, "night", "noc")}</span>
                  </div>
                </div>
                <p className="mb-4 text-[14px] font-medium text-neutral-500">
                  {[data.city, data.country].filter(Boolean).join(", ") || t(language, "Location not set", "Lokalita nenastavená")}
                </p>
                <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-neutral-100 pb-4 text-[14px] font-medium text-neutral-600">
                  <span className="flex items-center gap-2">
                    <BedDouble size={16} className="text-neutral-400" /> {data.beds || 0} {t(language, "beds", "postelí")}
                  </span>
                  <span className="flex items-center gap-2">
                    <Home size={16} className="text-neutral-400" /> {data.guests || 0} {t(language, "guests", "hostí")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(data.amenities || []).slice(0, 3).map((amenityId) => {
                    const amenity = AMENITIES_LIST.find((item) => item.id === amenityId);
                    return amenity ? (
                      <span key={amenity.id} className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-600">
                        {amenity[language === "en" ? "en" : "sk"]}
                      </span>
                    ) : null;
                  })}
                  {data.amenities?.length > 3 && (
                    <span className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-600">
                      +{data.amenities.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 bg-neutral-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:p-6">
          {unsaved && status !== "LIVE" && (
            <p role="status" className="text-[13px] font-semibold text-amber-700 sm:mr-auto">
              {t(language, "Newer edits are being saved; publish once they are checked.", "Novšie úpravy sa ukladajú; zverejnite, keď budú skontrolované.")}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl px-6 py-3 font-bold text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            {t(language, "Keep editing", "Pokračovať v úprave")}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={!completion.canPublish || publishing || unsaved || status === "LIVE"}
            aria-busy={publishing || undefined}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-8 py-3 font-bold text-white shadow-md transition-colors hover:bg-[#163021] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publishing && <Loader2 className="animate-spin" size={18} />}
            {status === "LIVE"
              ? t(language, "Already live", "Už zverejnené")
              : publishing
                ? t(language, "Publishing…", "Zverejňuje sa…")
                : t(language, "Publish Listing", "Zverejniť ponuku")}
          </button>
        </div>
      </div>
    </div>
  );
}
