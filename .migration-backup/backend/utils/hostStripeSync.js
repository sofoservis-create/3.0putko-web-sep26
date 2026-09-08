// utils/hostStripeSync.js
//
// Mirrors a Stripe connected account onto the Host document.
//
// This lives in its own module rather than in PaymentController because the
// booking gate (utils/listingGating.js) needs it: a host who has finished Stripe
// onboarding but whose `account.updated` webhook never arrived would otherwise be
// blocked forever, with no path to recovery except opening their payouts page.
// PaymentController imports listingGating, so putting this there would close an
// import cycle.

import Host from "../models/Host.js";
import Accommodation from "../models/Accommodation.js";
import mongoose from "mongoose";
import { getStripe, logStripeCall, describeAccountState } from "./stripeHelpers.js";
import { listingStatusForHost, listingStatusFor } from "./listingStatus.js";

/**
 * Write a Stripe account's capability state onto its Host.
 *
 * This is the ONLY place `chargesEnabled` / `payoutsEnabled` / `onboardingComplete`
 * are learned. The onboarding `return_url` is never trusted on its own — landing
 * back on the site says nothing about whether Stripe actually enabled the account.
 *
 * @param {object} account a Stripe Account object
 * @returns {Promise<object|null>} the updated Host, or null if none matched
 */
export const syncHostFromStripeAccount = async (account) => {
  const hostId = account.metadata?.host_id;

  const host =
    hostId && mongoose.Types.ObjectId.isValid(hostId)
      ? await Host.findById(hostId)
      : await Host.findOne({ stripeAccountId: account.id });

  if (!host) {
    console.warn(`account.updated: no host matches Stripe account ${account.id}`);
    return null;
  }

  // One place reads the Account object; everything below works off the result,
  // so the webhook, the staleness refresh and the return-from-onboarding check
  // can never disagree about what "ready" means.
  const s = describeAccountState(account);
  const chargesEnabled = s.chargesEnabled;
  const payoutsEnabled = s.payoutsEnabled;
  const requirementsDue = s.currentlyDue;
  const now = new Date();

  // Captured for the annual DAC7 report. Putko never moves money across this
  // account — Stripe pays the host directly.
  const bankAccount = account.external_accounts?.data?.find((a) => a.object === "bank_account");
  const maskedIban = bankAccount?.last4
    ? `${bankAccount.country || ""}****${bankAccount.last4}`
    : null;

  // Mirror onto the per-account entry. A host may hold several connected
  // accounts, and this event describes exactly one of them — writing it onto
  // the host's top-level fields alone would let a second account's verification
  // silently republish listings paid by the first.
  host.stripeAccounts = host.stripeAccounts || [];
  let entry = host.stripeAccounts.find((a) => a.accountId === account.id);
  if (!entry) {
    host.stripeAccounts.push({ accountId: account.id, connectedAt: now });
    entry = host.stripeAccounts[host.stripeAccounts.length - 1];
  }
  entry.chargesEnabled = chargesEnabled;
  entry.payoutsEnabled = payoutsEnabled;
  entry.transfersActive = s.transfersActive;
  entry.requirementsDue = requirementsDue;
  entry.pastDue = s.pastDue;
  entry.pendingVerification = s.pendingVerification;
  entry.eventuallyDue = s.eventuallyDue;
  entry.disabledReason = s.disabledReason;
  entry.requirementErrors = s.errors;
  entry.currentDeadline = s.currentDeadline;
  entry.futureDue = s.futureDue;
  entry.futureDeadline = s.futureDeadline;
  entry.payoutState = s.state;
  entry.statusUpdatedAt = now;
  if (maskedIban) entry.payoutIban = maskedIban;

  // A host with no default yet adopts this one, so the first account connected
  // becomes the fallback for every listing that names none.
  if (!host.stripeAccountId) host.stripeAccountId = account.id;

  // The top-level fields mirror the DEFAULT account only. Every existing reader
  // keeps working, and a non-default account's state cannot masquerade as the
  // host's overall readiness.
  if (host.stripeAccountId === account.id) {
    host.chargesEnabled = chargesEnabled;
    host.payoutsEnabled = payoutsEnabled;
    host.stripeTransfersActive = s.transfersActive;
    // Judged on transfers, not charges: with `card_payments` no longer
    // requested, `charges_enabled` stays false on a perfectly good account and
    // the old expression would have reported every new host as unfinished
    // forever. See utils/payoutAccounts.js -> isAccountPayoutReady.
    host.onboardingComplete = payoutsEnabled && s.transfersActive;
    host.stripeRequirementsDue = requirementsDue;
    host.stripePastDue = s.pastDue;
    host.stripeDisabledReason = s.disabledReason;
    host.stripePayoutState = s.state;
    host.stripeStatusUpdatedAt = now;
    if (maskedIban) host.payoutIban = maskedIban;
  }

  await host.save();

  // Flip this host's listings to match. This is the "no manual step" half of
  // the status model: the host finishes Stripe, Stripe fires account.updated,
  // and their listings publish themselves.
  const statusResult = await syncListingStatusForHost(host);

  logStripeCall("account.synced", {
    hostId: host._id.toString(),
    accountId: account.id,
    payoutState: s.state,
    transfersActive: s.transfersActive,
    payoutsEnabled,
    // Named so a restricted account is greppable in the log rather than only
    // visible in the Stripe dashboard.
    disabledReason: s.disabledReason || "",
    listingStatus: statusResult.status,
    listingsUpdated: statusResult.updated,
  });

  return host;
};

