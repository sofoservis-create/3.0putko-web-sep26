// config/payments.js
// Single source of truth for every money-related knob.
// Monetisation = change PLATFORM_FEE_PERCENT / PLATFORM_FEE_FIXED_CENTS in the
// environment. Nothing here may be hardcoded at a call site.

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true" || String(value) === "1";
};

// Platform fee, calibrated to break even on the Stripe cost after VAT.
//
// Derivation: Putko owes 23 % VAT on the fee it charges, so of a fee F it keeps
// F / 1.23. For that to cover the Stripe cost S:
//     F / 1.23 = S   ->   F = 1.23 x S
// Stripe's European card cost is 1.4 % + 0.25 EUR, so:
//     F = 1.23 x (1.4 % + 0.25) = 1.722 % + 0.3075 EUR
// which is why the defaults below are 1.722 % + 31 cents. On a 100 EUR booking
// that is 1.72 + 0.31 = 2.03 EUR, matching the worked example in the spec.
//
// Expressing it as percent + fixed (rather than a flat ~2.03 %) matters: the
// Stripe cost itself has a fixed component, so a percent-only fee would
// under-recover on small bookings and over-recover on large ones.
export const PLATFORM_FEE_PERCENT = num(process.env.PLATFORM_FEE_PERCENT, 1.722);
export const PLATFORM_FEE_FIXED_CENTS = Math.round(
  num(process.env.PLATFORM_FEE_FIXED_CENTS, 31)
);

// Stripe's own processing cost. Informational only — the real figure comes from
// the balance transaction on each charge. These are used to show hosts an
// estimated breakdown before payment settles.
export const STRIPE_COST_PERCENT = num(process.env.STRIPE_COST_PERCENT, 1.4);
export const STRIPE_COST_FIXED_CENTS = Math.round(
  num(process.env.STRIPE_COST_FIXED_CENTS, 25)
);

export const VAT_RATE_PERCENT = num(process.env.VAT_RATE_PERCENT, 23);

// Hours after check-in before the host payout may be released.
export const PAYOUT_DELAY_HOURS = num(process.env.PAYOUT_DELAY_HOURS, 24);

// Whether the Stripe processing cost is deducted from the host payout on top of
// the platform fee.
//   false -> hostPayout = total - platformFee               (the model in use)
//   true  -> hostPayout = total - platformFee - stripeFee
//
// This is now FALSE, matching the flow diagram: on a 100 EUR booking the host
// receives 97.97 and Putko's fee line is 2.03.
//
// Charging both would double-count. The 2.03 fee exists precisely to cover the
// 1.65 Stripe cost after VAT, so deducting the 1.65 from the host as well would
// leave Putko with a 1.65 margin on a model that is explicitly meant to run at
// zero. The arithmetic, per 100 EUR booking:
//     Stripe balance after processing   98.35   (100.00 - 1.65)
//     transferred to host              -97.97
//     Putko retains                      0.38
//     VAT owed on the 2.03 fee          -0.38   (2.03 x 23/123)
//     Putko net                          0.00   <- break-even, as intended
export const HOST_PAYS_STRIPE_FEE = bool(process.env.HOST_PAYS_STRIPE_FEE, false);

export const DEFAULT_CURRENCY = (process.env.DEFAULT_CURRENCY || "eur").toLowerCase();

// Every business date decision (cancellation deadlines, payout eligibility,
// invoicing month boundaries) resolves in this zone, never in server-local time.
export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || "Europe/Bratislava";

// Daily payout sweep, expressed in BUSINESS_TIMEZONE.
export const PAYOUT_CRON = process.env.PAYOUT_CRON || "0 3 * * *";

// Set to "false" to disable the automatic payout sweep and keep payouts
// host-initiated (open question #2 in the gap checklist).
export const PAYOUT_CRON_ENABLED = bool(process.env.PAYOUT_CRON_ENABLED, true);

export const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || "support@putko.sk";

/**
 * Platform fee and host payout for a given gross booking amount.
 * All values are integer cents — never floats.
 *
 * @param {number} totalAmountCents gross amount the guest pays
 * @param {number} stripeFeeCents   Stripe processing cost, when already known
 */
export function calculateFees(totalAmountCents, stripeFeeCents = 0) {
  const total = Math.round(Number(totalAmountCents) || 0);
  const stripeFee = Math.round(Number(stripeFeeCents) || 0);

  const percentFee = Math.round(total * (PLATFORM_FEE_PERCENT / 100));
  const platformFeeCents = percentFee + PLATFORM_FEE_FIXED_CENTS;

  const deductions = HOST_PAYS_STRIPE_FEE
    ? platformFeeCents + stripeFee
    : platformFeeCents;

  // Never produce a negative payout, however the knobs are configured.
  const hostPayoutCents = Math.max(0, total - deductions);

  return { platformFeeCents, hostPayoutCents, stripeFeeCents: stripeFee };
}

/**
 * Estimated Stripe processing cost, for display before the charge settles.
 * The authoritative figure is the balance transaction on the actual charge.
 */
export function estimateStripeCostCents(totalAmountCents) {
  const total = Math.round(Number(totalAmountCents) || 0);
  return Math.round(total * (STRIPE_COST_PERCENT / 100)) + STRIPE_COST_FIXED_CENTS;
}

