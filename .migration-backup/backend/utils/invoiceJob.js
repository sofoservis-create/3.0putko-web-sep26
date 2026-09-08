// utils/invoiceJob.js
import cron from "node-cron";
import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import Reservation from "../models/Reservation.js";
import Host from "../models/Host.js";
import Invoice from "../models/Invoice.js";
import { alertAdmin } from "./mailer.js";
import { createSuperfakturaInvoice, deliverInvoice } from "./superfaktura.js";
import { logExternalCall } from "./auditLog.js";
import { refreshHostVatRegistration } from "./companyLookup.js";
import {
  BUSINESS_TIMEZONE,
  INVOICE_GENERATION_CRON,
  INVOICE_GENERATION_ENABLED,
  INVOICE_DUE_DAYS,
  splitGrossAmountCents,
  INVOICE_DRY_RUN,
  INVOICE_EMAIL_ENABLED,
} from "../config/payments.js";

const TERMINAL_STATUSES = new Set(["issued", "emailed", "paid"]);

const isDryRun = () =>
  INVOICE_DRY_RUN || String(process.env.INVOICE_DRY_RUN).toLowerCase() === "true";

// ── Helpers ──────────────────────────────────────────────────────────

function buildInvoicePeriod(targetDate) {
  const localTarget = toZonedTime(targetDate, BUSINESS_TIMEZONE);
  const monthStartLocal = startOfMonth(localTarget);
  const monthEndLocal = endOfMonth(localTarget);

  return {
    periodStartUtc: fromZonedTime(monthStartLocal, BUSINESS_TIMEZONE),
    periodEndUtc: fromZonedTime(monthEndLocal, BUSINESS_TIMEZONE),
    invoiceMonth: monthStartLocal.getMonth() + 1,
    invoiceYear: monthStartLocal.getFullYear(),
    periodLabel: format(monthStartLocal, "MM/yyyy"),
    yearMonth: format(monthStartLocal, "yyyy-MM"),
  };
}

function buildHostSnapshot(host) {
  return {
    name: host.name || "",
    lastName: host.lastName || "",
    companyName: host.companyName || "",
    email: host.email || "",
    streetNumber: host.streetNumber || "",
    city: host.city || "",
    zipcode: host.zipcode || "",
    country: host.countryCode || host.country || "",
    billingSubjectType: host.billingSubjectType || "business",
    ico: host.ico || host.idNumber || "",
    dic: host.dic || host.tin || "",
    icDph: host.icDph || host.vatNumber || "",
  };
}

function buildInvoiceDescription(yearMonth) {
  return `Sprostredkovateľský poplatok — ${yearMonth}`;
}

function applyAmounts(invoiceDocument, group) {
  const { netAmountCents, vatAmountCents } = splitGrossAmountCents(group.totalFeeCents);
  invoiceDocument.grossAmountCents = group.totalFeeCents;
  invoiceDocument.netAmountCents = netAmountCents;
  invoiceDocument.vatAmountCents = vatAmountCents;
  invoiceDocument.billedBookings = group.bookingCount;
  invoiceDocument.reservations = group.reservationIds || [];
  return invoiceDocument;
}

function buildHostInvoiceRecord({ host, period, group }) {
  const invoice = new Invoice({
    host: host._id,
    periodStart: period.periodStartUtc,
    periodEnd: period.periodEndUtc,
    invoiceMonth: period.invoiceMonth,
    invoiceYear: period.invoiceYear,
    description: buildInvoiceDescription(period.yearMonth),
    currency: "eur",
    dueDate: addDays(new Date(), INVOICE_DUE_DAYS),
    status: "draft",
    hostSnapshot: buildHostSnapshot(host),
  });
  return applyAmounts(invoice, group);
}

async function saveInvoice(invoiceDocument) {
  try {
    return await invoiceDocument.save();
  } catch (err) {
    if (err?.code === 11000) {
      console.warn(
        `[invoice-job] invoice for host ${invoiceDocument.host} ` +
          `${invoiceDocument.invoiceMonth}/${invoiceDocument.invoiceYear} already exists`
      );
      return null;
    }
    throw err;
  }
}

// ── Core job ─────────────────────────────────────────────────────────

