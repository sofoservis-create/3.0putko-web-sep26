"use client";
import React, { useContext, useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import apiFetch from "../utlis/apiFetch";

const translations = { en, sk };

const PaymentCancel = () => {
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [cancelSent, setCancelSent] = useState(false);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  // 🔥 notify backend that user cancelled Stripe
  useEffect(() => {
    if (cancelSent) return;

    const reservationId = sessionStorage.getItem("reservationId");
    if (!reservationId) return;

    apiFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payments/cancel`, {
      method: "POST",
      reservationId,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
    })
      .catch((err) => console.error("Cancel payment error:", err))
      .finally(() => setCancelSent(true));
  }, [cancelSent]);

  const t = translations[language];

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 font-inter antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center">
        {/* ICON */}
        <div className="mb-7 flex justify-center">
          <div className="relative h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-red-100/50" />
            <XCircle className="relative h-10 w-10 text-red-500" strokeWidth={1.8} />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1e4636] font-fraunces mb-3">
          {t.PaymentCancelled}
        </h1>

        <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mx-auto mb-5" />

        <p className="text-sm sm:text-base text-neutral-500 leading-relaxed mb-8">
          {t.PaymentCancelMessage}
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-[#357965] text-white text-sm font-bold py-3.5 px-4 rounded-xl hover:bg-[#1e4636] transition-colors duration-200 shadow-sm"
          >
            {t.ReturnHome}
          </Link>

          <Link
            href="/Checkout"
            className="block w-full bg-white text-[#1e4636] text-sm font-bold py-3.5 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors duration-200"
          >
            {t.TryAgain}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
