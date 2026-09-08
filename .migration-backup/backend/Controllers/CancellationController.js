// Controllers/CancellationController.js
import mongoose from "mongoose";
import Reservation from "../models/Reservation.js";
import Accommodation from "../models/Accommodation.js";
import Host from "../models/Host.js";
import {
  calculateRefundCents,
  describeTiers,
  getTiersSnapshot,
  getPolicyNameSnapshot,
} from "../utils/cancellationPolicy.js";
import { getStripe, logStripeCall } from "../utils/stripeHelpers.js";
import { getTransporter, MAIL_FROM, alertAdmin } from "../utils/mailer.js";
import { brandShell, callout, detailTable, logoAttachments } from "../utils/emailLayout.js";
import { recordRefundForDac7 } from "../utils/dac7.js";
import {
  releaseCalendarForReservation,
  resolveHostForReservation,
} from "./PaymentController.js";

/**
 * GET /api/cancellation/preview/:reservationId
 * What would actually happen if THIS caller cancelled right now. Read-only.
 *
 * The amount depends on who is asking, and must be worked out the same way
 * `cancelBooking` works it out — otherwise the dialog and the outcome disagree.
 * They used to: the preview always returned the guest's policy figure, so a host
 * cancelling saw "refund €0.00", confirmed, and the guest was refunded in full.
 * The number on the button and the number in the confirmation said different
 * things about the same action.
 */
