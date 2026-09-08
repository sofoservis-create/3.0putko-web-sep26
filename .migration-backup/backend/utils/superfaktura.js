// utils/superfaktura.js
import axios from "axios";
import crypto from "crypto";
import { format } from "date-fns";
import {
  SUPERFAKTURA_API_URL,
  SUPERFAKTURA_AUTH_EMAIL,
  SUPERFAKTURA_AUTH_KEY,
  SUPERFAKTURA_AUTH_TOKEN,
  SUPERFAKTURA_COMPANY_ID,
  INVOICE_EMAIL_ENABLED,
  INVOICE_CONSTANT_SYMBOL,
  INVOICE_TEST_EMAIL_OVERRIDE,
  VAT_RATE_PERCENT,
} from "../config/payments.js";
import { logExternalCall } from "./auditLog.js";
import { getTransporter, MAIL_FROM } from "./mailer.js";

/** Slovakia's id in SuperFaktúra's country table. */
const SF_COUNTRY_IDS = { SK: 191, CZ: 57 };

/** `2026-08` from an invoice document. */
export const yearMonthOf = (invoiceDocument) =>
  `${invoiceDocument.invoiceYear}-${String(invoiceDocument.invoiceMonth).padStart(2, "0")}`;

/**
 * Variabilný symbol for a host's monthly invoice.
 *
 * Must be numeric, at most 10 digits, and stable: a retry after a failed run has
 * to reuse the same symbol so the accountant does not see two references for one
 * month. `YYYYMM` + four digits derived from the host id gives both properties
 * and stays inside the length limit.
 *
 * The four-digit suffix is a hash, so two hosts in the same month collide with
 * probability ~1/10000. That is acceptable for a payment reference (the invoice
 * is already marked paid and no incoming payment is matched against it), and the
 * invoice number issued by SuperFaktúra remains the unique identifier.
 */
export function generateVariableSymbol(hostId, yearMonth) {
  const period = String(yearMonth).replace(/\D/g, "").slice(0, 6);
  const digest = crypto.createHash("sha1").update(String(hostId)).digest("hex");
  const suffix = String(parseInt(digest.slice(0, 8), 16) % 10000).padStart(4, "0");
  return `${period}${suffix}`;
}

/** Buyer block — the host, as Slovak invoicing law requires them to appear. */
const buildClient = (host, invoiceDocument) => {
  const snapshot = invoiceDocument?.hostSnapshot || {};
  const country = snapshot.country || host.country || host.countryCode || "SK";
  const isIndividual = (snapshot.billingSubjectType || host.billingSubjectType) === "individual";

  const client = {
    name:
      snapshot.companyName ||
      host.companyName ||
      `${host.name || ""} ${host.lastName || ""}`.trim() ||
      "Host",
    email: snapshot.email || host.email || "",
    ico: isIndividual ? "" : (snapshot.ico || host.ico || host.idNumber || ""),
    dic: isIndividual ? "" : (snapshot.dic || host.dic || host.tin || ""),
    ic_dph: isIndividual ? "" : (snapshot.icDph || host.icDph || host.vatNumber || ""),
    address: snapshot.streetNumber || host.streetNumber || "",
    city: snapshot.city || host.city || "",
    zip: snapshot.zipcode || host.zipcode || "",
    country,
    update_addressbook: 1,
  };

  // SuperFaktúra resolves Slovak clients by id; the free-text country is kept
  // as well so a non-SK host still renders correctly.
  const countryCode = /slovensk/i.test(String(country)) ? "SK" : String(country).trim().toUpperCase();
  if (SF_COUNTRY_IDS[countryCode]) client.country_id = SF_COUNTRY_IDS[countryCode];

  return client;
};

