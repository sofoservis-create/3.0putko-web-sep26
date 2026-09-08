"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import apiFetch from "../utlis/apiFetch";

/**
 * "Request invoice from host".
 *
 * Putko cannot invoice for the stay — the rental contract is between the guest
 * and the host, and only the host may legally invoice that service. What the
 * guest gets from Putko is a payment receipt; this button passes a request for a
 * proper invoice through to the host, together with the billing details a
 * business guest needs on it.
 *
 * The fields are all optional on purpose: a guest who just wants to ask should
 * not be blocked by a form, and the host can always come back for details.
 */
export default function RequestInvoiceButton({ reservationId, labels = {}, className = "" }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    ico: "",
    dic: "",
    icDph: "",
    address: "",
    note: "",
  });

  const t = {
    request: labels.RequestInvoice || "Request invoice from host",
    requested: labels.InvoiceRequested || "Invoice request sent to the host",
    explain:
      labels.RequestInvoiceExplain ||
      "Putko does not issue invoices for the stay — only your host can. We will pass your billing details on to them.",
    company: labels.BillingCompany || "Company name",
    ico: labels.BillingIco || "IČO",
    dic: labels.BillingDic || "DIČ",
    icDph: labels.BillingIcDph || "IČ DPH",
    address: labels.BillingAddress || "Billing address",
    note: labels.BillingNote || "Note for the host",
    send: labels.SendRequest || "Send request",
    cancel: labels.Close || "Close",
  };

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = async () => {
    setSending(true);
    try {
      const res = await apiFetch(
        `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/receipts/${reservationId}/request-invoice`,
        {
          method: "POST",
          reservationId,
          headers: { "Content-Type": "application/json" },
          // Empty strings are dropped so the host's email does not fill up with
          // blank "IČO:" lines.
          body: JSON.stringify(
            Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim()))
          ),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Could not send the invoice request");
        return;
      }

      setSent(true);
      setOpen(false);
      toast.success(t.requested);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const field = (key, label, extra = {}) => (
    <label className="block text-left">
      <span className="mb-1 block text-xs font-semibold text-neutral-500">{label}</span>
      <input
        type="text"
        value={form[key]}
        onChange={update(key)}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-[#1e4636] outline-none focus:border-[#319a7a]"
        {...extra}
      />
    </label>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={sent}
        className={
          className ||
          "block w-full rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-sm font-bold text-[#1e4636] transition-colors duration-200 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-60"
        }
      >
        {sent ? t.requested : t.request}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-[#1e4636]">{t.request}</h3>
            <p className="mb-4 text-xs leading-relaxed text-neutral-500">{t.explain}</p>

            <div className="space-y-3">
              {field("companyName", t.company)}
              <div className="grid grid-cols-2 gap-3">
                {field("ico", t.ico, { inputMode: "numeric" })}
                {field("dic", t.dic, { inputMode: "numeric" })}
              </div>
              {field("icDph", t.icDph)}
              {field("address", t.address)}
              <label className="block text-left">
                <span className="mb-1 block text-xs font-semibold text-neutral-500">{t.note}</span>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={update("note")}
                  className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-[#1e4636] outline-none focus:border-[#319a7a]"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-[#1e4636] hover:bg-neutral-50 disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={sending}
                className="flex-1 rounded-xl bg-[#357965] py-2.5 text-sm font-semibold text-white hover:bg-[#1e4636] disabled:opacity-50"
              >
                {sending ? "…" : t.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
