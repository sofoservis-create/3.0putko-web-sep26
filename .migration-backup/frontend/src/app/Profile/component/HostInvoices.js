"use client";

import React, { useContext, useEffect, useState } from "react";
import apiFetch from "../../utlis/apiFetch";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const translations = { en, sk };

/**
 * The host's monthly Putko invoices — one per month, covering the intermediary
 * fees deducted from that month's payouts.
 *
 * SuperFaktúra emails the PDF when the invoice is issued, so this is not the
 * delivery mechanism; it is the place a host looks when they need last March's
 * invoice again and no longer have the email.
 *
 * The amounts here are shown net + VAT + gross deliberately: the fee deducted
 * from a payout is the GROSS figure, and an accountant needs the split.
 */
export default function HostInvoices({ hostId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  // `{ text }`, where `text` is the server's own wording when it sent one and
  // null when it did not — so the generic message can be rendered in the
  // language selected at the time it is displayed, not at the time it failed.
  const [error, setError] = useState(null);

  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  useEffect(() => {
    if (!hostId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/invoices/host/${hostId}`
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError({ text: data.message || data.error || null });
          return;
        }

        setInvoices(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setError({ text: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [hostId]);

  const money = (cents) => `€${((cents || 0) / 100).toFixed(2)}`;
  const period = (invoice) =>
    `${String(invoice.invoiceMonth).padStart(2, "0")}/${invoice.invoiceYear}`;

  if (loading) {
    return (
      <div>
        <h3 className="mb-3 text-xl font-semibold">{t.HostInvoicesTitle}</h3>
        <p className="text-gray-500">{t.HostInvoicesLoading}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-1 text-xl font-semibold">{t.HostInvoicesTitle}</h3>
      <p className="mb-3 text-sm text-gray-500">{t.HostInvoicesIntro}</p>

      {error && (
        <p className="text-sm text-red-600">{error.text || t.HostInvoicesLoadError}</p>
      )}

      {!error && invoices.length === 0 && (
        <p className="text-gray-500">{t.HostInvoicesEmpty}</p>
      )}

      {invoices.map((invoice) => (
        <div key={invoice._id} className="mb-3 rounded-lg bg-gray-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {invoice.invoiceNumber || `${t.HostInvoiceLabel} ${period(invoice)}`}
              </p>
              <p className="text-sm text-gray-600">
                {period(invoice)} · {invoice.billedBookings || 0} {t.HostInvoiceBookings}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {money(invoice.netAmountCents)} + {money(invoice.vatAmountCents)} {t.Vat}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold">{money(invoice.grossAmountCents)}</p>
              {/* "emailed" is the normal end state — the fee was already taken
                  at payout time, so there is nothing left for the host to pay. */}
              <p className="text-xs text-gray-500">
                {invoice.status === "emailed" || invoice.status === "issued" || invoice.status === "paid"
                  ? t.HostInvoiceSettled
                  : invoice.status}
              </p>
              {invoice.pdfUrl && (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  {t.HostInvoiceDownload}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
