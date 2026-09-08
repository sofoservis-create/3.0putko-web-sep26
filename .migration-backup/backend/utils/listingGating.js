// utils/listingGating.js
//
// A listing must not be publishable — and must not be bookable — until the host
// can actually be paid, and until Putko holds the billing details it needs to
// invoice its own fee.
//
// Both gates are ENFORCED FOR EVERY HOST, with no grandfathering: a host whose
// Stripe onboarding is finished AND whose billing details are on file can take
// bookings; every other host's Reserve button stays disabled. The env vars remain
// so the gates can be switched off in an emergency, but they now default to ON.

import Host from "../models/Host.js";
import { isBillingCompleteFor, missingBillingFieldsOf } from "./hostBilling.js";
import { ensureHostStripeStatusFresh } from "./hostStripeSync.js";
import { listingStatusForHost } from "./listingStatus.js";
import {
  listPayoutAccounts,
  isAccountPayoutReady,
  payoutStateOf,
} from "./payoutAccounts.js";

// ENFORCE_LISTING_PUBLISH_GATING and ENFORCE_BOOKING_HOST_GATING used to live
// here. Both are gone: they were a single all-or-nothing rollout switch, which
// meant the only safe setting was "off" — turning either on hid or blocked
// almost the whole catalogue at once, so in practice neither gate ever ran.
//
// A per-listing status replaces them (utils/listingStatus.js). Each listing
// publishes itself the moment its own host finishes Stripe, so there is nothing
// left to enforce globally and nothing to switch on. The rules below are now
// unconditional.

/**
 * May this host take a booking right now?
 *
 * Three requirements:
 *
 *   1. a connected Stripe account exists, so there is somewhere to send the money
 *   2. Stripe has actually ENABLED that account for charges and payouts — i.e.
 *      onboarding is genuinely finished, not merely started
 *   3. billing details are complete, so the fee deducted from that money can be
 *      invoiced — paying out a fee that can never be invoiced is the failure the
 *      monthly run records as `missing_host_billing_details`
 *
 * On (2): `chargesEnabled` / `payoutsEnabled` are a CACHE of what Stripe last
 * told us, written only by `syncHostFromStripeAccount`. They are ABSENT on host
 * documents that predate the webhook, and absent is indistinguishable from false
 * here — so this check fails CLOSED and the caller is expected to have run
 * `ensureHostStripeStatusFresh` first, which repopulates them from the Stripe API
 * for any host that would otherwise be wrongly blocked. That is what makes
 * requiring real onboarding completion safe rather than a mass lockout.
 *
 * `onboardingComplete` is not read directly: it is derived from the same two
 * booleans, and reading the inputs avoids depending on a third field that may
 * have been written by an older code path.
 *
 * Works on a lean object as well as a hydrated document, so it is safe to call
 * on a populated `.lean()` result where schema methods are unavailable.
 *
 * @param {object|null} host
 * @returns {boolean} always a real boolean, never undefined
 */
export function isHostBookingReady(host) {
  return hostBookingBlockers(host).length === 0;
}

/**
 * Why this host cannot take a booking, as machine-readable reasons.
 *
 * Same rule as `isHostBookingReady` — that function is defined in terms of this
 * one, so the boolean and the explanation can never disagree.
 *
 * @param {object|null} host
 * @returns {string[]} empty when the host is bookable
 */
export function hostBookingBlockers(host) {
  if (!host) return ["host_not_found"];

  const blockers = [];

  if (!host.stripeAccountId) {
    blockers.push("stripe_not_connected");
  } else {
    // The host's DEFAULT account, judged by the one shared readiness rule.
    //
    // This used to test `chargesEnabled` and `payoutsEnabled` directly. That is
    // wrong for every account connected since `card_payments` was dropped:
    // Putko charges on the platform and transfers to the host, so those
    // accounts are fully working with `charges_enabled: false`, and the old
    // check would have blocked every one of them permanently.
    //
    // Still fails closed on absent fields — see the note above — and callers are
    // still expected to have run `ensureHostStripeStatusFresh` first.
    const account = listPayoutAccounts(host).find((a) => a.isDefault);

    if (!isAccountPayoutReady(account)) {
      // A restriction is a different problem from unfinished onboarding, and
      // needs a different instruction: "go and finish the form" is useless to a
      // host whose account Stripe has suspended pending a document review.
      if (payoutStateOf(account) === "restricted") {
        blockers.push("stripe_account_restricted");
      } else {
        blockers.push("stripe_payouts_disabled");
      }
    }
  }

  if (!isBillingCompleteFor(host)) blockers.push("billing_details_incomplete");

  return blockers;
}

