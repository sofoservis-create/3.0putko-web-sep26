// utils/iban.js
//
// IBAN validation for the DAC7 filing.
//
// The masked value Stripe exposes on a connected account is country + last four
// ("SK****1234"), which does not satisfy the reporting requirement. The full
// number therefore has to come from the host, and a typo would be discovered at
// the 31 January deadline — so it is checked on entry instead.
//
// The check is the ISO 13616 / ISO 7064 mod-97 one: a correctly typed IBAN
// leaves a remainder of 1. It catches transpositions and single-character
// errors, which is what typing errors actually are.

/** Country -> expected total length. Covers SEPA; extend as needed. */
const IBAN_LENGTHS = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18,
  EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28,
  IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27,
  MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19,
  SK: 24, SM: 27,
};

/** Strip spaces and upper-case, the form every check below assumes. */
export const normaliseIban = (value) =>
  String(value || "").replace(/[\s-]/g, "").toUpperCase();

/**
 * @returns {{ valid: boolean, error?: string, iban?: string, country?: string }}
 */
export function validateIban(value) {
  const iban = normaliseIban(value);

  if (!iban) return { valid: false, error: "An IBAN is required" };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return { valid: false, error: "That does not look like an IBAN" };
  }

  const country = iban.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[country];

  if (!expectedLength) {
    return { valid: false, error: `IBANs from ${country} are not supported` };
  }
  if (iban.length !== expectedLength) {
    return {
      valid: false,
      error: `A ${country} IBAN has ${expectedLength} characters, this one has ${iban.length}`,
    };
  }

  // Move the first four characters to the end, then map letters to numbers
  // (A=10 ... Z=35) and take mod 97. A valid IBAN gives 1.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (ch) => ch.charCodeAt(0) - 55);

  // The number is far beyond Number.MAX_SAFE_INTEGER, so fold it in chunks
  // rather than parsing it whole.
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    remainder = Number(String(remainder) + digits.slice(i, i + 7)) % 97;
  }

  if (remainder !== 1) {
    return { valid: false, error: "That IBAN's check digits do not match — please re-check it" };
  }

  return { valid: true, iban, country };
}

/** Display form: country + last four, never the whole number. */
export const maskIban = (value) => {
  const iban = normaliseIban(value);
  if (iban.length < 6) return "";
  return `${iban.slice(0, 2)}****${iban.slice(-4)}`;
};
