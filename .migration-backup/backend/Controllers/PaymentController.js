// Controllers/paymentController.js
import Reservation from "../models/Reservation.js";
import Accommodation from "../models/Accommodation.js";
import Host from "../models/Host.js";
import ProcessedWebhookEvent from "../models/ProcessedWebhookEvent.js";
import mongoose from "mongoose";
import { format, eachDayOfInterval } from 'date-fns';
import { sendEvent } from "../utils/FacebookCAPI.js";
import {
  calculateFees,
  buildFeeBreakdown,
  DEFAULT_CURRENCY,
  PAYOUT_DELAY_HOURS,
} from "../config/payments.js";
import {
  getStripe,
  logStripeCall,
  resolveChargeAndFee,
  capturedAmountCents,
  connectedAccountCreateParams,
  describeAccountState,
} from "../utils/stripeHelpers.js";
import { getTransporter, MAIL_FROM, alertAdmin } from "../utils/mailer.js";
import {
  brandShell,
  button,
  callout,
  detailTable,
  esc,
  section,
  heroImage,
  logoAttachments,
} from "../utils/emailLayout.js";
import { hoursSinceCheckIn } from "../utils/timezone.js";
import { getTiersSnapshot, getPolicyNameSnapshot } from "../utils/cancellationPolicy.js";
import { recordReservationForDac7 } from "../utils/dac7.js";
import { holdDates, releaseHold, confirmHold } from "../utils/calendarHold.js";
import { isHostBookingReady } from "../utils/listingGating.js";
import {
  listPayoutAccounts,
  resolvePayoutAccount,
  isAccountPayoutReady,
  payoutStateOf,
} from "../utils/payoutAccounts.js";
import { missingBillingFieldsOf } from "../utils/hostBilling.js";
import {
  syncHostFromStripeAccount,
  refreshAllHostStripeAccounts,
  syncListingStatusForHost,
} from "../utils/hostStripeSync.js";

// Moved to utils/hostStripeSync.js so the booking gate can call it without
// closing an import cycle (listingGating -> PaymentController -> listingGating).
// Re-exported here because this was its public home.
export { syncHostFromStripeAccount };

/**
 * Ensure a reservation carries its cancellation-policy snapshot and cents
 * amount before it can be paid for. Reservations created through older paths
 * (or before this feature existed) get backfilled here — from the listing as it
 * is right now, which is still before the guest has paid anything.
 */
export const ensureBookingSnapshot = async (reservation) => {
  let dirty = false;

  if (!reservation.totalPriceCents) {
    reservation.totalPriceCents = Math.round((Number(reservation.totalPrice) || 0) * 100);
    dirty = true;
  }
  if (!reservation.currency) {
    reservation.currency = DEFAULT_CURRENCY;
    dirty = true;
  }

  if (!reservation.cancellationTiersSnapshot?.length) {
    const listing = await Accommodation.findById(reservation.accommodationId).select(
      "cancellationPolicyType customPolicyTiers"
    );
    reservation.cancellationPolicySnapshot = getPolicyNameSnapshot(listing);
    reservation.cancellationTiersSnapshot = getTiersSnapshot(listing);
    dirty = true;
  }

  // Expected fees, known before payment so the host can be shown what they get.
  if (reservation.platformFeeCents == null) {
    const { platformFeeCents, hostPayoutCents } = calculateFees(reservation.totalPriceCents);
    reservation.platformFeeCents = platformFeeCents;
    reservation.hostAmountCents = hostPayoutCents;
    dirty = true;
  }

  if (dirty) await reservation.save();
  return reservation;
};

/**
 * Build a Checkout Session for a reservation.
 *
 * THE single place a checkout is created. A second, hand-rolled copy used to
 * live in ReservationController's host-approval flow and had drifted badly: it
 * pinned `payment_method_types: ["card"]` (killing Apple Pay and Google Pay),
 * omitted `payment_intent_data.metadata` (so charge-level webhooks could not
 * identify the booking), skipped the locale mapping, skipped the snapshot
 * backfill, and emitted no audit line at all. Everything now routes here.
 *
 * @param {object} reservation  a Reservation document (mutated and saved)
 * @param {object} context      { language, fbp, fbc, userAgent, ip }
 * @returns {{ session: object, amountCents: number }}
 */
