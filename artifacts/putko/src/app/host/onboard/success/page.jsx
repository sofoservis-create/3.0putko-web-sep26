"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import Link from "@/app/components/NextLink";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { FormContext } from "../../../FormContext";
import en from "../../../locales/en";
import sk from "../../../locales/sk";
import apiFetch from "../../../utlis/apiFetch";
import BillingDetailsModal from "../../../components/BillingDetailsModal";
import { billingFieldLabel } from "../../../utlis/hostBilling";

const translations = { en, sk };

/**
 * Stripe's `return_url` after Express onboarding.
 *
 * Landing here does NOT mean onboarding succeeded — Stripe sends the host back
 * whether they finished or abandoned the form, and the URL can be opened
 * directly. So this page asks our backend to verify against the Stripe API
 * (accounts.retrieve) rather than trusting the redirect.
 *
 * Onboarding is not finished when Stripe is satisfied. Stripe verifies the
 * host's IDENTITY; Putko separately needs their INVOICING details (IČO, DIČ,
 * address) to raise the monthly fee invoice, and a listing is not bookable until
 * both are in place. So this screen treats the billing form as the last step of
 * onboarding rather than as a note to act on later — which is what it was, and
 * nobody acted on it.
 */
const HostOnboardSuccess = () => {
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [state, setState] = useState("checking"); // checking | complete | incomplete | error
  const [status, setStatus] = useState(null);
  const [resuming, setResuming] = useState(false);
  const [host, setHost] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [showBilling, setShowBilling] = useState(false);
  // The form is auto-opened at most once per visit. Without this, a host who
  // closes it without saving gets it thrown back at them on any re-verification.
  // Opening it by hand from the button below is always allowed.
  const billingAutoPrompted = useRef(false);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!stored) {
      setState("error");
      return;
    }

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      setState("error");
      return;
    }

    if (!user?._id) {
      setState("error");
      return;
    }

    setHostId(user._id);

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await apiFetch(
          `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/payments/host/refresh-status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hostId: user._id }),
          }
        );
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState("error");
          return;
        }

        setStatus(data);
        setState(data.onboardingComplete ? "complete" : "incomplete");

        // Auto-open the billing form ONLY when it is genuinely still outstanding.
        //
        // A host can now enter these details from the payout settings header
        // before they ever start onboarding. Popping the form at them again on
        // the way back — over a screen that otherwise says "your account is
        // ready" — asks for data they have already given and reads as though the
        // save did not work. `missingBillingFields` comes from the server's own
        // Host.missingBillingFields(), so an empty array means on file.
        const billingOutstanding = Boolean(data.missingBillingFields?.length);

        // Also skipped while Stripe itself is unfinished: that screen's one
        // instruction is "continue onboarding", and a modal over it buries the
        // thing the host actually has to do next.
        if (data.onboardingComplete && billingOutstanding && !billingAutoPrompted.current) {
          // The host record itself, so the form opens prefilled with whatever is
          // already on file rather than blank.
          try {
            const hostRes = await fetch(
              `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/hosts/${user._id}`
            );
            const hostData = await hostRes.json();
            if (!cancelled && hostRes.ok) setHost(hostData);
          } catch {
            // Prefill is a convenience; the form still works without it.
          }
          if (!cancelled) {
            billingAutoPrompted.current = true;
            setShowBilling(true);
          }
        }
      } catch (err) {
        console.error("Onboarding verification failed:", err);
        if (!cancelled) setState("error");
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stripe often needs more information before it enables an account. Send the
  // host straight back into onboarding with a fresh Account Link (the old one
  // has already expired — they only live for minutes).
  const resumeOnboarding = async () => {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    const user = JSON.parse(stored);
    setResuming(true);
    try {
      const res = await apiFetch(
        `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/payments/host/create-express-account`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostId: user._id, email: user.email }),
        }
      );
      const data = await res.json();
      if (res.ok && data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        setResuming(false);
      }
    } catch {
      setResuming(false);
    }
  };

  const isChecking = state === "checking";
  const stripeComplete = state === "complete";
  const missingBilling = status?.missingBillingFields || [];

  // Onboarding is only finished when BOTH sides are: Stripe has verified the
  // host, and Putko holds the details it needs to invoice its fee. Until then
  // the host's listings are not bookable, so saying "your account is ready"
  // would be a straight untruth.
  const isReady = stripeComplete && missingBilling.length === 0;
  const needsBilling = stripeComplete && missingBilling.length > 0;
  const isProblem = state === "incomplete" || state === "error" || needsBilling;

  // Billing details are the one outstanding item — a much smaller ask than
  // "Stripe needs more information", and worth saying so.
  const billingSaved = async () => {
    setShowBilling(false);
    setStatus((prev) => ({ ...prev, missingBillingFields: [] }));
  };

  const title = isChecking
    ? t.OnboardVerifying || "Verifying your account…"
    : needsBilling
    ? t.OnboardBillingTitle || "One last step"
    : isReady
    ? t.OnboardComplete || "Your account is ready"
    : state === "error"
    ? t.OnboardError || "We couldn't verify your account"
    : t.OnboardIncomplete || "Stripe needs a bit more information";

  const body = isChecking
    ? t.OnboardVerifyingBody || "We're confirming your details with Stripe. This only takes a moment."
    : needsBilling
    ? t.OnboardBillingBody ||
      "Stripe has verified you. We just need your invoicing details — we issue you a monthly invoice for the platform fee, and your listings cannot take bookings until we have them."
    : isReady
    ? t.OnboardCompleteBody || "Stripe has verified your details. You can now receive payouts for your bookings."
    : state === "error"
    ? t.OnboardErrorBody || "Please open your profile and try connecting again. If this keeps happening, contact support."
    : t.OnboardIncompleteBody || "Stripe hasn't finished verifying your account yet, so payouts are still on hold.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 font-inter antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center">
        {/* ICON */}
        <div className="mb-7 flex justify-center">
          <div
            className={`relative h-20 w-20 rounded-full flex items-center justify-center ${
              isProblem ? "bg-amber-50" : "bg-emerald-50"
            }`}
          >
            <span
              className={`absolute inset-0 rounded-full ${
                isProblem ? "bg-amber-100/60" : "bg-emerald-100/60"
              } ${isChecking ? "animate-ping" : ""}`}
            />
            {isChecking ? (
              <Loader2 className="relative h-10 w-10 text-[#319a7a] animate-spin" strokeWidth={1.8} />
            ) : isProblem ? (
              <AlertTriangle className="relative h-10 w-10 text-amber-500" strokeWidth={1.8} />
            ) : (
              <CheckCircle className="relative h-10 w-10 text-[#319a7a]" strokeWidth={1.8} />
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1e4636] font-fraunces mb-3">
          {title}
        </h1>

        <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mx-auto mb-5" />

        <p className="text-sm sm:text-base text-neutral-500 leading-relaxed mb-6">{body}</p>

        {/* What Stripe is still waiting on */}
        {state === "incomplete" && status?.requirementsDue?.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-left">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              {t.OnboardStillNeeded || "Still needed by Stripe"}
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm text-amber-800">
              {status.requirementsDue.map((req) => (
                <li key={req}>{req.replace(/[._]/g, " ")}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Billing details are ours, not Stripe's — needed before Putko can
            invoice its platform fee, and before the listing can take a booking. */}
        {needsBilling && (
          <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-left">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              {t.OnboardBillingMissing || "Complete your billing details"}
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm text-amber-800">
              {missingBilling.map((field) => (
                <li key={field}>{billingFieldLabel(field, t)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {needsBilling && (
            <button
              type="button"
              onClick={() => setShowBilling(true)}
              className="block w-full bg-[#357965] text-white text-sm font-bold py-3.5 px-4 rounded-xl hover:bg-[#1e4636] transition-colors duration-200 shadow-sm"
            >
              {t.OnboardAddBilling || "Add billing details"}
            </button>
          )}

          {state === "incomplete" && (
            <button
              type="button"
              onClick={resumeOnboarding}
              disabled={resuming}
              className="block w-full bg-[#357965] text-white text-sm font-bold py-3.5 px-4 rounded-xl hover:bg-[#1e4636] transition-colors duration-200 shadow-sm disabled:opacity-60"
            >
              {resuming
                ? t.OnboardOpening || "Opening Stripe…"
                : t.OnboardContinue || "Continue onboarding"}
            </button>
          )}

          <Link
            href="/host"
            className={`block w-full text-sm font-bold py-3.5 px-4 rounded-xl transition-colors duration-200 ${
              state === "incomplete" || needsBilling
                ? "bg-white text-[#1e4636] border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                : "bg-[#357965] text-white hover:bg-[#1e4636] shadow-sm"
            }`}
          >
            {t.OnboardGoToPayouts || "Go to payout settings"}
          </Link>

          <Link
            href="/"
            className="block w-full bg-white text-[#1e4636] text-sm font-bold py-3.5 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors duration-200"
          >
            {t.ReturnHome || "Return home"}
          </Link>
        </div>

        {status?.chargesEnabled !== undefined && !isChecking && (
          <p className="mt-7 inline-flex items-center gap-2 text-[11px] text-neutral-400 font-medium bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-1.5">
            <span>{t.OnboardPayments || "Payments"}: {status.chargesEnabled ? "✓" : "—"}</span>
            <span>{t.OnboardPayouts || "Payouts"}: {status.payoutsEnabled ? "✓" : "—"}</span>
            {/* Putko's own requirement, shown alongside Stripe's so the host can
                see at a glance which of the two is outstanding. */}
            <span>{t.OnboardBilling || "Billing"}: {missingBilling.length === 0 ? "✓" : "—"}</span>
          </p>
        )}

        {showBilling && (
          <BillingDetailsModal
            host={host}
            hostId={host?._id || hostId}
            onSaved={billingSaved}
            onClose={() => setShowBilling(false)}
            labels={t}
          />
        )}
      </div>
    </div>
  );
};

export default HostOnboardSuccess;
