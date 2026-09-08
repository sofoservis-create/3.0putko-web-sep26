"use client";
import React, { useEffect, useState, Suspense, useContext } from "react";
import { useSearchParams } from "@/app/components/NextNavigation";
import Link from "@/app/components/NextLink";
import {
  CheckCircle,
  XCircle,
  CalendarDays,
  Users,
  Mail,
  Home,
  Clock,
  CreditCard,
  Send,
} from "lucide-react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";

const translations = { en, sk };

/**
 * Where a guest lands after sending a booking request.
 *
 * This is the "request" counterpart to /payment-success. Nothing was charged
 * and no Stripe page was shown, so the job here is to make two things obvious:
 * the request reached the host, and the guest owes nothing yet. Everything
 * after this — approval, the payment link, confirmation — happens by email.
 */
const RequestSentContent = () => {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const [status, setStatus] = useState("loading");
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    if (!reservationId) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    /**
     * The request was created seconds ago, so it certainly exists. Anything
     * other than a 404 is therefore a transient failure, not a missing booking
     * — and this is the worst possible page to give up on, because telling a
     * guest their request cannot be found moments after they sent it reads as
     * "it did not go through". So a non-404 is retried once before giving up.
     */
    const load = async (attempt = 0) => {
      try {
        const res = await fetch(
          `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/reservation/${reservationId}`
        );
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data?._id) {
            setReservation(data);
            setStatus("ok");
            return;
          }
        }

        if (res.status !== 404 && attempt < 1) {
          setTimeout(() => !cancelled && load(attempt + 1), 1500);
          return;
        }

        // Logged rather than swallowed: the page shows one message for both
        // "deleted" and "server broke", and without this there is nothing to
        // tell them apart from the outside.
        console.error(
          `[request-sent] could not load reservation ${reservationId} — HTTP ${res.status}`
        );
        setStatus("error");
      } catch (err) {
        if (cancelled) return;
        if (attempt < 1) {
          setTimeout(() => !cancelled && load(attempt + 1), 1500);
          return;
        }
        console.error("[request-sent] reservation fetch failed:", err);
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  const formatDay = (value) =>
    value
      ? new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "sk-SK", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : "—";

  const amount = () => {
    const cents =
      reservation?.totalPriceCents ?? Math.round((reservation?.totalPrice || 0) * 100);
    return new Intl.NumberFormat(language === "en" ? "en-IE" : "sk-SK", {
      style: "currency",
      currency: (reservation?.currency || "eur").toUpperCase(),
    }).format(cents / 100);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#319A81] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">{t.Loading || "Loading…"}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 text-center bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 text-red-600 bg-red-50 border border-red-200 rounded-2xl">
            <XCircle className="w-7 h-7" />
          </div>
          <h1 className="mb-2 text-xl font-extrabold text-[#1E3E2B]">
            {t.RequestNotFoundTitle}
          </h1>
          <p className="mb-6 text-sm font-medium text-slate-500">
            {t.RequestNotFoundDescription}
          </p>
          <Link
            href="/listing-stay-map"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl transition-all duration-200 active:scale-95"
          >
            {t.BrowseAccommodations}
          </Link>
        </div>
      </div>
    );
  }

  const listingName =
    reservation?.accommodationId?.name || reservation?.accommodationName || "";

  const steps = [
    { Icon: Send, title: t.RequestStepSentTitle, body: t.RequestStepSentBody, done: true },
    { Icon: Clock, title: t.RequestStepHostTitle, body: t.RequestStepHostBody },
    { Icon: CreditCard, title: t.RequestStepPayTitle, body: t.RequestStepPayBody },
  ];

  return (
    <div className="px-4 py-12 md:py-16">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Confirmation */}
        <div className="relative overflow-hidden text-center bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#319A81]" />
          <div className="p-8 md:p-10">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 text-[#319A81] bg-[#319A81]/10 border border-[#319A81]/20 rounded-2xl">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-[#1E3E2B] md:text-3xl">
              {t.RequestSentTitle}
            </h1>
            <p className="max-w-md mx-auto text-sm font-medium leading-relaxed text-slate-500">
              {t.RequestSentDescription}
            </p>

            {/* The single most important fact on this page. A guest who has
                just been through a checkout form expects to have been charged,
                so say plainly that they have not been. */}
            <div className="inline-flex items-center gap-2 px-4 py-2.5 mt-5 text-sm font-bold text-[#257562] bg-[#319A81]/10 border border-[#319A81]/20 rounded-xl">
              <CreditCard className="w-4 h-4 shrink-0" />
              {t.NothingChargedYet}
            </div>
          </div>
        </div>

        {/* What they asked for */}
        <div className="relative overflow-hidden bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-[#DFBA73]" />
          <div className="p-6 pl-7 md:p-8 md:pl-9">
            <h2 className="mb-5 text-base font-extrabold tracking-tight text-[#1E3E2B]">
              {t.YourRequest}
            </h2>

            <dl className="space-y-4">
              {listingName && (
                <div className="flex items-start gap-3">
                  <Home className="w-4 h-4 mt-0.5 text-[#319A81] shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t.Accommodation}
                    </dt>
                    <dd className="text-sm font-bold text-[#1E3E2B] break-words">{listingName}</dd>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <CalendarDays className="w-4 h-4 mt-0.5 text-[#319A81] shrink-0" />
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t.Dates}
                  </dt>
                  <dd className="text-sm font-bold text-[#1E3E2B]">
                    {formatDay(reservation.checkInDate)} — {formatDay(reservation.checkOutDate)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 mt-0.5 text-[#319A81] shrink-0" />
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t.Guests}
                  </dt>
                  <dd className="text-sm font-bold text-[#1E3E2B]">
                    {reservation.numberOfPersons} {t.persons}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-[#319A81] shrink-0" />
                <div className="min-w-0">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t.Email}
                  </dt>
                  <dd className="text-sm font-bold text-[#1E3E2B] break-all">
                    {reservation.email}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-4 pt-5 mt-5 border-t border-[#1E3E2B]/10">
              <span className="text-sm font-semibold text-slate-500">{t.TotalToPayLater}</span>
              <span className="text-xl font-extrabold text-[#1E3E2B]">{amount()}</span>
            </div>

            <p className="mt-4 text-xs font-medium text-slate-400">
              {t.RequestReference}: {reservation._id}
            </p>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs">
          <div className="p-6 md:p-8">
            <h2 className="mb-5 text-base font-extrabold tracking-tight text-[#1E3E2B]">
              {t.WhatHappensNext}
            </h2>
            <ol className="space-y-5">
              {steps.map(({ Icon, title, body, done }, index) => (
                <li key={index} className="flex items-start gap-4">
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-xl border shrink-0 ${done
                      ? "bg-[#319A81] text-white border-[#319A81]"
                      : "bg-[#1E3E2B]/[0.04] text-[#319A81] border-[#1E3E2B]/10"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1E3E2B]">{title}</p>
                    <p className="mt-0.5 text-sm font-medium leading-relaxed text-slate-500">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="px-4 py-3 mt-6 text-xs font-medium text-[#9a7a3a] bg-[#DFBA73]/15 border border-[#DFBA73]/30 rounded-xl">
              {t.RequestDatesNotBlocked}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/listing-stay-map"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95"
          >
            {t.BrowseAccommodations}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-[#1E3E2B] bg-white border border-[#1E3E2B]/10 hover:bg-slate-50 rounded-xl transition-all duration-200 active:scale-95"
          >
            {t.BackToHome}
          </Link>
        </div>
      </div>
    </div>
  );
};

const RequestSentPage = () => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-[#319A81] border-t-transparent rounded-full animate-spin" />
      </div>
    }
  >
    <RequestSentContent />
  </Suspense>
);

export default RequestSentPage;
