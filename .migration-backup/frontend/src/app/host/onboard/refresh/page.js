"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { FormContext } from "../../../FormContext";
import en from "../../../locales/en";
import sk from "../../../locales/sk";
import apiFetch from "../../../utlis/apiFetch";

const translations = { en, sk };

/**
 * Stripe's `refresh_url`.
 *
 * Stripe sends the host here when the Account Link they were using is no longer
 * usable — the links expire within minutes, and one is also consumed if the host
 * abandons the form and comes back. The only correct response is to mint a fresh
 * link and send them straight back in, which is why this page immediately
 * requests a new one instead of showing a dead end.
 */
const HostOnboardRefresh = () => {
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!stored) {
      setFailed(true);
      return;
    }

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      setFailed(true);
      return;
    }

    if (!user?._id) {
      setFailed(true);
      return;
    }

    let cancelled = false;

    const restart = async () => {
      try {
        const res = await apiFetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/payments/host/create-express-account`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hostId: user._id, email: user.email }),
          }
        );
        const data = await res.json();
        if (cancelled) return;

        // The backend reuses the existing connected account, so this only mints
        // a new link — it does not create a duplicate Stripe account.
        if (res.ok && data.onboardingUrl) {
          window.location.href = data.onboardingUrl;
        } else {
          setFailed(true);
        }
      } catch (err) {
        console.error("Could not refresh the Stripe onboarding link:", err);
        if (!cancelled) setFailed(true);
      }
    };

    restart();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 font-inter antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center">
        <div className="mb-7 flex justify-center">
          <div
            className={`relative h-20 w-20 rounded-full flex items-center justify-center ${
              failed ? "bg-amber-50" : "bg-emerald-50"
            }`}
          >
            <span
              className={`absolute inset-0 rounded-full ${
                failed ? "bg-amber-100/60" : "bg-emerald-100/60 animate-ping"
              }`}
            />
            {failed ? (
              <AlertTriangle className="relative h-10 w-10 text-amber-500" strokeWidth={1.8} />
            ) : (
              <Loader2 className="relative h-10 w-10 text-[#319a7a] animate-spin" strokeWidth={1.8} />
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1e4636] font-fraunces mb-3">
          {failed
            ? t.OnboardError || "We couldn't reopen Stripe"
            : t.OnboardRefreshing || "Reopening Stripe…"}
        </h1>

        <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mx-auto mb-5" />

        <p className="text-sm sm:text-base text-neutral-500 leading-relaxed mb-8">
          {failed
            ? t.OnboardErrorBody ||
              "Please open your profile and try connecting again. If this keeps happening, contact support."
            : t.OnboardRefreshingBody ||
              "Your previous Stripe link expired. We're taking you back to finish setting up payouts."}
        </p>

        {failed && (
          <div className="space-y-3">
            <Link
              href="/Profile"
              className="block w-full bg-[#357965] text-white text-sm font-bold py-3.5 px-4 rounded-xl hover:bg-[#1e4636] transition-colors duration-200 shadow-sm"
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
        )}
      </div>
    </div>
  );
};

export default HostOnboardRefresh;