/** Exported so the payload can be inspected without calling SuperFaktúra. */
export const buildInvoicePayload = ({ host, invoiceDocument, withEmail }) => {
  const issueDate = format(new Date(), "yyyy-MM-dd");
  const dueDate = invoiceDocument.dueDate
    ? format(new Date(invoiceDocument.dueDate), "yyyy-MM-dd")
    : issueDate;

  const yearMonth = yearMonthOf(invoiceDocument);
  const bookingCount = invoiceDocument.billedBookings || 0;

  // When Putko is not VAT registered (VAT_RATE_PERCENT === 0) net and gross are
  // the same figure and the item carries no tax. Pricing the item off
  // `netAmountCents` while unconditionally attaching a 23 % tax line put VAT on
  // every commission invoice — a tax a non-registered issuer becomes liable for
  // simply by writing it on the document (§ 69 ods. 5 zákona o DPH).
  const netAmount = (invoiceDocument.netAmountCents / 100).toFixed(2);

  const payload = {
    Invoice: {
      name: invoiceDocument.description || `Sprostredkovateľský poplatok — ${yearMonth}`,
      created: issueDate,
      delivery: issueDate,
      due: dueDate,
      invoice_currency: (invoiceDocument.currency || "EUR").toUpperCase(),
      variable: generateVariableSymbol(host._id || host.id, yearMonth),
      constant: INVOICE_CONSTANT_SYMBOL,
      // Stripe deducted the fee at each booking; this document only records it.
      already_paid: 1,
      comment:
        `Putko — sprostredkovateľské poplatky za ${bookingCount} rezervácií v ${yearMonth}` +
        (VAT_RATE_PERCENT === 0 ? ". Nie sme platiteľmi DPH." : ""),
    },
    Client: buildClient(host, invoiceDocument),
    InvoiceItem: [
      {
        name: `Sprostredkovateľské poplatky za ${bookingCount} rezervácií v ${yearMonth}`,
        description: invoiceDocument.description || "",
        quantity: 1,
        unit: "ks",
        unit_price: netAmount,
        tax: VAT_RATE_PERCENT,
      },
    ],
    // Required on an invoice from a non-VAT-registered issuer: the document must
    // say why no tax is shown, or it reads as an incomplete tax invoice.
    ...(VAT_RATE_PERCENT === 0
      ? { InvoiceSettingNote: "Nie sme platiteľmi DPH." }
      : {}),
    InvoiceSetting: {
      language: "slo",
      signature: true,
      payment_type: "transfer",
      already_paid: 1,
    },
  };

  // NOTE: no InvoiceEmail block.
  //
  // The spec shows the email nested inside the create call, but SuperFaktúra
  // answers `500 TypeError` when `InvoiceEmail` is present — verified by
  // bisecting the payload against the sandbox: the identical request succeeds
  // with every other block and fails only with this one. Delivery is a separate
  // step, `deliverInvoice` below.
  void withEmail;

  return payload;
};

