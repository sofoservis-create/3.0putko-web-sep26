/**
 * Build a URL-safe slug from a title.
 *
 * Accented letters are transliterated to their base ASCII letter instead of
 * being dropped, so "Apartmán Anička Tatranská Lomnica" becomes
 * "apartman-anicka-tatranska-lomnica" and not "apartmn-anika-tatransk-lomnica".
 *
 * This matters for every Slovak diacritic (á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž):
 * Unicode NFD splits each one into a base letter plus a combining mark, so
 * removing the marks leaves the plain letter behind.
 */

// Letters NFD cannot split into base + combining mark, so they need an
// explicit mapping. Listed lowercase because toLowerCase() runs first.
const NON_DECOMPOSABLE = {
  "ß": "ss",
  "đ": "d",
  "ł": "l",
  "ø": "o",
  "æ": "ae",
  "œ": "oe",
  "þ": "th",
  "ð": "d",
};

export const slugify = (str) => {
  if (!str) return "";

  return str
    .toString()
    .trim()
    .toLowerCase()
    // Map the letters NFD leaves untouched
    .replace(/[ßđłøæœþð]/g, (ch) => NON_DECOMPOSABLE[ch] || ch)
    // Split accented letters into base + accent, then drop the accent
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Spaces and underscores become dashes
    .replace(/[\s_]+/g, "-")
    // Keep only a-z, 0-9 and dashes
    .replace(/[^a-z0-9-]/g, "")
    // Collapse repeated dashes, then trim them off both ends
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export default slugify;
