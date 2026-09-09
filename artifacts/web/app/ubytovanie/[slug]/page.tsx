import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@workspace/db";
import { getPublicListing } from "@workspace/db/queries/account";
import { getDestinationsForListing } from "@workspace/db/queries/destinations";
import { SiteHeader } from "../../_components/site-header";
import { eur, guestsWord, nightsWord } from "../../_lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const POLICY: Record<string, { label: string; detail: string }> = {
  flexible: {
    label: "Flexibilné",
    detail: "Bezplatné zrušenie do 24 hodín pred príchodom.",
  },
  standard: {
    label: "Štandardné",
    detail: "Bezplatné zrušenie do 5 dní pred príchodom.",
  },
  strict: {
    label: "Prísne",
    detail: "Bezplatné zrušenie do 14 dní pred príchodom.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListing(db, slug);
  if (!listing) return { title: "Ubytovanie sa nenašlo" };
  return {
    title: listing.name,
    description: listing.description ?? `Ubytovanie v ${listing.city}.`,
  };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;

  const listing = await getPublicListing(db, slug);
  if (!listing) notFound();

  // The breadcrumb comes from the same geographic membership rule the
  // destination tiles use, so a listing is shown under exactly the places
  // whose pages would list it.
  const destinations = await getDestinationsForListing(db, listing.id);
  const policy = POLICY[listing.cancellationPolicy];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {destinations.length > 0 ? (
          <nav aria-label="Kde sa nachádza" className="flex flex-wrap gap-2">
            {destinations.map((d) => (
              <Link
                key={d.slug}
                href={`/miesta/${d.slug}`}
                className="rounded-pill bg-black/[0.04] px-3 py-1 font-ui text-xs font-semibold text-link transition-colors hover:bg-black/[0.07] hover:text-link-hover"
              >
                {d.name}
              </Link>
            ))}
          </nav>
        ) : null}

        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {listing.name}
        </h1>
        <p className="mt-2 text-ink-soft">{listing.city}</p>

        <div className="mt-6 h-56 rounded-card bg-gradient-to-br from-photo-from to-photo-to sm:h-80" />

        {listing.description ? (
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {listing.description}
          </p>
        ) : null}

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <Fact label="Cena za noc" value={eur(listing.basePriceCents)} />
          <Fact
            label="Kapacita"
            value={`${listing.maxGuests} ${guestsWord(listing.maxGuests)}`}
          />
          <Fact
            label="Minimálny pobyt"
            value={`${listing.minNights} ${nightsWord(listing.minNights)}`}
          />
        </dl>

        {policy ? (
          <section className="mt-8 rounded-card border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-bold text-ink">
              Storno podmienky: {policy.label}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{policy.detail}</p>
          </section>
        ) : null}

        {/* The intermediary position, stated on the page where the guest is
            deciding — not buried in terms nobody opens. It is the legal
            reality of the product and it is also reassuring, so there is no
            reason to hide it. */}
        <section className="mt-8 rounded-card border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-bold text-ink">
            Ubytovateľ
          </h2>
          <p className="mt-1 text-ink-soft">{listing.hostName}</p>
          <p className="mt-3 text-sm text-ink-muted">
            Zmluva o ubytovaní vzniká priamo medzi vami a ubytovateľom. Putko
            je sprostredkovateľ — nie je zmluvnou stranou. Miestnu daň za
            ubytovanie vyberá ubytovateľ na mieste.
          </p>
        </section>

        <p className="mt-8 rounded-card border border-dashed border-border-strong p-5 text-center text-sm text-ink-muted">
          Rezervácia sa pripravuje. Dostupnosť a platba pribudnú v ďalšej fáze.
        </p>
      </main>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  );
}
