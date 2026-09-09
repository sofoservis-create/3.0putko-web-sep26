import React, { useEffect, useRef } from "react";
import { ArrowLeft, Check, CircleAlert, CircleDashed, ListChecks, Loader2, X } from "lucide-react";

const t = (language, en, sk) => (language === "en" ? en : sk);

const formatTime = (value, language) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const sameDay = new Date().toDateString() === date.toDateString();
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sk-SK", {
    ...(sameDay ? {} : { day: "numeric", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Explicit save lifecycle indicator: Saving / Saved HH:MM / Unsaved changes /
 * Not saved (with retry). `compact` drops the retry label to an icon-sized
 * button for the phone header.
 */
export function SaveStatus({ state, dirty, savedAt, hasListing, language, onRetry, className = "" }) {
  const en = language === "en";
  let icon;
  let text;
  let tone = "text-neutral-500";

  if (state === "saving") {
    icon = <Loader2 size={15} className="animate-spin" />;
    text = t(language, "Saving…", "Ukladá sa…");
  } else if (state === "failed") {
    icon = <CircleAlert size={15} />;
    text = t(language, "Not saved", "Neuložené");
    tone = "text-red-600";
  } else if (dirty) {
    icon = <CircleDashed size={15} />;
    text = t(language, "Unsaved changes", "Neuložené zmeny");
    tone = "text-amber-700";
  } else if (hasListing && savedAt) {
    icon = <Check size={15} />;
    text = `${t(language, "Saved", "Uložené")} ${formatTime(savedAt, language) ?? ""}`.trim();
    tone = "text-green-700";
  } else if (hasListing) {
    icon = <Check size={15} />;
    text = t(language, "Saved", "Uložené");
    tone = "text-green-700";
  } else {
    icon = <CircleDashed size={15} />;
    text = t(language, "Not saved yet", "Zatiaľ neuložené");
  }

  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-2 text-[12px] font-bold ${tone} ${className}`}>
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {icon}
        {text}
      </span>
      {state === "failed" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-9 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[12px] font-bold text-red-700 transition-colors hover:bg-red-100"
        >
          {en ? "Retry" : "Skúsiť znova"}
        </button>
      )}
    </div>
  );
}

function StepList({ steps, currentStep, isComplete, language, onSelect, compact = false }) {
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((step, index) => {
        const active = currentStep === index;
        const complete = isComplete(step.id);
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
              className={`flex w-full min-h-12 items-center gap-3 rounded-xl px-3 text-left font-bold transition-all ${
                active
                  ? "bg-[#1E3E2B] text-white shadow-md"
                  : complete
                    ? "text-[#1E3E2B] hover:bg-neutral-50"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
              } ${compact ? "py-2.5" : "py-3"}`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  active ? "bg-white/15 text-white" : complete ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {complete && !active ? <Check size={14} /> : index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px]">{step.title[language]}</span>
              <step.icon size={18} className={active || complete ? "text-[#DFBA73]" : "text-neutral-300"} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Desktop (lg+) sidebar: completion, step list, save status. */
export function DesktopStepSidebar({ steps, currentStep, isComplete, percent, language, onSelect, onBack, saveStatus }) {
  return (
    <div className="hidden lg:block w-72 shrink-0 self-start sticky top-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex min-h-11 items-center gap-2 text-sm font-bold text-neutral-500 transition-colors hover:text-[#1E3E2B]"
      >
        <ArrowLeft size={18} />
        {t(language, "Back to listings", "Späť na ponuky")}
      </button>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-[#1E3E2B]">{t(language, "Completion", "Dokončenie")}</h3>
        <span className="text-sm font-bold text-[#1E3E2B]">{percent}%</span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full bg-[#DFBA73] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="mb-6 min-h-6">{saveStatus}</div>
      <StepList steps={steps} currentStep={currentStep} isComplete={isComplete} language={language} onSelect={onSelect} />
    </div>
  );
}

/** Phone/tablet header: back, step position, and a button opening the step sheet. */
export function MobileEditorHeader({ step, stepIndex, total, percent, language, onBack, onOpenSteps, saveStatus }) {
  return (
    <div className="lg:hidden sticky top-0 z-30 -mx-4 border-b border-neutral-200 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex min-h-14 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t(language, "Back to listings", "Späť na ponuky")}
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#1E3E2B] transition-colors hover:bg-neutral-100"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            {t(language, "Step", "Krok")} {stepIndex + 1} / {total}
          </div>
          <div className="truncate text-[16px] font-bold leading-5 text-[#1E3E2B]">{step.title[language]}</div>
        </div>
        <button
          type="button"
          onClick={onOpenSteps}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-[13px] font-bold text-[#1E3E2B] transition-colors hover:bg-neutral-50"
        >
          <ListChecks size={18} className="text-[#DFBA73]" />
          {t(language, "Steps", "Kroky")}
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 pb-2.5">
        {saveStatus}
        <span className="text-[12px] font-bold text-neutral-500">{percent}%</span>
      </div>
      <div className="-mx-4 h-1 bg-neutral-200">
        <div className="h-full bg-[#DFBA73] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Bottom sheet listing all steps for phones and tablets. */
export function StepSheet({ open, steps, currentStep, isComplete, percent, language, onSelect, onClose }) {
  const sheetRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const focusable = () =>
      sheetRef.current?.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [];
    sheetRef.current?.querySelector('[aria-current="step"]')?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
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
      className="lg:hidden fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-steps-title"
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 id="editor-steps-title" className="text-lg font-bold text-[#1E3E2B]">
              {t(language, "Listing steps", "Kroky ponuky")}
            </h2>
            <p className="text-[12px] font-bold text-neutral-500">
              {percent}% {t(language, "complete", "dokončené")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(language, "Close steps", "Zavrieť kroky")}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <StepList
            steps={steps}
            currentStep={currentStep}
            isComplete={isComplete}
            language={language}
            compact
            onSelect={(index) => {
              onSelect(index);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
