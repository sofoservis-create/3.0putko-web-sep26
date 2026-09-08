// Controllers/ReceiptController.js
//
// Putko does NOT invoice for the stay. The rental contract is between guest and
// host, and only the host may legally invoice the accommodation service.
// What Putko issues is a payment RECEIPT — proof that the guest paid — which
// deliberately carries no tax-invoice fields (no VAT breakdown, no invoice
// number, no supplier tax identity). A business guest who needs a real invoice
// asks the host, via requestHostInvoice below.

import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import Reservation from "../models/Reservation.js";
import Message from "../models/messageModel.js";
import { getTransporter, MAIL_FROM } from "../utils/mailer.js";
import { brandShell, callout, esc, logoAttachments } from "../utils/emailLayout.js";
import { toBusinessDateString, toCalendarDateString } from "../utils/timezone.js";

const money = (cents, currency = "EUR") =>
  `${(Math.round(cents || 0) / 100).toFixed(2)} ${currency.toUpperCase()}`;

/** Stable, human-quotable receipt reference. Not an invoice number. */
export const receiptNumber = (reservation) =>
  `PUTKO-R-${String(reservation._id).slice(-8).toUpperCase()}`;

function buildReceiptPdf(reservation, accommodation, lang = "sk") {
  const t = {
    en: {
      title: "Payment Receipt",
      notInvoice:
        "This is a confirmation of payment, not a tax invoice. For an invoice for the accommodation service, please contact your host.",
      receiptNo: "Receipt number",
      issued: "Issued",
      guest: "Guest",
      property: "Property",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: "Nights",
      guests: "Guests",
      paid: "Amount paid",
      method: "Payment method",
      card: "Card (via Stripe)",
      status: "Status",
      statusPaid: "Paid",
      footer: "Putko facilitates the booking and payment. The rental agreement is between the guest and the host.",
    },
    sk: {
      title: "Potvrdenie o platbe",
      notInvoice:
        "Toto je potvrdenie o platbe, nie daňový doklad. O faktúru za ubytovacie služby požiadajte svojho hostiteľa.",
      receiptNo: "Číslo potvrdenia",
      issued: "Vystavené",
      guest: "Hosť",
      property: "Ubytovanie",
      checkIn: "Príchod",
      checkOut: "Odchod",
      nights: "Nocí",
      guests: "Hostia",
      paid: "Zaplatená suma",
      method: "Spôsob platby",
      card: "Karta (cez Stripe)",
      status: "Stav",
      statusPaid: "Zaplatené",
      footer: "Putko sprostredkúva rezerváciu a platbu. Nájomná zmluva je medzi hosťom a hostiteľom.",
    },
  }[lang === "en" ? "en" : "sk"];

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const nights = Math.max(
    1,
    Math.round(
      (new Date(reservation.checkOutDate) - new Date(reservation.checkInDate)) /
        (1000 * 60 * 60 * 24)
    )
  );

  doc.fontSize(22).fillColor("#2E7D32").text("Putko", { align: "left" });
  doc.moveDown(0.2);
  doc.fontSize(18).fillColor("#222").text(t.title);
  doc.moveDown(0.5);

  doc.fontSize(9).fillColor("#777").text(t.notInvoice, { width: 495 });
  doc.moveDown(1);

  const row = (label, value) => {
    doc.fontSize(10).fillColor("#666").text(label, { continued: true });
    doc.fillColor("#111").text(`   ${value ?? "—"}`, { align: "right" });
    doc.moveDown(0.35);
  };

  doc.fillColor("#111").fontSize(11);
  row(t.receiptNo, receiptNumber(reservation));
  // `paidAt` is a genuine instant, so it is read in the business timezone.
  row(t.issued, toBusinessDateString(reservation.paidAt || new Date()));
  row(t.guest, reservation.name);
  row(t.property, accommodation?.name || "—");
  // Check-in/out are calendar dates. Reading them as instants showed a guest who
  // booked 10–12 a receipt saying 9–11, because their picker had serialised
  // local midnight and Bratislava is behind them.
  row(t.checkIn, toCalendarDateString(reservation.checkInDate));
  row(t.checkOut, toCalendarDateString(reservation.checkOutDate));
  row(t.nights, nights);
  row(t.guests, reservation.numberOfPersons);

  doc.moveDown(0.6);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e0e0e0").stroke();
  doc.moveDown(0.6);

  row(t.method, t.card);
  row(t.status, t.statusPaid);

  doc.moveDown(0.3);
  doc
    .fontSize(14)
    .fillColor("#2E7D32")
    .text(`${t.paid}: ${money(reservation.grossCents(), reservation.currency || "EUR")}`, {
      align: "right",
    });

  doc.moveDown(2);
  doc.fontSize(8).fillColor("#999").text(t.footer, { width: 495 });

  return doc;
}