/**
 * Bring every listing owned by this host in line with their Stripe state.
 *
 * Writes only the listings that actually disagree, so a repeated webhook — and
 * Stripe does repeat them — is a no-op rather than a pile of pointless writes.
 * Never throws: a listing that will not save must not fail the host sync that
 * triggered it, or the host's own record silently rolls back with it.
 *
 * @returns {Promise<{status: string, updated: number}>}
 */
export const syncListingStatusForHost = async (host) => {
  // The host-level answer, for the log line and for callers that just want to
  // know where this host stands overall.
  const status = listingStatusForHost(host);

  try {
    const listings = await Accommodation.find({ userId: host._id })
      .select("_id payoutStripeAccountId listingStatus")
      .lean();

    if (!listings.length) return { status, updated: 0 };

    // Grouped by the status each listing SHOULD have. Two properties of the
    // same host can legitimately differ — one paid by a long-verified account,
    // the other by one still waiting on a document — so this cannot be a single
    // updateMany over every listing the host owns.
    const byStatus = new Map();
    for (const listing of listings) {
      const want = listingStatusFor(listing, host);
      if (want === listing.listingStatus) continue; // already correct
      if (!byStatus.has(want)) byStatus.set(want, []);
      byStatus.get(want).push(listing._id);
    }

    let updated = 0;
    const now = new Date();
    for (const [want, ids] of byStatus) {
      const result = await Accommodation.updateMany(
        { _id: { $in: ids } },
        { $set: { listingStatus: want, listingStatusUpdatedAt: now } }
      );
      updated += result.modifiedCount || 0;
      console.log(`[listing-status] host ${host._id}: ${ids.length} listing(s) → ${want}`);
    }

    return { status, updated };
  } catch (err) {
    console.error(
      `[listing-status] could not update listings for host ${host._id}:`,
      err.message
    );
    return { status, updated: 0 };
  }
};

/**
 * Fill in `listingStatus` on a batch of listings that are about to be returned.
 *
 * Most listings on the platform predate the field and have NO value stored. A
 * missing value is not DRAFT — it is unknown — but every reader treats it as
 * DRAFT, so a fully onboarded host sees "Nepripojené" on all their properties.
 * The boot backfill fixes that eventually; this fixes it on the spot, for the
 * request being served, and does not depend on the backfill having run.
 *
 * It is also the self-healing path for a status that has gone STALE: if the
 * `account.updated` webhook never arrived, the stored value can say PENDING
 * long after Stripe finished. Deriving on read means the host's own screens are
 * never wrong, whatever the stored field says.
 *
 * There is a third reason this is needed, and it is the sharpest: Mongoose
 * applies schema defaults to missing paths when it hydrates a document, so ANY
 * `.save()` on a pre-existing listing — editing its calendar feeds, say — would
 * silently stamp it DRAFT. Correcting on read and persisting the correction is
 * what stops that turning into a wrong status the host cannot clear.
 *
 * Mutates the lean objects in place. Persistence is fire-and-forget: a write
 * failure must not fail the read that triggered it.
 *
 * @param {Array<object>} listings lean accommodation objects
 * @param {object|null} host the owner
 */
