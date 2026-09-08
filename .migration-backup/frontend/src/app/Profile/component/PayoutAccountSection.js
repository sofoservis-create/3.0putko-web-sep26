"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Wallet, Plus, Check, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import ListingStatusBadge from "./ListingStatusBadge";

/**
 * "Výplaty / Stripe" — which connected account this listing pays out to.
 *
 * Two options, per the spec:
 *   • use an account the host already connected — one click, no redirect
 *   • connect a new one — redirects to Stripe onboarding and comes back here
 *
 * A host may run one account across every property, or a separate one per
 * property. Both work: the dropdown is a per-listing choice, and leaving it on
 * the default is how "one account for everything" looks.
 *
 * IMPORTANT: nothing here blocks Save. Stripe verification takes days for ID and
 * bank checks, and blocking the form would throw away everything the host
 * typed. The listing simply saves as DRAFT or PENDING and publishes itself when
 * Stripe finishes — see backend/utils/listingStatus.js.
 */
function PayoutAccountSection({
  t,
  hostId,
  selectedAccountId,
  onSelect,
  returnTo,
  disabled = false,
}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const authHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAccounts = useCallback(async () => {
    if (!hostId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/payments/host/${hostId}/stripe-accounts`,
        { headers: { "Content-Type": "application/json", ...authHeaders() } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load accounts");

      setAccounts(data.accounts || []);
    } catch (err) {
      console.error("Could not load payout accounts:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Most recent pre-selected, as the spec asks — a host who has just connected
  // an account is almost always connecting it FOR the listing they are creating.
  // Only when the host has not chosen: an explicit choice is never overridden.
  useEffect(() => {
    if (selectedAccountId || !accounts.length) return;
    onSelect(accounts[0].accountId);
  }, [accounts, selectedAccountId, onSelect]);

  /**
   * Connect an additional account.
   *
   * The form is autosaved before leaving, so the Stripe redirect cannot lose
   * what the host typed — `returnTo` brings them back to this page and the
   * draft restores the rest.
   */
  const connectNew = async () => {
    if (!hostId) return;
    setConnecting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/payments/host/connect-account`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ hostId, returnTo }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start onboarding");

      window.location.href = data.onboardingUrl;
    } catch (err) {
      console.error("Could not connect a Stripe account:", err);
      alert(err.message || t.Somethingwentwrong);
      setConnecting(false);
    }
  };

  /**
   * The listing badge this account would produce.
   *
   * Judged on `transfersActive`, not `chargesEnabled`. Putko charges the guest
   * on the platform account and only transfers to the host, so a host account no
   * longer requests `card_payments` at all — `chargesEnabled` is false on every
   * healthy account connected from now on, and the old test would have shown
   * each of them as "Verifying" forever.
   *
   * `transfersActive` is undefined on an account not yet re-synced against
   * Stripe; those fall back to the old test rather than being misreported.
   */
  const statusOf = (account) => {
    if (!account) return "DRAFT";
    if (!account.payoutsEnabled) return "PENDING";

    const ready =
      account.transfersActive === undefined || account.transfersActive === null
        ? Boolean(account.chargesEnabled)
        : Boolean(account.transfersActive);

    return ready ? "PUBLISHED" : "PENDING";
  };

  const selected = accounts.find((a) => a.accountId === selectedAccountId) || null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
          {t.PayoutsStripeHeading}
          <ListingStatusBadge status={statusOf(selected)} t={t} size="xs" />
        </h2>
        <span className="block mt-2 text-neutral-500">{t.PayoutsStripeIntro}</span>
      </div>

      {/* The listing saves regardless. Said plainly, because a host who thinks
          this is a gate will stop and go do Stripe first, and lose the form. */}
      <p className="flex items-start gap-2 px-4 py-3 text-sm font-medium text-[#9a7a3a] bg-[#DFBA73]/15 border border-[#DFBA73]/30 rounded-xl">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        {t.PayoutsNeverBlockSave}
      </p>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t.Loading || "Loading…"}
        </p>
      ) : loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border border-red-200 bg-red-50 rounded-xl">
          <p className="text-sm font-medium text-red-700">{t.PayoutAccountsLoadFailed}</p>
          <button
            type="button"
            onClick={fetchAccounts}
            className="px-4 py-2 text-sm font-bold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50"
          >
            {t.TryAgain}
          </button>
        </div>
      ) : (
        <>
          {accounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {t.UseExistingAccount}
              </p>

              {accounts.map((account) => {
                const isActive = account.accountId === selectedAccountId;
                return (
                  <button
                    type="button"
                    key={account.accountId}
                    disabled={disabled}
                    onClick={() => onSelect(account.accountId)}
                    className={`flex items-center justify-between w-full gap-3 p-4 text-left border rounded-xl transition-all duration-150 disabled:opacity-60 ${
                      isActive
                        ? "border-[#319A81] bg-[#319A81]/[0.06] ring-1 ring-[#319A81]"
                        : "border-neutral-200 bg-white hover:border-[#319A81]/50"
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex items-center justify-center w-10 h-10 rounded-lg border shrink-0 ${
                          isActive
                            ? "bg-[#319A81] text-white border-[#319A81]"
                            : "bg-neutral-50 text-[#319A81] border-neutral-200"
                        }`}
                      >
                        <Wallet className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#1E3E2B] break-words">
                          {account.label || t.PayoutAccountUnnamed}
                          {account.isDefault && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                              {t.PayoutAccountDefault}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs font-medium text-neutral-500 break-all">
                          {account.payoutIban || account.accountId}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <ListingStatusBadge status={statusOf(account)} t={t} size="xs" showIcon={false} />
                      {isActive && <Check className="w-4 h-4 text-[#319A81]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {accounts.length > 0 && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {t.OrConnectNew}
              </p>
            )}
            <button
              type="button"
              onClick={connectNew}
              disabled={disabled || connecting}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-[#357965] hover:bg-[#1e4636] rounded-xl transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : accounts.length ? (
                <Plus className="w-4 h-4" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {connecting
                ? t.PayoutConnectOpening
                : accounts.length
                ? t.ConnectAnotherStripeAccount
                : t.ConnectStripeAccount}
            </button>
            <p className="text-xs font-medium text-neutral-400">{t.ConnectStripeAccountHint}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default PayoutAccountSection;
