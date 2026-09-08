// utils/stripeHelpers.js
import Stripe from "stripe";
import { logExternalCall } from "./auditLog.js";

let cachedClient = null;

/** Shared Stripe client — avoids re-instantiating on every request. */
export function getStripe() {
  if (!cachedClient) {
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return cachedClient;
}

/**
 * Structured audit log for every Stripe call.
 * Thin wrapper over the shared logger in `utils/auditLog.js`, so Stripe and
 * SuperFaktúra calls land in one greppable stream and in the same shape.
 */
export function logStripeCall(operation, context = {}, outcome = "ok", error = null) {
  return logExternalCall("stripe", operation, context, outcome, error);
}

/**
 * Resolve the charge behind a PaymentIntent and its Stripe processing fee.
 *
 * Older code expanded `charges.data[0]`, which no longer exists on recent Stripe
 * API versions — the PaymentIntent exposes `latest_charge` instead. That silently
 * yielded a fee of 0 and therefore a wrong host payout. This handles both shapes.
 *
 * @returns {{ charge: object|null, stripeFeeCents: number }}
 */
export async function resolveChargeAndFee(stripe, paymentIntentOrId) {
  let paymentIntent = paymentIntentOrId;

  if (typeof paymentIntentOrId === "string") {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentOrId, {
      expand: ["latest_charge.balance_transaction"],
    });
  }

  let charge = null;

  // Current API shape.
  if (paymentIntent?.latest_charge) {
    charge =
      typeof paymentIntent.latest_charge === "string"
        ? await stripe.charges.retrieve(paymentIntent.latest_charge, {
            expand: ["balance_transaction"],
          })
        : paymentIntent.latest_charge;
  }

  // Legacy API shape, kept so older expanded objects still work.
  if (!charge && paymentIntent?.charges?.data?.length) {
    charge = paymentIntent.charges.data[0];
  }

  if (!charge) return { charge: null, stripeFeeCents: 0 };

  let stripeFeeCents = 0;
  const bt = charge.balance_transaction;

  if (bt && typeof bt === "object" && bt.fee != null) {
    stripeFeeCents = Math.round(bt.fee);
  } else if (typeof bt === "string") {
    const fetched = await stripe.balanceTransactions.retrieve(bt);
    stripeFeeCents = Math.round(fetched?.fee || 0);
  }

  return { charge, stripeFeeCents };
}