export const previewCancellation = async (req, res) => {
  try {
    // Loaded and access-checked by requireReservationAccess.
    const reservation = req.reservation;
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });

    const actor = req.actorRole; // 'guest' | 'host' | 'admin', from the verified identity
    const outcome = calculateRefundCents(reservation);
    const isPaid = reservation.paymentStatus === "paid";

    if (!outcome) {
      return res.json({
        cancellable: false,
        reason: "no_policy_snapshot",
        message:
          "This booking predates automated cancellation handling. Contact support to cancel.",
      });
    }

    // Mirrors cancelBooking: a host cancellation refunds the guest in full,
    // everyone else follows the snapshotted policy. If these two ever disagree,
    // the dialog shows one number and the button does another.
    const fullRefund = actor === "host";
    const refundAmountCents = isPaid
      ? (fullRefund ? reservation.grossCents() : outcome.refundCents)
      : 0;
    const refundPercent = isPaid ? (fullRefund ? 100 : outcome.refundPercent) : 0;

    res.json({
      cancellable: reservation.isApproved !== "cancelled" && !reservation.transferId,
      policy: reservation.cancellationPolicySnapshot,
      tiers: describeTiers(reservation.cancellationTiersSnapshot),
      refundAmountCents,
      refundPercent,
      cancelledBy: actor,
      hoursUntilCheckIn: outcome.hoursUntilCheckIn,
      totalPaidCents: reservation.grossCents(),
      isPaid,
      currency: reservation.currency || "eur",
      alreadyPaidOut: Boolean(reservation.transferId),
    });
  } catch (err) {
    console.error("previewCancellation error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/cancellation/policy/:accommodationId
 * The policy a guest would be agreeing to if they booked this listing now.
 */
export const getListingPolicy = async (req, res) => {
  try {
    const { accommodationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(accommodationId)) {
      return res.status(400).json({ error: "Invalid accommodation ID" });
    }

    const listing = await Accommodation.findById(accommodationId).select(
      "cancellationPolicy cancellationPolicyType customPolicyTiers"
    );
    if (!listing) return res.status(404).json({ error: "Accommodation not found" });

    res.json({
      policy: getPolicyNameSnapshot(listing),
      description: listing.cancellationPolicy || "",
      tiers: describeTiers(getTiersSnapshot(listing)),
    });
  } catch (err) {
    console.error("getListingPolicy error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Core cancellation. Refund is computed from the reservation's OWN snapshot —
 * never by re-reading the listing, which the host may have edited since.
 *
 * @param {object} reservation
 * @param {'guest'|'host'|'admin'} cancelledBy
 * @param {object} options { reason, overrideRefundCents }
 */
export const cancelBooking = async (reservation, cancelledBy, options = {}) => {
  const stripe = getStripe();
  const { reason, overrideRefundCents } = options;

  if (reservation.isApproved === "cancelled") {
    return { ok: false, code: "already_cancelled", error: "Reservation is already cancelled" };
  }

  // Once the money has left for the host it cannot simply be refunded from the
  // platform balance — that needs a transfer reversal, which is a separate flow
  // with its own approval. Refuse rather than silently under-refunding.
  if (reservation.transferId) {
    return {
      ok: false,
      code: "already_paid_out",
      error: "Booking already paid out to the host — requires the transfer reversal flow",
    };
  }

  let refundCents = 0;

  if (reservation.paymentStatus === "paid") {
    if (cancelledBy === "admin" && overrideRefundCents != null) {
      refundCents = Math.max(0, Math.min(Math.round(overrideRefundCents), reservation.grossCents()));
    } else if (cancelledBy === "host") {
      // A HOST cancellation is a full refund, always.
      //
      // The cancellation policy is a bargain the GUEST accepted about the guest
      // changing their mind. It has nothing to say about the host withdrawing a
      // stay the guest already paid for. Applying the guest's tier here — which
      // is what this used to do, by a product decision recorded on 2026-08-04 —
      // means a host who cancels the week before arrival keeps the guest's money
      // AND the guest has nowhere to sleep. That is not a defensible position
      // for an intermediary under Slovak consumer law (§ 3 zákona č. 250/2007
      // Z. z.), and it is the opposite of what every comparable platform does.
      refundCents = reservation.grossCents();
    } else {
      const outcome = calculateRefundCents(reservation);
      if (!outcome) {
        return {
          ok: false,
          code: "no_policy_snapshot",
          error: "No cancellation policy snapshot on this booking — admin override required",
        };
      }
      refundCents = outcome.refundCents;
    }
  }

  if (refundCents > 0) {
    if (!reservation.paymentIntentId) {
      return { ok: false, code: "no_payment_intent", error: "No payment intent to refund" };
    }

    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: reservation.paymentIntentId,
          amount: refundCents,
          metadata: {
            reservationId: reservation._id.toString(),
            cancelledBy,
          },
        },
        {
          // Deterministic per booking: a retry returns the original refund
          // rather than issuing a second one.
          idempotencyKey: `refund_booking_${reservation._id}`,
        }
      );

      reservation.refundId = refund.id;
      logStripeCall("refunds.create", {
        reservationId: reservation._id.toString(),
        refundCents,
        cancelledBy,
      });
    } catch (err) {
      logStripeCall("refunds.create", { reservationId: reservation._id.toString() }, "error", err);
      await alertAdmin("Refund failed", {
        reservationId: reservation._id.toString(),
        refundCents,
        error: err.message,
      });
      return { ok: false, code: "refund_failed", error: err.message };
    }
  }

  reservation.isApproved = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancelledBy = cancelledBy;
  reservation.cancellationReason = reason;
  reservation.refundAmountCents = refundCents;
  // A cancelled booking must never be swept up by the payout job.
  reservation.payoutStatus = "pending";

  if (reservation.paymentStatus === "paid" && refundCents > 0) {
    reservation.paymentStatus =
      refundCents >= reservation.grossCents() ? "refunded" : "partially_refunded";
  }

  await reservation.save();

  // Free the dates so the listing can be rebooked.
  await releaseCalendarForReservation(reservation);

  // Keep the annual report honest about money that came back.
  if (refundCents > 0) {
    const { host } = await resolveHostForReservation(reservation);
    if (host) await recordRefundForDac7(reservation, host, refundCents);
  }

  await sendCancellationEmails(reservation, cancelledBy, refundCents);

  // Three host cancellations in a rolling twelve months deactivates the account.
  if (cancelledBy === "host") await enforceHostCancellationLimit(reservation);

  return { ok: true, refundCents, refundId: reservation.refundId };
};

/** How many host cancellations in twelve months cost the account. */
const HOST_CANCELLATION_LIMIT = Number(process.env.HOST_CANCELLATION_LIMIT || 3);

/**
 * Deactivate a host who keeps cancelling on guests.
 *
 * Nothing counted these before, so the rule existed on paper only. A host could
 * cancel every booking they disliked the look of, indefinitely, and the platform
 * kept sending them guests.
 *
 * Deactivation is recorded on the host and their listings are taken out of the
 * catalogue; it is not a deletion, and an admin can reverse it.
 */
async function enforceHostCancellationLimit(reservation) {
  try {
    const hostId = reservation.accommodationProvider;
    if (!hostId) return;

    const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const count = await Reservation.countDocuments({
      accommodationProvider: hostId,
      cancelledBy: "host",
      cancelledAt: { $gte: since },
      // A request the host declined was never a confirmed booking, so it is not
      // a cancellation in the sense this rule is about.
      paymentStatus: { $in: ["refunded", "partially_refunded", "paid"] },
    });

    if (count < HOST_CANCELLATION_LIMIT) return;

    const host = await Host.findById(hostId);
    if (!host || host.deactivatedAt) return;

    host.deactivatedAt = new Date();
    host.deactivationReason = `${count} host cancellations in 12 months`;
    await host.save();

    await Accommodation.updateMany(
      { userId: hostId },
      { $set: { stripeEnabled: false, listingStatusUpdatedAt: new Date() } }
    );

    await alertAdmin("Host deactivated for repeated cancellations", {
      hostId: String(hostId),
      cancellations: count,
      windowDays: 365,
    });
  } catch (err) {
    // Never let the counter break the cancellation the guest is waiting on.
    console.error("enforceHostCancellationLimit failed:", err.message);
  }
}

/**
 * POST /api/cancellation/:reservationId
 * body: { cancelledBy: 'guest'|'host'|'admin', reason, overrideRefundCents }
 */
export const cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { reason, overrideRefundCents } = req.body || {};

    // The actor comes from the VERIFIED identity that `requireReservationAccess`
    // established, never from the body. Taking it from the body is what let an
    // unauthenticated caller claim `cancelledBy: "host"` and convert a
    // policy-limited refund into a full one.
    const cancelledBy = req.actorRole;

    if (!["guest", "host", "admin"].includes(cancelledBy)) {
      return res.status(403).json({ error: "Cannot determine who is cancelling" });
    }
    // An override is an admin-only escape hatch.
    if (overrideRefundCents != null && cancelledBy !== "admin") {
      return res.status(403).json({ error: "Only an admin may override the refund amount" });
    }

    // Loaded and access-checked by the middleware.
    const reservation = req.reservation;
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });

    const result = await cancelBooking(reservation, cancelledBy, { reason, overrideRefundCents });

    if (!result.ok) {
      return res.status(400).json({ error: result.error, code: result.code });
    }

    res.json({
      success: true,
      refundAmountCents: result.refundCents,
      refundId: result.refundId,
      reservation: await Reservation.findById(reservationId),
    });
  } catch (err) {
    console.error("cancelReservation error:", err);
    res.status(500).json({ error: err.message });
  }
};