async function invoiceJobForPeriod(period) {
  const { periodStartUtc, periodEndUtc, invoiceMonth, invoiceYear, periodLabel, yearMonth } = period;

  // 1. Find all billable bookings for the period
  const groups = await Reservation.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        platformFeeCents: { $gt: 0 },
        payoutStatus: "released",
        isApproved: { $ne: "cancelled" },
        transferredAt: { $gte: periodStartUtc, $lte: periodEndUtc },
      },
    },
    {
      $group: {
        _id: "$accommodationProvider",
        totalFeeCents: { $sum: "$platformFeeCents" },
        bookingCount: { $sum: 1 },
        reservationIds: { $push: "$_id" },
      },
    },
  ]);

  const hostIds = groups.map((g) => g._id).filter(Boolean);
  const hosts = await Host.find({ _id: { $in: hostIds } });
  const hostById = Object.fromEntries(hosts.map((h) => [h._id.toString(), h]));

  const summary = {
    periodLabel,
    yearMonth,
    generatedAt: new Date().toISOString(),
    hostCount: hostIds.length,
    created: 0,
    emailed: 0,
    failed: 0,
    alreadyExists: 0,
    retried: 0,
    undelivered: 0,
  };

  // 2. Process each host
  for (const group of groups) {
    const hostId = group._id?.toString();
    if (!hostId) {
      summary.failed++;
      await alertAdmin("Invoice generation failed", { reason: "missing_host_reference", periodLabel, group });
      continue;
    }

    const host = hostById[hostId];
    if (!host) {
      summary.failed++;
      await alertAdmin("Invoice generation failed", { reason: "host_not_found", hostId, periodLabel });
      continue;
    }

    // Idempotency: skip already issued invoices
    let invoiceDocument = await Invoice.findOne({ host: host._id, invoiceMonth, invoiceYear });

    if (invoiceDocument && TERMINAL_STATUSES.has(invoiceDocument.status)) {
      // One exception. An invoice created while INVOICE_EMAIL_ENABLED was off
      // exists in SuperFaktúra but was never sent, and `issued` is terminal —
      // so once email is switched on, the monthly run would skip it forever and
      // that host would never receive the invoice for that month.
      //
      // Delivery is retried; creation is NOT. Calling SuperFaktúra again would
      // issue a second tax document for the same period, which is exactly the
      // thing the idempotency check exists to prevent.
      const deliverable =
        INVOICE_EMAIL_ENABLED &&
        invoiceDocument.status === "issued" &&
        !invoiceDocument.emailSentAt &&
        invoiceDocument.externalInvoiceId;

      if (!deliverable) {
        summary.alreadyExists++;
        continue;
      }

      const delivery = await deliverInvoice({
        host,
        invoiceDocument,
        meta: {
          id: invoiceDocument.externalInvoiceId,
          number: invoiceDocument.invoiceNumber,
          pdfUrl: invoiceDocument.pdfUrl || invoiceDocument.externalUrl,
        },
      });

      if (delivery.delivered) {
        invoiceDocument.status = "emailed";
        invoiceDocument.emailSentAt = new Date();
        invoiceDocument.failureReason = undefined;
        summary.emailed++;
      } else {
        invoiceDocument.failureReason = `issued but not delivered: ${delivery.error}`;
        summary.undelivered++;
        await alertAdmin("Previously issued invoice could not be emailed", {
          hostId: host._id.toString(),
          periodLabel,
          invoiceNumber: invoiceDocument.invoiceNumber,
          error: delivery.error,
        });
      }

      await saveInvoice(invoiceDocument);
      continue;
    }

    // Retry previous failed/draft, or create new
    if (invoiceDocument) {
      summary.retried++;
      invoiceDocument.failureReason = undefined;
      invoiceDocument.superfakturaResponse = undefined;
      invoiceDocument.status = "draft";
      invoiceDocument.description = buildInvoiceDescription(yearMonth);
      invoiceDocument.hostSnapshot = buildHostSnapshot(host);
      applyAmounts(invoiceDocument, group);
    } else {
      invoiceDocument = buildHostInvoiceRecord({ host, period, group });
    }

    // Missing billing data → fail
    if (!host.isBillingComplete()) {
      invoiceDocument.status = "failed";
      invoiceDocument.failureReason = "missing_host_billing_details";
      await saveInvoice(invoiceDocument);
      summary.failed++;
      await alertAdmin("Host invoice skipped due to missing billing details", {
        hostId: host._id.toString(),
        periodLabel,
        missingBillingFields: host.missingBillingFields?.() || [],
      });
      continue;
    }

    try {
      // Dry-run: leave as draft, do not call SuperFaktúra
      await refreshHostVatRegistration(host);
      invoiceDocument.hostSnapshot = buildHostSnapshot(host);

      if (isDryRun()) {
        invoiceDocument.status = "draft";
        invoiceDocument.superfakturaResponse = { dryRun: true, at: new Date().toISOString() };
        await saveInvoice(invoiceDocument);
        summary.created++;
        logExternalCall("superfaktura", "invoices.create", {
          hostId,
          period: yearMonth,
          grossAmountCents: invoiceDocument.grossAmountCents,
          dryRun: true,
        });
        continue;
      }

      // Claim the invoice before calling SuperFaktúra
      invoiceDocument.status = "creating";
      const claimed = await saveInvoice(invoiceDocument);
      if (!claimed) {
        summary.alreadyExists++;
        continue;
      }

      // Create real invoice in SuperFaktúra
      const { response, emailRequested, meta } = await createSuperfakturaInvoice({
        host,
        invoiceDocument,
      });

      invoiceDocument.externalInvoiceId = meta.id || undefined;
      invoiceDocument.invoiceNumber = meta.number || undefined;
      invoiceDocument.externalUrl = meta.pdfUrl || undefined;
      invoiceDocument.pdfUrl = meta.pdfUrl || undefined;
      invoiceDocument.superfakturaResponse = response;
      invoiceDocument.status = "issued";
      summary.created++;

      // Try to email (separate outcome)
      if (emailRequested) {
        const delivery = await deliverInvoice({ host, invoiceDocument, meta });

        if (delivery.delivered) {
          invoiceDocument.status = "emailed";
          invoiceDocument.emailSentAt = new Date();
          invoiceDocument.failureReason = undefined;
          summary.emailed++;
        } else {
          invoiceDocument.failureReason = `issued but not delivered: ${delivery.error}`;
          summary.undelivered++;
          await alertAdmin("Invoice issued but could not be emailed", {
            hostId: host._id.toString(),
            periodLabel,
            invoiceNumber: meta.number,
            error: delivery.error,
          });
        }
      }

      await saveInvoice(invoiceDocument);
    } catch (error) {
      invoiceDocument.status = "failed";
      invoiceDocument.failureReason = error?.message || "superfaktura_error";
      invoiceDocument.superfakturaResponse = {
        error: error?.response?.data || error?.providerResponse || error?.message || String(error),
      };
      await saveInvoice(invoiceDocument);
      summary.failed++;
      await alertAdmin("SuperFaktura invoice creation failed", {
        hostId: host._id.toString(),
        periodLabel,
        error: error?.message || String(error),
      });
    }
  }

  return summary;
}

