import cron from "node-cron";
import { getTransporter, MAIL_FROM } from "./mailer.js";
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

// Schedule cleanup task to run every 5 seconds
cron.schedule("*/5 * * * * *", async () => {
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
    const reservationsToDelete = await Reservation.find({ accommodationId: { $nin: validAccommodationIds } });

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

    // Delete reservations from main collection
    const resultReservations = await Reservation.deleteMany({ accommodationId: { $nin: validAccommodationIds } });
    console.log(`Deleted ${resultReservations.deletedCount} reservations with invalid accommodationId.`);
    
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
});

export default cron;
