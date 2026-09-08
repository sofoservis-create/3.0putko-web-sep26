// utils/listingStatus.js
//
// A listing's lifecycle, driven entirely by the host's Stripe account.
//
//   DRAFT      details saved, no Stripe account linked yet
//   PENDING    account linked, Stripe still verifying
//   PUBLISHED  Stripe reports charges_enabled AND payouts_enabled
//
// This replaces the two ENFORCE_* environment flags. Those were a rollout
// switch — a single boolean that either blocked every un-onboarded host or none
// of them — and they had to be left off, because turning them on hid most of the
// catalogue. A per-listing status says the same thing with the granularity the
// situation actually needs: each listing goes live the moment its own host is
// finished, and nobody has to flip anything.
//
// The status is never set by hand. It is recomputed from the host's Stripe
// capabilities whenever those change — chiefly on the `account.updated` webhook,
// which is the only reliable signal that onboarding finished.

import {
  resolvePayoutAccount,
  isAccountPayoutReady,
  listPayoutAccounts,
} from "./payoutAccounts.js";
import { REQUEST_MODE } from "./requestToBook.js";

export const LISTING_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
};

/**
 * The status a listing should have, given its host.
 *
 * Reads the same two booleans the payout gate reads, and nothing else.
 * `onboardingComplete` is deliberately ignored: it is derived from these two,
 * and is absent on host documents that predate the webhook — reading it would
 * make a finished host look unfinished.
 *
 * Works on a lean object as well as a hydrated document.
 *
 * @param {object|null} host
 * @returns {'DRAFT'|'PENDING'|'PUBLISHED'}
 */
export function listingStatusForHost(host) {
  if (!host?.stripeAccountId) return LISTING_STATUS.DRAFT;

  // Routed through the same readiness rule the per-listing version uses, rather
  // than re-testing the booleans here. It used to read
  // `chargesEnabled && payoutsEnabled` directly, which stops being true for
  // every host onboarded after `card_payments` was dropped from account
  // creation — their accounts are perfectly good transfer destinations with
  // `charges_enabled: false`, and this would have left the whole catalogue
  // PENDING. See utils/payoutAccounts.js -> isAccountPayoutReady.
  const defaultAccount = listPayoutAccounts(host).find((a) => a.isDefault);
  if (isAccountPayoutReady(defaultAccount)) return LISTING_STATUS.PUBLISHED;
  return LISTING_STATUS.PENDING;
}

/**
 * The status of ONE listing, from the account that listing actually pays out to.
 *
 * This is the version that matters once a host holds several accounts: two of
 * their properties can legitimately be in different states, because a newly
 * connected account is still verifying while an older one is long since live.
 * `listingStatusForHost` above answers the host-level question and is the
 * fallback for a listing that names no account of its own.
 *
 * @param {object|null} accommodation
 * @param {object|null} host
 */
export function listingStatusFor(accommodation, host) {
  const account = resolvePayoutAccount(accommodation, host);
  if (!account?.accountId) return LISTING_STATUS.DRAFT;
  if (isAccountPayoutReady(account)) return LISTING_STATUS.PUBLISHED;
  return LISTING_STATUS.PENDING;
}

/**
 * Is this listing live — visible in search and bookable?
 *
 * The listing's own `stripeEnabled` switch still applies on top: a host may
 * take a finished listing off sale without disconnecting their account.
 */
export function isListingLive(accommodation) {
  return (
    accommodation?.listingStatus === LISTING_STATUS.PUBLISHED &&
    accommodation?.stripeEnabled !== false
  );
}

/**
 * What Stripe is still waiting for, when the status is PENDING.
 * Shown to the HOST only — it names document types, never their contents.
 */
export function pendingRequirementsOf(host, accommodation = null) {
  // Per-account when the listing names one — with several accounts, the host's
  // aggregate requirements would name documents for an account this listing has
  // nothing to do with.
  const account = resolvePayoutAccount(accommodation, host);
  if (account?.requirementsDue?.length) return account.requirementsDue;
  return Array.isArray(host?.stripeRequirementsDue) ? host.stripeRequirementsDue : [];
}

/**
 * The mongo filter for "listings a guest may see in search".
 *
 * Only the `unonboarded` mode widens this. There, a listing whose host is still
 * onboarding must stay VISIBLE — that is the entire point of the flow: a real
 * booking request with a real amount is what finally gets the host to connect an
 * account, and they cannot receive one if nobody can see the listing. It simply
 * cannot be booked instantly; the button offers a request instead.
 *
 * In `off` and `published` alike, only PUBLISHED listings are returned, which is
 * the plain reading of "the listing does not go live until Stripe is finished".
 * `published` changes how a live listing is BOOKED, not which listings are live.
 *
 * @param {string} mode one of REQUEST_MODE
 */
export function searchVisibilityFilter(mode) {
  if (mode === REQUEST_MODE.UNONBOARDED) {
    return {
      listingStatus: {
        $in: [LISTING_STATUS.PUBLISHED, LISTING_STATUS.PENDING, LISTING_STATUS.DRAFT],
      },
    };
  }
  return { listingStatus: LISTING_STATUS.PUBLISHED };
}