export const ensureListingStatuses = (listings, host) => {
  if (!Array.isArray(listings) || !listings.length) return listings;

  const corrections = new Map();

  for (const listing of listings) {
    const want = listingStatusFor(listing, host);
    if (listing.listingStatus === want) continue;

    listing.listingStatus = want;
    if (!corrections.has(want)) corrections.set(want, []);
    corrections.get(want).push(listing._id);
  }

  if (corrections.size) {
    const now = new Date();
    for (const [status, ids] of corrections) {
      Accommodation.updateMany(
        { _id: { $in: ids } },
        { $set: { listingStatus: status, listingStatusUpdatedAt: now } }
      ).catch((err) =>
        console.error("[listing-status] could not persist correction:", err.message)
      );
    }
    console.log(
      `[listing-status] corrected ${[...corrections.values()].flat().length} listing(s) on read`
    );
  }

  return listings;
};

/**
 * Give every listing written before `listingStatus` existed a real value.
 *
 * Without this the field is `undefined` on the whole existing catalogue, and
 * `undefined` is not PUBLISHED — so the moment anything filters on it, every
 * listing on the platform disappears. The webhook alone cannot fix that: it
 * only fires for hosts whose Stripe account changes, which for a finished host
 * may be never.
 *
 * Runs once at boot. Touches only listings that have no status yet, so a second
 * boot is a no-op and a status the webhook has since corrected is never
 * overwritten.
 *
 * @returns {Promise<{scanned: number, updated: number}>}
 */
export const backfillListingStatuses = async () => {
  try {
    const pending = await Accommodation.find({
      $or: [{ listingStatus: { $exists: false } }, { listingStatus: null }],
    })
      .select("_id userId payoutStripeAccountId")
      .lean();

    if (!pending.length) return { scanned: 0, updated: 0 };

    // One host lookup per host, not per listing — a host with twelve listings
    // is the normal case, not the exception.
    const hostIds = [...new Set(pending.map((a) => String(a.userId)).filter(Boolean))];
    const hosts = await Host.find({ _id: { $in: hostIds } })
      .select("_id stripeAccountId chargesEnabled payoutsEnabled stripeAccounts")
      .lean();
    const hostById = new Map(hosts.map((h) => [String(h._id), h]));

    // Group by resulting status so this is three updateMany calls rather than
    // one per listing.
    const byStatus = new Map();
    for (const listing of pending) {
      const status = listingStatusFor(listing, hostById.get(String(listing.userId)));
      if (!byStatus.has(status)) byStatus.set(status, []);
      byStatus.get(status).push(listing._id);
    }

    let updated = 0;
    for (const [status, ids] of byStatus) {
      const result = await Accommodation.updateMany(
        { _id: { $in: ids } },
        { $set: { listingStatus: status, listingStatusUpdatedAt: new Date() } }
      );
      updated += result.modifiedCount || 0;
      console.log(`[listing-status] backfilled ${ids.length} listing(s) → ${status}`);
    }

    return { scanned: pending.length, updated };
  } catch (err) {
    // Never fatal at boot. A failed backfill leaves the old behaviour in place;
    // a crashed server helps nobody.
    console.error("[listing-status] backfill failed:", err.message);
    return { scanned: 0, updated: 0 };
  }
};

/**
 * How old the cached Stripe capability state may be before it is re-read from
 * the API. Long enough that a public listing page does not make a Stripe call
 * per view; short enough that a host who has just finished onboarding sees their
 * Reserve button come back within a few minutes rather than never.
 */
export const STRIPE_STATUS_MAX_AGE_MS = Number(
  process.env.STRIPE_STATUS_MAX_AGE_MS || 10 * 60 * 1000
);

/**
 * Re-read a host's Stripe capabilities when what we hold is stale or was never
 * written at all.
 *
 * `chargesEnabled` / `payoutsEnabled` / `onboardingComplete` are a CACHE, written
 * only by `syncHostFromStripeAccount` — which runs on the `account.updated`
 * webhook and when the host opens their payouts page. Neither is guaranteed. If
 * the webhook is not configured, or was added after a host onboarded, that host
 * has finished onboarding and still reads as not-ready forever.
 *
 * Callers should invoke this ONLY for a host that currently fails the gate, so a
 * host who already passes costs no API call at all. The staleness window then
 * bounds the rest: at most one `accounts.retrieve` per unready host per window,
 * however many guests view the listing.
 *
 * Never throws — a Stripe outage must not take listing pages down with it.
 *
 * @param {object} host a hydrated Host document
 * @returns {Promise<object>} the host (refreshed when possible, else unchanged)
 */