const getAxiosConfig = () => {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  };

  // The SFAPI header is SuperFaktúra's documented and actually-supported scheme,
  // so it wins whenever email + key are present.
  //
  // The Bearer branch used to be checked first. Since the same API key had been
  // copied into SUPERFAKTURA_AUTH_TOKEN, every request went out as
  // `Bearer <apikey>` — which SuperFaktúra rejects by serving its HTML login
  // page with a 200 status. Bearer is kept only as a fallback for accounts that
  // genuinely have a token and no key pair.
  if (SUPERFAKTURA_AUTH_EMAIL && SUPERFAKTURA_AUTH_KEY) {
    const email = encodeURIComponent(SUPERFAKTURA_AUTH_EMAIL);
    const key = encodeURIComponent(SUPERFAKTURA_AUTH_KEY);
    const company = SUPERFAKTURA_COMPANY_ID
      ? `&company_id=${encodeURIComponent(SUPERFAKTURA_COMPANY_ID)}`
      : "";
    headers.Authorization = `SFAPI email=${email}&apikey=${key}${company}&module=Putko`;
  } else if (SUPERFAKTURA_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${SUPERFAKTURA_AUTH_TOKEN}`;
  }

  return { headers, timeout: 20000 };
};

/**
 * Pull the useful identifiers out of a SuperFaktúra response.
 *
 * The API has shipped several response shapes over the years and the sandbox
 * does not always match production, so every known nesting is tried rather than
 * letting a good invoice come back with no number recorded against it.
 */
export function extractInvoiceMeta(response) {
  const invoice =
    response?.data?.Invoice || response?.Invoice || response?.invoice || response?.data || {};

  const id = invoice.id || response?.id || response?.invoice_id;
  const number = invoice.invoice_no_formatted || invoice.number || response?.number;
  const token = invoice.token || response?.token;

  let pdfUrl = invoice.pdf_url || response?.pdf_url || response?.url;

  // SuperFaktúra does not always return a link, but it is deterministic from the
  // invoice id and its token.
  if (!pdfUrl && id && token) {
    try {
      const origin = new URL(SUPERFAKTURA_API_URL).origin;
      pdfUrl = `${origin}/invoices/pdf/${id}/token:${token}`;
    } catch {
      // A malformed API URL must not lose an otherwise successful invoice.
    }
  }

  return { id, number, token, pdfUrl };
}

/**
 * Create (and, unless disabled, email) one monthly fee invoice.
 *
 * @returns {{ response: object, emailRequested: boolean, meta: object }}
 */
export async function createSuperfakturaInvoice({ host, invoiceDocument }) {
  if (!SUPERFAKTURA_API_URL) {
    throw new Error("SuperFaktura API URL is not configured");
  }

  if (!SUPERFAKTURA_AUTH_TOKEN && (!SUPERFAKTURA_AUTH_EMAIL || !SUPERFAKTURA_AUTH_KEY)) {
    throw new Error("SuperFaktura credentials are not configured");
  }

  const hostEmail = invoiceDocument.hostSnapshot?.email || host.email;
  // With a test override in place there is always somewhere to send, even for a
  // host who has no email on file.
  const recipient = INVOICE_TEST_EMAIL_OVERRIDE || hostEmail;
  const emailRequested = Boolean(INVOICE_EMAIL_ENABLED && recipient);

  if (INVOICE_EMAIL_ENABLED && !recipient) {
    // Not fatal — the invoice is still a valid tax document — but the host will
    // never see it, so it must not pass silently.
    console.warn(
      `[superfaktura] host ${host._id} has no email address; invoice will be created but not sent`
    );
  }

  const payload = buildInvoicePayload({ host, invoiceDocument, withEmail: emailRequested });

  // The documented transport: form-urlencoded with the JSON in a `data` field.
  const body = new URLSearchParams();
  body.append("data", JSON.stringify(payload));

  const auditContext = {
    hostId: String(host._id || host.id || ""),
    invoiceId: String(invoiceDocument._id || ""),
    period: yearMonthOf(invoiceDocument),
    grossAmountCents: invoiceDocument.grossAmountCents,
    netAmountCents: invoiceDocument.netAmountCents,
    vatAmountCents: invoiceDocument.vatAmountCents,
    variableSymbol: payload.Invoice.variable,
    emailRequested,
    emailTo: emailRequested ? recipient : undefined,
    // Makes it obvious in the audit trail that a host did not receive this.
    emailRedirected: Boolean(INVOICE_TEST_EMAIL_OVERRIDE) || undefined,
  };

  let response;
  try {
    response = await axios.post(SUPERFAKTURA_API_URL, body.toString(), getAxiosConfig());
  } catch (err) {
    logExternalCall("superfaktura", "invoices.create", auditContext, "error", err);
    throw err;
  }

  // A 200 from SuperFaktúra does not mean the invoice exists.
  //
  // When the credentials are wrong the API answers 200 with its HTML LOGIN PAGE.
  // Checking only for a non-zero `error` field treats that as success: the
  // invoice gets marked issued and emailed, the run reports "1 emailed", and
  // nothing whatsoever was created. Anything that is not a JSON object carrying
  // a recognisable invoice is a failure.
  if (typeof response.data === "string" || !response.data || typeof response.data !== "object") {
    const looksLikeLogin = /<html|Prihlásenie|login/i.test(String(response.data).slice(0, 2000));
    const err = new Error(
      looksLikeLogin
        ? "SuperFaktura returned its login page instead of JSON — the API credentials were rejected"
        : "SuperFaktura returned an unexpected non-JSON response"
    );
    err.providerResponse = String(response.data).slice(0, 500);
    logExternalCall("superfaktura", "invoices.create", auditContext, "error", err);
    throw err;
  }

  if (response.data.error && response.data.error !== 0) {
    const err = new Error(
      response.data.error_message || response.data.message || "SuperFaktura returned an error"
    );
    err.providerResponse = response.data;
    logExternalCall("superfaktura", "invoices.create", auditContext, "error", err);
    throw err;
  }

  const meta = extractInvoiceMeta(response.data);

  // Success is proved by an invoice id coming back, not by the absence of an
  // error field. Without one there is nothing to reference, nothing to link a
  // PDF to, and no evidence the document was ever created.
  if (!meta.id) {
    const err = new Error(
      "SuperFaktura returned no invoice id — the invoice was not created"
    );
    err.providerResponse = response.data;
    logExternalCall("superfaktura", "invoices.create", auditContext, "error", err);
    throw err;
  }

  logExternalCall("superfaktura", "invoices.create", {
    ...auditContext,
    externalInvoiceId: meta.id,
    invoiceNumber: meta.number,
  });

  return { response: response.data, emailRequested, meta, recipient };
}

/**
 * Deliver an issued invoice to the host.
 *
 * Two routes, tried in order:
 *
 *  1. SuperFaktúra's own `/invoices/send` — preferred, since the service owns
 *     the PDF, the archive and the delivery record.
 *  2. Putko sends it over the SMTP the platform already uses, PDF attached.
 *
 * The fallback is load-bearing, not belt-and-braces: a SuperFaktúra account
 * without custom SMTP configured refuses to send anything at all
 * (`error 11 — Posielanie e-mailov je vypnuté`), which would leave every host
 * with an invoice they never received.
 *
 * @returns {{ delivered: boolean, via: 'superfaktura'|'putko'|null, to: string, error?: string }}
 */
export async function deliverInvoice({ host, invoiceDocument, meta }) {
  const hostEmail = invoiceDocument.hostSnapshot?.email || host.email || "";
  const to = INVOICE_TEST_EMAIL_OVERRIDE || hostEmail;
  const yearMonth = yearMonthOf(invoiceDocument);
  const redirected = Boolean(INVOICE_TEST_EMAIL_OVERRIDE);

  if (!to) {
    return { delivered: false, via: null, to: "", error: "no recipient address" };
  }

  const subject = redirected
    ? `[TEST] Faktúra od Putko — ${yearMonth} (host: ${hostEmail || "no email"})`
    : `Faktúra od Putko — ${yearMonth}`;

  const bodyText = redirected
    ? `TEST — redirected by INVOICE_TEST_EMAIL_OVERRIDE. Normally sent to ${hostEmail || "the host"}.\n\n` +
      `Obdobie: ${yearMonth}\nFaktúra č.: ${meta.number || "—"}`
    : "Dobrý deň,\n\n" +
      `v prílohe zasielame faktúru za sprostredkovateľské služby za obdobie ${yearMonth}. ` +
      "Faktúra je už uhradená — poplatok bol odpočítaný pri jednotlivých rezerváciách.\n\n" +
      "S pozdravom,\nTím Putko";

  const audit = {
    invoiceId: String(invoiceDocument._id || ""),
    externalInvoiceId: meta.id,
    to,
    emailRedirected: redirected || undefined,
  };

  // ── Route 1: SuperFaktúra ────────────────────────────────────────
  if (meta.id) {
    try {
      const origin = new URL(SUPERFAKTURA_API_URL).origin;
      const body = new URLSearchParams();
      body.append(
        "data",
        JSON.stringify({ Email: { invoice_id: meta.id, to, subject, body: bodyText } })
      );

      const res = await axios.post(`${origin}/invoices/send`, body.toString(), getAxiosConfig());

      if (res.data && typeof res.data === "object" && (!res.data.error || res.data.error === 0)) {
        logExternalCall("superfaktura", "invoices.send", { ...audit, via: "superfaktura" });
        return { delivered: true, via: "superfaktura", to };
      }

      logExternalCall(
        "superfaktura",
        "invoices.send",
        { ...audit, providerMessage: res.data?.error_message },
        "error",
        new Error(res.data?.error_message || "SuperFaktura refused to send")
      );
    } catch (err) {
      logExternalCall("superfaktura", "invoices.send", audit, "error", err);
    }
  }

  // ── Route 2: Putko's own SMTP, PDF attached ──────────────────────
  try {
    const attachments = [];

    if (meta.pdfUrl) {
      const pdf = await axios.get(meta.pdfUrl, { responseType: "arraybuffer", timeout: 20000 });
      attachments.push({
        filename: `Faktura-${meta.number || meta.id || yearMonth}.pdf`,
        content: Buffer.from(pdf.data),
        contentType: "application/pdf",
      });
    }

    await getTransporter().sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text: bodyText,
      html: `<div style="font-family:Arial,sans-serif;color:#333;line-height:1.6;">
        <p>${bodyText.replace(/\n/g, "<br/>")}</p>
        ${meta.pdfUrl ? `<p><a href="${meta.pdfUrl}">Faktúra (PDF)</a></p>` : ""}
      </div>`,
      attachments,
    });

    logExternalCall("putko-mail", "invoice.send", {
      ...audit,
      via: "putko",
      attached: attachments.length > 0,
    });

    return { delivered: true, via: "putko", to };
  } catch (err) {
    logExternalCall("putko-mail", "invoice.send", audit, "error", err);
    return { delivered: false, via: null, to, error: err.message };
  }
}
