import Link from "next/link";
import { db } from "@workspace/db";
import {
  getTopLevelDestinations,
  countPublishedListings,
} from "@workspace/db/queries/destinations";
import { SiteHeader } from "./_components/site-header";
import { DestinationCard } from "./_components/destination-card";
import { listingsWord } from "./_lib/format";

// Server Component: this runs on the server, queries Postgres directly, and
// ships HTML. No client-side fetch, no loading spinner, no API round-trip —
// and Google sees the destination names and counts in the source, which for
// an accommodation marketplace is the whole SEO game.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [destinations, listingTotal] = await Promise.all([
    getTopLevelDestinations(db, 9),
    countPublishedListings(db),
  ]);
  const [lead, ...rest] = destinations;

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────
            The current site's hero reads "1433+ ubytovaní" above a
            catalogue of 6 (audit/DESIGN-AUDIT.md D-01). The number below
            is a COUNT(*) taken on this request. If it is small, it says so
            — a marketplace that inflates its inventory teaches guests to
            distrust its prices and its availability too. */}
        <section className="border-b border-border bg-gradient-to-br from-ink-deep via-ink to-brand-hover">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
              Ubytovanie na Slovensku{" "}
              <span className="italic text-mint-on-dark">
                priamo od ubytovateľa
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Chaty, apartmány a penzióny. Zmluva je medzi vami a
              ubytovateľom — Putko je len sprostredkovateľ.
            </p>

            <p className="mt-8 font-ui text-sm text-white/60">
              Práve teraz{" "}
              <span className="font-semibold text-mint-on-dark">
                {listingTotal} {listingsWord(listingTotal)}
              </span>{" "}
              v {destinations.length} destináciách
            </p>
          </div>
        </section>

        {/* ── Obľúbené miesta ─────────────────────────────────────────────
            Replaces the flat city grid. Ranked by live listing count, and
            filtered to destinations that actually have something — a tile
            reading "0 možností" is never rendered because the query never
            returns one. */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Obľúbené miesta na Slovensku
              </h2>
              <p className="mt-3 max-w-xl text-ink-soft">
                Regióny, hory a mestá — počty sú živé, nie marketingové.
              </p>
            </div>

            <Link
              href="/miesta"
              className="font-ui font-semibold text-link transition-colors hover:text-link-hover"
            >
              Všetky destinácie →
            </Link>
          </div>

          {destinations.length === 0 ? (
            <p className="mt-10 rounded-card border border-dashed border-border-strong p-8 text-center text-ink-muted">
              Zatiaľ tu nie je žiadne ubytovanie. Hneď ako pribudne prvé,
              objaví sa tu jeho destinácia.
            </p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* The leader gets a double-width tile: it is the destination
                  with the most real supply, so it is also the one most
                  likely to convert. Editorial sort_order cannot buy this
                  slot — only listings can. */}
              {lead ? (
                <div className="sm:col-span-2">
                  <DestinationCard destination={lead} featured />
                </div>
              ) : null}
              {rest.map((d) => (
                <DestinationCard key={d.slug} destination={d} />
              ))}
            </div>
          )}
        </section>

        {/* Honest about state. This scaffold renders the browse layer only;
            search, the listing page and checkout are the next phases. */}
        <section className="border-t border-border bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-muted sm:px-6">
            Rozostavané. Funguje prehliadanie destinácií nad reálnou
            databázou; vyhľadávanie, detail ubytovania a rezervácia sú ďalšie
            fázy. Ubytovania sú zatiaľ ukážkové dáta.
          </div>
        </section>
      </main>
    </>
  );
}
