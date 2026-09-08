// utils/mailer.js
// The one shared transporter for the whole application.
//
// Credentials come from the environment only. The SMTP password used to be a
// literal in eight different files plus a fallback here, which meant rotating
// it in the environment changed nothing — every one of those call sites kept
// sending with the old one. There is no fallback now: a missing SMTP_PASS is a
// configuration error, and failing loudly beats silently using a leaked secret.
import nodemailer from "nodemailer";
import { ADMIN_ALERT_EMAIL } from "../config/payments.js";

let cached = null;

export function getTransporter() {
  if (!cached) {
    const pass = process.env.SMTP_PASS;

    if (!pass) {
      // Surfaced once, at first use, rather than as an opaque SMTP auth failure.
      console.error(
        "[mailer] SMTP_PASS is not set — outgoing email will fail. Set it in the environment."
      );
    }

    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.websupport.sk",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || "support@putko.sk",
        pass,
      },
    });
  }
  return cached;
}

export const MAIL_FROM = '"Putko Support" <support@putko.sk>';

/**
 * Operational alert to the admin mailbox. Never throws — an alert failing must
 * not take down the flow that raised it.
 */
export async function alertAdmin(subject, details = {}) {
  const body = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color:#c0392b;">Putko alert: ${subject}</h2>
      <pre style="background:#f6f6f6;padding:12px;border-radius:6px;white-space:pre-wrap;">${
        typeof details === "string" ? details : JSON.stringify(details, null, 2)
      }</pre>
      <p style="color:#777;font-size:13px;">Sent ${new Date().toISOString()}</p>
    </div>`;

  console.error(`[admin-alert] ${subject}`, details);

  try {
    await getTransporter().sendMail({
      from: MAIL_FROM,
      to: ADMIN_ALERT_EMAIL,
      subject: `[Putko] ${subject}`,
      html: body,
    });
  } catch (err) {
    console.error("alertAdmin: failed to send alert email:", err.message);
  }
}
