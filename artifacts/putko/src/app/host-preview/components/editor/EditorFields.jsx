import React, { useEffect, useState } from "react";
import { AlertCircle, Minus, Plus } from "lucide-react";
import { fieldElementId } from "../../../host/hostEditorValidation";

// Shared form primitives for the listing editor. Every control gets a stable
// DOM id (`fieldElementId`) so review links and validation can focus it, and
// a bottom scroll margin so focusing never hides the field behind the sticky
// action bar or the on-screen keyboard.

export const controlClass = (error, extra = "") =>
  `w-full min-h-12 px-4 py-3 rounded-xl border bg-white text-[16px] text-[#1E3E2B] outline-none transition-all scroll-mb-40 ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-neutral-300 focus:border-[#1E3E2B] focus:ring-1 focus:ring-[#1E3E2B]"
  } ${extra}`;

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-semibold text-red-600">
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function Field({ name, label, hint, error, children, className = "" }) {
  const id = fieldElementId(name);
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-[#1E3E2B]">
        {label}
      </label>
      {typeof children === "function" ? children({ id, errorId, hintId }) : children}
      {hint && !error && (
        <p id={hintId} className="mt-2 text-[13px] font-medium text-neutral-500">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

const describedBy = (error, errorId, hintId) =>
  [error ? errorId : null, hintId].filter(Boolean).join(" ") || undefined;

export function TextField({ name, label, hint, error, value, onChange, type = "text", inputMode, placeholder, autoComplete }) {
  return (
    <Field name={name} label={label} hint={hint} error={error}>
      {({ id, errorId, hintId }) => (
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error, errorId, hintId)}
          className={controlClass(error)}
        />
      )}
    </Field>
  );
}

export function TextAreaField({ name, label, hint, error, value, onChange, placeholder, rows = 5 }) {
  return (
    <Field name={name} label={label} hint={hint} error={error}>
      {({ id, errorId, hintId }) => (
        <textarea
          id={id}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error, errorId, hintId)}
          className={controlClass(error, "resize-none")}
        />
      )}
    </Field>
  );
}

export function SelectField({ name, label, hint, error, value, onChange, children }) {
  return (
    <Field name={name} label={label} hint={hint} error={error}>
      {({ id, errorId, hintId }) => (
        <select
          id={id}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error, errorId, hintId)}
          className={controlClass(error)}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

/**
 * Touch-first numeric control: 48px −/+ buttons around a numeric input that
 * still accepts typing. The typed text is kept while the field has focus and
 * the parsed number ("" while empty or unparsable) is written to the payload
 * on every change, so the server's positive-number check sees what the host
 * typed. Nothing is rounded, clamped, or substituted on blur: an invalid value
 * gets an inline message from step validation instead of a silent rewrite,
 * and stored values outside the −/+ range stay untouched. `min` only floors
 * the −/+ buttons; `decimals` sets the precision those buttons keep.
 */
export function NumberStepperField({
  name,
  label,
  hint,
  error,
  value,
  onValueChange,
  min = 0,
  step = 1,
  decimals = 0,
  language,
  prefix,
}) {
  const id = fieldElementId(name);
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : null;
  const [text, setText] = useState(numeric === null ? "" : String(numeric));
  const [focused, setFocused] = useState(false);
  // Outside edits (load, −/+ buttons, reset) refresh the text; while typing
  // the host's own text wins so "89." or "0" are not rewritten mid-entry.
  useEffect(() => {
    if (focused) return;
    setText(numeric === null ? "" : String(numeric));
  }, [numeric, focused]);
  const en = language === "en";
  const round = (next) => Number(next.toFixed(decimals));
  const bump = (delta) => {
    const base = numeric ?? Math.max(min - delta, 0);
    const next = round(Math.max(min, base + delta));
    setText(String(next));
    onValueChange(name, next);
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-[#1E3E2B]">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-stretch overflow-hidden rounded-xl border bg-white ${
          error ? "border-red-400" : "border-neutral-300 focus-within:border-[#1E3E2B] focus-within:ring-1 focus-within:ring-[#1E3E2B]"
        }`}
      >
        <button
          type="button"
          onClick={() => bump(-step)}
          disabled={numeric !== null && numeric <= min}
          aria-label={en ? `Decrease ${label}` : `Znížiť ${label}`}
          className="flex w-12 shrink-0 items-center justify-center text-[#1E3E2B] transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-300"
        >
          <Minus size={20} />
        </button>
        <div className="flex min-w-0 flex-1 items-center border-x border-neutral-200">
          {prefix && <span className="pl-3 text-[15px] font-bold text-neutral-400">{prefix}</span>}
          <input
            id={id}
            name={name}
            type="text"
            inputMode={decimals > 0 ? "decimal" : "numeric"}
            autoComplete="off"
            value={text}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              const raw = event.target.value;
              setText(raw);
              const trimmed = raw.trim().replace(",", ".");
              const parsed = trimmed === "" ? NaN : Number(trimmed);
              onValueChange(name, Number.isFinite(parsed) ? parsed : "");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(error, errorId, hintId)}
            className="w-full min-w-0 bg-transparent px-3 py-3 text-center text-[16px] font-bold text-[#1E3E2B] outline-none scroll-mb-40"
          />
        </div>
        <button
          type="button"
          onClick={() => bump(step)}
          aria-label={en ? `Increase ${label}` : `Zvýšiť ${label}`}
          className="flex w-12 shrink-0 items-center justify-center text-[#1E3E2B] transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-300"
        >
          <Plus size={20} />
        </button>
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-2 text-[13px] font-medium text-neutral-500">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/** Large tappable checkbox card used for confirmations and amenities. */
export function CheckCard({ id, name, checked, onChange, title, description, error, describedBy: extraDescribedBy }) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex min-h-12 cursor-pointer items-start gap-4 rounded-2xl border-2 bg-white p-4 transition-colors ${
          checked
            ? "border-[#DFBA73] bg-[#DFBA73]/5"
            : error
              ? "border-red-300"
              : "border-neutral-200 hover:border-neutral-300"
        }`}
      >
        <input
          id={id}
          type="checkbox"
          name={name}
          checked={Boolean(checked)}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : null, extraDescribedBy].filter(Boolean).join(" ") || undefined}
          className="mt-0.5 h-6 w-6 shrink-0 rounded border-neutral-300 text-[#DFBA73] focus:ring-[#DFBA73] scroll-mb-40"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-6 text-[#1E3E2B]">{title}</span>
          {description && (
            <span className="mt-1 block text-[13px] font-medium leading-5 text-neutral-500">{description}</span>
          )}
        </span>
      </label>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
