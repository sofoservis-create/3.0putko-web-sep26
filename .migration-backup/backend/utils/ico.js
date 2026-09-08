// utils/ico.js
/**
 * Slovak IČO checksum (mod-11), available to callers that need strict validation.
 */
export function isValidIco(s) {
  if (!/^\d{8}$/.test(s)) return false;
  const w = [8, 7, 6, 5, 4, 3, 2];
  const sum = w.reduce((a, wi, i) => a + wi * +s[i], 0);
  const r = sum % 11;
  const check = r === 0 ? 1 : r === 1 ? 0 : 11 - r;
  return check === +s[7];
}

/**
 * Strip diacritics and lower-case for matching against legal_form.
 */
function normalize(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Map a register legal-form label → internal entityType.
 * Log every UNKNOWN with an occurrence counter in production.
 */
export function classify(legalForm) {
  const f = normalize(legalForm);

  if (/fyzicka osoba|zivnost|samostatne hospodariaci/.test(f)) return 'SOLE_TRADER';
  if (/rucenim obmedzenym/.test(f)) return 'LLC';
  if (/akciova spolocnost/.test(f)) return 'JSC';
  if (/komanditna|verejna obchodna|jednoducha spolocnost|druzstvo/.test(f)) return 'OTHER_COMPANY';
  if (/zdruzenie|nadacia|nezisk|neinvesticny fond|cirkev/.test(f)) return 'NONPROFIT';
  if (/obec|mesto|rozpoctova|prispevkova|statny podnik|vysoka skola/.test(f)) return 'PUBLIC_SECTOR';

  // Log raw value in real traffic so the list can be extended later.
  console.warn('[ico] UNKNOWN legal_form:', legalForm);
  return 'UNKNOWN';
}