/** Gross amount actually captured for a PaymentIntent, in cents. */
export function capturedAmountCents(paymentIntent) {
  return Math.round(
    paymentIntent?.amount_received || paymentIntent?.amount || 0
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connected account shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merchant category for short-term accommodation. Sent at account creation so
 * Stripe does not put `business_profile.mcc` on the host's to-do list.
 */
export const CONNECT_MCC = process.env.STRIPE_CONNECT_MCC || "7011";

/**
 * `CLIENT_SITE_URL`, but only when Stripe would actually accept it.
 *
 * `business_profile.url` must be a reachable public https URL. In development
 * CLIENT_SITE_URL is http://localhost:3000, which Stripe rejects outright — and
 * a rejected create call is a host who cannot onboard at all. Omitting the field
 * is harmless: Stripe then asks for it during onboarding, exactly as it did
 * before this was set at all.
 */
function publicSiteUrl() {
  const raw = (process.env.CLIENT_SITE_URL || "").trim();
  if (!/^https:\/\//i.test(raw)) return null;

  try {
    const { hostname } = new URL(raw);
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
    ) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * The payload for `accounts.create`, shared by every path that connects a host.
 *
 * Two decisions here are the whole reason accounts kept coming back RESTRICTED,
 * and both are about asking Stripe for less than we used to.
 *
 * 1. ONLY the `transfers` capability is requested.
 *
 *    Putko takes the guest's money on the PLATFORM account — the Checkout
 *    Session in `createCheckoutSession` carries no `transfer_data`, no
 *    `on_behalf_of` and no connected-account header — and moves the host's share
 *    afterwards with `transfers.create({ destination })`. That is "separate
 *    charges and transfers", and in it the connected account never processes a
 *    card payment.
 *
 *    Requesting `card_payments` anyway told Stripe to treat every host as a
 *    card-accepting merchant, which pulls in the full merchant verification set
 *    — company registration, ownership declaration, directors, card-acceptance
 *    terms. Those land in `requirements.currently_due`, and an account with
 *    outstanding requirements is exactly what the Stripe dashboard labels
 *    "Restricted". Hosts were being asked to prove things about a payment method
 *    they were never going to accept, and the ones who could not simply stopped.
 *
 *    Dropping it leaves identity and bank details, which is all a transfer
 *    destination actually needs.
 *
 * 2. `business_type` is NOT set.
 *
 *    It used to be guessed as `host.companyName ? "company" : "individual"`.
 *    `companyName` is free-text profile data that plenty of sole traders fill
 *    in, and guessing "company" makes Stripe demand company registration
 *    documents and a directors list that an individual cannot produce — a dead
 *    end with no way back, because the type cannot be changed from inside the
 *    Express form. Leaving it unset makes the first question of onboarding "are
 *    you an individual or a business?", answered by the one party who knows.
 *
 * `business_profile` is prefilled for the opposite reason: those fields are
 * required, we already know them, and anything supplied here is one less item on
 * the host's list.
 *
 * @param {object} host the Host document being connected
 * @param {{country?: string, email?: string}} options
 */
export function connectedAccountCreateParams(host, { country, email } = {}) {
  // Stripe rules on the country, not us: `host.countryCode` is free-text profile
  // data ("PAKISTAN", "PA") and driving creation from it produced errors the
  // host had no way to get past. An explicit request wins; otherwise Putko's own
  // jurisdiction.
  const requested = (country || "").trim().toUpperCase() || "SK";

  const businessProfile = {
    mcc: CONNECT_MCC,
    product_description:
      "Short-term accommodation rental booked through the Putko marketplace.",
  };

  const url = publicSiteUrl();
  if (url) businessProfile.url = url;

  return {
    type: "express",
    country: requested,
    email: email || host?.email,
    capabilities: { transfers: { requested: true } },
    business_profile: businessProfile,
    // Lets account.updated find the host without a DB lookup by account id.
    metadata: { host_id: String(host?._id || "") },
  };
}

/**
 * Stripe's `requirements.disabled_reason` values that mean "we are looking at
 * it", as opposed to "the host must do something".
 *
 * The distinction matters because the two need opposite messages: one says sit
 * tight, the other says go back into onboarding. Showing "action needed" to a
 * host who is merely waiting on Stripe's review sends them round the form again
 * to change nothing.
 */
const REVIEW_DISABLED_REASONS = new Set([
  "requirements.pending_verification",
  "under_review",
]);

/**
 * The full state of a connected account, as Putko needs to store and show it.
 *
 * Everything here comes off one `Account` object. Previously only
 * `charges_enabled`, `payouts_enabled` and `currently_due` were read, which is
 * why a restricted account showed up in the UI as an ordinary "Verifying" with
 * an empty list of requirements — the fields that say WHY (`disabled_reason`,
 * `past_due`, `errors`) were never looked at, so the host was told nothing and
 * had nothing to act on.
 *
 * @param {object} account a Stripe Account object
 */
export function describeAccountState(account) {
  const requirements = account?.requirements || {};
  const future = account?.future_requirements || {};

  const transfersActive = account?.capabilities?.transfers === "active";
  const payoutsEnabled = Boolean(account?.payouts_enabled);
  const chargesEnabled = Boolean(account?.charges_enabled);

  const currentlyDue = requirements.currently_due || [];
  const pastDue = requirements.past_due || [];
  const pendingVerification = requirements.pending_verification || [];
  const eventuallyDue = requirements.eventually_due || [];
  const disabledReason = requirements.disabled_reason || null;

  // Stripe names the offending field AND why it was rejected ("the document is
  // expired", "the name does not match"). Without this the host re-uploads the
  // same unusable document and waits again.
  const errors = (requirements.errors || []).map((e) => ({
    requirement: e.requirement,
    code: e.code,
    reason: e.reason,
  }));

  const underReview = REVIEW_DISABLED_REASONS.has(disabledReason);

  let state;
  if (payoutsEnabled && transfersActive) {
    state = "active";
  } else if ((disabledReason && !underReview) || pastDue.length) {
    state = "restricted";
  } else if (currentlyDue.length) {
    state = "pending";
  } else if (pendingVerification.length || underReview) {
    state = "verifying";
  } else {
    state = "pending";
  }

  return {
    state,
    transfersActive,
    payoutsEnabled,
    chargesEnabled,
    currentlyDue,
    pastDue,
    pendingVerification,
    eventuallyDue,
    disabledReason,
    errors,
    currentDeadline: requirements.current_deadline
      ? new Date(requirements.current_deadline * 1000)
      : null,
    // Requirements that only bite after a future date. Surfaced so a host can
    // clear them before the deadline turns them into a restriction, which is the
    // single most common way an already-working account goes bad.
    futureDue: future.currently_due || [],
    futureDeadline: future.current_deadline
      ? new Date(future.current_deadline * 1000)
      : null,
    // Whether returning to the Stripe form would actually achieve anything.
    actionRequired: Boolean(currentlyDue.length || pastDue.length || errors.length),
  };
}
