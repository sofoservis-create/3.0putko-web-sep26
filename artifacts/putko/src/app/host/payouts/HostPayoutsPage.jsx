import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CircleDashed, House, Landmark, RefreshCw } from "lucide-react";
import Link from "@/app/components/NextLink";
import { getHostPayoutReadiness } from "../../utlis/guestAccountApi";
import { useHostNavigation } from "../HostNavigationGuard";
import { hostPaths } from "../hostRoutes";
import { payoutErrorText, payoutRequirementCopy, payoutStatusCopy } from "./hostPayoutCopy";

const t = (language, en, sk) => (language === "en" ? en : sk);

const skListings = (n) => (n === 1 ? "1 ponuka" : n >= 2 && n <= 4 ? `${n} ponuky` : `${n} ponúk`);
const listingsCount = (n, language) => (language === "en" ? `${n} ${n === 1 ? "listing" : "listings"}` : skListings(n));

/**
 * Host-level payout readiness (`/host/payouts`). Read-only and honest: the
 * server reports `not_connected` because no payout provider exists, and this
 * page never renders a Connect button that leads nowhere. The status copy is
 * shared with editor Step 9 (`hostPayoutCopy`).
 */
export default function HostPayoutsPage({ language }) {
  const wrap = "mx-auto max-w-3xl px-4 pb-8 animate-fadeIn md:px-0";
  const { linkProps } = useHostNavigation();
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: null }));
    try {
      const { payouts } = await getHostPayoutReadiness();
      if (!mountedRef.current) return;
      setState({ status: "ready", data: payouts, error: null });
    } catch (error) {
      if (!mountedRef.current) return;
      setState({ status: "error", data: null, error });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = payoutStatusCopy(language);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" className={`${wrap} animate-pulse space-y-4`}>
        <div className="h-8 w-40 rounded-lg bg-neutral-200" />
        <div className="h-40 rounded-3xl border border-neutral-200 bg-white" />
        <div className="h-56 rounded-3xl border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={wrap}>
        <div role="alert" className="flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-red-700">{t(language, "We couldn't load your payout status", "Nepodarilo sa načítať stav výplat")}</h2>
              <p className="mt-1 text-sm text-red-600">{payoutErrorText(state.error, language)}</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-700 hover:bg-red-100">
            <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
          </button>
        </div>
      </div>
    );
  }

  const { data } = state;
  const notAcknowledged = Math.max(0, data.listings.total - data.listings.acknowledged);

  return (
    <div className={wrap}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3E2B] md:text-3xl">{t(language, "Payouts", "Výplaty")}</h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          {t(language, "One payout account for your whole host profile.", "Jeden výplatný účet pre celý hostiteľský profil.")}
        </p>
      </header>

      <section aria-labelledby="payout-status-title" className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1E3E2B] text-white">
            <Landmark size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="payout-status-title" className="text-lg font-bold text-[#1E3E2B]">{t(language, "Payout account", "Výplatný účet")}</h2>
              <span data-testid="payout-status" className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700">
                {copy.badge}
              </span>
            </div>
            <p className="mt-2 text-[14px] font-medium leading-6 text-neutral-600">{copy.summary}</p>
            <p className="mt-2 text-[14px] font-medium leading-6 text-neutral-600">{copy.next}</p>
            <p className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-[13px] font-medium leading-5 text-neutral-600">{copy.noButton}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="payout-requirements-title" className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 id="payout-requirements-title" className="text-lg font-bold text-[#1E3E2B]">{t(language, "What you will need", "Čo budete potrebovať")}</h2>
        <p className="mt-1 text-[14px] text-neutral-500">
          {t(language, "Nothing to prepare today; this is what the setup will ask for.", "Dnes netreba nič pripravovať; toto si nastavenie vyžiada.")}
        </p>
        <ol className="mt-4 space-y-3">
          {data.requirements.map((code, index) => {
            const item = payoutRequirementCopy(code, language);
            return (
              <li key={code} className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#1E3E2B] shadow-sm">{index + 1}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-[#1E3E2B]">
                    {item.title}
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                      <CircleDashed size={12} /> {t(language, "Later", "Neskôr")}
                    </span>
                  </p>
                  {item.body && <p className="mt-1 text-[14px] leading-6 text-neutral-600">{item.body}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="payout-listings-title" className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <House size={22} className="mt-0.5 shrink-0 text-[#1E3E2B]" />
          <div className="min-w-0 flex-1">
            <h2 id="payout-listings-title" className="text-lg font-bold text-[#1E3E2B]">{t(language, "Your listings", "Vaše ponuky")}</h2>
            {data.listings.total === 0 ? (
              <p className="mt-1 text-[14px] leading-6 text-neutral-600">
                {t(language, "No listings yet. Payouts will apply to every listing you create.", "Zatiaľ žiadne ponuky. Výplaty sa budú vzťahovať na každú ponuku, ktorú vytvoríte.")}
              </p>
            ) : (
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat label={t(language, "Total", "Spolu")} value={listingsCount(data.listings.total, language)} />
                <Stat label={t(language, "Live", "Zverejnené")} value={listingsCount(data.listings.live, language)} />
                <Stat label={t(language, "Payout note acknowledged", "Potvrdený stav výplat")} value={`${data.listings.acknowledged}/${data.listings.total}`} />
              </dl>
            )}
            {notAcknowledged > 0 && (
              <p className="mt-3 text-[13px] leading-5 text-neutral-500">
                {t(
                  language,
                  "Listings still in setup confirm the payout note in step 9 of the editor.",
                  "Ponuky, ktoré sú ešte v nastavení, potvrdia stav výplat v 9. kroku editora.",
                )}
              </p>
            )}
            <Link {...linkProps(hostPaths.listings)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#1E3E2B] px-4 text-[14px] font-bold text-[#1E3E2B] transition-colors hover:bg-[#1E3E2B]/5">
              {t(language, "Open listings", "Otvoriť ponuky")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-3">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-1 text-[15px] font-bold text-[#1E3E2B]">{value}</dd>
    </div>
  );
}
