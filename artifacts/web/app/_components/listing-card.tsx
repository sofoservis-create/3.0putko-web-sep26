import { eur, guestsWord, nightsWord } from "../_lib/format";

export type ListingRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  basePriceCents: number;
  maxGuests: number;
  distanceM?: number;
};

export function ListingCard({ listing }: { listing: ListingRow }) {
  const { name, city, basePriceCents, maxGuests, distanceM } = listing;

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {/* No photography exists for these yet. An empty tinted band is
          honest; a stock photo of somebody else's chalet is not. */}
      <div className="h-36 bg-gradient-to-br from-photo-from to-photo-to" />

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-bold leading-snug text-ink">
          {name}
        </h3>

        <p className="mt-1 text-sm text-ink-muted">
          {city}
          {typeof distanceM === "number" && distanceM > 0
            ? ` · ${Math.round(distanceM / 1000)} km od centra`
            : null}
        </p>

        <p className="mt-auto pt-3 font-ui text-sm text-ink-soft">
          <span className="text-base font-semibold text-ink">
            {eur(basePriceCents)}
          </span>{" "}
          / {nightsWord(1)} · až {maxGuests} {guestsWord(maxGuests)}
        </p>
      </div>
    </article>
  );
}
