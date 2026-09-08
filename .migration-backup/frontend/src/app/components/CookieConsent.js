"use client";

// Consent gate for non-essential tracking.
//
// The Meta Pixel and Microsoft Clarity were injected unconditionally from the
// root layout, so both ran — and set cookies, and in Clarity's case began
// recording the session — before the visitor was asked anything. Under GDPR
// Art. 6 and § 109 ods. 8 zákona č. 452/2021 Z. z. o elektronických
// komunikáciách, storing or reading anything on a visitor's device for
// analytics or advertising needs prior, informed, opt-in consent. Legitimate
// interest is not available for advertising cookies.
//
// This module is the single place that answers "may we track?". Nothing else
// should decide for itself.

import { useEffect, useState } from "react";

export const CONSENT_STORAGE_KEY = "putko.cookieConsent.v1";
export const CONSENT_EVENT = "putko:cookie-consent";

/** The consent record, or null when the visitor has not answered yet. */
export function readConsent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return readConsent()?.analytics === true;
}

export function hasMarketingConsent() {
  return readConsent()?.marketing === true;
}

function writeConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...value, at: Date.now() }));
  } catch {
    /* a visitor blocking storage has, in effect, declined */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Re-render whenever the visitor answers, so gated scripts can mount. */
export function useConsent() {
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    setConsent(readConsent());
    const onChange = () => setConsent(readConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return consent;
}

export default function CookieConsent() {
  const consent = useConsent();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  // Already answered, or still server-rendering: show nothing.
  if (!ready || consent) return null;

  const accept = () => writeConsent({ necessary: true, analytics: true, marketing: true });
  const reject = () => writeConsent({ necessary: true, analytics: false, marketing: false });

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Súhlas s cookies"
      className="fixed inset-x-0 bottom-0 z-[9999] border-t border-neutral-200 bg-white p-4 shadow-lg sm:p-5"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-700">
          Používame nevyhnutné cookies na fungovanie stránky. S vaším súhlasom
          používame aj analytické a marketingové cookies (Meta, Microsoft
          Clarity). Súhlas môžete kedykoľvek odvolať.{" "}
          <a href="/Privacy-Policy" className="underline">
            Zásady ochrany súkromia
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          {/* Refusing must be exactly as easy as accepting. */}
          <button
            type="button"
            onClick={reject}
            className="min-h-[44px] rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium"
          >
            Odmietnuť
          </button>
          <button
            type="button"
            onClick={accept}
            className="min-h-[44px] rounded-lg bg-[#357965] px-4 py-2 text-sm font-medium text-white"
          >
            Prijať všetko
          </button>
        </div>
      </div>
    </div>
  );
}