/**
 * Full breakdown for the UI, so no fee maths is ever duplicated in the browser.
 *
 * @param {number} totalAmountCents  gross amount the guest pays
 * @param {number|null} actualStripeFeeCents  real Stripe fee once known
 */
export function buildFeeBreakdown(totalAmountCents, actualStripeFeeCents = null) {
  const total = Math.round(Number(totalAmountCents) || 0);
  const stripeCostCents =
    actualStripeFeeCents != null
      ? Math.round(actualStripeFeeCents)
      : estimateStripeCostCents(total);

  const { platformFeeCents, hostPayoutCents } = calculateFees(total, stripeCostCents);

  // The VAT portion contained within the fee Putko charges.
  const feeVatCents = Math.round(
    platformFeeCents * (VAT_RATE_PERCENT / (100 + VAT_RATE_PERCENT))
  );

  return {
    totalAmountCents: total,
    stripeCostCents,
    stripeCostIsEstimate: actualStripeFeeCents == null,
    platformFeeCents,
    platformFeeNetCents: platformFeeCents - feeVatCents,
    platformFeeVatCents: feeVatCents,
    hostPayoutCents,
    hostPaysStripeFee: HOST_PAYS_STRIPE_FEE,
    // What Putko is actually left with after Stripe's cost and the VAT it owes.
    // Zero by design during the launch phase.
    platformNetCents: total - stripeCostCents - hostPayoutCents - feeVatCents,
    currency: DEFAULT_CURRENCY,
    config: {
      platformFeePercent: PLATFORM_FEE_PERCENT,
      platformFeeFixedCents: PLATFORM_FEE_FIXED_CENTS,
      vatRatePercent: VAT_RATE_PERCENT,
    },
  };
}

export function splitGrossAmountCents(grossAmountCents, vatRatePercent = VAT_RATE_PERCENT) {
  const gross = Math.round(Number(grossAmountCents) || 0);
  const netAmountCents = Math.round((gross * 100) / (100 + vatRatePercent));
  const vatAmountCents = gross - netAmountCents;
  return { netAmountCents, vatAmountCents };
}

export const INVOICE_GENERATION_CRON = process.env.INVOICE_GENERATION_CRON || "0 3 1 * *";
export const INVOICE_GENERATION_ENABLED = bool(process.env.INVOICE_GENERATION_ENABLED, true);
export const INVOICE_DUE_DAYS = num(process.env.INVOICE_DUE_DAYS, 14);
export const SUPERFAKTURA_API_URL = process.env.SUPERFAKTURA_API_URL || process.env.SUPERFAKTURA_ENDPOINT || "https://moja.superfaktura.sk/invoices/create";
// Support both the new token-based API and the legacy SFAPI header credentials.
export const SUPERFAKTURA_AUTH_TOKEN = process.env.SUPERFAKTURA_AUTH_TOKEN || process.env.SUPERFAKTURA_API_KEY || "";
export const SUPERFAKTURA_AUTH_EMAIL = process.env.SUPERFAKTURA_AUTH_EMAIL || process.env.SUPERFAKTURA_EMAIL || "";
export const SUPERFAKTURA_AUTH_KEY = process.env.SUPERFAKTURA_AUTH_KEY || process.env.SUPERFAKTURA_API_KEY_SECRET || "";
export const SUPERFAKTURA_COMPANY_ID = process.env.SUPERFAKTURA_COMPANY_ID || process.env.SUPERFAKTURA_COMPANY || process.env.SUPERFAKTURA_COMPANY_ID || "";

export const INVOICE_DRY_RUN = bool(process.env.INVOICE_DRY_RUN, false);

// Whether the monthly fee invoice is emailed to the host by SuperFaktúra as part
// of creating it. This is the delivery mechanism the model relies on — Putko does
// not attach or store the PDF itself — so it defaults ON. Turn it off only when
// pointing at the sandbox, so test runs cannot mail real hosts.
export const INVOICE_EMAIL_ENABLED = bool(process.env.INVOICE_EMAIL_ENABLED, true);

// Konštantný symbol for a service invoice. 0308 = payment for services by
// transfer, which is what an intermediary fee is.
export const INVOICE_CONSTANT_SYMBOL = process.env.INVOICE_CONSTANT_SYMBOL || "0308";

// TEST ONLY — redirect every invoice email to this address instead of the host.
//
// The invoice itself still carries the host's real identity (that is the tax
// document and must not be falsified); only DELIVERY is redirected. Set this
// while testing so a live run cannot mail real hosts, and clear it before
// launch. A non-empty value is announced loudly at startup and on every send.
export const INVOICE_TEST_EMAIL_OVERRIDE = (process.env.INVOICE_TEST_EMAIL_OVERRIDE || "").trim();

if (INVOICE_TEST_EMAIL_OVERRIDE) {
  console.warn(
    `[invoice] TEST MODE: every invoice email is redirected to ${INVOICE_TEST_EMAIL_OVERRIDE}. ` +
      "Hosts will NOT receive their invoices. Clear INVOICE_TEST_EMAIL_OVERRIDE before launch."
  );
}
