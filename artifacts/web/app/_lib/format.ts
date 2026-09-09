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

/**
 * `2026-02-14` + `2026-02-17` → `14. – 17. februára 2026`.
 *
 * Check-in/check-out are `date` columns, so they arrive as bare
 * `YYYY-MM-DD` strings with no timezone. They are formatted through `Intl`
 * with an explicit UTC noon anchor rather than `new Date(str)` +
 * `toLocaleDateString()`, because parsing a bare date string yields UTC
 * midnight — and rendering that anywhere west of Greenwich shows the
 * PREVIOUS day. A check-in that reads a day early is the kind of bug a
 * guest discovers at reception.
 *
 * Noon rather than midnight for the same reason in reverse: it leaves 12
 * hours of slack in both directions, so no plausible timezone can push the
 * date across a boundary.
 */
export function formatStay(checkIn: string, checkOut: string): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("sk-SK", { timeZone: "UTC", ...opts }).format(
      new Date(`${iso}T12:00:00Z`)
    );

  const sameMonth = checkIn.slice(0, 7) === checkOut.slice(0, 7);
  const from = sameMonth
    ? fmt(checkIn, { day: "numeric" })
    : fmt(checkIn, { day: "numeric", month: "long" });
  const to = fmt(checkOut, { day: "numeric", month: "long", year: "numeric" });
  return `${from} – ${to}`;
}
