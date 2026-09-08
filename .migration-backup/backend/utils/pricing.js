// utils/pricing.js
//
// Authoritative booking price. Until this existed the amount came straight from
// the request body (`new Reservation(req.body)`), so a guest could book a 500
// EUR stay for 1 EUR and every downstream number — platform fee, host payout,
// refund, DAC7 consideration — inherited the forged figure.
//
// The rules below deliberately mirror the browser's calculation in
// `frontend/src/app/Checkout/page.js` so the guest is never charged something
// different from what they were shown. If the two ever diverge, THIS file wins
// and the divergence is logged: the listing's own configuration is the truth,
// not whatever the client posted.
//
// Precedence for a single night, highest first:
//   1. flexiblePrices  — seasonal period + length-of-stay tier
//   2. effective nightly rate — max(pricePerNight, pricePerPerson x paying guests)
//
// The legacy `specialPrice` offer is intentionally NOT applied: the checkout
// page builds its offer list as an empty array, so honouring it here would
// produce a total the guest never saw.

import { calendarDateUtc } from "./timezone.js";

/**
 * The calendar day a value represents, as UTC midnight.
 *
 * Uses the shared calendar-date helper rather than re-reading the instant in the
 * business timezone: a guest whose browser serialised local midnight would
 * otherwise have every night of their stay shifted a day, which moves seasonal
 * rates onto the wrong dates.
 *
 * Returns null for anything unparseable — a missing or malformed date must
 * surface as a refused quote, not a 500 from deep inside date-fns.
 */
const dateOnly = (value) => {
  if (value === null || value === undefined || value === "") return null;
  return calendarDateUtc(value);
};

/**
 * Nights between two dates. A one-night stay is check-out minus check-in = 1.
 * Returns 0 when either date is missing or unparseable, which callers treat as
 * an unpriceable stay.
 */
export function nightsBetween(checkIn, checkOut) {
  const start = dateOnly(checkIn);
  const end = dateOnly(checkOut);
  if (!start || !end) return 0;

  return Math.max(0, Math.round((end - start) / 86400000));
}

/** Pick the tier whose night range contains `totalNights` (no max = unbounded). */
function findTierForNights(tiers, totalNights) {
  if (!Array.isArray(tiers)) return null;

  return (
    tiers.find((tier) => {
      const price = Number(tier?.price);
      if (!Number.isFinite(price) || price <= 0) return false;

      const min = Number(tier?.minNights) || 1;
      const hasMax =
        tier?.maxNights !== null && tier?.maxNights !== undefined && tier?.maxNights !== "";
      const max = hasMax ? Number(tier.maxNights) : Infinity;

      return totalNights >= min && totalNights <= max;
    }) || null
  );
}

/**
 * Resolver for one booking: date -> seasonal rate, or null.
 * The tier depends on the length of the WHOLE stay, not on where the night
 * falls within it, so it is resolved once per period rather than per night.
 */
export function buildFlexiblePriceResolver(listing, totalNights) {
  const periods = Array.isArray(listing?.flexiblePrices) ? listing.flexiblePrices : [];
  const nights = Number(totalNights) || 0;

  if (!periods.length || nights <= 0) return () => null;

  const resolved = periods
    .map((period) => {
      if (!period?.start || !period?.end) return null;

      const tier = findTierForNights(period.tiers, nights);
      if (!tier) return null;

      return {
        name: period.name || "",
        price: Number(tier.price),
        startDate: dateOnly(period.start),
        endDate: dateOnly(period.end),
      };
    })
    .filter(Boolean);

  if (!resolved.length) return () => null;

  return (date) => {
    const day = dateOnly(date);
    if (!day) return null;
    // End date is inclusive: a period ending 31 Aug covers the night of 31 Aug.
    return resolved.find((p) => day >= p.startDate && day <= p.endDate) || null;
  };
}

/**
 * Price a stay from the listing itself.
 *
 * @param {object} listing  Accommodation document
 * @param {object} stay     { checkInDate, checkOutDate, adults, children, infants }
 * @returns {{ ok: boolean, error?: string, totalCents: number, breakdown: object }}
 */
export function quoteStay(listing, stay) {
  const nights = nightsBetween(stay.checkInDate, stay.checkOutDate);

  if (!listing) {
    return { ok: false, error: "listing_not_found", totalCents: 0, breakdown: {} };
  }
  if (nights <= 0) {
    return { ok: false, error: "check_out_must_follow_check_in", totalCents: 0, breakdown: {} };
  }

  const basePrice = Number(listing.pricePerNight) || 0;
  const perPersonRate = Number(listing.pricePerPerson) || 0;

  // Infants do not count towards the per-person rate, matching the checkout page.
  const payingGuests = (Number(stay.adults) || 0) + (Number(stay.children) || 0);

  const effectiveNightly =
    perPersonRate > 0 && payingGuests > 0
      ? Math.max(basePrice, perPersonRate * payingGuests)
      : basePrice;

  const resolveFlexible = buildFlexiblePriceResolver(listing, nights);

  // Non-null: nights > 0 already proves both dates parsed.
  const start = dateOnly(stay.checkInDate);
  let accommodationTotal = 0;
  let seasonalNights = 0;

  for (let i = 0; i < nights; i++) {
    const night = new Date(start.getTime() + i * 86400000);
    const seasonal = resolveFlexible(night);

    if (seasonal) {
      accommodationTotal += seasonal.price;
      seasonalNights++;
    } else {
      accommodationTotal += effectiveNightly;
    }
  }

  const petFeePerNight = Number(listing.petFeePerNight) || 0;
  const petFeeTotal = petFeePerNight > 0 ? petFeePerNight * nights : 0;

  // Round once, at the end, and only into cents. Every consumer downstream works
  // in integer cents from here on.
  const totalCents = Math.round((accommodationTotal + petFeeTotal) * 100);

  if (totalCents <= 0) {
    return { ok: false, error: "listing_has_no_price", totalCents: 0, breakdown: { nights } };
  }

  return {
    ok: true,
    totalCents,
    breakdown: {
      nights,
      payingGuests,
      basePriceCents: Math.round(basePrice * 100),
      perPersonRateCents: Math.round(perPersonRate * 100),
      effectiveNightlyCents: Math.round(effectiveNightly * 100),
      seasonalNights,
      accommodationCents: Math.round(accommodationTotal * 100),
      petFeePerNightCents: Math.round(petFeePerNight * 100),
      petFeeCents: Math.round(petFeeTotal * 100),
      averageNightlyCents: Math.round((accommodationTotal / nights) * 100),
    },
  };
}

/**
 * Compare what the client claimed against what the listing actually costs.
 * A tolerance of one cent absorbs float rounding in the browser; anything
 * larger is a real divergence worth surfacing.
 */
export function priceMismatch(clientCents, serverCents) {
  const claimed = Math.round(Number(clientCents) || 0);
  if (!claimed) return null;

  const delta = claimed - serverCents;
  if (Math.abs(delta) <= 1) return null;

  return {
    claimedCents: claimed,
    serverCents,
    deltaCents: delta,
    // Negative delta is the direction that costs money: the client asked to pay
    // less than the listing charges.
    direction: delta < 0 ? "underpaid" : "overpaid",
  };
}