export const buildCheckoutSession = async (reservation, context = {}) => {
  const stripe = getStripe();

  await ensureBookingSnapshot(reservation);

  const amountCents =
    reservation.totalPriceCents || Math.round((reservation.totalPrice || 0) * 100);
  if (!amountCents || amountCents <= 0) {
    const err = new Error("Invalid amount");
    err.code = "invalid_amount";
    throw err;
  }

  // A disabled Reserve button is cosmetic: it stops a guest clicking, not a
  // direct POST to this endpoint, a stale tab, or a payment link mailed before
  // the host's account lapsed. Refuse here too, so the rule holds wherever the
  // checkout is started from.
  //
  // Unconditional since the ENFORCE_* flags were removed. Taking the money is
  // the irreversible half of this transaction, so the refusal happens BEFORE
  // the calendar hold below, leaving the dates on the market.
  //
  // This is not a duplicate of the listing status check: a listing can be
  // PUBLISHED when the session is created and its host's account restricted by
  // the time the guest pays, and a payment link mailed days ago outlives any
  // check made when it was issued.
  {
    const { host, conflict } = await resolveHostForReservation(reservation);
    if (conflict || !isHostBookingReady(host)) {
      const err = new Error(
        "This property cannot take bookings at the moment — the host has not finished setting up payments."
      );
      err.code = "host_not_payout_ready";
      throw err;
    }
  }

  const language = context.language || reservation.language || "sk";
  const stripeLocaleMap = { en: "en", sk: "sk" };
  const locale = stripeLocaleMap[language] || "auto";

  const listingId = String(
    reservation.accommodationId?._id || reservation.accommodationId || ""
  );
  const hostId = reservation.accommodationProvider?.toString() || "";

  // Take the dates before sending the guest to Stripe. Without this the
  // calendar was only written once payment settled, so two guests could be
  // paying for the same nights at the same time.
  const hold = await holdDates(reservation);
  if (!hold.ok) {
    const err = new Error(
      hold.reason === "dates_unavailable"
        ? "Those dates have just been taken"
        : "Could not reserve those dates"
    );
    err.code = hold.reason;
    err.conflictDays = hold.conflictDays;
    throw err;
  }

  // A session started from the browser uses Stripe's default lifetime. One that
  // is EMAILED — the payment link a host's approval sends — has to outlive the
  // tab, so the caller can widen the window. Stripe caps this at 24 hours.
  const expiresInHours = Number(context.expiresInHours) || 0;
  const expiresAt = expiresInHours
    ? Math.floor(Date.now() / 1000) + Math.min(expiresInHours, 24) * 3600
    : undefined;

  const session = await stripe.checkout.sessions.create({
    ...(expiresAt ? { expires_at: expiresAt } : {}),
    // payment_method_types is deliberately omitted. Pinning it to ["card"]
    // disables Apple Pay and Google Pay. Omitting it makes Checkout use whatever
    // is enabled in the Stripe Dashboard, which includes the wallets.
    // (automatic_payment_methods is a PaymentIntent-only param — sending it here
    // would be rejected.)
    mode: "payment",
    locale,
    customer_email: reservation.email,
    line_items: [
      {
        price_data: {
          currency: reservation.currency || DEFAULT_CURRENCY,
          product_data: {
            name: `Reservation #${reservation._id} - ${reservation.name}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      reservationId: reservation._id.toString(),
      hostId,
      listingId,
      language,
      fbp: context.fbp || "",
      fbc: context.fbc || "",
      userAgent: context.userAgent || "",
      ip: context.ip || "",
    },
    // The Checkout Session's metadata does not propagate to the charge, so
    // refund/dispute webhooks (which carry a charge, not a session) could not
    // identify the reservation. Copying it onto the PaymentIntent fixes that.
    payment_intent_data: {
      metadata: {
        reservationId: reservation._id.toString(),
        hostId,
        listingId,
      },
    },
    success_url: `${process.env.CLIENT_SITE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_SITE_URL}/payment-cancel`,
  });

  logStripeCall("checkout.sessions.create", {
    reservationId: reservation._id.toString(),
    amountCents,
    sessionId: session.id,
  });

  reservation.checkoutSessionId = session.id;
  reservation.paymentStatus = "unpaid";
  await reservation.save();

  return { session, amountCents };
};

// Create Stripe Checkout Session (guest pays)
export const createCheckoutSession = async (req, res) => {
  try {
    const { reservationId, language, fbp, fbc } = req.body;
    if (!reservationId) return res.status(400).json({ error: "reservationId required" });

    // Loaded and access-checked by requireReservationAccess where available.
    const reservation = req.reservation || (await Reservation.findById(reservationId));
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });

    const { session } = await buildCheckoutSession(reservation, {
      language,
      fbp,
      fbc,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.connection?.remoteAddress,
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    if (err.code === "invalid_amount") {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (err.code === "dates_unavailable") {
      // 409, not 500: the request was well formed, someone else simply got
      // there first. The client should offer different dates.
      return res.status(409).json({
        error: err.message,
        code: err.code,
        conflictDays: err.conflictDays || [],
      });
    }
    if (err.code === "listing_not_found") {
      return res.status(404).json({ error: "Accommodation not found" });
    }
    // 409, not 400: the request is well formed and the guest did nothing wrong —
    // the listing is simply not in a state where it can be paid for.
    if (err.code === "host_not_payout_ready") {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    console.error("createCheckoutSession error:", err);
    logStripeCall("checkout.sessions.create", { reservationId: req.body?.reservationId }, "error", err);
    res.status(500).json({ error: err.message || "Failed to create session" });
  }
};

// Webhook handler (must run with raw body)
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  const stripe = getStripe();

  try {
    // req.body must be raw Buffer (see route setup)
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // --- Idempotency ---
  // Claim the event first. The unique index on stripeEventId makes this atomic,
  // so a duplicate delivery (Stripe retries anything that is not 2xx) loses the
  // race and returns early instead of re-running the handler.
  let claim;
  try {
    claim = await ProcessedWebhookEvent.create({
      stripeEventId: event.id,
      eventType: event.type,
      status: "processing",
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.json({ received: true, duplicate: true });
    }
    console.error("Webhook idempotency claim failed:", err);
    return res.status(500).send();
  }

  try {
    await handleStripeEvent(stripe, event);

    claim.status = "completed";
    claim.processedAt = new Date();
    await claim.save();

    res.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook event:", err);
    logStripeCall("webhook.handle", { eventId: event.id, eventType: event.type }, "error", err);

    // Release the claim so Stripe's retry can genuinely reprocess the event
    // rather than being swallowed as a duplicate.
    try {
      await ProcessedWebhookEvent.deleteOne({ _id: claim._id });
    } catch (cleanupErr) {
      console.error("Failed to release webhook claim:", cleanupErr.message);
    }

    res.status(500).send();
  }
};

/** Event dispatch, split out so the idempotency wrapper stays readable. */
async function handleStripeEvent(stripe, event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const reservationId = session.metadata?.reservationId;

      if (!reservationId || !mongoose.Types.ObjectId.isValid(reservationId)) {
        console.warn("checkout.session.completed: reservationId missing or invalid in metadata");
        break;
      }

      await applyPaidCheckoutSession(stripe, session, { source: "webhook" });
      break;
    }

    // Payment never completed: free the dates so the listing is bookable again.
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const reservationId = paymentIntent.metadata?.reservationId;
      if (!reservationId || !mongoose.Types.ObjectId.isValid(reservationId)) break;

      const reservation = await Reservation.findById(reservationId);
      // Never downgrade a booking that has already been paid for.
      if (!reservation || reservation.paymentStatus === "paid") break;

      reservation.paymentStatus = "unpaid";
      reservation.isApproved = "pending";
      await reservation.save();

      await releaseCalendarForReservation(reservation);
      logStripeCall("payment.failed", {
        reservationId,
        reason: paymentIntent.last_payment_error?.message,
      });
      break;
    }

    // The only reliable signal for host onboarding progress.
    case "account.updated": {
      const account = event.data.object;
      await syncHostFromStripeAccount(account);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const reservationId =
        charge.metadata?.reservationId ||
        (charge.payment_intent
          ? (await Reservation.findOne({ paymentIntentId: charge.payment_intent }).select("_id"))?._id?.toString()
          : null);

      if (!reservationId) break;

      const refundedCents = Math.round(charge.amount_refunded || 0);
      const totalCents = Math.round(charge.amount || 0);

      await Reservation.findByIdAndUpdate(reservationId, {
        paymentStatus: refundedCents >= totalCents ? "refunded" : "partially_refunded",
        refundAmountCents: refundedCents,
      });

      logStripeCall("refund.confirmed", { reservationId, refundedCents });
      break;
    }

    case "transfer.created": {
      const transfer = event.data.object;
      const reservationId = transfer.metadata?.reservationId;
      if (!reservationId || !mongoose.Types.ObjectId.isValid(reservationId)) break;

      await Reservation.findByIdAndUpdate(reservationId, {
        payoutStatus: "released",
        transferId: transfer.id,
        transferredAt: new Date(),
      });
      logStripeCall("transfer.confirmed", { reservationId, transferId: transfer.id });
      break;
    }

    case "transfer.failed":
    case "transfer.reversed": {
      const transfer = event.data.object;
      const reservationId = transfer.metadata?.reservationId;

      if (reservationId && mongoose.Types.ObjectId.isValid(reservationId)) {
        await Reservation.findByIdAndUpdate(reservationId, {
          payoutStatus: "failed",
          payoutLastError: `Stripe reported ${event.type}`,
        });
      }

      await alertAdmin(`Host payout ${event.type}`, {
        transferId: transfer.id,
        reservationId,
        amount: transfer.amount,
      });
      break;
    }

    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const dispute = event.data.object;
      const reservation = await Reservation.findOne({
        $or: [
          { paymentIntentId: dispute.payment_intent },
          { chargeId: dispute.charge },
        ],
      });

      if (reservation) {
        reservation.disputeId = dispute.id;
        reservation.disputeStatus = dispute.status;
        await reservation.save();
      }

      await alertAdmin(`Dispute ${event.type === "charge.dispute.created" ? "opened" : "closed"}`, {
        disputeId: dispute.id,
        status: dispute.status,
        amount: dispute.amount,
        reservationId: reservation?._id?.toString() || "unmatched",
      });
      break;
    }

    default:
      // Unhandled event types are acknowledged, not retried.
      break;
  }
}

/**
 * Record a settled Checkout Session against its reservation.
 *
 * The webhook is the primary caller. `verifyPayment` also calls it as a
 * reconciliation path, because a webhook can be delayed, misconfigured, or —
 * very commonly in local development — never delivered at all, which would
 * leave a genuinely paid booking showing as unpaid forever.
 *
 * That does NOT make the frontend the source of truth: the amounts are read
 * from Stripe here on the server, never accepted from the client, and the whole
 * operation is idempotent — the reservation write is conditional on the booking
 * not already being paid, and `finalizeReservation` claims atomically, so emails
 * and the calendar update happen exactly once no matter how many callers race.
 *
 * @returns {{ applied: boolean, reason?: string, reservationId?: string }}
 */
export const applyPaidCheckoutSession = async (stripe, session, { source = "webhook" } = {}) => {
  const reservationId = session.metadata?.reservationId;
  if (!reservationId || !mongoose.Types.ObjectId.isValid(reservationId)) {
    return { applied: false, reason: "no_reservation_id" };
  }
  if (session.payment_status !== "paid") {
    return { applied: false, reason: "not_paid", reservationId };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
    expand: ["latest_charge.balance_transaction"],
  });

  const { charge, stripeFeeCents } = await resolveChargeAndFee(stripe, paymentIntent);
  const totalAmountCents = capturedAmountCents(paymentIntent);
  const { platformFeeCents, hostPayoutCents } = calculateFees(totalAmountCents, stripeFeeCents);

  // Conditional update: whoever gets here first wins, the rest are no-ops.
  const updated = await Reservation.findOneAndUpdate(
    { _id: reservationId, paymentStatus: { $ne: "paid" } },
    {
      paymentStatus: "paid",
      isApproved: "approved",
      paymentIntentId: paymentIntent.id,
      chargeId: charge ? charge.id : undefined,
      stripeFeeCents,
      platformFeeCents,
      hostAmountCents: hostPayoutCents,
      totalPriceCents: totalAmountCents,
      currency: paymentIntent.currency || DEFAULT_CURRENCY,
      paidAt: new Date(),
    },
    { new: true }
  );

  if (!updated) {
    // Already recorded by the other path. Still make sure finalisation ran —
    // it is claim-guarded, so this is safe and cheap.
    await finalizeReservation(reservationId);
    return { applied: false, reason: "already_paid", reservationId };
  }

  logStripeCall("payment.confirmed", {
    reservationId,
    source,
    totalAmountCents,
    stripeFeeCents,
    platformFeeCents,
    hostPayoutCents,
  });

  // Calendar + confirmation emails, guarded internally.
  await finalizeReservation(reservationId);

  // Facebook CAPI - Purchase. Only ever fired by the path that won the update,
  // so reconciliation cannot double-count a conversion.
  try {
    const { fbp, fbc, userAgent, ip } = session.metadata || {};
    const eventData = {
      eventName: 'Purchase',
      productId: reservationId,
      currency: paymentIntent.currency || 'eur',
      value: totalAmountCents / 100, // cents to main unit
      contentName: 'Reservation Payment',
      eventSourceUrl: '',
    };

    const userPayload = {
      email: session.customer_email || session.customer_details?.email,
      clientIp: ip || '',
      clientUserAgent: userAgent || '',
      fbp: fbp,
      fbc: fbc
    };

    sendEvent('Purchase', eventData, userPayload);
  } catch (e) {
    console.error("FB CAPI Error (Purchase):", e);
  }

  return { applied: true, reservationId };
};

/**
 * GET /api/payments/fee-preview?amountCents=10000
 *
 * The single source of truth for the fee split shown in the UI. The browser
 * never recomputes these numbers — a drift between what a host is shown and
 * what they are actually paid is exactly the kind of bug worth designing out.
 */
export const getFeePreview = async (req, res) => {
  try {
    const amountCents =
      req.query.amountCents != null
        ? Math.round(Number(req.query.amountCents))
        : Math.round((Number(req.query.amount) || 0) * 100);

    if (!Number.isFinite(amountCents) || amountCents < 0) {
      return res.status(400).json({ error: "A non-negative amount is required" });
    }

    res.json(buildFeeBreakdown(amountCents));
  } catch (err) {
    console.error("getFeePreview error:", err);
    res.status(500).json({ error: err.message });
  }
};

/** Remove a reservation's dates from its listing's occupancy calendar. */
export const releaseCalendarForReservation = async (reservation) => {
  try {
    // Drop any checkout hold this booking still owns first — an abandoned or
    // failed payment must not keep the dates off the market.
    await releaseHold(reservation);

    const accommodation = await Accommodation.findById(
      reservation.accommodationId?._id || reservation.accommodationId
    );
    if (!accommodation?.occupancyCalendar?.length) return;

    // Rows this booking owns can be removed precisely, without the range
    // matching below that has to guess which entry belongs to whom.
    const owned = accommodation.occupancyCalendar.filter(
      (entry) => String(entry.reservationId || "") === String(reservation._id)
    );
    if (owned.length) {
      accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter(
        (entry) => String(entry.reservationId || "") !== String(reservation._id)
      );
      await accommodation.save();
      return;
    }

    const booked = new Set(
      eachDayOfInterval({
        start: new Date(reservation.checkInDate),
        end: new Date(reservation.checkOutDate),
      }).map((d) => format(d, "yyyy-MM-dd"))
    );

    // Drop only entries fully covered by this reservation's range, so a manual
    // or imported block that merely overlaps is left untouched.
    accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter((entry) => {
      const range = eachDayOfInterval({
        start: new Date(entry.startDate),
        end: new Date(entry.endDate),
      }).map((d) => format(d, "yyyy-MM-dd"));
      return !range.every((d) => booked.has(d));
    });

    await accommodation.save();
    console.log(`Released calendar dates for reservation ${reservation._id}`);
  } catch (err) {
    console.error("releaseCalendarForReservation error:", err.message);
  }
};

/**
 * Can this platform key still reach the given connected account?
 *
 * Deliberately three-valued, because the two failure modes must not be confused:
 *
 *   true  — the account exists and is ours
 *   false — Stripe positively says otherwise: the account does not exist, or
 *           this key has no access to it. Safe to act on.
 *   null  — we could not find out (outage, rate limit, or a bad API key). NOT a
 *           licence to discard anything. A `StripeAuthenticationError` in
 *           particular means the KEY is wrong, not the account — treating that
 *           as `false` would wipe the stored account id of every host who
 *           happened to press the button during the misconfiguration.
 */
async function isConnectedAccountReachable(stripe, accountId) {
  try {
    await stripe.accounts.retrieve(accountId);
    return true;
  } catch (err) {
    const definitelyGone =
      err?.type === "StripePermissionError" ||
      err?.code === "resource_missing" ||
      err?.code === "account_invalid" ||
      (err?.type === "StripeInvalidRequestError" && err?.statusCode === 403);

    if (definitelyGone) {
      logStripeCall("accounts.retrieve", { accountId, verdict: "unreachable" }, "error", err);
      return false;
    }

    logStripeCall("accounts.retrieve", { accountId, verdict: "unknown" }, "error", err);
    return null;
  }
}

/**
 * GET /api/payments/host/:hostId/stripe-accounts
 *
 * Every connected account this host holds, for the "use an existing account"
 * dropdown. Newest first, because a host who has just connected an account is
 * almost always connecting it FOR the listing they are creating.
 *
 * Returns capability state per account but never the host's tax identity or
 * anything else from the record.
 *
 * `?refresh=1` re-reads every account from the Stripe API first. The payout
 * settings page asks for that, because the stored state is only as current as
 * the last `account.updated` webhook — and a webhook that was never delivered
 * is precisely the case where a host is staring at a status that has been wrong
 * for weeks. It is opt-in so the add-accommodation dropdown, which just needs
 * names to choose between, still costs no Stripe calls at all.
 */
export const listHostStripeAccounts = async (req, res) => {
  try {
    const { hostId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ error: "Invalid hostId" });
    }

    // No `.select()` — `refreshAllHostStripeAccounts` saves the document, and a
    // projected document saves back only what was projected. The previous
    // narrow select was safe only because nothing wrote to it.
    let host = await Host.findById(hostId);
    if (!host) return res.status(404).json({ error: "Host not found" });

    let refreshFailed = [];
    if (req.query.refresh === "1" || req.query.refresh === "true") {
      // The refresh is an ENHANCEMENT, never a precondition. Whatever happens to
      // it, the host still gets the accounts we hold — a Stripe outage, a
      // missing API key or one unreachable account must not collapse into "we
      // couldn't load your payout accounts", which hides working data and names
      // no cause.
      try {
        const result = await refreshAllHostStripeAccounts(host);
        host = result.host || host;
        refreshFailed = result.failed || [];
      } catch (err) {
        console.error("listHostStripeAccounts: refresh failed, serving stored state:", err);
        refreshFailed = listPayoutAccounts(host).map((a) => a.accountId);
      }
    }

    res.json({
      accounts: listPayoutAccounts(host),
      defaultAccountId: host.stripeAccountId || null,
      // Named so the UI can say "we could not reach this one" rather than
      // silently showing stale figures as though they were fresh.
      refreshFailed,
    });
  } catch (err) {
    console.error("listHostStripeAccounts error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payments/host/account-link
 *
 * A fresh Stripe onboarding link for ONE named account.
 *
 * This is the gap that made a restricted account a dead end. The only way back
 * into Stripe was `create-express-account`, which always acts on
 * `host.stripeAccountId` — so a host whose SECOND account needed a document had
 * no route to it anywhere in the product. They could see "action needed" and do
 * nothing about it.
 *
 * The link type is chosen from what the account actually needs:
 *   `account_onboarding` while requirements are outstanding — the guided form
 *   `account_update`     once there are none — Stripe rejects `account_onboarding`
 *                        for a completed account, and the host may still want to
 *                        change their bank details
 */
export const createStripeAccountLink = async (req, res) => {
  try {
    const { hostId, accountId, returnTo } = req.body || {};
    if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ error: "Valid hostId required" });
    }
    if (!accountId) return res.status(400).json({ error: "accountId required" });

    const host = await Host.findById(hostId);
    if (!host) return res.status(404).json({ error: "Host not found" });

    // Refuse an account this host does not hold. Without it, possession of any
    // acct_ id would mint an onboarding link into a stranger's account.
    const accounts = listPayoutAccounts(host);
    if (!accounts.some((a) => a.accountId === accountId)) {
      return res.status(400).json({
        error: "That payout account does not belong to this host.",
        code: "unknown_account",
      });
    }

    const stripe = getStripe();

    // Ask Stripe rather than trusting the cached row: the whole point of this
    // button is that the host thinks something is outstanding, and the cache is
    // exactly what may be wrong.
    let state = null;
    try {
      const account = await stripe.accounts.retrieve(accountId);
      state = describeAccountState(account);
      await syncHostFromStripeAccount({
        ...account,
        metadata: { ...(account.metadata || {}), host_id: host._id.toString() },
      });
    } catch (err) {
      // A link is still worth minting — accountLinks.create will fail loudly
      // below if the account is genuinely unreachable.
      logStripeCall("accounts.retrieve", { hostId, accountId }, "error", err);
    }

    const type =
      state && !state.actionRequired && state.state === "active"
        ? "account_update"
        : "account_onboarding";

    const safeReturn =
      typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "";
    const returnUrl =
      `${process.env.CLIENT_SITE_URL}/host/onboard/success?account=${accountId}` +
      (safeReturn ? `&returnTo=${encodeURIComponent(safeReturn)}` : "");

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.CLIENT_SITE_URL}/host/onboard/refresh?account=${accountId}`,
      return_url: returnUrl,
      type,
    });

    logStripeCall("accountLinks.create", { hostId, accountId, type });

    res.json({ onboardingUrl: accountLink.url, accountId, type });
  } catch (err) {
    console.error("createStripeAccountLink error:", err);
    logStripeCall("accountLinks.create", { hostId: req.body?.hostId }, "error", err);

    if (err?.type === "StripeInvalidRequestError") {
      return res
        .status(400)
        .json({ error: err.message, code: err.code || "stripe_invalid_request" });
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payments/host/default-account
 *
 * Which of the host's accounts every listing that names none falls back to.
 *
 * A host who holds several needs to be able to say so: the first account they
 * ever connected became the default automatically, and if that is the one they
 * have stopped using, every listing they have not explicitly repointed is still
 * paying into it.
 *
 * Changing the default changes which account those listings pay, so their
 * statuses are recomputed here rather than waiting for the next webhook — the
 * host should not have to wonder why a listing went quiet.
 */
export const setDefaultStripeAccount = async (req, res) => {
  try {
    const { hostId, accountId } = req.body || {};
    if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ error: "Valid hostId required" });
    }
    if (!accountId) return res.status(400).json({ error: "accountId required" });

    const host = await Host.findById(hostId);
    if (!host) return res.status(404).json({ error: "Host not found" });

    const accounts = listPayoutAccounts(host);
    const target = accounts.find((a) => a.accountId === accountId);
    if (!target) {
      return res.status(400).json({
        error: "That payout account does not belong to this host.",
        code: "unknown_account",
      });
    }

    host.stripeAccountId = accountId;

    // The top-level fields mirror the DEFAULT account, so they have to move with
    // it. Leaving them behind would report the old account's readiness under the
    // new account's id — the one combination that can wave a transfer through to
    // an account Stripe has not enabled.
    host.chargesEnabled = Boolean(target.chargesEnabled);
    host.payoutsEnabled = Boolean(target.payoutsEnabled);
    host.stripeTransfersActive = target.transfersActive;
    host.onboardingComplete = isAccountPayoutReady(target);
    host.stripeRequirementsDue = target.requirementsDue || [];
    host.stripePastDue = target.pastDue || [];
    host.stripeDisabledReason = target.disabledReason || undefined;
    host.stripePayoutState = payoutStateOf(target);
    host.payoutIban = target.payoutIban || host.payoutIban;
    host.stripeStatusUpdatedAt = new Date();

    await host.save();

    const statusResult = await syncListingStatusForHost(host);

    logStripeCall("account.default_changed", {
      hostId: host._id.toString(),
      accountId,
      listingsUpdated: statusResult.updated,
    });

    res.json({
      defaultAccountId: host.stripeAccountId,
      accounts: listPayoutAccounts(host),
      listingsUpdated: statusResult.updated,
    });
  } catch (err) {
    console.error("setDefaultStripeAccount error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/payments/host/connect-account
 *
 * Connect an ADDITIONAL account, alongside any the host already holds.
 *
 * Distinct from createHostExpressAccount below, which deliberately reuses the
 * existing account so a retry does not orphan it. Here a new account is the
 * point: a host with an apartment in their own name and a chalet under a
 * company needs two, and reusing the first would defeat the request.
 *
 * `returnTo` comes back on the onboarding return URL so the host lands where
 * they started — the add-accommodation form, with everything still filled in.
 */
export const connectAdditionalStripeAccount = async (req, res) => {
  try {
    const { hostId, country, email, label, returnTo } = req.body;
    if (!hostId) return res.status(400).json({ error: "hostId required" });
    if (!mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ error: "Invalid hostId" });
    }

    const stripe = getStripe();
    const host = await Host.findById(hostId);
    if (!host) return res.status(404).json({ error: "Host not found" });

    // Both connect paths build the account the same way — see
    // utils/stripeHelpers.js -> connectedAccountCreateParams for why it requests
    // `transfers` only and leaves `business_type` for the host to declare. This
    // used to be a second, subtly different copy of the payload, which is how
    // one path could be fixed and the other left restricting accounts.
    const account = await stripe.accounts.create(
      connectedAccountCreateParams(host, { country, email })
    );

    host.stripeAccounts = host.stripeAccounts || [];
    host.stripeAccounts.push({
      accountId: account.id,
      label: (label || "").trim().slice(0, 60),
      connectedAt: new Date(),
    });
    // The first account a host connects becomes the default every listing falls
    // back to. Later ones do not steal that role — a host adding a second
    // account for one property must not silently repoint the others.
    if (!host.stripeAccountId) host.stripeAccountId = account.id;
    await host.save();

    logStripeCall("accounts.create", {
      hostId: host._id.toString(),
      accountId: account.id,
      additional: true,
    });

    // Account Links expire within minutes — always mint a fresh one.
    const safeReturn = typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "";
    const returnUrl = `${process.env.CLIENT_SITE_URL}/host/onboard/success?account=${account.id}` +
      (safeReturn ? `&returnTo=${encodeURIComponent(safeReturn)}` : "");

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.CLIENT_SITE_URL}/host/onboard/refresh`,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    res.json({ onboardingUrl: accountLink.url, accountId: account.id });
  } catch (err) {
    console.error("connectAdditionalStripeAccount error:", err);
    logStripeCall("accounts.create", { hostId: req.body?.hostId }, "error", err);

    if (err?.type === "StripeInvalidRequestError") {
      return res.status(400).json({ error: err.message, code: err.code || "stripe_invalid_request" });
    }
    res.status(500).json({ error: err.message });
  }
};

// Create Host Express account and return onboarding link
export const createHostExpressAccount = async (req, res) => {
  try {
    const { hostId, country, email } = req.body;
    if (!hostId) return res.status(400).json({ error: "hostId required" });
    if (!mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ error: "Invalid hostId" });
    }

    const stripe = getStripe();

    const host = await Host.findById(hostId);
    if (!host) return res.status(404).json({ error: "Host not found" });

    // Reuse the existing connected account instead of orphaning it on a retry.
    let accountId = host.stripeAccountId;

    // ...but only if this platform key can still reach it. A stored acct_ id
    // becomes unreachable when the platform's Stripe account or API key changes
    // (test vs live, or a different Stripe account entirely) — the id stays on
    // the host document and points at an account this key has no access to.
    //
    // Without this check the handler skipped creation, went straight to
    // accountLinks.create with a dead id, and Stripe threw — surfacing as a 500
    // on "Continue onboarding" that the host could never get past, because every
    // retry took the same branch.
    if (accountId) {
      const reachable = await isConnectedAccountReachable(stripe, accountId);

      if (reachable === false) {
        // Provably gone, not a blip: drop it and onboard afresh below. The id is
        // kept in history — it may still exist under whichever platform created
        // it, and this is the only trace that it was once this host's.
        host.stripeAccountIdHistory = [
          ...(host.stripeAccountIdHistory || []),
          {
            accountId,
            discardedAt: new Date(),
            reason: "unreachable_with_current_platform_key",
          },
        ];
        host.stripeAccountId = undefined;
        // These cached flags described the OLD account. Leaving them true would
        // let the payout gate wave through a transfer to an account that is no
        // longer ours.
        host.chargesEnabled = false;
        host.payoutsEnabled = false;
        host.onboardingComplete = false;
        host.stripeRequirementsDue = [];
        host.stripeStatusUpdatedAt = new Date();
        await host.save();

        accountId = null;

        console.warn(
          `[stripe] host ${host._id} had unreachable account ${host.stripeAccountIdHistory.at(-1).accountId} — creating a new one`
        );
        await alertAdmin("Host Stripe account was unreachable — re-onboarding", {
          hostId: host._id.toString(),
          discardedAccountId: host.stripeAccountIdHistory.at(-1).accountId,
          hint:
            "The stored acct_ id is not accessible with the current STRIPE_SECRET_KEY. " +
            "This is expected if the platform Stripe account or key changed; if it was not " +
            "supposed to change, fix the key BEFORE more hosts re-onboard.",
        });
      }
      // reachable === null means Stripe could not be asked (network/outage).
      // Fall through and use the existing id: refusing or recreating on an
      // unknown is how a working account gets orphaned by a transient failure.
    }

    if (!accountId) {
      // The connected account's country is Putko's own jurisdiction by default,
      // NOT the host's `countryCode`.
      //
      // That field is free-text profile data and holds values that have nothing
      // to do with where the host can legally be paid — "PAKISTAN", "PA" — and
      // driving account creation from it produced "PA is not currently supported
      // by Stripe" on a button the host had no way to get past. Validating the
      // shape locally does not help either: "PA" is a perfectly well-formed ISO
      // code that Stripe simply does not support, so only Stripe can rule on it.
      //
      // An explicit `country` in the request body still wins, for the case where
      // a genuinely non-Slovak host is being onboarded deliberately. Anything
      // Stripe rejects comes back as its own 400 via the handler below, which
      // states the actual reason.
      //
      // The payload itself is shared with connectAdditionalStripeAccount — see
      // utils/stripeHelpers.js -> connectedAccountCreateParams.
      const account = await stripe.accounts.create(
        connectedAccountCreateParams(host, { country, email })
      );

      accountId = account.id;
      host.stripeAccountId = accountId;
      await host.save();

      logStripeCall("accounts.create", { hostId: host._id.toString(), accountId });
    }

    // Account Links expire within minutes — always mint a fresh one, never persist.
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.CLIENT_SITE_URL}/host/onboard/refresh`,
      return_url: `${process.env.CLIENT_SITE_URL}/host/onboard/success`,
      type: "account_onboarding",
    });

    res.json({ onboardingUrl: accountLink.url, accountId });
  } catch (err) {
    console.error("createHostExpressAccount error:", err);
    logStripeCall("accounts.create", { hostId: req.body?.hostId }, "error", err);

    // A rejected request is the caller's problem to fix, not a server fault, and
    // saying which is the difference between an actionable message and a 500
    // that looks like the site is broken. Stripe's own text is used verbatim —
    // it names the offending parameter, which is exactly what is needed here.
    if (err?.type === "StripeInvalidRequestError") {
      return res.status(400).json({ error: err.message, code: err.code || "stripe_invalid_request" });
    }

    res.status(500).json({ error: err.message });
  }
};

/**
 * Verify onboarding against the Stripe API rather than trusting the return_url.
 * Called when the host lands back on the site; account.updated covers the rest.
 */
export const refreshHostStripeStatus = async (req, res) => {
  try {
    const { hostId } = req.body;
    if (!hostId || !mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ error: "Valid hostId required" });
    }

    const host = await Host.findById(hostId);
    if (!host) return res.status(404).json({ error: "Host not found" });

    // Billing is Putko's own record and has nothing to do with Stripe, so it is
    // reported on every path — including the two below that never reach the API.
    // Previously the no-account path returned `{ onboardingComplete: false }`
    // alone and the error path returned a 500, so a host without a connected
    // account (or with a broken one) got no billing answer at all.
    const billingOf = (doc) => {
      const missing = missingBillingFieldsOf(doc);
      return { billing: { complete: missing.length === 0, missing }, missingBillingFields: missing };
    };

    if (!host.stripeAccountId) {
      return res.json({
        onboardingComplete: false,
        reason: "no_stripe_account",
        payoutState: "not_connected",
        payoutDelayHours: PAYOUT_DELAY_HOURS,
        ...billingOf(host),
      });
    }

    const stripe = getStripe();

    let updated = null;
    try {
      const account = await stripe.accounts.retrieve(host.stripeAccountId);
      updated = await syncHostFromStripeAccount(account);
    } catch (err) {
      // A stored account this key cannot reach (see createHostExpressAccount)
      // used to 500 here, which took the whole payments page's status refresh
      // down with it — including the billing answer, which Stripe has no say in.
      // Report what is cached instead and let the host get on with onboarding.
      logStripeCall("accounts.retrieve", { hostId, accountId: host.stripeAccountId }, "error", err);
      return res.json({
        onboardingComplete: false,
        reason: "stripe_account_unreachable",
        chargesEnabled: false,
        payoutsEnabled: false,
        transfersActive: false,
        payoutState: "pending",
        requirementsDue: [],
        payoutDelayHours: PAYOUT_DELAY_HOURS,
        ...billingOf(host),
      });
    }

    // `syncHostFromStripeAccount` returns null when no Host matches the account.
    // Falling back to the record we already loaded matters for the billing block:
    // `null?.missingBillingFields?.() || []` reported an empty list, i.e. "billing
    // complete", which is the one direction this must never fail in.
    const current = updated || host;
    const defaultAccount = listPayoutAccounts(current).find((a) => a.isDefault);

    res.json({
      onboardingComplete: Boolean(current.onboardingComplete),
      chargesEnabled: Boolean(current.chargesEnabled),
      payoutsEnabled: Boolean(current.payoutsEnabled),
      transfersActive: Boolean(current.stripeTransfersActive),
      requirementsDue: current.stripeRequirementsDue || [],
      // Everything the host needs to tell "still filling in the form" apart
      // from "Stripe has restricted this account", which the old response could
      // not express at all — both arrived as onboardingComplete: false with an
      // empty requirements list.
      payoutState: payoutStateOf(defaultAccount),
      pastDue: current.stripePastDue || [],
      disabledReason: current.stripeDisabledReason || null,
      pendingVerification: defaultAccount?.pendingVerification || [],
      requirementErrors: defaultAccount?.requirementErrors || [],
      currentDeadline: defaultAccount?.currentDeadline || null,
      futureDue: defaultAccount?.futureDue || [],
      futureDeadline: defaultAccount?.futureDeadline || null,
      // So the UI's lock window matches the one the backend actually enforces.
      payoutDelayHours: PAYOUT_DELAY_HOURS,
      ...billingOf(current),
    });
  } catch (err) {
    console.error("refreshHostStripeStatus error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Resolve the Host that owns a reservation.
 *
 * `accommodationProvider` was declared as ref 'User' but is populated with a
 * Host id, while other code paths resolve the host via the listing's `userId`.
 * Both are tried here, and a mismatch is reported rather than silently paying
 * the wrong account.
 *
 * `payoutIbanFull` is declared `select: false` on the schema, so it is absent
 * unless asked for by name. Every DAC7 write goes through this function, and
 * without the `+` it read as undefined — so `dac7.js` fell through to Stripe's
 * masked `SK****1234` for every host, including those who had supplied their
 * real IBAN, and filed the mask as the seller's financial account identifier.
 *
 * The value stays server-side: all three callers use the host locally (payout,
 * refund recording, DAC7 rebuild) and none of them serialise it into a response.
 */
const HOST_WITH_IBAN = "+payoutIbanFull";

export const resolveHostForReservation = async (reservation) => {
  const direct = reservation.accommodationProvider
    ? await Host.findById(reservation.accommodationProvider).select(HOST_WITH_IBAN)
    : null;

  const listing = await Accommodation.findById(
    reservation.accommodationId?._id || reservation.accommodationId
  ).select("userId");

  const viaListing = listing?.userId
    ? await Host.findById(listing.userId).select(HOST_WITH_IBAN)
    : null;

  if (direct && viaListing && String(direct._id) !== String(viaListing._id)) {
    await alertAdmin("Host mismatch on reservation — payout blocked", {
      reservationId: reservation._id.toString(),
      accommodationProvider: String(direct._id),
      listingOwner: String(viaListing._id),
    });
    return { host: null, conflict: true };
  }

  return { host: direct || viaListing, conflict: false };
};

/**
 * How old a cached Stripe account status may be before a payout refusal
 * re-checks it against the API. Short enough that a host who has just finished
 * onboarding can withdraw immediately; long enough that the nightly sweep does
 * not make one API call per booking.
 */
const STRIPE_STATUS_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Core payout. Shared by the manual endpoint and the daily sweep so both apply
 * exactly the same eligibility rules.
 *
 * @returns {{ ok: boolean, code?: string, error?: string, transferId?: string }}
 */
export const payoutReservation = async (reservation, { force = false, requireBillingDetails = false } = {}) => {
  const stripe = getStripe();

  if (reservation.paymentStatus !== "paid") {
    return { ok: false, code: "not_paid", error: "Reservation not paid" };
  }
  if (reservation.payoutStatus === "released" || reservation.transferId) {
    return { ok: false, code: "already_released", error: "Payout already released" };
  }
  if (reservation.isApproved === "cancelled") {
    return { ok: false, code: "cancelled", error: "Reservation is cancelled" };
  }
  if (reservation.refundAmountCents > 0) {
    return { ok: false, code: "refunded", error: "Reservation has been refunded" };
  }

  // Hold window: PAYOUT_DELAY_HOURS after check-in, measured in the business
  // timezone. Previously the backend released from check-in 00:00 while the UI
  // implied check-in + 24 h, so the backend was the more permissive of the two.
  if (!force) {
    const elapsed = hoursSinceCheckIn(reservation.checkInDate);
    if (elapsed < PAYOUT_DELAY_HOURS) {
      return {
        ok: false,
        code: "locked",
        error: `Payout unlocks ${PAYOUT_DELAY_HOURS}h after check-in (${PAYOUT_DELAY_HOURS - elapsed}h remaining)`,
      };
    }
  }

  const { host, conflict } = await resolveHostForReservation(reservation);
  if (conflict) {
    return { ok: false, code: "host_conflict", error: "Host record conflict — escalated to admin" };
  }
  if (!host?.stripeAccountId) {
    return { ok: false, code: "not_onboarded", error: "Host not onboarded for payouts" };
  }

  // WHICH of the host's connected accounts this booking pays. A host may run a
  // separate account per property, so the destination is a property of the
  // LISTING, not of the host — paying the host default here would quietly send
  // a chalet's takings to the account that belongs to their apartment.
  const payoutListing = await Accommodation.findById(
    reservation.accommodationId?._id || reservation.accommodationId
  ).select("payoutStripeAccountId");
  const payoutAccount = resolvePayoutAccount(payoutListing, host);

  if (!payoutAccount?.accountId) {
    return { ok: false, code: "not_onboarded", error: "Host not onboarded for payouts" };
  }

  // Putko deducts its intermediary fee from this payout and must issue a Slovak
  // VAT invoice for that fee. Without the host's IČO, DIČ and billing address the
  // monthly run cannot raise one — utils/invoiceJob.js records
  // `missing_host_billing_details` and gives up — so paying out first means
  // having taken a fee that can never be invoiced.
  //
  // Only the manual Withdraw button enforces this, which is where the host is
  // standing in front of a form that can fix it. The daily sweep deliberately
  // does NOT pass the flag: hard-blocking it would strand the money of every
  // existing host who has not yet filled these fields in, with nobody watching
  // the cron log to notice. That mirrors the opt-in stance in
  // utils/listingGating.js, and should be tightened once hosts are migrated.
  if (requireBillingDetails) {
    const missingBilling = host.missingBillingFields?.() || [];
    if (missingBilling.length) {
      return {
        ok: false,
        code: "billing_incomplete",
        error: "Host billing details are incomplete",
        missingBillingFields: missingBilling,
      };
    }
  }

  // `payoutsEnabled` is a CACHE of what Stripe last told us, refreshed by the
  // account.updated webhook and by the host opening their payouts page. Neither
  // is guaranteed: if the webhook is not configured (several hosts have
  // stripeStatusUpdatedAt unset), a host who finished onboarding stays blocked
  // here forever, pressing Withdraw and being told to finish onboarding they
  // already finished.
  //
  // So a refusal is never issued on stale data — ask Stripe first. Bounded by a
  // staleness window so the nightly sweep does not re-fetch every host it sees.
  // Checked against THIS booking's destination account, not the host's default.
  // With several accounts a host-level `payoutsEnabled` says nothing about the
  // one the money is actually going to — a verified default would wave through
  // a transfer to a second account Stripe has not enabled.
  //
  // Judged with `isAccountPayoutReady`, the same rule the listing gate and the
  // payouts page apply. It used to test `payoutsEnabled` alone, which is LOOSER
  // than every other gate in the system: an account can have payouts enabled
  // while its `transfers` capability is inactive, and this would then attempt a
  // transfer Stripe was always going to reject — surfacing to the host as a
  // failed withdrawal rather than as the "still verifying" they are shown
  // everywhere else.
  let destination = payoutAccount;
  if (!isAccountPayoutReady(destination)) {
    const lastSync = new Date(destination.statusUpdatedAt || 0).getTime();
    const isStale = Date.now() - lastSync > STRIPE_STATUS_MAX_AGE_MS;

    if (isStale) {
      try {
        const account = await stripe.accounts.retrieve(destination.accountId);
        const refreshed = await syncHostFromStripeAccount(account);
        if (refreshed) {
          Object.assign(host, refreshed.toObject ? refreshed.toObject() : refreshed);
          destination = resolvePayoutAccount(payoutListing, host) || destination;
        }
      } catch (err) {
        // A Stripe outage must not turn into a confusing payout error; fall
        // through and refuse on what we know, having logged why.
        logStripeCall(
          "accounts.retrieve",
          { hostId: host._id.toString(), accountId: destination.accountId },
          "error",
          err
        );
      }
    }

    if (!isAccountPayoutReady(destination)) {
      // A restricted account and an unfinished one need different instructions,
      // so they no longer collapse into one message.
      const restricted = payoutStateOf(destination) === "restricted";

      return {
        ok: false,
        code: restricted ? "account_restricted" : "payouts_disabled",
        error: restricted
          ? "Stripe has restricted the account this booking pays out to"
          : "Host's Stripe account cannot receive payouts yet",
        // What Stripe is actually still waiting for, so the host can be told
        // rather than left guessing. `past_due` first — those are the ones
        // already holding the money up.
        requirementsDue: [
          ...(destination.pastDue || []),
          ...(destination.requirementsDue || []).filter(
            (r) => !(destination.pastDue || []).includes(r)
          ),
        ],
        disabledReason: destination.disabledReason || null,
        accountId: destination.accountId,
      };
    }
  }

  const amount = Math.round(reservation.hostAmountCents || 0);
  if (!amount || amount <= 0) {
    return { ok: false, code: "no_amount", error: "No payout amount available" };
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount,
        currency: reservation.currency || DEFAULT_CURRENCY,
        // The listing's own account, resolved above — never the host default
        // unless the listing named none.
        destination: destination.accountId,
        metadata: { reservationId: reservation._id.toString() },
      },
      {
        // Deterministic: a retry with the same key returns the ORIGINAL transfer
        // instead of creating a second one. The previous key embedded Date.now(),
        // which made every retry a fresh key and therefore a fresh payout.
        idempotencyKey: `transfer_booking_${reservation._id}`,
      }
    );

    reservation.transferId = transfer.id;
    reservation.payoutStatus = "released";
    reservation.transferredAt = new Date();
    reservation.payoutLastError = undefined;
    await reservation.save();

    logStripeCall("transfers.create", {
      reservationId: reservation._id.toString(),
      // Both forms: cents is what Stripe was actually sent, the formatted value
      // is so nobody reading a console mistakes 6357 for a wrong figure.
      amount: `${(amount / 100).toFixed(2)} ${(reservation.currency || DEFAULT_CURRENCY).toUpperCase()}`,
      amountCents: amount,
      transferId: transfer.id,
    });

    // Keep the annual DAC7 aggregate current instead of reconstructing it at
    // the 31 January deadline.
    await recordReservationForDac7(reservation, host);

    return { ok: true, transferId: transfer.id };
  } catch (err) {
    reservation.payoutAttempts = (reservation.payoutAttempts || 0) + 1;
    reservation.payoutLastAttemptAt = new Date();
    reservation.payoutLastError = err.message;

    if (err.code === "balance_insufficient") {
      // Stripe reports the same error code for two very different situations,
      // and telling them apart matters: one clears itself, the other never does.
      //
      //   a) The money is still settling. Retrying tomorrow works.
      //   b) The platform holds NO balance in the transfer's currency at all —
      //      e.g. a GBP Stripe account being asked to send EUR. No amount of
      //      waiting fixes that, so promising the host "a few days" is a lie and
      //      the daily sweep would retry it forever.
      const currency = (reservation.currency || DEFAULT_CURRENCY).toLowerCase();
      let holdsCurrency = true;
      let balanceSummary = null;

      try {
        const balance = await stripe.balance.retrieve();
        const inCurrency = (list) => list.find((b) => b.currency === currency);
        holdsCurrency = Boolean(inCurrency(balance.available) || inCurrency(balance.pending));
        balanceSummary = {
          requestedCurrency: currency,
          available: balance.available.map((b) => `${b.currency.toUpperCase()} ${(b.amount / 100).toFixed(2)}`),
          pending: balance.pending.map((b) => `${b.currency.toUpperCase()} ${(b.amount / 100).toFixed(2)}`),
        };
      } catch (balanceErr) {
        logStripeCall("balance.retrieve", { reservationId: reservation._id.toString() }, "error", balanceErr);
      }

      // Amounts are sent to Stripe in the smallest currency unit (6357 = EUR
      // 63.57) and stored that way throughout — never floats. Logs and alerts
      // additionally carry the formatted value, because reading bare cents off a
      // console is how "6357" gets mistaken for a wrong figure.
      const formatted = `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;

      if (!holdsCurrency) {
        // A configuration problem, not a timing one. Mark it failed so the sweep
        // stops retrying, and tell the admin exactly what the mismatch is.
        reservation.payoutStatus = "failed";
        reservation.payoutLastError = `No ${currency.toUpperCase()} balance on the platform account — cannot fund a ${currency.toUpperCase()} transfer`;
        await reservation.save();

        await alertAdmin("Payout blocked: platform holds no balance in the payout currency", {
          reservationId: reservation._id.toString(),
          amount: formatted,
          amountCents: amount,
          host: host._id.toString(),
          ...balanceSummary,
          hint: "The Putko Stripe account settles in a different currency than the bookings. Transfers can only be funded from a balance in the same currency.",
        });

        logStripeCall(
          "transfers.create",
          { reservationId: reservation._id.toString(), ...balanceSummary },
          "error",
          err
        );

        return {
          ok: false,
          code: "balance_currency_mismatch",
          error: `The platform Stripe account holds no ${currency.toUpperCase()} balance, so a ${currency.toUpperCase()} payout cannot be funded.`,
          retryable: false,
          balance: balanceSummary,
        };
      }

      // Recoverable: the platform balance will refill. Leave the reservation
      // eligible so the next sweep retries it, but make the failure loud.
      await reservation.save();
      await alertAdmin("Insufficient Stripe balance for payout", {
        reservationId: reservation._id.toString(),
        amount: formatted,
        amountCents: amount,
        host: host._id.toString(),
        ...balanceSummary,
      });
      logStripeCall("transfers.create", { reservationId: reservation._id.toString() }, "error", err);
      return { ok: false, code: "balance_insufficient", error: err.message, retryable: true };
    }

    reservation.payoutStatus = "failed";
    await reservation.save();
    logStripeCall("transfers.create", { reservationId: reservation._id.toString() }, "error", err);
    throw err;
  }
};

// Release payout to host (transfer)
/**
 * Host-facing wording for each payout refusal.
 *
 * Stripe's own messages are written for developers — `balance_insufficient`
 * arrives as "You have insufficient available funds in your Stripe account. Try
 * adding funds ... using the 4000000000000077 test card", which is meaningless
 * and alarming to a host who just pressed Withdraw. The technical detail stays
 * in the audit log and the admin alert; the host is told what it means for them.
 */
const PAYOUT_MESSAGES = {
  not_paid: "This booking has not been paid for yet.",
  already_released: "This payout has already been sent.",
  cancelled: "This booking was cancelled, so there is nothing to pay out.",
  refunded: "This booking was refunded, so there is nothing to pay out.",
  locked: null, // payoutReservation already returns a precise, friendly message
  not_onboarded: "Finish connecting your Stripe account before withdrawing.",
  payouts_disabled:
    "Stripe has not enabled payouts on your account yet. This usually means a verification step is still outstanding.",
  account_restricted:
    "Stripe has restricted the account this booking pays out to. Open your payout settings to see what it still needs.",
  host_conflict: "We could not confirm who owns this booking. Our team has been notified.",
  // Actionable by the host, and the UI reopens the billing form on this code —
  // so it says what is needed, not just that something is missing.
  billing_incomplete:
    "We need your billing details (IČO, DIČ and address) before releasing this payout. They go on the monthly invoice we issue you for the platform fee.",
  no_amount: "There is no payout amount recorded against this booking.",
  balance_insufficient:
    "Your payout is queued. The funds from this booking are still settling with Stripe — it will be released automatically, usually within a few days.",
  // Deliberately not phrased as "try again later": nothing about waiting fixes a
  // currency mismatch, and telling the host otherwise would have them pressing
  // Withdraw for days.
  balance_currency_mismatch:
    "This payout cannot be sent yet because of a currency setup issue on our side. Our team has been notified — you do not need to do anything.",
};

export const releasePayoutToHost = async (req, res) => {
  try {
    const { reservationId } = req.body;
    if (!reservationId) {
      return res.status(400).json({ error: "reservationId required" });
    }
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      return res.status(400).json({ error: "Invalid reservationId" });
    }

    // Loaded and access-checked by requireReservationAccess.
    const reservation = req.reservation || (await Reservation.findById(reservationId));
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    // Enforced only on this path — see the note in payoutReservation.
    const result = await payoutReservation(reservation, { requireBillingDetails: true });

    if (!result.ok) {
      const friendly = PAYOUT_MESSAGES[result.code];

      // A retryable failure is not the host's mistake and not a dead end: the
      // daily sweep will pick it up. 202 says "accepted, not done yet" rather
      // than 400, which reads as "you did something wrong".
      return res.status(result.retryable ? 202 : 400).json({
        error: friendly || result.error,
        code: result.code,
        retryable: Boolean(result.retryable),
        // Present on payouts_disabled: the exact Stripe onboarding steps still
        // outstanding, so the UI can list them instead of just saying "not yet".
        requirementsDue: result.requirementsDue || undefined,
        // Present on account_restricted: Stripe's own reason for the hold.
        disabledReason: result.disabledReason || undefined,
        // Present on billing_incomplete: which invoicing fields to ask for.
        missingBillingFields: result.missingBillingFields || undefined,
      });
    }

    res.json({ success: true, transferId: result.transferId });
  } catch (err) {
    console.error("releasePayoutToHost error:", err);
    res.status(500).json({ error: err.message });
  }
};
// Helper function to finalize reservation (update calendar + send email)
export const finalizeReservation = async (reservationId) => {
  try {
    // Claim the reservation atomically. Both the webhook and (historically) the
    // success page could reach this point; without the claim the guest and host
    // received duplicate confirmation emails and the calendar was written twice.
    const claimed = await Reservation.findOneAndUpdate(
      { _id: reservationId, finalizedAt: { $exists: false } },
      { $set: { finalizedAt: new Date() } },
      { new: true }
    );

    if (!claimed) {
      console.log(`finalizeReservation: ${reservationId} already finalized, skipping`);
      return;
    }

    const reservation = await Reservation.findById(reservationId).populate({
      path: "accommodationId",
      populate: { path: "userId" }
    });

    if (!reservation) throw new Error("Reservation not found");

    // FIX: Get accommodation directly from the populated reservation
    const accommodation = reservation.accommodationId;
    if (!accommodation) throw new Error("Accommodation not found");

    // FIX: The host is now inside the populated accommodation object
    const host = accommodation.userId;

    if (!host) {
      console.warn(`Warning: No host found for accommodation ${accommodation._id}`);
    }

    // 1. Update Occupancy Calendar
    //
    // Convert this booking's checkout hold into a confirmed booking. The old
    // code here filtered conflicting days out and booked whatever remained,
    // which meant a guest who lost a race paid in full and received a partial
    // stay, with nobody told. `confirmHold` refuses instead and raises an alert.
    const confirmed = await confirmHold(reservation);

    if (confirmed.ok) {
      console.log(`Updated calendar for reservation ${reservationId}`);
    } else {
      console.error(
        `Calendar conflict finalising reservation ${reservationId}: ` +
          `${confirmed.reason} ${JSON.stringify(confirmed.conflictDays || [])}`
      );
      // Deliberately not thrown: the guest HAS paid, and the payment record
      // must stand. An admin alert has already gone out from confirmHold.
    }

    // 2. Send Confirmation Email
    const transporter = getTransporter();

    const lang = reservation.language || 'sk'; // Default to Slovak if not set
    const locale = lang === 'sk' ? 'sk-SK' : 'en-US';

    const checkInDateFormatted = new Date(reservation.checkInDate).toLocaleDateString(locale, {
      month: 'long', day: 'numeric', year: 'numeric'
    });
    const checkOutDateFormatted = new Date(reservation.checkOutDate).toLocaleDateString(locale, {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    // Calculate nights
    const diffTime = Math.abs(new Date(reservation.checkOutDate) - new Date(reservation.checkInDate));
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const propertyImage = accommodation.images[0] || "";
    const address = accommodation.locationDetails?.streetAndNumber || "";
    const googleMapsLink = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;

    // Translations
    const t = {
      en: {
        // Guest Email
        subjectGuest: `Reservation Confirmed: ${accommodation.name}`,
        titleGuest: "Your Reservation is Confirmed!",
        hi: "Hi",
        congrats: `Congratulations! Your reservation request for <strong>${accommodation.name}</strong> has been approved and paid.`,
        // Host Email
        subjectHost: `New Booking Received: ${accommodation.name}`,
        titleHost: "You have a new booking!",
        hostMsg: `Great news! Your property <strong>${accommodation.name}</strong> has been booked and paid for.`,
        // Shared
        stayDetails: "Stay Details",
        checkIn: "Check-in",
        checkOut: "Check-out",
        guests: "Number of Guests",
        nights: "Nights",
        totalPrice: "Total Price",
        guestDetails: "Guest Details",
        hostDetails: "Host Details",
        name: "Name",
        email: "Email",
        phone: "Phone Number",
        message: "Message",
        location: "Property Location",
        viewMap: "View Location on Map",
        regards: "Best regards",
        team: "The Putko Team"
      },
      sk: {
        // Guest Email
        subjectGuest: `Rezervácia potvrdená: ${accommodation.name}`,
        titleGuest: "Vaša rezervácia je potvrdená!",
        hi: "Ahoj",
        congrats: `Gratulujeme! Vaša žiadosť o rezerváciu pre <strong>${accommodation.name}</strong> bola schválená a zaplatená.`,
        // Host Email
        subjectHost: `Nová rezervácia: ${accommodation.name}`,
        titleHost: "Máte novú rezerváciu!",
        hostMsg: `Skvelé správy! Vaše ubytovanie <strong>${accommodation.name}</strong> bolo práve zarezervované a zaplatené.`,
        // Shared
        stayDetails: "Detaily pobytu",
        checkIn: "Príchod",
        checkOut: "Odchod",
        guests: "Počet hostí",
        nights: "Nocí",
        totalPrice: "Celková cena",
        guestDetails: "Detaily hosťa",
        hostDetails: "Informácie o hostiteľovi",
        name: "Meno",
        email: "E-mail",
        phone: "Telefónne číslo",
        message: "Správa",
        location: "Poloha ubytovania",
        viewMap: "Zobraziť polohu na mape",
        regards: "S pozdravom",
        team: "Tím Putko"
      }
    };

    const text = t[lang] || t.en;

    const hasMessage =
      typeof reservation.message === "string" &&
      reservation.message.trim().length > 0;

    const stayRows = (withNights) =>
      detailTable([
        [text.checkIn, checkInDateFormatted],
        [text.checkOut, checkOutDateFormatted],
        withNights && [text.nights, String(nights)],
        [text.totalPrice, `€${reservation.totalPrice}`],
      ]);

    // --- EMAIL 1: TO GUEST ---
    const guestMailOptions = {
      from: MAIL_FROM,
      to: reservation.email,
      subject: text.subjectGuest,
      attachments: logoAttachments(),
      html: brandShell({
        preheader: `${checkInDateFormatted} – ${checkOutDateFormatted} · €${reservation.totalPrice}`,
        title: text.titleGuest,
        bodyHtml: `
          ${heroImage(propertyImage, accommodation.name)}
          <p style="margin:0 0 14px 0;">${text.hi} <strong>${reservation.name}</strong>,</p>
          <p style="margin:0 0 4px 0;">${text.congrats}</p>
          ${section(text.stayDetails, stayRows(false))}
          ${section(
            text.hostDetails,
            detailTable([
              [text.name, host?.name || "—"],
              [text.email, host?.email || "—"],
              [text.phone, host?.phoneNumber ? `+${host.phoneNumber}` : "—"],
            ])
          )}
          ${address ? button(googleMapsLink, text.viewMap) : ""}`,
      }),
    };

    // --- EMAIL 2: TO HOST ---
    const hostMailOptions = {
      from: MAIL_FROM,
      to: host?.email,
      subject: text.subjectHost,
      attachments: logoAttachments(),
      html: brandShell({
        preheader: `${accommodation.name} · ${checkInDateFormatted} – ${checkOutDateFormatted}`,
        title: text.titleHost,
        bodyHtml: `
          <p style="margin:0 0 14px 0;">${text.hi} <strong>${host?.name || ""}</strong>,</p>
          <p style="margin:0 0 4px 0;">${text.hostMsg}</p>
          ${section(
            text.guestDetails,
            detailTable([
              [text.name, reservation.name],
              [text.email, reservation.email],
              [text.phone, reservation.phone ? `+${reservation.phone}` : "—"],
            ])
          )}
          ${hasMessage ? callout(`<strong>${esc(text.message)}:</strong> ${esc(reservation.message)}`) : ""}
          ${section(text.stayDetails, stayRows(true))}`,
      }),
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(guestMailOptions),
      transporter.sendMail(hostMailOptions)
    ]);
    
    console.log(`Emails sent to Guest (${reservation.email}) and Host (${host?.email})`);

  } catch (error) {
    console.error("Error finalizing reservation:", error);
    // Release the claim so a webhook retry can genuinely finish the job rather
    // than seeing it as already finalized and skipping it forever.
    try {
      await Reservation.findByIdAndUpdate(reservationId, { $unset: { finalizedAt: "" } });
    } catch (releaseErr) {
      console.error("Failed to release finalize claim:", releaseErr.message);
    }
    // Don't throw, just log, so we don't crash the webhook/response
  }
};

/**
 * Status check for the success page, with server-side reconciliation.
 *
 * This originally confirmed the booking straight from the browser's report,
 * which made the frontend a source of truth and duplicated everything the
 * webhook did. It was then made purely read-only — but that left a real hole:
 * if the webhook is delayed, misconfigured, or (typically in local development)
 * never delivered, a genuinely paid booking shows as UNPAID indefinitely.
 *
 * The fix is reconciliation, not client trust. The session is re-read from
 * Stripe here on the server; if Stripe says it is paid and our record disagrees,
 * the same idempotent path the webhook uses is invoked. The client supplies only
 * a session id — never an amount, never a status.
 */
export const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const reservationId = session.metadata?.reservationId;
    let reservation =
      reservationId && mongoose.Types.ObjectId.isValid(reservationId)
        ? await Reservation.findById(reservationId)
        : null;

    let reconciled = false;

    // Stripe took the money but we have not recorded it. Close the gap.
    if (session.payment_status === "paid" && reservation?.paymentStatus !== "paid") {
      const result = await applyPaidCheckoutSession(stripe, session, { source: "reconcile" });
      reconciled = result.applied;

      if (result.applied) {
        console.log(
          `[reconcile] reservation ${reservationId} marked paid from the success page — ` +
            `the Stripe webhook had not arrived. Check the webhook endpoint configuration.`
        );
      }

      reservation = await Reservation.findById(reservationId);
    }

    const settled = reservation?.paymentStatus === "paid";

    res.json({
      status: session.payment_status,
      settled,
      // True only if Stripe reports paid and reconciliation still could not
      // settle it — the client keeps polling while this holds.
      pending: session.payment_status === "paid" && !settled,
      reconciled,
      reservation,
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST /payments/cancel
export const cancelPayment = async (req, res) => {
  try {
    const { reservationId } = req.body;

    if (!reservationId) {
      return res.status(400).json({ error: "reservationId required" });
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    // IMPORTANT:
    // Only reset if payment is NOT completed
    if (reservation.paymentStatus !== "paid") {
      reservation.paymentStatus = "unpaid";
      reservation.isApproved = "pending";
      reservation.checkoutSessionId = null; // optional but clean
      await reservation.save();

      // Give the dates back immediately. Without this the hold taken when
      // checkout started sat on the calendar for the rest of HOLD_MINUTES even
      // though the guest had explicitly walked away, so the listing showed as
      // unavailable to everyone — including the guest retrying.
      await releaseHold(reservation);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("cancelPayment error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Send Payment Email manually
export const sendPaymentEmail = async (req, res) => {
  try {
    const { reservationId } = req.body;
    if (!reservationId) return res.status(400).json({ error: "reservationId required" });

    const reservation = await Reservation.findById(reservationId).populate("accommodationId");
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });

    if (reservation.paymentStatus === "paid") {
      return res.status(400).json({ error: "Reservation is already paid" });
    }

    const stripe = getStripe();
    await ensureBookingSnapshot(reservation);
    const amountCents = reservation.totalPriceCents || Math.round((reservation.totalPrice || 0) * 100);

    // Map language
    const language = reservation.language || "sk";
    const stripeLocaleMap = { en: "en", sk: "sk" };
    const locale = stripeLocaleMap[language] || "auto";

    // Create new session
    const session = await stripe.checkout.sessions.create({
      // See createCheckoutSession: omitting payment_method_types lets the
      // Dashboard-enabled methods (incl. Apple Pay / Google Pay) apply.
      mode: "payment",
      locale,
      customer_email: reservation.email,
      line_items: [
        {
          price_data: {
            currency: reservation.currency || DEFAULT_CURRENCY,
            product_data: {
              name: `Reservation #${reservationId} - ${reservation.name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        reservationId: reservation._id.toString(),
        hostId: reservation.accommodationProvider?.toString() || "",
        language,
      },
      payment_intent_data: {
        metadata: {
          reservationId: reservation._id.toString(),
          hostId: reservation.accommodationProvider?.toString() || "",
        },
      },
      success_url: `${process.env.CLIENT_SITE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_SITE_URL}/payment-cancel`,
    });

    // Save session ID
    reservation.checkoutSessionId = session.id;
    await reservation.save();

    // Data Preparation for Email
    const accommodationName = reservation.accommodationId?.name || "Accommodation";

    // Format Dates: DD / MM / YYYY
    const formatDate = (dateString) => {
      const d = new Date(dateString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day} / ${month} / ${year}`; // Explicit space as requested
    };

    const checkInStr = formatDate(reservation.checkInDate);
    const checkOutStr = formatDate(reservation.checkOutDate);

    // Calculate Nights
    const diffTime = Math.abs(new Date(reservation.checkOutDate) - new Date(reservation.checkInDate));
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate Guests - determine if it's a number or array length
    let guestCount = 1;
    if (Array.isArray(reservation.guests)) {
      guestCount = reservation.guests.length;
    } else if (reservation.numberOfGuests) {
      guestCount = reservation.numberOfGuests;
    } else if (reservation.guests && typeof reservation.guests === 'number') {
      guestCount = reservation.guests;
    }

    // Send Email
    const transporter = getTransporter();

    // Translations
    const t = {
      en: {
        subject: `Payment Request: ${accommodationName}`,
        title: "Complete Your Payment",
        greeting: `Hi ${reservation.name},`,
        message: `Your reservation at <strong>${accommodationName}</strong> is pending payment. Please verify the details below and proceed to payment to secure your booking.`,
        detailsTitle: "Reservation Details",
        checkIn: "Check-in",
        checkOut: "Check-out",
        nights: "Nights",
        guests: "Guests",
        totalPrice: "Total Price",
        buttonText: "Pay Now",
        expires: "Link expires in 24 hours.",
        regards: "Best regards,<br/>The Putko Team"
      },
      sk: {
        subject: `Žiadosť o platbu: ${accommodationName}`,
        title: "Dokončite svoju platbu",
        greeting: `Ahoj ${reservation.name},`,
        message: `Vaša rezervácia v <strong>${accommodationName}</strong> čaká na platbu. Skontrolujte prosím údaje nižšie a pokračujte k platbe pre potvrdenie rezervácie.`,
        detailsTitle: "Detaily rezervácie",
        checkIn: "Príchod",
        checkOut: "Odchod",
        nights: "Nocí",
        guests: "Hostia",
        totalPrice: "Celková cena",
        buttonText: "Zaplatiť teraz",
        expires: "Odkaz vyprší do 24 hodín.",
        regards: "S pozdravom,<br/>Tím Putko"
      }
    };

    const text = t[language] || t.en;

    const mailOptions = {
      from: MAIL_FROM,
      to: reservation.email,
      subject: text.subject,
      attachments: logoAttachments(),
      html: brandShell({
        preheader: `${checkInStr} – ${checkOutStr} · €${reservation.totalPrice}`,
        title: text.title,
        bodyHtml: `
          <p style="margin:0 0 14px 0;">${text.greeting}</p>
          <p style="margin:0 0 4px 0;">${text.message}</p>
          ${section(
            text.detailsTitle,
            detailTable([
              [text.checkIn, checkInStr],
              [text.checkOut, checkOutStr],
              [text.nights, String(nights)],
              [text.guests, String(guestCount)],
              [text.totalPrice, `€${reservation.totalPrice}`],
            ])
          )}
          ${button(session.url, text.buttonText)}
          ${callout(text.expires, "warning")}`,
      }),
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "Payment email sent successfully" });

  } catch (err) {
    console.error("sendPaymentEmail error:", err);
    res.status(500).json({ error: err.message || "Failed to send payment email" });
  }
};