/**
 * GET /api/receipts/:reservationId
 * Streams the receipt PDF. Only issued once the payment has actually settled.
 */
export const downloadReceipt = async (req, res) => {
  try {
    const { reservationId } = req.params;

    // Access already checked by requireReservationAccess; re-read to populate.
    const reservation = await Reservation.findById(reservationId).populate("accommodationId");
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });

    if (reservation.paymentStatus !== "paid" && reservation.paymentStatus !== "partially_refunded") {
      return res.status(400).json({ error: "No settled payment for this reservation" });
    }

    const lang = req.query.lang || reservation.language || "sk";
    const doc = buildReceiptPdf(reservation, reservation.accommodationId, lang);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${receiptNumber(reservation)}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error("downloadReceipt error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/receipts/:reservationId/request-invoice
 *
 * Putko cannot issue an invoice for the stay, so this passes the request to the
 * host: a chat message plus an email. Body may carry the guest's billing details.
 */
export const requestHostInvoice = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { companyName, ico, dic, icDph, address, note } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      return res.status(400).json({ error: "Invalid reservation ID" });
    }

    const reservation = await Reservation.findById(reservationId).populate({
      path: "accommodationId",
      populate: { path: "userId" },
    });
    if (!reservation) return res.status(404).json({ error: "Reservation not found" });
    if (reservation.paymentStatus !== "paid") {
      return res.status(400).json({ error: "Reservation is not paid" });
    }

    const host = reservation.accommodationId?.userId;
    if (!host) return res.status(400).json({ error: "Host not found for this reservation" });

    const billingLines = [
      companyName && `Company: ${companyName}`,
      ico && `IČO: ${ico}`,
      dic && `DIČ: ${dic}`,
      icDph && `IČ DPH: ${icDph}`,
      address && `Address: ${address}`,
      note && `Note: ${note}`,
    ].filter(Boolean);

    const body = [
      `Guest ${reservation.name} has requested an invoice for the stay at ${reservation.accommodationId?.name || "your property"}.`,
      `Booking: ${receiptNumber(reservation)} (${toCalendarDateString(reservation.checkInDate)} → ${toCalendarDateString(reservation.checkOutDate)})`,
      `Amount paid: ${money(reservation.grossCents(), reservation.currency || "EUR")}`,
      billingLines.length ? `\nBilling details:\n${billingLines.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // In-app message, so the request lives in the existing host↔guest thread.
    // Reservations do not always carry a guest user id (guests can book without
    // an account), and Message requires ObjectIds — so this is best-effort and
    // the email below is the guaranteed delivery path.
    const guestUserId = req.body?.guestUserId || reservation.userId;
    if (guestUserId && mongoose.Types.ObjectId.isValid(guestUserId)) {
      try {
        await Message.create({
          message: body,
          sender: guestUserId,
          reciver: host._id,
          users: [guestUserId, host._id],
        });
      } catch (msgErr) {
        console.error("requestHostInvoice: could not persist chat message:", msgErr.message);
      }
    }

    await getTransporter().sendMail({
      from: MAIL_FROM,
      to: host.email,
      replyTo: reservation.email,
      subject: `Invoice requested by ${reservation.name}`,
      attachments: logoAttachments(),
      html: brandShell({
        preheader: `${reservation.name} has asked you for an invoice.`,
        title: "Invoice requested",
        bodyHtml: `
          <div style="white-space:pre-wrap;background:#F1F7F3;border-left:4px solid #238869;
                      border-radius:6px;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;
                      font-size:14px;line-height:1.6;color:#2A2A2A;">${esc(body)}</div>
          ${callout(
            `Putko does not issue invoices for the stay — only the host can. ` +
              `Please send the invoice directly to <strong>${esc(reservation.email)}</strong>.`,
            "warning"
          )}`,
      }),
    });

    res.json({ success: true, message: "Invoice request sent to the host" });
  } catch (err) {
    console.error("requestHostInvoice error:", err);
    res.status(500).json({ error: err.message });
  }
};
