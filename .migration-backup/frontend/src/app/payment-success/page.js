"use client";
import React, { useEffect, useState, Suspense, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { withReservationToken } from "../utlis/apiFetch";
// RequestInvoiceButton ("Požiadať hostiteľa o faktúru") is intentionally not
// mounted for now. The component and its backend endpoint still exist — re-add
// the import and the <RequestInvoiceButton reservationId={reservationId}
// labels={t} /> block below the receipt link to switch it back on.

// <-- your new translation file
const translations = { en, sk };

const PaymentSuccessContent = () => {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const { lang } = useContext(FormContext);
    const [language, setLanguage] = useState(lang || "sk");

    useEffect(() => {
        setLanguage(lang || "sk");
    }, [lang]);

    const t = translations[language];

    const [status, setStatus] = useState("loading");
    const [reservationId, setReservationId] = useState(null);

    // The booking is confirmed by the Stripe webhook, never by this page — a
    // closed tab must not lose a confirmation, and a loaded tab must not create
    // a second one. So this polls for the webhook's result instead of writing.
    useEffect(() => {
        if (!sessionId) {
            setStatus("error");
            return;
        }

        let cancelled = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 20; // ~30s at 1.5s intervals

        const poll = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payments/verify-payment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
                const data = await res.json();
                if (cancelled) return;

                if (data.reservation?._id) setReservationId(data.reservation._id);

                if (data.settled) {
                    setStatus("success");
                    return;
                }

                // Stripe took the money but our webhook has not landed yet.
                if (data.pending && attempts < MAX_ATTEMPTS) {
                    attempts++;
                    setTimeout(poll, 1500);
                    return;
                }

                // Payment went through; only our confirmation is lagging. Show
                // success rather than a scary error — the webhook will finish.
                setStatus(data.status === "paid" ? "success" : "error");
            } catch (err) {
                console.error(err);
                if (!cancelled) setStatus("error");
            }
        };

        poll();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    const isError = status === "error";
    const isLoading = status === "loading";

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 font-inter antialiased">
            <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center">
                {/* ICON */}
                <div className="mb-7 flex justify-center">
                    <div className={`relative h-20 w-20 rounded-full flex items-center justify-center ${isError ? "bg-red-50" : "bg-emerald-50"}`}>
                        <span className={`absolute inset-0 rounded-full ${isError ? "bg-red-100/60" : "bg-emerald-100/60"} ${isLoading ? "animate-ping" : ""}`} />
                        {isError ? (
                            <XCircle className="relative h-10 w-10 text-red-500" strokeWidth={1.8} />
                        ) : (
                            <CheckCircle className={`relative h-10 w-10 text-[#319a7a] ${isLoading ? "animate-pulse" : ""}`} strokeWidth={1.8} />
                        )}
                    </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1e4636] font-fraunces mb-3">
                    {isLoading
                        ? t.VerifyingPayment
                        : status === "success"
                            ? t.PaymentSuccessful
                            : t.PaymentFailed}
                </h1>

                <div className="w-12 h-[3px] bg-[#319a7a] rounded-full mx-auto mb-5" />

                <p className="text-sm sm:text-base text-neutral-500 leading-relaxed mb-8">
                    {isLoading
                        ? t.VerifyWait
                        : status === "success"
                            ? t.PaymentSuccessMessage
                            : t.PaymentErrorMessage}
                </p>

                <div className="space-y-3">
                    {status === "success" && reservationId && (
                        <a
                            // A browser-followed download cannot carry a custom
                            // header, so the booking's capability token rides in
                            // the query string instead.
                            href={withReservationToken(
                                `${process.env.NEXT_PUBLIC_BASE_URL}/receipts/${reservationId}?lang=${language}`,
                                reservationId
                            )}
                            className="block w-full bg-white text-[#1e4636] text-sm font-bold py-3.5 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors duration-200"
                        >
                            {t.DownloadReceipt || "Download payment receipt"}
                        </a>
                    )}
                    <Link
                        href="/"
                        className="block w-full bg-[#357965] text-white text-sm font-bold py-3.5 px-4 rounded-xl hover:bg-[#1e4636] transition-colors duration-200 shadow-sm"
                    >
                        {t.ReturnHome}
                    </Link>
                    <Link
                        href="/Profile"
                        className="block w-full bg-white text-[#1e4636] text-sm font-bold py-3.5 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors duration-200"
                    >
                        {t.ViewBookings}
                    </Link>
                </div>

                {sessionId && (
                    <p className="mt-7 inline-flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-1.5">
                        {t.TransactionID}: <span className="font-mono text-neutral-500">{sessionId.slice(0, 10)}...</span>
                    </p>
                )}
            </div>
        </div>
    );
};

const PaymentSuccess = () => {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-50 text-sm font-medium text-neutral-400 font-inter">Loading...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
};

export default PaymentSuccess;