// ── Public API ───────────────────────────────────────────────────────

export async function generateInvoicesForPreviousMonth() {
  const localNow = toZonedTime(new Date(), BUSINESS_TIMEZONE);
  return generateInvoicesForPeriod(subMonths(localNow, 1));
}

export async function generateInvoicesForPeriod(targetDate) {
  return invoiceJobForPeriod(buildInvoicePeriod(targetDate));
}

/** Safe date for a given year + month (avoids timezone shift) */
export function periodAnchor(year, month) {
  return new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
}

export function startInvoiceJob() {
  if (!INVOICE_GENERATION_ENABLED) {
    console.log("[invoice-job] disabled via INVOICE_GENERATION_ENABLED=false");
    return null;
  }

  const task = cron.schedule(
    INVOICE_GENERATION_CRON,
    async () => {
      console.log(`[invoice-job] starting (${new Date().toISOString()})`);
      try {
        const result = await generateInvoicesForPreviousMonth();
        console.log(`[invoice-job] completed: ${JSON.stringify(result)}`);
      } catch (err) {
        console.error("[invoice-job] run failed:", err.message || err);
        await alertAdmin("Invoice generation job crashed", {
          error: err?.message || String(err),
        });
      }
    },
    { timezone: BUSINESS_TIMEZONE }
  );

  console.log(`[invoice-job] scheduled "${INVOICE_GENERATION_CRON}" (${BUSINESS_TIMEZONE})`);
  return task;
}