/** Notify guest and host that a booking was cancelled. Never throws. */
async function sendCancellationEmails(reservation, cancelledBy, refundCents) {
  try {
    const populated = await Reservation.findById(reservation._id).populate({
      path: "accommodationId",
      populate: { path: "userId" },
    });

    const accommodation = populated?.accommodationId;
    const host = accommodation?.userId;
    const lang = reservation.language === "en" ? "en" : "sk";
    const money = (c) => `€${(c / 100).toFixed(2)}`;

    const t = {
      en: {
        subjectGuest: `Booking cancelled: ${accommodation?.name || ""}`,
        titleGuest: "Your booking has been cancelled",
        byWhom: {
          guest: "You cancelled this booking.",
          host: "The host cancelled this booking.",
          admin: "This booking was cancelled by Putko support.",
        },
        refundLine:
          refundCents > 0
            ? `A refund of ${money(refundCents)} is on its way back to your original payment method. Banks usually take 5–10 working days.`
            : "Under the cancellation policy you agreed to at booking, no refund is due.",
        subjectHost: `Booking cancelled: ${accommodation?.name || ""}`,
        titleHost: "A booking was cancelled",
        hostLine: "The dates have been released and are bookable again.",
        regards: "Best regards,<br/><strong>The Putko Team</strong>",
      },
      sk: {
        subjectGuest: `Rezervácia zrušená: ${accommodation?.name || ""}`,
        titleGuest: "Vaša rezervácia bola zrušená",
        byWhom: {
          guest: "Túto rezerváciu ste zrušili vy.",
          host: "Túto rezerváciu zrušil hostiteľ.",
          admin: "Túto rezerváciu zrušila podpora Putko.",
        },
        refundLine:
          refundCents > 0
            ? `Vrátenie platby vo výške ${money(refundCents)} je na ceste späť na váš pôvodný platobný prostriedok. Bankám to zvyčajne trvá 5–10 pracovných dní.`
            : "Podľa storno podmienok, s ktorými ste súhlasili pri rezervácii, vám nevzniká nárok na vrátenie platby.",
        subjectHost: `Rezervácia zrušená: ${accommodation?.name || ""}`,
        titleHost: "Rezervácia bola zrušená",
        hostLine: "Termíny boli uvoľnené a sú znova dostupné na rezerváciu.",
        regards: "S pozdravom,<br/><strong>Tím Putko</strong>",
      },
    }[lang];

    // The stay, so a host with several bookings knows which one was cancelled
    // — the old message named only the property, which is not enough.
    const day = (d) =>
      d ? new Date(d).toLocaleDateString(lang === "en" ? "en-GB" : "sk-SK", { timeZone: "UTC" }) : "";
    const stay = detailTable([
      accommodation?.name && [lang === "en" ? "Accommodation" : "Ubytovanie", accommodation.name],
      [lang === "en" ? "Dates" : "Termín", `${day(reservation.checkInDate)} – ${day(reservation.checkOutDate)}`],
    ]);

    const transporter = getTransporter();
    const messages = [];

    if (reservation.email) {
      messages.push(
        transporter.sendMail({
          from: MAIL_FROM,
          to: reservation.email,
          subject: t.subjectGuest,
          attachments: logoAttachments(),
          html: brandShell({
            preheader: t.byWhom[cancelledBy],
            title: t.titleGuest,
            bodyHtml: `
              <p style="margin:0 0 14px 0;">${t.byWhom[cancelledBy]}</p>
              ${stay}
              ${callout(t.refundLine, refundCents > 0 ? "info" : "warning")}`,
          }),
        })
      );
    }

    if (host?.email) {
      messages.push(
        transporter.sendMail({
          from: MAIL_FROM,
          to: host.email,
          subject: t.subjectHost,
          attachments: logoAttachments(),
          html: brandShell({
            preheader: t.byWhom[cancelledBy],
            title: t.titleHost,
            bodyHtml: `
              <p style="margin:0 0 14px 0;">${t.byWhom[cancelledBy]}</p>
              ${stay}
              ${callout(t.hostLine)}`,
          }),
        })
      );
    }

    await Promise.all(messages);
  } catch (err) {
    console.error("sendCancellationEmails error:", err.message);
  }
}