/**
 * Whether this host may publish a listing.
 *
 * Same rule as the booking gate — a listing that could go live but could not be
 * booked would be a listing that takes no money, so there is no reason for the
 * two to differ. Stale Stripe status is refreshed first, so a host who finished
 * onboarding before the webhook existed is not told to "finish onboarding".
 *
 * @returns {{ ready: boolean, reasons: string[], details: object }}
 */
export async function checkListingPublishReadiness(hostId) {
  if (!hostId) {
    return { ready: false, reasons: ["host_not_found"], details: {} };
  }

  let host = await Host.findById(hostId);
  if (!host) {
    return { ready: false, reasons: ["host_not_found"], details: {} };
  }

  // Only when the host would otherwise be refused: a host who already passes
  // costs no Stripe call.
  if (hostBookingBlockers(host).length) {
    host = await ensureHostStripeStatusFresh(host);
  }

  const reasons = hostBookingBlockers(host);
  const missingBilling = missingBillingFieldsOf(host);
  const defaultAccount = listPayoutAccounts(host).find((a) => a.isDefault);

  return {
    ready: reasons.length === 0,
    reasons,
    details: {
      stripeAccountId: host.stripeAccountId || null,
      onboardingComplete: isAccountPayoutReady(defaultAccount),
      chargesEnabled: Boolean(host.chargesEnabled),
      payoutsEnabled: Boolean(host.payoutsEnabled),
      transfersActive: Boolean(defaultAccount?.transfersActive),
      // So a caller can tell "still filling in the form" apart from "Stripe has
      // suspended this account", which need opposite instructions.
      payoutState: payoutStateOf(defaultAccount),
      disabledReason: defaultAccount?.disabledReason || null,
      missingBillingFields: missingBilling,
      requirementsDue: host.stripeRequirementsDue || [],
      // The listing lifecycle this host's readiness produces, so a caller can
      // report status without re-deriving the rule.
      listingStatus: listingStatusForHost(host),
    },
  };
}

/**
 * Host-facing wording for each blocker code.
 *
 * `stripe_charges_disabled` / `stripe_payouts_disabled` mean the account exists
 * but Stripe has not enabled it, which for almost every host means onboarding was
 * started and abandoned part-way. The message says that rather than naming the
 * capability, because "charges are disabled" is not something a host can act on.
 */
const BLOCKER_MESSAGES = {
  host_not_found: "Host account not found",
  stripe_not_connected: "Connect your Stripe account",
  // Kept for host documents still carrying the old code from a cached response.
  stripe_charges_disabled: "Finish Stripe onboarding — Stripe has not enabled payments yet",
  stripe_payouts_disabled: "Finish Stripe onboarding — Stripe has not enabled payouts yet",
  stripe_account_restricted:
    "Stripe has restricted your payout account — open payout settings to see what it needs",
  billing_details_incomplete: "Complete your billing details (IČO, DIČ and address)",
};

/** Human-readable message for a set of blocker codes. */
export function describeBlockers(reasons = []) {
  return reasons.map((r) => BLOCKER_MESSAGES[r] || r).join("; ");
}

/**
 * Human-readable message for a readiness result.
 *
 * Phrased as "guests cannot book yet", not "cannot be published": creating and
 * editing a listing is always allowed, and the only thing readiness withholds is
 * the Reserve button. Telling a host their listing is blocked when they can see
 * it in their dashboard would just be confusing.
 */
export function publishBlockedMessage(readiness) {
  const detail = describeBlockers(readiness.reasons);
  return detail
    ? `Guests cannot book this listing yet. ${detail}.`
    : "Guests cannot book this listing yet.";
}