export async function ensureHostStripeStatusFresh(host) {
  if (!host?.stripeAccountId) return host;

  const lastSync = host.stripeStatusUpdatedAt?.getTime?.() || 0;
  if (Date.now() - lastSync < STRIPE_STATUS_MAX_AGE_MS) return host;

  try {
    const account = await getStripe().accounts.retrieve(host.stripeAccountId);
    return (await syncHostFromStripeAccount(account)) || host;
  } catch (err) {
    // Stamp the attempt so a persistently failing account (deleted, wrong key)
    // cannot turn every listing view into another Stripe round-trip.
    try {
      host.stripeStatusUpdatedAt = new Date();
      await host.save();
    } catch {
      // Best effort only.
    }
    logStripeCall(
      "accounts.retrieve",
      { hostId: host._id?.toString(), reason: "gate_refresh" },
      "error",
      err
    );
    return host;
  }
}

/**
 * Re-read EVERY connected account this host holds, not just the default.
 *
 * `ensureHostStripeStatusFresh` above deliberately refreshes only
 * `host.stripeAccountId`: it runs on the listing-view path, where one Stripe
 * call per unready host is already the budget.
 *
 * That leaves a hole the moment a host holds more than one account. A second
 * account's state is written only by its own `account.updated` webhook, so if
 * that webhook is missed — misconfigured endpoint, a delivery failure, an
 * account connected before the endpoint existed — the account is frozen in the
 * UI at whatever it looked like when it was created. A host whose second
 * account Stripe has since restricted sees "Verifying" forever, and the
 * listings paying into it quietly stop being publishable with no explanation.
 *
 * This is the deliberate, host-initiated refresh: it runs when the host opens
 * their payout settings, which is exactly the moment they want the truth and
 * exactly the moment a handful of API calls is affordable.
 *
 * Never throws. Accounts that cannot be read are reported and skipped — one
 * unreachable account must not cost the host the status of the others.
 *
 * @param {object} host a hydrated Host document
 * @returns {Promise<{host: object, refreshed: string[], failed: string[]}>}
 */
export async function refreshAllHostStripeAccounts(host) {
  if (!host) return { host, refreshed: [], failed: [] };

  const ids = [
    ...new Set(
      [host.stripeAccountId, ...(host.stripeAccounts || []).map((a) => a?.accountId)].filter(
        Boolean
      )
    ),
  ];

  if (!ids.length) return { host, refreshed: [], failed: [] };

  // `getStripe()` constructs the client and THROWS when STRIPE_SECRET_KEY is
  // absent or malformed. That is outside the per-account try below, so it
  // escaped this function despite the "never throws" contract above — and took
  // the whole payout-accounts response down with it, turning a missing
  // environment variable into "We couldn't load your payout accounts" with no
  // stored data shown and nothing naming the cause.
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("[stripe] client unavailable, serving cached account state:", err.message);
    return { host, refreshed: [], failed: ids, unavailable: true };
  }

  const refreshed = [];
  const failed = [];
  let current = host;

  for (const accountId of ids) {
    try {
      const account = await stripe.accounts.retrieve(accountId);

      // An account created under a different platform key comes back without
      // our `host_id`, and `syncHostFromStripeAccount` would then look it up by
      // `stripeAccountId` and miss a non-default account entirely. Filling the
      // id in keeps the sync pointed at the host we already have in hand.
      if (!account.metadata?.host_id) {
        account.metadata = { ...(account.metadata || {}), host_id: host._id.toString() };
      }

      current = (await syncHostFromStripeAccount(account)) || current;
      refreshed.push(accountId);
    } catch (err) {
      failed.push(accountId);
      logStripeCall(
        "accounts.retrieve",
        { hostId: host._id?.toString(), accountId, reason: "payout_settings_refresh" },
        "error",
        err
      );
    }
  }

  return { host: current, refreshed, failed };
}
