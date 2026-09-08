// utils/cancellationPolicy.js
// Cancellation tiers are always expressed in HOURS before check-in, never days —
// a "48 hours" boundary cannot be stated precisely in days.
//
// The tier array is snapshotted onto the reservation at booking time. Refunds
// must always be computed from that snapshot, never by reading the listing:
// the guest agreed to specific terms at the moment they paid, and a later edit
// to the listing (or to these constants) must not change an existing booking.

import { hoursUntilCheckIn } from "./timezone.js";

export const POLICY_NAMES = ["flexible", "standard", "strict", "custom"];

export const POLICY_TIERS = {
  flexible: [
    { hoursBefore: 24, refundPercent: 100 },
    { hoursBefore: 0, refundPercent: 0 },
  ],
  standard: [
    { hoursBefore: 168, refundPercent: 100 }, // 7 days
    { hoursBefore: 48, refundPercent: 50 }, // 2 days
    { hoursBefore: 0, refundPercent: 0 },
  ],
  strict: [
    { hoursBefore: 336, refundPercent: 50 }, // 14 days
    { hoursBefore: 0, refundPercent: 0 },
  ],
};

export const DEFAULT_POLICY = "standard";

/** Accepts both camelCase and snake_case tiers, normalising to camelCase. */
function normaliseTier(tier) {
  const hoursBefore = tier.hoursBefore ?? tier.hours_before;
  const refundPercent = tier.refundPercent ?? tier.refund_percent;
  return {
    hoursBefore: Math.round(Number(hoursBefore)),
    refundPercent: Number(refundPercent),
  };
}

export function normaliseTiers(tiers) {
  if (!Array.isArray(tiers)) return [];
  return tiers.map(normaliseTier);
}

/**
 * Validates a custom tier array.
 * Returns { valid, errors, tiers } with `tiers` normalised and sorted.
 */
export function validateCustomTiers(rawTiers) {
  const errors = [];
  const tiers = normaliseTiers(rawTiers);

  if (!tiers.length) {
    return { valid: false, errors: ["At least one cancellation tier is required"], tiers };
  }
  if (tiers.length > 3) {
    errors.push("A custom policy may define at most 3 tiers");
  }

  for (const tier of tiers) {
    if (!Number.isFinite(tier.hoursBefore) || tier.hoursBefore < 0) {
      errors.push("hoursBefore must be a non-negative whole number of hours");
    }
    if (!Number.isFinite(tier.refundPercent) || tier.refundPercent < 0 || tier.refundPercent > 100) {
      errors.push("refundPercent must be between 0 and 100");
    }
  }

  // Sort descending by hoursBefore so evaluation order is deterministic.
  const sorted = [...tiers].sort((a, b) => b.hoursBefore - a.hoursBefore);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].hoursBefore === sorted[i - 1].hoursBefore) {
      errors.push("Duplicate hoursBefore values are not allowed");
    }
    if (sorted[i].refundPercent > sorted[i - 1].refundPercent) {
      errors.push("refundPercent must decrease as hoursBefore decreases");
    }
  }

  // Without this, a no-show would fall through and generate a refund.
  const last = sorted[sorted.length - 1];
  if (!last || last.hoursBefore !== 0 || last.refundPercent !== 0) {
    errors.push("The last tier must be exactly { hoursBefore: 0, refundPercent: 0 }");
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)], tiers: sorted };
}

/**
 * The tier array to snapshot onto a booking for a given listing.
 * Falls back to the default policy when the listing has nothing usable.
 */
export function getTiersSnapshot(listing) {
  const policy = listing?.cancellationPolicyType;

  if (policy === "custom") {
    const { valid, tiers } = validateCustomTiers(listing?.customPolicyTiers);
    if (valid) return tiers;
    // An invalid custom policy must never silently widen refunds.
    return POLICY_TIERS[DEFAULT_POLICY];
  }

  return POLICY_TIERS[policy] || POLICY_TIERS[DEFAULT_POLICY];
}

/** The policy name to snapshot alongside the tiers. */
export function getPolicyNameSnapshot(listing) {
  const policy = listing?.cancellationPolicyType;
  return POLICY_NAMES.includes(policy) ? policy : DEFAULT_POLICY;
}

/**
 * Refund in cents for a reservation, from its OWN snapshot.
 *
 * @param {object} reservation must carry cancellationTiersSnapshot + checkInDate
 * @param {Date}   now
 */
export function calculateRefundCents(reservation, now = new Date()) {
  const tiers = normaliseTiers(reservation?.cancellationTiersSnapshot);

  // No snapshot means the booking predates this feature. Refuse to guess —
  // the caller decides (admin override), rather than silently refunding.
  if (!tiers.length) return null;

  const totalCents = Math.round(
    Number(reservation.totalPriceCents) ||
      Math.round((Number(reservation.totalPrice) || 0) * 100)
  );

  const hoursLeft = hoursUntilCheckIn(reservation.checkInDate, now);

  // Tiers are sorted descending: the first threshold the guest still meets wins.
  const sorted = [...tiers].sort((a, b) => b.hoursBefore - a.hoursBefore);
  // Unreachable while the last tier is 0/0, but a no-show must never refund.
  const tier = sorted.find((t) => hoursLeft >= t.hoursBefore) || {
    hoursBefore: 0,
    refundPercent: 0,
  };

  return {
    refundCents: Math.round(totalCents * (tier.refundPercent / 100)),
    refundPercent: tier.refundPercent,
    hoursUntilCheckIn: hoursLeft,
    tier,
  };
}

/** Human-readable preview of a tier array, for guest-facing UI. */
export function describeTiers(tiers) {
  const sorted = normaliseTiers(tiers).sort((a, b) => b.hoursBefore - a.hoursBefore);

  // "24 hours (1 days)" reads as a bug even when the number is right.
  const inDays = (hours) => {
    const days = Math.round(hours / 24);
    return `${days} ${days === 1 ? "day" : "days"}`;
  };

  return sorted.map((tier, index) => {
    if (tier.hoursBefore > 0) {
      return {
        hoursBefore: tier.hoursBefore,
        refundPercent: tier.refundPercent,
        label: `${tier.hoursBefore} hours (${inDays(tier.hoursBefore)}) or more before check-in: ${tier.refundPercent}% refund`,
      };
    }

    // The final 0-hour tier. It used to read "Less than the final window before
    // check-in", which names no window at all and left the reader to work out
    // which threshold it meant. State the actual boundary — the previous tier's.
    const previous = sorted[index - 1];

    return {
      hoursBefore: 0,
      refundPercent: tier.refundPercent,
      label: previous
        ? `Less than ${previous.hoursBefore} hours (${inDays(previous.hoursBefore)}) before check-in, or a no-show: ${tier.refundPercent}% refund`
        : `Cancelling at any time, or a no-show: ${tier.refundPercent}% refund`,
    };
  });
}
