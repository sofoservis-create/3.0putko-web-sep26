/**
 * Which invoicing details a host is still missing.
 *
 * This mirrors `HostSchema.methods.missingBillingFields()` in
 * `backend/models/Host.js` field for field, including the fallbacks onto the
 * legacy free-text columns (`idNumber` / `tin` / `country`) so a host who filled
 * those in years ago is not asked for the same data twice.
 *
 * Keep the two in step. The browser copy decides whether the host is prompted;
 * the server copy decides whether the payout is allowed. If they drift, the host
 * is either nagged for data that is already on file or told everything is fine
 * and then refused at the Withdraw button.
 */

/** Trim-aware emptiness check — "   " is not a filled-in IČO. */
const blank = (value) => !String(value ?? "").trim();

/** Field keys, in the order they should be presented to the host. */
export const BILLING_FIELDS = [
  "billing_name",
  "ico",
  "dic",
  "billing_address_street",
  "billing_address_city",
  "billing_address_zip",
  "billing_address_country",
];

/** Host-facing names for each key the server can return. */
export const BILLING_FIELD_LABELS = {
  billing_name: "Billing name",
  ico: "IČO (business ID)",
  dic: "DIČ (tax ID)",
  billing_address_street: "Street and number",
  billing_address_city: "City",
  billing_address_zip: "ZIP code",
  billing_address_country: "Country",
};

/** Locale key holding each field's name, so the list can be shown in Slovak. */
const BILLING_FIELD_KEYS = {
  billing_name: "BillingFieldName",
  ico: "BillingFieldIco",
  dic: "BillingFieldDic",
  billing_address_street: "BillingFieldStreet",
  billing_address_city: "BillingFieldCity",
  billing_address_zip: "BillingFieldZip",
  billing_address_country: "BillingFieldCountry",
};

/**
 * One field's host-facing name.
 *
 * `labels` is a locale dictionary (`en` / `sk`); the English constants above are
 * the fallback, so a caller with no translations in hand still renders something
 * readable rather than the raw `billing_address_zip`.
 */
export function billingFieldLabel(key, labels = {}) {
  return (
    labels[BILLING_FIELD_KEYS[key]] || BILLING_FIELD_LABELS[key] || String(key)
  );
}

/**
 * @param {object|null} host  the host document as returned by GET /api/hosts/:id
 * @returns {string[]} the missing field keys, empty when nothing is outstanding
 */
export function missingBillingFields(host) {
  if (!host) return [...BILLING_FIELDS];

  const missing = [];

  // The name the invoice is made out to. `companyName` is OPTIONAL — a sole
  // trader has none — so the host's own name satisfies it, the same way `ico`
  // falls back to `idNumber` below. Must stay in step with the server copy.
  if (blank(host.companyName) && blank(host.name)) missing.push("billing_name");
  if (host.billingSubjectType !== "individual" && blank(host.ico) && blank(host.idNumber)) missing.push("ico");
  if (host.billingSubjectType !== "individual" && blank(host.dic) && blank(host.tin)) missing.push("dic");
  if (blank(host.streetNumber)) missing.push("billing_address_street");
  if (blank(host.city)) missing.push("billing_address_city");
  if (blank(host.zipcode)) missing.push("billing_address_zip");
  if (blank(host.countryCode) && blank(host.country)) missing.push("billing_address_country");

  return missing;
}

/** True once Putko can raise a compliant Slovak invoice for its fee. */
export function isBillingComplete(host) {
  return missingBillingFields(host).length === 0;
}

/** "IČO (business ID), City" — for a one-line summary in a banner or toast. */
export function describeMissingBillingFields(fields, labels) {
  return (fields || []).map((key) => billingFieldLabel(key, labels)).join(", ");
}
