"use client";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Star,
  Wallet,
} from "lucide-react";
import apiFetch from "../../utlis/apiFetch";

/**
 * "Výplatné účty" — every Stripe account this host holds, and which property
 * each one is paid into.
 *
 * A host may connect as many accounts as they need: an apartment in their own
 * name and a chalet under a company are two different legal recipients, and the
 * money has to land in the right one. Everything to manage that lives here —
 * connect another, see what Stripe is waiting for, go back and fix it, choose
 * the default, and point each property at an account.
 *
 * Before this panel the only Stripe control on the page was a single "Connect
 * with Stripe" button acting on the DEFAULT account. A host whose second
 * account had been restricted could see it was restricted and had no way in the
 * product to do anything about it; assigning a property to an account was
 * possible only while creating that property, and never afterwards.
 *
 * The status shown per account is `payoutState`, decided server-side from the
 * live Stripe account (backend/utils/stripeHelpers.js -> describeAccountState).
 * It is never derived here: two screens disagreeing about whether a host can be
 * paid is exactly the confusion this replaces.
 */

const STATE_STYLES = {
  active: {
    labelKey: "PayoutStateActive",
    Icon: CheckCircle2,
    className: "bg-[#319A81]/10 text-[#257562] border-[#319A81]/20",
  },
  verifying: {
    labelKey: "PayoutStateVerifying",
    Icon: Loader2,
    className: "bg-[#DFBA73]/15 text-[#9a7a3a] border-[#DFBA73]/30",
  },
  pending: {
    labelKey: "PayoutStatePending",
    Icon: AlertTriangle,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  restricted: {
    labelKey: "PayoutStateRestricted",
    Icon: ShieldAlert,
    className: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

/**
 * The account's state, preferring what the server decided.
 *
 * The fallback is for an account whose row predates `payoutState` and has not
 * been re-synced yet — it keeps the badge honest rather than showing every such
 * account as "pending".
 */
const stateOf = (account) => {
  if (!account) return "pending";
  if (account.payoutsEnabled && account.transfersActive) return "active";
  if (account.payoutState) return account.payoutState;
  if (account.disabledReason || account.pastDue?.length) return "restricted";
  if (account.requirementsDue?.length) return "pending";
  if (account.pendingVerification?.length) return "verifying";
  return "pending";
};

/** Stripe's requirement ids are machine strings — "individual.verification.document". */
const prettyRequirement = (req) => String(req).replace(/[._]/g, " ");

function StatePill({ state, t }) {
  const config = STATE_STYLES[state] || STATE_STYLES.pending;
  const { Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border shrink-0 ${config.className}`}
    >
      <Icon
        className={`w-3.5 h-3.5 shrink-0 ${state === "verifying" ? "animate-spin [animation-duration:2.5s]" : ""}`}
      />
      {t[config.labelKey]}
    </span>
  );
}

/**
 * What is standing between this account and a payout.
 *
 * Deliberately shows Stripe's own `reason` text for a rejected requirement.
 * "The document is expired" is the difference between a host who fixes it and a
 * host who uploads the same unusable file again.
 */
function AccountBlockers({ account, t }) {
  const pastDue = account.pastDue || [];
  const due = (account.requirementsDue || []).filter((r) => !pastDue.includes(r));
  const errors = account.requirementErrors || [];
  const pendingVerification = account.pendingVerification || [];
  const futureDue = account.futureDue || [];

  const nothingToSay =
    !pastDue.length &&
    !due.length &&
    !errors.length &&
    !pendingVerification.length &&
    !futureDue.length &&
    !account.disabledReason;

  if (nothingToSay) return null;

  const deadline = account.currentDeadline ? new Date(account.currentDeadline) : null;
  const futureDeadline = account.futureDeadline ? new Date(account.futureDeadline) : null;

  return (
    <div className="mt-2 space-y-2 text-xs">
      {account.disabledReason && (
        <p className="font-medium text-rose-700">
          {t.PayoutDisabledReason}: {prettyRequirement(account.disabledReason)}
        </p>
      )}

      {errors.length > 0 && (
        <ul className="ml-4 space-y-1 list-disc text-rose-700">
          {errors.map((e, i) => (
            <li key={`${e.requirement}-${i}`}>
              <span className="font-medium">{prettyRequirement(e.requirement)}</span>
              {e.reason ? ` — ${e.reason}` : ""}
            </li>
          ))}
        </ul>
      )}

      {pastDue.length > 0 && (
        <div className="text-rose-700">
          <p className="font-medium">{t.PayoutPastDue}:</p>
          <ul className="ml-4 list-disc">
            {pastDue.map((r) => (
              <li key={r}>{prettyRequirement(r)}</li>
            ))}
          </ul>
        </div>
      )}

      {due.length > 0 && (
        <div className="text-amber-700">
          <p className="font-medium">
            {t.PayoutAccountAwaiting}
            {deadline ? ` (${t.PayoutBy} ${deadline.toLocaleDateString()})` : ""}:
          </p>
          <ul className="ml-4 list-disc">
            {due.map((r) => (
              <li key={r}>{prettyRequirement(r)}</li>
            ))}
          </ul>
        </div>
      )}

      {pendingVerification.length > 0 && (
        <p className="text-gray-500">
          {t.PayoutUnderReview}: {pendingVerification.map(prettyRequirement).join(", ")}
        </p>
      )}

      {/* Not blocking anything yet, and that is exactly why it is worth saying:
          a requirement left until its deadline is the usual way a working
          account turns into a restricted one. */}
      {futureDue.length > 0 && (
        <p className="text-gray-500">
          {t.PayoutFutureDue}
          {futureDeadline ? ` (${t.PayoutBy} ${futureDeadline.toLocaleDateString()})` : ""}:{" "}
          {futureDue.map(prettyRequirement).join(", ")}
        </p>
      )}
    </div>
  );
}

function PayoutAccountsPanel({ t, hostId, accommodations = [], onAccountsChanged }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  // `null` when fine, otherwise `{ status, message }` — the reason is carried so
  // the host is told which of "sign in again", "not your profile" and "our
  // server broke" they are actually looking at.
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Which account a per-account button is currently working on, so only that
  // row's spinner turns.
  const [busyAccount, setBusyAccount] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  // Listing id -> true while its payout account is being saved.
  const [savingListing, setSavingListing] = useState({});
  const [listingAccounts, setListingAccounts] = useState({});

  const base = process.env.NEXT_PUBLIC_BASE_URL;

  /**
   * @param {boolean} fromStripe re-read every account from the Stripe API
   *   first. Done on the first load of this panel — the stored state is only as
   *   current as the last `account.updated` webhook, and a webhook that never
   *   arrived is precisely the case where a host has been looking at a wrong
   *   status for weeks.
   */
  const load = useCallback(
    async (fromStripe = false) => {
      // Was a bare `return`, which left `loading` true forever — the panel sat
      // on a spinner with no way out whenever the host id had not arrived.
      if (!hostId) {
        setLoading(false);
        return;
      }
      if (fromStripe) setRefreshing(true);

      try {
        const res = await apiFetch(
          `${base}/payments/host/${hostId}/stripe-accounts${fromStripe ? "?refresh=1" : ""}`,
          { headers: { "Content-Type": "application/json" } }
        );

        // A proxy or a wrong NEXT_PUBLIC_BASE_URL answers with an HTML error
        // page, and `res.json()` then throws a SyntaxError that says nothing
        // about what actually went wrong. Read the status first.
        let data = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok) {
          // Carry the real reason. "We couldn't load your payout accounts" is
          // true of an expired session, someone else's profile, and a server
          // fault alike — and only one of those is the host's to fix.
          // The server's own message wins wherever it sent one: it distinguishes
          // "this is not your account" from "this account is not a host
          // account", which need completely different responses from the reader.
          const reason =
            data?.error ||
            (res.status === 401
              ? t.PayoutSessionExpired
              : res.status === 403
              ? t.PayoutOwnProfileOnly
              : `${t.PayoutAccountsLoadFailed} (HTTP ${res.status})`);
          setLoadError({ status: res.status, message: reason });
          return;
        }

        setAccounts(data?.accounts || []);
        setLoadError(null);

        if (data?.refreshFailed?.length) {
          // Named rather than swallowed: the figures on screen are stale and
          // the host is entitled to know which ones.
          toast.warn(`${t.PayoutRefreshPartial}: ${data.refreshFailed.join(", ")}`);
        }
        onAccountsChanged?.(data?.accounts || []);
      } catch (err) {
        console.error("Could not load payout accounts:", err);
        // A genuine network failure — the request never got an answer.
        setLoadError({ status: 0, message: t.PayoutAccountsLoadFailedNetwork });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      base,
      hostId,
      onAccountsChanged,
      t.PayoutRefreshPartial,
      t.PayoutSessionExpired,
      t.PayoutOwnProfileOnly,
      t.PayoutAccountsLoadFailed,
      t.PayoutAccountsLoadFailedNetwork,
    ]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  // Mirror what each listing currently pays out to, so the selects are
  // controlled without re-reading the listings on every change.
  useEffect(() => {
    setListingAccounts(
      Object.fromEntries(
        (accommodations || []).map((a) => [a._id, a.payoutStripeAccountId || ""])
      )
    );
  }, [accommodations]);

  /**
   * Connect an ADDITIONAL account.
   *
   * Deliberately not `create-express-account`, which reuses the existing
   * account so that a retry cannot orphan it. Here a second account is the
   * whole point.
   */
  const connectNew = async () => {
    if (!hostId) return;
    setConnecting(true);
    try {
      const res = await apiFetch(`${base}/payments/host/connect-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId, label: newLabel.trim(), returnTo: "/Profile" }),
      });
      const data = await res.json();
      if (!res.ok || !data.onboardingUrl) {
        throw new Error(data.error || t.PayoutConnectFailed);
      }
      window.location.href = data.onboardingUrl;
    } catch (err) {
      console.error("Could not connect a Stripe account:", err);
      toast.error(err.message || t.SomethingWentWrong);
      setConnecting(false);
    }
  };

  /**
   * Reopen Stripe for ONE account.
   *
   * Account Links expire within minutes and are consumed once used, so a fresh
   * one is minted every time — there is never a link worth storing.
   */
  const openAccount = async (accountId) => {
    setBusyAccount(accountId);
    try {
      const res = await apiFetch(`${base}/payments/host/account-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId, accountId, returnTo: "/Profile" }),
      });
      const data = await res.json();
      if (!res.ok || !data.onboardingUrl) {
        throw new Error(data.error || t.PayoutConnectFailed);
      }
      window.location.href = data.onboardingUrl;
    } catch (err) {
      console.error("Could not open Stripe for this account:", err);
      toast.error(err.message || t.SomethingWentWrong);
      setBusyAccount(null);
    }
  };

  const makeDefault = async (accountId) => {
    setBusyAccount(accountId);
    try {
      const res = await apiFetch(`${base}/payments/host/default-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId, accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.SomethingWentWrong);

      setAccounts(data.accounts || []);
      onAccountsChanged?.(data.accounts || []);
      toast.success(t.PayoutDefaultChanged);
    } catch (err) {
      console.error("Could not change the default payout account:", err);
      toast.error(err.message || t.SomethingWentWrong);
    } finally {
      setBusyAccount(null);
    }
  };

  /** Point one property at one account. An empty value means "use the default". */
  const assignListing = async (listingId, accountId) => {
    const previous = listingAccounts[listingId] || "";
    setListingAccounts((prev) => ({ ...prev, [listingId]: accountId }));
    setSavingListing((prev) => ({ ...prev, [listingId]: true }));

    try {
      const res = await apiFetch(`${base}/accommodation/${listingId}/payout-account`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accountId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || t.SomethingWentWrong);

      toast.success(t.PayoutListingUpdated);
    } catch (err) {
      console.error("Could not set the listing's payout account:", err);
      // Put the select back — leaving it showing a choice that was not saved is
      // how a host ends up believing money is going somewhere it is not.
      setListingAccounts((prev) => ({ ...prev, [listingId]: previous }));
      toast.error(err.message || t.SomethingWentWrong);
    } finally {
      setSavingListing((prev) => ({ ...prev, [listingId]: false }));
    }
  };

  const nameOf = (account) =>
    account.label || account.payoutIban || account.accountId;

  return (
    <div className="p-4 border border-gray-200 rounded-md">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-800">{t.YourPayoutAccounts}</h3>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? t.PayoutRefreshing : t.PayoutRefreshStatus}
        </button>
      </div>
      <p className="mb-3 text-xs text-gray-500">{t.YourPayoutAccountsExplainer}</p>

      {/* The failure is reported ABOVE the panel rather than instead of it.
          Replacing the whole panel with an error box also removed the only
          button that connects an account — so a host whose list failed to load
          (and a host who has no account at all, which is when this endpoint is
          most likely to be the thing that is wrong) was left with an error and
          no way to act on it. */}
      {loadError && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-700">{t.PayoutAccountsLoadFailed}</p>
            <p className="mt-0.5 text-xs text-red-600 break-words">{loadError.message}</p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50"
          >
            {t.TryAgain}
          </button>
        </div>
      )}

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t.PayoutLoading}
        </p>
      ) : (
        <>
          {accounts.length === 0 ? (
            /* Only claim there are none when we actually got an answer. After a
               failed load we do not know, and telling a host with a working
               account that they have none would send them off to connect a
               second one they do not need. */
            <p className="mb-3 text-sm text-gray-500">
              {loadError ? t.PayoutAccountsUnknown : t.PayoutNoAccountsYet}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {accounts.map((account) => {
                const state = stateOf(account);
                const busy = busyAccount === account.accountId;
                // "Update details" rather than "Finish setup" once there is
                // nothing outstanding — the host is editing, not completing.
                const actionLabel =
                  state === "restricted"
                    ? t.PayoutFixNow
                    : state === "active"
                    ? t.PayoutUpdateDetails
                    : t.PayoutFinishSetup;

                return (
                  <li key={account.accountId} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start min-w-0 gap-3">
                        <span className="flex items-center justify-center w-9 h-9 border rounded-lg shrink-0 bg-gray-50 border-gray-200 text-gray-600">
                          <Wallet className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 break-words">
                            {account.label || t.PayoutAccountUnnamed}
                            {account.isDefault && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {t.PayoutAccountDefault}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 break-all">
                            {account.payoutIban
                              ? `${account.payoutIban} · ${account.accountId}`
                              : account.accountId}
                          </p>
                          <AccountBlockers account={account} t={t} />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatePill state={state} t={t} />
                        <div className="flex flex-wrap justify-end gap-2">
                          {!account.isDefault && (
                            <button
                              type="button"
                              onClick={() => makeDefault(account.accountId)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
                            >
                              <Star className="w-3.5 h-3.5" />
                              {t.PayoutMakeDefault}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openAccount(account.accountId)}
                            disabled={busy}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-60 ${
                              state === "restricted"
                                ? "bg-rose-600 hover:bg-rose-700"
                                : state === "active"
                                ? "bg-gray-600 hover:bg-gray-700"
                                : "bg-amber-600 hover:bg-amber-700"
                            }`}
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            {busy ? t.PayoutConnectOpening : actionLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Connect another. The label is asked for here rather than after the
              fact because "acct_1Nv8…" against "acct_1Pq2…" is not a choice a
              host can make later, and this is the only moment they know which
              account they are about to create. */}
          <div className="pt-3 mt-3 border-t border-gray-100">
            {showConnect ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex-1 min-w-[200px]">
                  <span className="block mb-1 text-xs font-medium text-gray-600">
                    {t.PayoutAccountLabel}{" "}
                    <span className="text-gray-400">({t.OptionalLabel})</span>
                  </span>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    maxLength={60}
                    placeholder={t.PayoutAccountLabelPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#319A81]"
                  />
                </label>
                <button
                  type="button"
                  onClick={connectNew}
                  disabled={connecting}
                  className="px-4 py-2 text-sm font-medium text-white rounded-md bg-[#357965] hover:bg-[#1e4636] disabled:opacity-60"
                >
                  {connecting ? t.PayoutConnectOpening : t.PayoutContinueToStripe}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConnect(false)}
                  disabled={connecting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60"
                >
                  {t.Cancel}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConnect(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md bg-[#357965] hover:bg-[#1e4636]"
              >
                <Plus className="w-4 h-4" />
                {accounts.length ? t.ConnectAnotherStripeAccount : t.ConnectStripeAccount}
              </button>
            )}
            <p className="mt-2 text-xs text-gray-400">{t.ConnectStripeAccountHint}</p>
          </div>

          {/* Which account each property is paid into. Editable here, not only
              inside the add-accommodation form — a host who connects a second
              account today has to be able to move an existing property onto it
              without editing the whole listing. */}
          {accounts.length > 0 && accommodations.length > 0 && (
            <div className="pt-3 mt-3 border-t border-gray-100">
              <h4 className="mb-1 text-sm font-semibold text-gray-800">
                {t.PayoutListingAssignment}
              </h4>
              <p className="mb-3 text-xs text-gray-500">
                {t.PayoutListingAssignmentExplainer}
              </p>

              <ul className="space-y-2">
                {accommodations.map((acc) => (
                  <li
                    key={acc._id}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <span className="min-w-0 text-sm text-gray-800 break-words">
                      {acc.name}
                    </span>
                    <span className="flex items-center gap-2">
                      {savingListing[acc._id] && (
                        <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                      )}
                      <select
                        value={listingAccounts[acc._id] ?? ""}
                        disabled={savingListing[acc._id]}
                        onChange={(e) => assignListing(acc._id, e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white disabled:opacity-60 max-w-[240px]"
                      >
                        <option value="">{t.PayoutUseDefaultAccount}</option>
                        {accounts.map((account) => (
                          <option key={account.accountId} value={account.accountId}>
                            {nameOf(account)}
                          </option>
                        ))}
                      </select>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PayoutAccountsPanel;
