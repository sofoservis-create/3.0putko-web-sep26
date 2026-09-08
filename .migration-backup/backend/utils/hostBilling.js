// utils/hostBilling.js
//
// One definition of "which invoicing fields is this host still missing", shared
// by the Host schema method, the listing/booking gates and the monthly invoice
// run. It lives in its own module because `listingGating.js` imports the Host
// model — putting this there and importing it back into `models/Host.js` would
// close an import cycle.
//
// Works on a lean object as well as a hydrated document, so it is safe to call
// on a populated `.lean()` result where schema methods are unavailable.

/**
 * Fields required before Putko can raise a compliant Slovak invoice for its fee.
 * Falls back to the legacy free-text columns so hosts who already filled those
 * in are not asked to re-enter the same data.
 *
 * @param {object|null} host
 * @returns {string[]} empty when the host is fully billable
 */
export function missingBillingFieldsOf(host) {
  if (!host) return ["host_not_found"];

  const missing = [];
  // The name the invoice is made out to. `companyName` is OPTIONAL — a sole
  // trader has none — so the host's own name satisfies it, the same way `ico`
  // falls back to `idNumber` below. Requiring companyName outright made the
  // billing form impossible to complete: it does not collect one, so the check
  // reported `billing_name` missing however many times the host saved.
  if (blank(host.companyName) && blank(host.name)) missing.push("billing_name");
  if (host.billingSubjectType !== "individual" && blank(host.ico) && blank(host.idNumber)) missing.push("ico");
  if (host.billingSubjectType !== "individual" && blank(host.dic) && blank(host.tin)) missing.push("dic");
  if (blank(host.streetNumber)) missing.push("billing_address_street");
  if (blank(host.city)) missing.push("billing_address_city");
  if (blank(host.zipcode)) missing.push("billing_address_zip");
  if (blank(host.countryCode) && blank(host.country)) missing.push("billing_address_country");
  return missing;
}

/**
 * Trim-aware emptiness check — "   " is not a filled-in IČO.
 *
 * The browser copy in `frontend/src/app/utlis/hostBilling.js` has always trimmed;
 * this one used a bare falsiness test, so a whitespace-only value counted as
 * present on the server and absent in the browser. That is the drift the two
 * files warn each other about: the host would be told their details are missing
 * while the payout gate waved them through. No stored value currently trips it,
 * which is precisely why it was worth closing before one does.
 */
function blank(value) {
  return !String(value ?? "").trim();
}

/** True when every invoicing field Putko needs is present. */
export function isBillingCompleteFor(host) {
  return missingBillingFieldsOf(host).length === 0;
}
