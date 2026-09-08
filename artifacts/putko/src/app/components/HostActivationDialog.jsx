"use client";

import React from "react";
import { House, Shield, User } from "lucide-react";

export default function HostActivationDialog({
  open,
  language = "sk",
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071D16]/65 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-activation-title"
        className="max-h-[calc(100dvh-0.5rem)] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#FFFEF9] p-6 text-[#163C2E] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#238869]">
          {language === "en" ? "Development preview" : "Vývojový náhľad"}
        </p>
        <h2 id="host-activation-title" className="mt-2 font-fraunces text-2xl font-semibold">
          {language === "en" ? "Activate hosting on this account?" : "Aktivovať hostiteľstvo na tomto účte?"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {language === "en"
            ? "Your traveler profile and saved stays remain unchanged. This preview cannot publish listings or connect payments."
            : "Cestovateľský profil aj uložené pobyty zostanú nezmenené. Tento náhľad nemôže publikovať ponuky ani pripájať platby."}
        </p>
        <ul className="mt-5 space-y-3 text-sm text-neutral-700">
          <li className="flex gap-3">
            <Shield size={18} className="mt-0.5 shrink-0 text-[#238869]" />
            {language === "en" ? "Keep the same verified email and password." : "Ponecháte si rovnaký overený e-mail a heslo."}
          </li>
          <li className="flex gap-3">
            <User size={18} className="mt-0.5 shrink-0 text-[#238869]" />
            {language === "en" ? "Switch back to travel mode at any time." : "K cestovaniu sa môžete kedykoľvek vrátiť."}
          </li>
          <li className="flex gap-3">
            <House size={18} className="mt-0.5 shrink-0 text-[#238869]" />
            {language === "en" ? "Live hosting tools stay disconnected." : "Živé hostiteľské nástroje zostanú odpojené."}
          </li>
        </ul>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 rounded-xl border border-neutral-200 px-5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-60"
          >
            {language === "en" ? "Not now" : "Teraz nie"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#238869] px-5 text-sm font-semibold text-white hover:bg-[#1d7359] disabled:opacity-60"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {language === "en" ? "Activate host mode" : "Aktivovať hostiteľský režim"}
          </button>
        </div>
      </div>
    </div>
  );
}