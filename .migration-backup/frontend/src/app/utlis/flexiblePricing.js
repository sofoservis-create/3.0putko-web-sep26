/**
 * Flexible (seasonal) pricing resolver.
 *
 * A host can define any number of price periods on a listing. Each period has a
 * name, a date range, an optional note, and one or more length-of-stay tiers:
 *
 *   Period   1-3 nights   4-6 nights   7+ nights
 *   Summer   EUR 120      EUR 105      EUR 95
 *   Winter   EUR 140      EUR 125      EUR 110
 *
 * The tier is chosen by the TOTAL length of the stay, not by the position of
 * the night within it - a 5-night stay in Summer is billed at EUR 105 for every
 * night that falls inside the Summer period.
 *
 * Precedence when pricing a single night:
 *   1. flexiblePrices (period match + tier match)
 *   2. specialPrice   (legacy single offer, handled by the caller)
 *   3. pricePerNight  (base rate, handled by the caller)
 */

/** Strip the time component so date comparisons are not skewed by timezones. */
export const toLocalDateOnly = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Pick the tier whose night range contains `totalNights`.
 * A tier with no maxNights is unbounded ("7+ nights").
 */
const findTierForNights = (tiers, totalNights) => {
  if (!Array.isArray(tiers)) return null;

  return (
    tiers.find((tier) => {
      const price = Number(tier?.price);
      if (!Number.isFinite(price) || price <= 0) return false;

      const min = Number(tier?.minNights) || 1;
      const hasMax =
        tier?.maxNights !== null &&
        tier?.maxNights !== undefined &&
        tier?.maxNights !== "";
      const max = hasMax ? Number(tier.maxNights) : Infinity;

      return totalNights >= min && totalNights <= max;
    }) || null
  );
};

/**
 * Build a lookup for one booking.
 *
 * @param {object} accommodation listing document (needs `flexiblePrices`)
 * @param {number} totalNights   length of the whole stay, used to pick the tier
 * @returns {(date: Date) => ({name, price, start, end, note}|null)}
 *
 * The returned offer is shaped like the legacy `specialPrice` object so existing
 * "same offer for every night?" logic keeps working unchanged.
 */
export const buildFlexiblePriceResolver = (accommodation, totalNights) => {
  const periods = Array.isArray(accommodation?.flexiblePrices)
    ? accommodation.flexiblePrices
    : [];

  const nights = Number(totalNights) || 0;

  if (periods.length === 0 || nights <= 0) {
    return () => null;
  }

  // Pre-resolve each period's tier once - it only depends on the stay length.
  const resolved = periods
    .map((period) => {
      if (!period?.start || !period?.end) return null;

      const tier = findTierForNights(period.tiers, nights);
      if (!tier) return null;

      return {
        name: period.name || "",
        note: period.note || "",
        start: period.start,
        end: period.end,
        price: Number(tier.price),
        startDate: toLocalDateOnly(period.start),
        endDate: toLocalDateOnly(period.end),
      };
    })
    .filter(Boolean);

  if (resolved.length === 0) {
    return () => null;
  }

  return (date) => {
    const day = toLocalDateOnly(date);
    // End date is inclusive: a period ending 31 Aug covers the night of 31 Aug.
    const match = resolved.find((p) => day >= p.startDate && day <= p.endDate);
    if (!match) return null;

    return {
      name: match.name,
      note: match.note,
      start: match.start,
      end: match.end,
      price: match.price,
    };
  };
};

/**
 * Drop empty rows and coerce numbers before sending to the API.
 * A period is kept only if it has a date range and at least one priced tier.
 */
export const sanitizeFlexiblePrices = (periods) => {
  if (!Array.isArray(periods)) return [];

  return periods
    .map((period) => {
      const tiers = (Array.isArray(period?.tiers) ? period.tiers : [])
        .filter((tier) => tier?.price !== "" && tier?.price !== null && tier?.price !== undefined)
        .map((tier) => ({
          minNights: Number(tier.minNights) || 1,
          maxNights:
            tier.maxNights === "" || tier.maxNights === null || tier.maxNights === undefined
              ? null
              : Number(tier.maxNights),
          price: Number(tier.price),
        }))
        .filter((tier) => Number.isFinite(tier.price) && tier.price > 0);

      return {
        name: (period?.name || "").trim(),
        start: period?.start || "",
        end: period?.end || "",
        note: (period?.note || "").trim(),
        tiers,
      };
    })
    .filter((period) => period.start && period.end && period.tiers.length > 0);
};

/** Validate host input. Returns an array of human-readable error strings. */
export const validateFlexiblePrices = (periods, t = {}) => {
  const errors = [];
  if (!Array.isArray(periods)) return errors;

  periods.forEach((period, index) => {
    const label = period?.name?.trim() || `#${index + 1}`;
    const hasAnyInput =
      period?.name?.trim() ||
      period?.start ||
      period?.end ||
      period?.note?.trim() ||
      (period?.tiers || []).some((tier) => tier?.price !== "" && tier?.price !== undefined);

    if (!hasAnyInput) return; // untouched blank row, ignored on submit

    if (!period?.start || !period?.end) {
      errors.push(`${label}: ${t.FlexiblePriceDatesRequired || "both a start and an end date are required"}`);
    } else if (toLocalDateOnly(period.end) < toLocalDateOnly(period.start)) {
      errors.push(`${label}: ${t.FlexiblePriceEndBeforeStart || "the end date is before the start date"}`);
    }

    const tiers = Array.isArray(period?.tiers) ? period.tiers : [];
    const pricedTiers = tiers.filter(
      (tier) => tier?.price !== "" && tier?.price !== null && tier?.price !== undefined && Number(tier.price) > 0
    );

    if (pricedTiers.length === 0) {
      errors.push(`${label}: ${t.FlexiblePriceTierRequired || "add at least one night range with a price"}`);
    }

    pricedTiers.forEach((tier) => {
      const min = Number(tier.minNights) || 1;
      const hasMax =
        tier.maxNights !== "" && tier.maxNights !== null && tier.maxNights !== undefined;
      if (hasMax && Number(tier.maxNights) < min) {
        errors.push(`${label}: ${t.FlexiblePriceTierInvalid || "a night range has a maximum lower than its minimum"}`);
      }
    });
  });

  return errors;
};
