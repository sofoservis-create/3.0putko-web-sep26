// utils/payoutJob.js
// Daily sweep that releases host payouts once the hold window has elapsed.
//
// Previously payouts only happened when a host pressed "Withdraw", which meant
// unclaimed money could sit on the Stripe balance indefinitely. The sweep and
// the manual button share the same core (payoutReservation), so both apply
// identical eligibility rules.

import cron from "node-cron";
import { subHours } from "date-fns";
import Reservation from "../models/Reservation.js";
import { payoutReservation } from "../Controllers/PaymentController.js";
import { alertAdmin } from "../utils/mailer.js";
import {
  PAYOUT_DELAY_HOURS,
  PAYOUT_CRON,
  PAYOUT_CRON_ENABLED,
  BUSINESS_TIMEZONE,
} from "../config/payments.js";

export async function processPayouts() {
  // Coarse DB filter; payoutReservation re-checks the window precisely in the
  // business timezone, so a DST shift cannot let a payout out early.
  const cutoff = subHours(new Date(), PAYOUT_DELAY_HOURS);

  const eligible = await Reservation.find({
    paymentStatus: "paid",
    payoutStatus: { $ne: "released" },
    transferId: { $in: [null, undefined] },
    isApproved: { $ne: "cancelled" },
    checkInDate: { $lte: cutoff },
  }).limit(500);

  const summary = { considered: eligible.length, released: 0, skipped: 0, failed: 0 };

  for (const reservation of eligible) {
    try {
      const result = await payoutReservation(reservation);
      if (result.ok) {
        summary.released++;
      } else {
        summary.skipped++;
        // Only surface reasons that need a human; "locked" is routine.
        if (result.code !== "locked") {
          console.log(
            `[payout-sweep] skipped ${reservation._id}: ${result.code} — ${result.error}`
          );
        }
      }
    } catch (err) {
      summary.failed++;
      console.error(`[payout-sweep] failed ${reservation._id}:`, err.message);
      await alertAdmin("Host payout failed during daily sweep", {
        reservationId: reservation._id.toString(),
        error: err.message,
      });
    }
  }

  console.log(`[payout-sweep] ${JSON.stringify(summary)}`);
  return summary;
}

export function startPayoutJob() {
  if (!PAYOUT_CRON_ENABLED) {
    console.log("[payout-sweep] disabled via PAYOUT_CRON_ENABLED=false");
    return null;
  }

  const task = cron.schedule(
    PAYOUT_CRON,
    async () => {
      console.log(`[payout-sweep] starting (${new Date().toISOString()})`);
      try {
        await processPayouts();
      } catch (err) {
        console.error("[payout-sweep] run failed:", err);
        await alertAdmin("Payout sweep crashed", { error: err.message });
      }
    },
    { timezone: BUSINESS_TIMEZONE }
  );

  console.log(`[payout-sweep] scheduled "${PAYOUT_CRON}" (${BUSINESS_TIMEZONE})`);
  return task;
}
