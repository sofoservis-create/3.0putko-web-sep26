import Link from "next/link";
import type { DestinationTile } from "@workspace/db/queries/destinations";
import { listingsWord } from "../_lib/format";
import { KIND_LABEL, KIND_TINT } from "../_lib/kinds";

/**
 * One tile in "Obľúbené miesta na Slovensku".
 *
 * The count shown here is the destination's live listing count, and
 * clicking through runs the same membership predicate — so the number and
 * the page behind it cannot disagree. That is the whole point of the
 * feature (see lib/db/src/queries/destinations.ts); a tile whose number is
 * decorative is the bug this replaces.
 */
export function DestinationCard({
  destination,
  featured = false,
}: {
  destination: DestinationTile;
  featured?: boolean;
}) {
  const { slug, name, kind, description, listingCount } = destination;

  return (
    <Link
      href={`/miesta/${slug}`}
      className={`group relative flex flex-col justify-end overflow-hidden rounded-card bg-gradient-to-br ${KIND_TINT[kind]} p-5 text-white shadow-card transition-transform duration-200 hover:-translate-y-0.5 ${
        featured ? "min-h-56 sm:min-h-72" : "min-h-40 sm:min-h-48"
      }`}
    >
      <span className="absolute left-5 top-5 rounded-pill bg-white/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/90">
        {KIND_LABEL[kind]}
      </span>

      <div>
        <h3
          className={`font-display font-bold leading-tight ${
            featured ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"
          }`}
        >
          {name}
        </h3>

        {featured && description ? (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
            {description}
          </p>
        ) : null}

        <p className="mt-2 font-ui text-sm font-semibold text-mint-on-dark">
          {listingCount} {listingsWord(listingCount)}
        </p>
      </div>
    </Link>
  );
}
