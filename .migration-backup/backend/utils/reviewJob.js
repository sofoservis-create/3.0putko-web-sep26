// reviewJob.js
import cron from "node-cron";
import { getTransporter } from "./mailer.js";
import { brandShell, button, esc, logoAttachments } from "./emailLayout.js";
import Reservation from "../models/Reservation.js";
import dotenv from "dotenv";

dotenv.config();

console.log("✅ reviewJob.js loaded");

// Resolved at send time, not at import time — see the note in cleanupJob.js.
// getTransporter memoises, so calling it before the environment is loaded would
// poison the transporter for every other caller too.
const transporter = () => getTransporter();

export const startReviewJob = () => {
  cron.schedule("*/10 * * * * *", async () => {
    try {
      console.log("🔄 Running review cron...");
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

      const reservations = await Reservation.find({
        isApproved: "approved",
        reviewEmailSent: false, // ✅ only those not emailed
        checkOutDate: { $gte: startOfToday, $lt: startOfTomorrow },
      });

      for (const res of reservations) {
       const mailOptions = {
        from: '"Putko Support" <support@putko.sk>',
        to: res.email, // ✅ send to guest’s email from reservation model
        subject: "⭐ We’d love your review!",
        text: `Hi ${res.name}, thanks for staying with us!`,

        attachments: logoAttachments(),
        html: brandShell({
          preheader: "Your opinion helps future guests find the right place.",
          title: "Thank you for staying with us!",
          bodyHtml:
            `<p style="margin:0 0 14px 0;">Hi <strong>${esc(res.name)}</strong>,</p>` +
            `<p style="margin:0 0 14px 0;">We hope you enjoyed your stay. Your opinion means a lot to us and helps future guests.</p>` +
            `<p style="margin:0;">Please take a moment to share your review and rating.</p>` +
            button(`${process.env.CLIENT_SITE_URL}/Review/${res.accommodationId.toString()}`, "Leave a Review"),
        }),
        };



        await transporter().sendMail(mailOptions);
        console.log(`✅ Review email sent for ${res.name}`);

        // ✅ mark as sent
        res.reviewEmailSent = true;
        await res.save();
      }
    } catch (err) {
      console.error("❌ Error in review cron:", err);
    }
  });
};
