// utils/repairReservationAmounts.js
//
// One-off migration for reservations paid before the fee fields were recorded
// correctly (or recorded as 0 because the Stripe fee was read from the removed
// `charges` field). This used to run inline inside the payout endpoint, which
// meant a payout silently rewrote financial records. It is a script now.
//
// Usage:
//   node utils/repairReservationAmounts.js          # report only
//   node utils/repairReservationAmounts.js --apply  # write changes

import mongoose from "mongoose";
import dotenv from "dotenv";
import Reservation from "../models/Reservation.js";
import { getStripe, resolveChargeAndFee, capturedAmountCents } from "./stripeHelpers.js";
import { calculateFees, DEFAULT_CURRENCY } from "../config/payments.js";

dotenv.config();

export async function repairReservationAmounts({ apply = false } = {}) {
  const stripe = getStripe();

  const broken = await Reservation.find({
    paymentStatus: "paid",
    payoutStatus: { $ne: "released" },
    $or: [
      { hostAmountCents: { $in: [null, 0] } },
      { totalPriceCents: { $in: [null, 0] } },
    ],
  });

  const results = [];

  for (const reservation of broken) {
    try {
      let paymentIntentId = reservation.paymentIntentId;

      if (!paymentIntentId && reservation.checkoutSessionId) {
        const session = await stripe.checkout.sessions.retrieve(reservation.checkoutSessionId);
        paymentIntentId = session?.payment_intent;
      }
      if (!paymentIntentId) {
        results.push({ id: String(reservation._id), status: "no_payment_intent" });
        continue;
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge.balance_transaction"],
      });

      const { charge, stripeFeeCents } = await resolveChargeAndFee(stripe, paymentIntent);
      const totalAmountCents = capturedAmountCents(paymentIntent);
      const { platformFeeCents, hostPayoutCents } = calculateFees(totalAmountCents, stripeFeeCents);

      const change = {
        id: String(reservation._id),
        status: "repairable",
        before: {
          totalPriceCents: reservation.totalPriceCents,
          hostAmountCents: reservation.hostAmountCents,
          stripeFeeCents: reservation.stripeFeeCents,
        },
        after: {
          totalPriceCents: totalAmountCents,
          hostAmountCents: hostPayoutCents,
          stripeFeeCents,
          platformFeeCents,
        },
      };

      if (apply) {
        reservation.totalPriceCents = totalAmountCents;
        reservation.stripeFeeCents = stripeFeeCents;
        reservation.platformFeeCents = platformFeeCents;
        reservation.hostAmountCents = hostPayoutCents;
        reservation.paymentIntentId = paymentIntent.id;
        reservation.currency = paymentIntent.currency || DEFAULT_CURRENCY;
        if (charge) reservation.chargeId = charge.id;
        await reservation.save();
        change.status = "repaired";
      }

      results.push(change);
    } catch (err) {
      results.push({ id: String(reservation._id), status: "error", error: err.message });
    }
  }

  return results;
}

// Executed directly rather than imported.
if (process.argv[1] && process.argv[1].endsWith("repairReservationAmounts.js")) {
  const apply = process.argv.includes("--apply");

  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      const results = await repairReservationAmounts({ apply });
      console.log(JSON.stringify(results, null, 2));
      console.log(
        `\n${results.length} reservation(s) examined. Mode: ${apply ? "APPLIED" : "DRY RUN (pass --apply to write)"}`
      );
      await mongoose.disconnect();
    })
    .catch((err) => {
      console.error("repairReservationAmounts failed:", err);
      process.exit(1);
    });
}
