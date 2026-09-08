import React, { useState, useEffect, useCallback, useContext } from 'react';
import { toast } from 'react-toastify';
import useFetchData from '../../hooks/useFetchData';
import apiFetch from '../../utlis/apiFetch';
import HostInvoices from './HostInvoices';
import BillingDetailsModal from '../../components/BillingDetailsModal';
import ListingStatusBadge from './ListingStatusBadge';
import PayoutAccountsPanel from './PayoutAccountsPanel';
import { PayoutRow, PayoutSection, PayoutSummary } from './PayoutRows';
import { missingBillingFields, describeMissingBillingFields } from '../../utlis/hostBilling';
import { FormContext } from '../../FormContext';
import en from '../../locales/en';
import sk from '../../locales/sk';

const translations = { en, sk };

function Payments() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hostData, setHostData] = useState(null);
  // True when the host record could not be read at all. Kept separate from
  // "billing incomplete": both used to render as the same bare dash, which told
  // a host whose details were already saved precisely nothing.
  const [hostLoadError, setHostLoadError] = useState(false);
  const [reservations, setReservations] = useState({
    available: [],
    upcoming: [],
    // Payouts Stripe refused. Previously folded into `available`, where a
    // failure was indistinguishable from money waiting to be taken.
    failed: [],
    history: [],
  });
  const [withdrawingId, setWithdrawingId] = useState(null);
  // Mirrors PAYOUT_DELAY_HOURS on the server; overwritten by the status call so
  // the UI can never imply a stricter or looser window than the backend applies.
  const [payoutDelayHours, setPayoutDelayHours] = useState(24);
  // `null` while the billing modal is closed; `{ reservationId }` while it is
  // open. The reservation is carried through so the payout resumes by itself
  // once the form is filled in — making the host press Withdraw a second time
  // reads as a failure. It is null when the modal was opened from the banner,
  // where there is nothing to resume.
  const [billingPrompt, setBillingPrompt] = useState(null);

  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || 'sk');

  useEffect(() => {
    setLanguage(lang || 'sk');
  }, [lang]);

  const t = translations[language] || en;

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const userId = user?._id;

  // Fetch accommodations
  const { data: accommodationData, loading: accommodationLoading } = useFetchData(
    userId ? `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}` : null
  );

  // Whether the PAYOUT side of this page applies — i.e. the host has at least one
  // listing that can take money. Reads `!== false` rather than `=== true`: the
  // field defaults to true on the schema, so absent means "not set", not "off".
  // Reading it as `=== true` treated every listing with no stored value as
  // payments-disabled and hid this whole page behind "coming soon".
  //
  // A host with no listings at all is also false here, and that is correct — but
  // it must not cost them access to the billing form, which is a prerequisite for
  // having a bookable listing in the first place. So this gates the payout
  // sections only, never the header.
  const payoutsAvailable = Array.isArray(accommodationData)
    ? accommodationData.some(acc => acc.stripeEnabled !== false)
    : false;

  // Every connected account this host holds. A host may run one across all
  // their properties or a separate one per property, so the listing table below
  // has to name which account each property actually pays.
  //
  // Loaded by PayoutAccountsPanel and handed up, rather than fetched here as
  // well: that panel refreshes each account against the Stripe API, and a second
  // copy of the request would both duplicate the round-trip and let this list go
  // stale the moment the host changes something inside the panel.
  const [payoutAccounts, setPayoutAccounts] = useState([]);

  // Stable identity — the panel uses it inside a useCallback that its load
  // effect depends on, so a new function every render would refetch forever.
  const handleAccountsChanged = useCallback((accounts) => {
    setPayoutAccounts(accounts || []);
  }, []);

  // Fetch host data, then refresh the Stripe status straight from the API.
  // Returning from onboarding is not proof that onboarding finished — only
  // Stripe can say whether charges and payouts are actually enabled.
  //
  // Deliberately NOT gated on `payoutsAvailable`: `billingComplete` is derived
  // from this record and drives the header, which is shown regardless.
  const fetchHostData = useCallback(async () => {
    if (!user?._id) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${user._id}`);
      const data = await res.json();

      if (!res.ok) {
        // Was a bare `return`. A failure here leaves `hostData` null, which the
        // header renders identically to "billing incomplete" — so a host who had
        // filled everything in saw an unexplained dash and no way to find out
        // why. Say so instead of failing silently into a wrong answer.
        console.error('Host fetch failed:', res.status, data?.message || '');
        setHostLoadError(true);
        return;
      }

      setHostLoadError(false);
      setHostData(data);

      if (data.stripeAccountId) {
        const statusRes = await apiFetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/payments/host/refresh-status`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: user._id }),
          }
        );
        const status = await statusRes.json();
        if (statusRes.ok) {
          setHostData(prev => ({ ...prev, ...status }));
          if (status.payoutDelayHours) setPayoutDelayHours(status.payoutDelayHours);
        }
      }
    } catch (err) {
      console.error('Host fetch error:', err);
      setHostLoadError(true);
    }
  }, [user]);

  useEffect(() => {
    fetchHostData();
  }, [fetchHostData]);

  // Billing is edited on the Personal Profile tab, which is a sibling of this one
  // inside the same page — so this component can be showing a snapshot taken
  // before those details existed. Re-read whenever the tab is looked at again,
  // so saving the profile and coming back here shows the tick without a reload.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') fetchHostData();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [fetchHostData]);

  // Connect Stripe
  const handleConnectStripe = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payments/host/create-express-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: user._id, email: user.email }),
      });
      const data = await res.json();
      if (res.ok && data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
        return;
      }

      // "Authentication required" is the server saying no usable token arrived —
      // nothing to do with Stripe, and unactionable as raw text. Name the real
      // problem so the host signs in again instead of pressing the button twice.
      if (res.status === 401) {
        toast.error(t.PayoutSessionExpired);
      } else if (res.status === 403) {
        toast.error(t.PayoutOwnProfileOnly);
      } else {
        toast.error(data.error || t.PayoutConnectFailed);
      }
    } catch {
      toast.error(t.SomethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reservations
  useEffect(() => {
    if (!user?._id) return;

    const fetchReservations = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reservation/provider/${user._id}`);
        if (!res.ok) return;
        const data = await res.json();

        const now = new Date();

        const available = [];
        const upcoming = [];
        const failed = [];
        const history = [];

        data.forEach(r => {
          if (r.paymentStatus !== 'paid') return;

          // A cancelled or refunded booking owes the host nothing, and the
          // server refuses it with `cancelled` / `refunded`. It used to sit in
          // the available list with a live Withdraw button that could only ever
          // produce an error.
          if (r.isApproved === 'cancelled') return;
          if (Number(r.refundAmountCents) > 0) return;

          // When this payout unlocks, as computed by the SERVER from the same
          // business-timezone rule the payout gate enforces. The browser used to
          // re-derive it from its own local midnight, which drifts from the
          // backend for any host outside Europe/Bratislava and for any
          // PAYOUT_DELAY_HOURS that is not a multiple of 24 — showing a disabled
          // "Locked" button on money that was already withdrawable, or a live
          // one on money that was not.
          //
          // The old rule is kept only as a fallback for a backend that predates
          // the field.
          const unlocksAt = r.payoutUnlocksAt
            ? new Date(r.payoutUnlocksAt)
            : (() => {
                const checkIn = new Date(r.checkInDate);
                checkIn.setHours(0, 0, 0, 0);
                return new Date(checkIn.getTime() + payoutDelayHours * 60 * 60 * 1000);
              })();

          const locked = now < unlocksAt;
          const item = { ...r, payoutUnlocksAt: unlocksAt, locked };

          if (r.payoutStatus === 'released' || r.transferId) {
            history.push(item);
          } else if (r.payoutStatus === 'failed') {
            // Its own group. These used to land in "available" — indistinguishable
            // from a healthy payout, with `payoutLastError` recorded and shown
            // nowhere.
            failed.push(item);
          } else if (locked) {
            upcoming.push(item);
          } else {
            available.push(item);
          }
        });

        // Soonest money first in the two actionable lists; most recent first in
        // history, which is read as a log.
        available.sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));
        upcoming.sort((a, b) => new Date(a.payoutUnlocksAt) - new Date(b.payoutUnlocksAt));
        history.sort(
          (a, b) => new Date(b.transferredAt || 0) - new Date(a.transferredAt || 0)
        );

        setReservations({ available, upcoming, failed, history });
      } catch (err) {
        console.error('Reservation fetch error:', err);
      }
    };

    fetchReservations();
  }, [user, payoutDelayHours]);

  // Invoicing details Putko still needs before it may pay this host out.
  //
  // The server now sends its own verdict (`billing.missing`) on both
  // GET /hosts/:id and the status refresh, and that is the one the payout gate
  // actually applies — so it wins whenever it is present. The local computation
  // stays as a fallback for a backend that predates the field, which is the only
  // case where the browser has to reconstruct the rule for itself.
  const missingBilling = Array.isArray(hostData?.billing?.missing)
    ? hostData.billing.missing
    : missingBillingFields(hostData);
  const billingComplete = hostData != null && missingBilling.length === 0;

  // Withdraw payout
  const performWithdraw = async reservationId => {
    setWithdrawingId(reservationId);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payments/release-payout`, {
        method: 'POST',
        reservationId,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      });
      const data = await res.json();

      // Success is `data.success`, not `res.ok`. A queued payout comes back as
      // 202 — which is inside the 2xx range — and moving the row to history on
      // that would tell the host money had been sent when no transfer exists.
      if (data.success) {
        toast.success(t.PayoutReleasedToast);
        setReservations(prev => {
          // Searched in both lists: a retried payout is withdrawn from `failed`,
          // and the previous version looked only in `available` — so retrying a
          // failed payout spread `undefined` into history, producing a keyless
          // blank row while the failed one stayed on screen.
          const withdrawn =
            prev.available.find(r => r._id === reservationId) ||
            prev.failed.find(r => r._id === reservationId);

          if (!withdrawn) return prev;

          return {
            ...prev,
            available: prev.available.filter(r => r._id !== reservationId),
            failed: prev.failed.filter(r => r._id !== reservationId),
            history: [
              {
                ...withdrawn,
                payoutStatus: 'released',
                transferId: data.transferId,
                transferredAt: new Date().toISOString(),
                payoutLastError: undefined,
              },
              ...prev.history,
            ],
          };
        });
      } else if (data.retryable) {
        // Not the host's problem and not a dead end — the daily sweep retries.
        // The booking stays in "available" so they can see it is still owed.
        toast.info(data.error || t.PayoutQueuedToast);
      } else if (data.code === 'payouts_disabled' || data.code === 'account_restricted') {
        // Stripe is still waiting on something. Naming it beats "payouts are not
        // enabled yet", which leaves the host with nothing to do.
        const due = (data.requirementsDue || []).map(r => r.replace(/[._]/g, ' '));
        toast.error(
          due.length
            ? `${data.error} ${t.PayoutStillNeeded}: ${due.slice(0, 4).join(', ')}${due.length > 4 ? '…' : ''}`
            : data.error,
          { autoClose: 8000 }
        );
        // Re-read the Stripe status so the banner above updates in the same
        // breath — including the restricted state, which the banner renders
        // differently from unfinished onboarding.
        setHostData(prev => ({
          ...prev,
          payoutsEnabled: false,
          payoutState: data.code === 'account_restricted' ? 'restricted' : prev?.payoutState,
          stripeDisabledReason: data.disabledReason ?? prev?.stripeDisabledReason,
          stripeRequirementsDue: data.requirementsDue || [],
        }));
      } else if (data.code === 'billing_incomplete') {
        // The server holds the authoritative copy of the host record, so it can
        // refuse even when this browser thought the details were complete —
        // stale hostData, or another tab having cleared a field. Reopen the form
        // rather than showing an error the host has no way to act on.
        toast.error(data.error || t.PayoutBillingRequiredToast);
        setBillingPrompt({ reservationId });
      } else {
        toast.error(data.error || t.PayoutFailedToast);
      }
    } catch {
      toast.error(t.SomethingWentWrong);
    } finally {
      setWithdrawingId(null);
    }
  };

  /**
   * Withdraw, gated on the invoicing details.
   *
   * Putko takes its platform fee out of this payout and has to invoice that fee
   * under Slovak VAT rules, which is impossible without the host's IČO, DIČ and
   * billing address. Collect them here rather than letting the payout through
   * and having the monthly invoice run fail silently a month later.
   */
  const handleWithdraw = reservationId => {
    if (!billingComplete) {
      setBillingPrompt({ reservationId });
      return;
    }
    return performWithdraw(reservationId);
  };

  // Details saved — merge them in, close the form, and finish what the host
  // originally asked for.
  const handleBillingSaved = saved => {
    // Merge for an instant response, then re-read so the server's own billing
    // verdict replaces the optimistic one. Without the re-read `billing.missing`
    // would still hold the list from before the save, and the tick would not
    // appear until the next page load.
    setHostData(prev => ({ ...prev, ...saved }));
    fetchHostData();

    const pending = billingPrompt?.reservationId;
    setBillingPrompt(null);
    if (pending) performWithdraw(pending);
  };

  // Guards.
  //
  // `payoutsAvailable` is deliberately NOT one of them. It used to early-return a
  // "coming soon" card, which took the billing form off the page entirely — for a
  // host with no listings yet, and (because the flag was read as `=== true`
  // against a value that is absent on older listings) for many hosts whose
  // payments were in fact enabled. It now selects which section renders below,
  // leaving the header and the billing form reachable in every case.
  if (!user) return <div>{t.PayoutPleaseLogIn}</div>;
  if (accommodationLoading)
    return (
      <div className="p-6 bg-white rounded-lg shadow-md text-gray-500">{t.PayoutLoading}</div>
    );

  // Two independent requirements, and a host can satisfy them in either order.
  // Billing is Putko's (IČO, DIČ, address, for the monthly fee invoice); Stripe
  // is where the money actually goes.
  const stripeConnected = Boolean(hostData?.stripeAccountId);

  // Stripe has suspended the default account rather than merely not finished
  // with it — reported by the server from `requirements.disabled_reason` /
  // `past_due`, which nothing on this page used to read.
  const stripeRestricted = hostData?.payoutState === 'restricted';

  // Dates and money render in the host's chosen language, not the browser's.
  const locale = language === 'sk' ? 'sk-SK' : 'en-GB';

  // Bookings are priced in one currency in practice, so the section and summary
  // totals take it from the first row rather than pretending to sum across
  // currencies — which would silently add pounds to euros.
  const payoutCurrency =
    reservations.available[0]?.currency ||
    reservations.upcoming[0]?.currency ||
    reservations.history[0]?.currency ||
    'eur';

  // Sums per group, from the host's SHARE — never the gross. A booking with no
  // recorded split contributes nothing, because there is no figure to add and
  // adding the gross would overstate what the host is owed.
  const sumHostCents = rows =>
    rows.reduce((total, r) => total + (Math.round(Number(r.hostAmountCents)) || 0), 0);

  const totals = {
    available: sumHostCents(reservations.available),
    upcoming: sumHostCents(reservations.upcoming),
    failed: sumHostCents(reservations.failed),
    history: sumHostCents(reservations.history),
  };

  /**
   * Which connected account a booking's money lands in.
   *
   * Resolved the same way the server does (utils/payoutAccounts.js): the
   * listing's own account when it names one and the host still holds it,
   * otherwise the host's default.
   */
  const destinationAccountFor = reservation => {
    const named = reservation.accommodationId?.payoutStripeAccountId;
    return (
      (named && payoutAccounts.find(a => a.accountId === named)) ||
      payoutAccounts.find(a => a.isDefault) ||
      null
    );
  };

  // UI
  return (
    <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
      {/* Header. The billing entry point lives here rather than only inside the
          connected-to-Stripe branch, because it used to be unreachable for the
          hosts who most needed it: a host with no connected account — and so no
          payout to be refused — was shown nothing but "Connect with Stripe" and
          had no way to enter their invoicing details from this page at all. Both
          steps are required before a listing can take bookings, and neither has
          to come first. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t.PayoutSettings}</h2>
          <p className="mt-1 text-sm text-gray-500 max-w-xl">{t.PayoutSettingsIntro}</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {/* Three states, not two: a restricted account is not "not yet
                finished", and an amber dash for it hid the one status a host
                has to act on today. */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                hostData?.onboardingComplete
                  ? 'bg-green-100 text-green-800'
                  : stripeRestricted
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Stripe {hostData?.onboardingComplete ? '✓' : stripeRestricted ? '!' : '—'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                billingComplete ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {t.PayoutBillingLabel} {billingComplete ? '✓' : '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setBillingPrompt({ reservationId: null })}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              billingComplete
                ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'text-white bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {billingComplete ? t.PayoutEditBilling : t.PayoutAddBilling}
          </button>
        </div>
      </div>

      {/* Payout accounts.
          Always shown, not only when there is more than one: connecting the
          first account, connecting another, seeing exactly what Stripe is
          waiting for, going back in to supply it, and pointing a property at an
          account all live in here. Previously this was a read-only list that
          appeared only for hosts who already had two accounts — so the host who
          most needed it, the one with a single account Stripe had restricted,
          never saw it at all. */}
      <PayoutAccountsPanel
        t={t}
        hostId={user?._id}
        accommodations={Array.isArray(accommodationData) ? accommodationData : []}
        onAccountsChanged={handleAccountsChanged}
      />

      {/* Listing lifecycle.
          Every listing carries its own status, flipped automatically from the
          account.updated webhook — so this is a read-out, not a control. It sits
          on this page because "why is my listing not live?" is a payouts
          question: the answer is always somewhere in this host's Stripe state.
          The same badge appears on each card in "Moje ubytovania". */}
      {Array.isArray(accommodationData) && accommodationData.length > 0 && (
        <div className="p-4 border border-gray-200 rounded-md">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-800">{t.ListingStatusHeading}</h3>
            <span className="text-xs text-gray-500">
              {accommodationData.filter((a) => a.listingStatus === "PUBLISHED").length}
              {" / "}
              {accommodationData.length} {t.ListingStatusLiveCount}
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500">{t.ListingStatusExplainer}</p>

          <ul className="divide-y divide-gray-100">
            {accommodationData.map((acc) => {
              // Which of the host's accounts this property pays out to. A host
              // with five apartments should see it all at a glance, including
              // when two of them pay different accounts.
              const account = payoutAccounts.find(
                (a) => a.accountId === acc.payoutStripeAccountId
              );
              const usesDefault = !acc.payoutStripeAccountId;
              const defaultAccount = payoutAccounts.find((a) => a.isDefault);
              const shown = account || (usesDefault ? defaultAccount : null);

              return (
                <li key={acc._id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800 break-words">
                      {acc.name}
                    </span>
                    {payoutAccounts.length > 0 && (
                      <span className="block text-xs text-gray-500 break-all">
                        {t.PaysOutTo}:{" "}
                        {shown
                          ? `${shown.label || shown.payoutIban || shown.accountId}${
                              usesDefault ? ` (${t.PayoutAccountDefault})` : ""
                            }`
                          : t.PayoutAccountNoneLinked}
                      </span>
                    )}
                  </span>
                  <ListingStatusBadge status={acc.listingStatus} t={t} size="xs" />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!payoutsAvailable ? (
        <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="text-sm font-medium text-gray-800">{t.PayoutsNotActive}</h3>
          <p className="mt-2 text-gray-600">
            {Array.isArray(accommodationData) && accommodationData.length > 0
              ? t.PayoutsNotActiveListings
              : t.PayoutsNotActiveNoListings}
          </p>
        </div>
      ) : stripeConnected ? (
        <>
          {/* Stripe status — verified against the Stripe API, not the return URL */}
          {hostData.onboardingComplete ? (
            <div className="p-4 border border-green-200 rounded-md bg-green-50">
              <h3 className="text-sm font-medium text-green-800">{t.PayoutStripeConnected}</h3>
              <p className="mt-2 text-green-700">{t.PayoutStripeConnectedBody}</p>
              <p className="mt-1 text-xs text-gray-500">
                {t.PayoutAccountId}: {hostData.stripeAccountId}
              </p>
            </div>
          ) : (
            /* A restriction and an unfinished form are different problems and
               need opposite instructions, so they no longer share one amber
               box. "Continue onboarding" is useless to a host whose account
               Stripe has suspended over a rejected document.

               `chargesEnabled` is deliberately no longer mentioned. Putko charges
               on the platform account and only transfers to the host, so a host
               account never requests `card_payments` — `charges_enabled` is false
               on every healthy account now, and reporting it as a fault was
               telling hosts something was wrong when nothing was. */
            <div
              className={`p-4 border rounded-md ${
                stripeRestricted
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-yellow-200 bg-yellow-50'
              }`}
            >
              <h3
                className={`text-sm font-medium ${
                  stripeRestricted ? 'text-rose-800' : 'text-yellow-800'
                }`}
              >
                {stripeRestricted ? t.PayoutStripeRestricted : t.PayoutStripeIncomplete}
              </h3>
              <p className={`mt-2 ${stripeRestricted ? 'text-rose-700' : 'text-yellow-700'}`}>
                {stripeRestricted ? t.PayoutStripeRestrictedBody : t.OnboardIncompleteBody}
                {hostData.payoutsEnabled === false && ` ${t.PayoutPayoutsDisabled}`}
              </p>
              {hostData.stripeRequirementsDue?.length > 0 && (
                <ul
                  className={`mt-2 ml-4 list-disc text-xs ${
                    stripeRestricted ? 'text-rose-700' : 'text-yellow-700'
                  }`}
                >
                  {hostData.stripeRequirementsDue.map(req => (
                    <li key={req}>{req.replace(/[._]/g, ' ')}</li>
                  ))}
                </ul>
              )}
              <button
                onClick={handleConnectStripe}
                disabled={loading}
                className={`mt-3 px-4 py-2 text-sm font-medium text-white rounded-md disabled:bg-gray-400 ${
                  stripeRestricted
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {loading
                  ? t.OnboardOpening
                  : stripeRestricted
                  ? t.PayoutFixNow
                  : t.OnboardContinue}
              </button>
            </div>
          )}

          {/* The host record itself could not be read. Distinguished from
              "billing incomplete" on purpose: telling a host to add details they
              have already saved sends them round a loop that cannot end. */}
          {hostLoadError && (
            <div className="p-4 border border-rose-200 rounded-md bg-rose-50">
              <h3 className="text-sm font-medium text-rose-800">{t.PayoutLoadErrorTitle}</h3>
              <p className="mt-2 text-sm text-rose-700">{t.PayoutLoadErrorBody}</p>
              <button
                onClick={fetchHostData}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md"
              >
                {t.TryAgain}
              </button>
            </div>
          )}

          {/* Billing details — required before any payout can be released, and
              shown up front so the host is not first told about it by a button
              that refuses to do anything. */}
          {hostData && !hostLoadError && !billingComplete && (
            <div className="p-4 border border-amber-200 rounded-md bg-amber-50">
              <h3 className="text-sm font-medium text-amber-800">{t.PayoutBillingNeeded}</h3>
              <p className="mt-2 text-amber-700">{t.PayoutBillingNeededBody}</p>
              <p className="mt-1 text-xs text-amber-700">
                {t.PayoutStillNeeded}: {describeMissingBillingFields(missingBilling, t)}
              </p>
              <button
                onClick={() => setBillingPrompt({ reservationId: null })}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md"
              >
                {t.PayoutAddBilling}
              </button>
            </div>
          )}

          {/* Earnings at a glance. Nothing on this page used to add anything
              up — the totals existed only in the host's head, one row at a
              time. */}
          <PayoutSummary
            availableCents={totals.available}
            lockedCents={totals.upcoming}
            releasedCents={totals.history}
            currency={payoutCurrency}
            locale={locale}
            t={t}
          />

          {/* Available */}
          <PayoutSection
            title={t.PayoutAvailableTitle}
            hint={t.PayoutAvailableHint}
            rows={reservations.available}
            totalCents={totals.available}
            currency={payoutCurrency}
            locale={locale}
            emptyText={t.PayoutAvailableEmpty}
            t={t}
          >
            {reservations.available.map(res => (
              <PayoutRow
                key={res._id}
                reservation={res}
                t={t}
                locale={locale}
                tone="available"
                statusLabel={t.PayoutStatusReady}
                destinationAccount={destinationAccountFor(res)}
                busy={withdrawingId === res._id}
                onWithdraw={handleWithdraw}
              />
            ))}
          </PayoutSection>

          {/* Payouts Stripe refused. Their own section: a failure used to be
              indistinguishable from money waiting to be taken, and the recorded
              reason was shown nowhere at all. */}
          {reservations.failed.length > 0 && (
            <PayoutSection
              title={t.PayoutFailedTitle}
              hint={t.PayoutFailedHint}
              rows={reservations.failed}
              totalCents={totals.failed}
              currency={payoutCurrency}
              locale={locale}
              emptyText=""
              t={t}
            >
              {reservations.failed.map(res => (
                <PayoutRow
                  key={res._id}
                  reservation={res}
                  t={t}
                  locale={locale}
                  tone="failed"
                  statusLabel={t.PayoutStatusFailed}
                  destinationAccount={destinationAccountFor(res)}
                  busy={withdrawingId === res._id}
                  onWithdraw={handleWithdraw}
                />
              ))}
            </PayoutSection>
          )}

          {/* Locked */}
          <PayoutSection
            title={t.PayoutUpcomingTitle.replace('{hours}', payoutDelayHours)}
            hint={t.PayoutUpcomingHint.replace('{hours}', payoutDelayHours)}
            rows={reservations.upcoming}
            totalCents={totals.upcoming}
            currency={payoutCurrency}
            locale={locale}
            emptyText={t.PayoutUpcomingEmpty}
            t={t}
          >
            {reservations.upcoming.map(res => (
              <PayoutRow
                key={res._id}
                reservation={res}
                t={t}
                locale={locale}
                tone="locked"
                statusLabel={t.PayoutLocked}
                destinationAccount={destinationAccountFor(res)}
              />
            ))}
          </PayoutSection>

          {/* History */}
          <PayoutSection
            title={t.PayoutHistoryTitle}
            rows={reservations.history}
            totalCents={totals.history}
            currency={payoutCurrency}
            locale={locale}
            emptyText={t.PayoutHistoryEmpty}
            t={t}
          >
            {reservations.history.map(res => (
              <PayoutRow
                key={res._id}
                reservation={res}
                t={t}
                locale={locale}
                tone="released"
                statusLabel={t.PayoutStatusSent}
                destinationAccount={destinationAccountFor(res)}
              />
            ))}
          </PayoutSection>

          {/* Putko's own invoices for the fees already deducted above. */}
          <HostInvoices hostId={user._id} />
        </>
      ) : (
        <div className="p-4 border border-indigo-200 rounded-md bg-indigo-50">
          <h3 className="text-sm font-medium text-indigo-900">{t.PayoutConnectTitle}</h3>
          <p className="mt-2 text-indigo-800">{t.PayoutConnectBody}</p>
          {billingComplete && (
            <p className="mt-2 text-sm text-indigo-800">{t.PayoutBillingSavedNote}</p>
          )}
          <button
            onClick={handleConnectStripe}
            disabled={loading}
            className="mt-3 px-4 py-2 text-white bg-indigo-600 rounded-md disabled:bg-gray-400"
          >
            {loading ? t.PayoutConnecting : t.PayoutConnectStripe}
          </button>
        </div>
      )}

      {/* Rendered outside the branch above: the form has to be reachable whether
          or not the host has connected Stripe. */}
      {billingPrompt && (
        <BillingDetailsModal
          host={hostData}
          hostId={user._id}
          onSaved={handleBillingSaved}
          onClose={() => setBillingPrompt(null)}
          labels={t}
          {...(billingComplete
            ? {
                title: t.PayoutEditBilling,
                intro: t.PayoutEditBillingIntro,
                submitLabel: t.PayoutSaveChanges,
              }
            : {})}
        />
      )}
    </div>
  );
}

export default Payments;
