/**
 * The cancellation policies a host can choose from.
 *
 * These mirror `backend/utils/cancellationPolicy.js` exactly. The tier arrays
 * here are for display only — the server snapshots its OWN copy onto the booking
 * at payment time, so nothing the browser sends can widen a refund.
 */

export const POLICY_CHOICES = [
  {
    value: "flexible",
    labelKey: "PolicyFlexible",
    fallback: "Flexible",
    descKey: "PolicyFlexibleDesc",
    descFallback: "Full refund up to 24 hours before check-in.",
  },
  {
    value: "standard",
    labelKey: "PolicyStandard",
    fallback: "Standard",
    descKey: "PolicyStandardDesc",
    descFallback: "Full refund up to 7 days before, 50% up to 2 days before.",
  },
  {
    value: "strict",
    labelKey: "PolicyStrict",
    fallback: "Strict",
    descKey: "PolicyStrictDesc",
    descFallback: "50% refund up to 14 days before check-in, none after.",
  },
  {
    value: "custom",
    labelKey: "PolicyCustom",
    fallback: "Custom",
    descKey: "PolicyCustomDesc",
    descFallback: "Define your own tiers, up to three.",
  },
];

/**
 * Validate custom tiers before submitting. The server enforces the same rules
 * in a pre-validate hook — this exists so the host is told what is wrong while
 * they are still editing, not after a save fails.
 */
export function validateTiers(tiers) {
  const errors = [];
  const parsed = (tiers || []).map((t) => ({
    hoursBefore: Number(t.hoursBefore),
    refundPercent: Number(t.refundPercent),
  }));

  if (!parsed.length) return ["Add at least one tier"];
  if (parsed.length > 3) errors.push("A custom policy may define at most 3 tiers");

  for (const tier of parsed) {
    if (!Number.isFinite(tier.hoursBefore) || tier.hoursBefore < 0) {
      errors.push("Hours before check-in must be a non-negative number");
    }
    if (!Number.isFinite(tier.refundPercent) || tier.refundPercent < 0 || tier.refundPercent > 100) {
      errors.push("Refund percent must be between 0 and 100");
    }
  }

  const sorted = [...parsed].sort((a, b) => b.hoursBefore - a.hoursBefore);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].hoursBefore === sorted[i - 1].hoursBefore) {
      errors.push("Two tiers cannot start at the same number of hours");
    }
    if (sorted[i].refundPercent > sorted[i - 1].refundPercent) {
      errors.push("The refund cannot grow as check-in gets closer");
    }
  }

  const last = sorted[sorted.length - 1];
  if (!last || last.hoursBefore !== 0 || last.refundPercent !== 0) {
    // Without this a guest who simply never turns up would be owed money.
    errors.push("The final tier must be 0 hours / 0% refund, so a no-show earns no refund");
  }

  return [...new Set(errors)];
}
