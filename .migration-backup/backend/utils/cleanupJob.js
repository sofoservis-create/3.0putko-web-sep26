import cron from "node-cron";
import { getTransporter, MAIL_FROM, alertAdmin } from "./mailer.js";
import { brandShell, callout, detailTable, esc, section, logoAttachments } from "./emailLayout.js";
import Accommodation from "../models/Accommodation.js";
import Host from "../models/Host.js";
import Reservation from "../models/Reservation.js";
import DeletedAccommodation from "../models/DeletedAccommodation.js";
import DeletedReservation from "../models/DeletedReservation.js";

// The transporter is resolved at SEND time, not at import time. Calling it here
// at module scope ran before the environment was loaded and then cached a
// transporter with no credentials — for every other caller too, since
// getTransporter memoises.

// Function to send email
const sendEmail = async (email, reservation) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: MAIL_FROM,
    to: reservation.email,
    subject: "Zrušenie rezervácie",
    attachments: logoAttachments(),
    html: brandShell({
      preheader: "Vaša rezervácia bola zrušená — ubytovanie už nie je dostupné.",
      title: "Rezervácia bola zrušená",
      bodyHtml: `
        <p style="margin:0 0 14px 0;">Vážený/á <strong>${esc(reservation.name)}</strong>,</p>
        <p style="margin:0 0 4px 0;">
          Ľutujeme, ale vaša rezervácia bola zrušená, pretože ubytovanie už nie je dostupné.
        </p>
        ${section(
          "Detaily rezervácie",
          detailTable([
            ["Príchod", new Date(reservation.checkInDate).toLocaleDateString("sk-SK", { timeZone: "UTC" })],
            ["Odchod", new Date(reservation.checkOutDate).toLocaleDateString("sk-SK", { timeZone: "UTC" })],
            ["Cena", `€${reservation.totalPrice}`],
            ["Počet osôb", String(reservation.numberOfPersons)],
            reservation.phone && ["Telefón", `+${reservation.phone}`],
          ])
        )}
        ${callout("Ospravedlňujeme sa za nepríjemnosti. Ak máte otázky, neváhajte nás kontaktovať.")}`,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Orphan cleanup.
//
// Two things were wrong with this job, and both are severe.
//
// 1. It ran EVERY FIVE SECONDS. Each pass does `Host.distinct`,
//    `Accommodation.distinct`, and two `$nin` scans against the full id list —
//    four unindexable collection scans, seventeen thousand times a day, growing
//    with the catalogue.
//
// 2. It HARD-DELETES reservations whose listing has gone, mails the guest
//    "your reservation is cancelled", and issues no refund. A paid booking is
//    money the platform is holding on the guest's behalf; deleting the record
//    destroys the only evidence of what is owed. A listing removed by its host
//    took its paid bookings with it within five seconds.
//
// Now: hourly, and paid bookings are never touched. They are reported for a
// human to refund and cancel through the ordinary cancellation flow, which
// issues the refund, releases the calendar and writes the DAC7 record.
cron.schedule(process.env.CLEANUP_CRON || "17 * * * *", async () => {
  console.log("Running cleanup task for accommodations and reservations...");

  try {
    // Get all valid host IDs
    const hostIds = await Host.distinct("_id");

    // Find accommodations where userId is not in the host collection
    const accommodationsToDelete = await Accommodation.find({ userId: { $nin: hostIds } });

    // Store deleted accommodations before removing them
    if (accommodationsToDelete.length > 0) {
      const deletedAccommodations = accommodationsToDelete.map(acc => ({
        ...acc.toObject(),
        deletedAt: new Date(),
      }));
      await DeletedAccommodation.insertMany(deletedAccommodations);
    }

    // Delete accommodations from main collection
    const resultAccommodations = await Accommodation.deleteMany({ userId: { $nin: hostIds } });
    console.log(`Deleted ${resultAccommodations.deletedCount} accommodations with invalid userId.`);

    // Get all valid accommodation IDs
    const validAccommodationIds = await Accommodation.distinct("_id");

    // Find reservations where accommodationId does not exist
    const orphanedReservations = await Reservation.find({ accommodationId: { $nin: validAccommodationIds } });

    // Money the guest has paid is never deleted by a cron. A paid booking whose
    // listing has vanished needs a REFUND, which this job cannot issue and must
    // not silently skip, so it is left in place and reported.
    const paidOrphans = orphanedReservations.filter((r) => r.paymentStatus === "paid" && !r.refundId);
    const reservationsToDelete = orphanedReservations.filter((r) => !paidOrphans.includes(r));

    if (paidOrphans.length) {
      console.error(
        `[cleanup] ${paidOrphans.length} PAID reservation(s) have no listing and were NOT deleted — ` +
          `each needs a refund: ${paidOrphans.map((r) => r._id).join(", ")}`
      );
      await alertAdmin("Paid bookings orphaned by a deleted listing", {
        count: paidOrphans.length,
        reservationIds: paidOrphans.map((r) => String(r._id)),
        note: "Refund and cancel these through /api/cancellation/:reservationId. The cleanup job will not touch them.",
      });
    }

    // Send emails before deleting reservations
    for (const reservation of reservationsToDelete) {
      if (reservation.email) {
        await sendEmail(reservation.email, reservation);
      }
    }

    // Store deleted reservations before removing them (avoiding duplicates)
    if (reservationsToDelete.length > 0) {
      for (const res of reservationsToDelete) {
        try {
          await DeletedReservation.updateOne(
            { _id: res._id }, // Match by _id
            { $setOnInsert: { ...res.toObject(), deletedAt: new Date() } }, // Insert only if not exists
            { upsert: true } // Ensure it inserts only if missing
          );
        } catch (error) {
          console.error("Error inserting deleted reservation:", error);
        }
      }
    }

    // Delete reservations from main collection — only the unpaid ones.
    const resultReservations = await Reservation.deleteMany({
      _id: { $in: reservationsToDelete.map((r) => r._id) },
    });
    console.log(`Deleted ${resultReservations.deletedCount} reservations with invalid accommodationId.`);
    
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
});

export default cron;
