// Slovak-correct formatting. Both helpers here fix things the current site
// gets wrong in ways a Slovak reader notices immediately.

/**
 * Slovak has THREE plural forms, not two:
 *   1        → ubytovanie
 *   2, 3, 4  → ubytovania
 *   0, 5+    → ubytovaní   (genitive plural)
 *
 * English-shaped `n === 1 ? sg : pl` produces "2 ubytovaní" and
 * "5 ubytovania", both of which read as broken Slovak. This is the single
 * most visible localisation error a Slovak site can ship, and it appears
 * on every tile of a destination grid.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export const listingsWord = (n: number) =>
  plural(n, "ubytovanie", "ubytovania", "ubytovaní");

export const nightsWord = (n: number) =>
  plural(n, "noc", "noci", "nocí");

export const guestsWord = (n: number) =>
  plural(n, "hosť", "hostia", "hostí");

/**
 * Money is integer cents everywhere in this codebase (never float), so
 * formatting is the only place it becomes a decimal — and it happens once,
 * here. Slovak convention: space as the thousands separator, comma as the
 * decimal, € after the number.
 */
export function eur(cents: number, opts: { decimals?: boolean } = {}): string {
  const showDecimals = opts.decimals ?? cents % 100 !== 0;
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(cents / 100);
}
