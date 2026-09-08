// utils/requestToBook.js
//
// "Request to book" — a booking that takes no card up front.
//
// The guest sends dates, party size and an email; nothing is charged. The host
// is told what is waiting for them, accepts, and only then does the guest get a
// payment link. From the payment onward it is the ordinary booking flow.
//
// The same machinery serves two quite different purposes, and which one is in
// play is chosen by REQUEST_TO_BOOK_MODE:
//
//   1. Getting un-onboarded hosts onboarded. Their listings cannot take a
//      payment — there is nowhere to send it, and refunding the guest still
//      costs Putko the Stripe fee, which Stripe does not return. Rather than a
//      dead listing, the guest can send a request, and the host is emailed a
//      real booking with a real amount. "You have a €340 booking" is a far
//      stronger reason to finish onboarding than a reminder to complete a
//      profile.
//
//   2. Letting onboarded hosts vet guests. Nothing here is about onboarding —
//      the host can already be paid. They simply want to see who is asking
//      before the money moves, the way Airbnb's "Request to Book" works next to
//      Instant Book.
//
// The flows are identical; only who they apply to, and what the host is told,
// differ.
//
// Note that `unonboarded` applies to EVERY listing, not only to listings whose
// host is un-onboarded — the mode is named for the problem it was built to
// solve, not for the subset it touches. An onboarded host on that mode is
// simply in case 2: they get the vetting message and approve as normal.

import { isHostBookingReady } from "./listingGating.js";

/** The three settings REQUEST_TO_BOOK_MODE may take. */
export const REQUEST_MODE = {
  /** Nobody uses requests. A PUBLISHED listing takes payment at checkout;
   *  DRAFT and PENDING show a disabled button. */
  OFF: "off",
  /** EVERY listing takes requests — DRAFT, PENDING and PUBLISHED alike.
   *  Named for the problem it solves (purpose 1 above), not for the subset it
   *  applies to: the un-onboarded host is why the flow exists, but the whole
   *  catalogue runs on it so that every listing page makes the same promise. */
  UNONBOARDED: "unonboarded",
  /** PUBLISHED listings take requests (purpose 2 above);
   *  DRAFT and PENDING stay disabled, exactly as in OFF. */
  PUBLISHED: "published",
};

/**
 * `true` and `false` are accepted as aliases so an existing deployment keeps
 * working without an edit: `true` was the un-onboarded flow, `false` was off.
 */
const parseMode = (raw) => {
  const value = String(raw ?? "").trim().toLowerCase();

  if (value === "true" || value === "1") return REQUEST_MODE.UNONBOARDED;
  if (value === "false" || value === "0" || value === "") return REQUEST_MODE.OFF;

  const known = Object.values(REQUEST_MODE);
  if (known.includes(value)) return value;

  // An unrecognised value must not silently pick a behaviour. Off is the one
  // that changes nothing about how money is taken.
  console.warn(
    `[request-to-book] REQUEST_TO_BOOK_MODE="${raw}" is not one of ` +
      `${known.join(" | ")} (or true/false) — falling back to "off".`
  );
  return REQUEST_MODE.OFF;
};

export const REQUEST_TO_BOOK_MODE = parseMode(process.env.REQUEST_TO_BOOK_MODE);

/** Are requests in play at all? */
export const requestsEnabled = () => REQUEST_TO_BOOK_MODE !== REQUEST_MODE.OFF;

/** How long a host has to respond before the request lapses. */
export const REQUEST_EXPIRY_HOURS = Number(process.env.REQUEST_EXPIRY_HOURS || 48);

/** How long the guest's payment link stays valid once the host approves. */
export const PAYMENT_LINK_HOURS = Number(process.env.REQUEST_PAYMENT_LINK_HOURS || 24);

/**
 * Which flow this booking takes: pay now, or ask first.
 *
 * Reads the host's readiness directly rather than the listing's PUBLISHED
 * status, because the two answer different questions — the status decides
 * whether a listing is live, this decides what its button does.
 *
 * Note what happens to the side that is NOT taking requests in each mode. It
 * returns "instant", which is not a promise that a payment can be taken: for an
 * un-onboarded host `bookable` is false and the button stays disabled. "instant"
 * only means "not a request".
 *
 * @param {object|null} host
 * @returns {'instant'|'request'}
 */
export function bookingModeForHost(host) {
  const ready = isHostBookingReady(host);

  switch (REQUEST_TO_BOOK_MODE) {
    case REQUEST_MODE.UNONBOARDED:
      // EVERY listing takes requests — DRAFT, PENDING and PUBLISHED alike.
      //
      // The un-onboarded host is the reason this mode exists, but splitting the
      // catalogue by readiness bought nothing and cost something: two guests
      // looking at two listings on the same day met two different checkouts,
      // and a host who finished onboarding mid-stream watched their listing
      // silently change how it books. One flow for everyone is the same promise
      // on every listing page, and it is the ready host who loses least by it —
      // they approve and the guest is paying within the minute.
      //
      // `ready` still decides what the host is TOLD (requestPurposeForHost
      // below): onboarding steps for a host who cannot be paid, plain approve
      // or decline for one who can.
      return "request";

    case REQUEST_MODE.PUBLISHED:
      // The mirror image: hosts who CAN be paid take requests, so they can vet
      // the guest first. Hosts who cannot stay disabled rather than collecting
      // requests they are in no position to accept.
      return ready ? "request" : "instant";

    case REQUEST_MODE.OFF:
    default:
      return "instant";
  }
}

/**
 * Why the host is being asked to accept — which decides what the email says.
 *
 * 'onboarding' — they cannot be paid yet, and accepting means connecting an
 *                account first. The amount is the argument for doing it.
 * 'vetting'    — they can already be paid and are simply approving the guest.
 *
 * @param {object|null} host
 * @returns {'onboarding'|'vetting'}
 */
export function requestPurposeForHost(host) {
  return isHostBookingReady(host) ? "vetting" : "onboarding";
}

/** When a request created now should lapse. */
export const requestExpiryFrom = (from = new Date()) =>
  new Date(from.getTime() + REQUEST_EXPIRY_HOURS * 3600 * 1000);

/** When a payment link issued now should stop working. */
export const paymentLinkExpiryFrom = (from = new Date()) =>
  new Date(from.getTime() + PAYMENT_LINK_HOURS * 3600 * 1000);
