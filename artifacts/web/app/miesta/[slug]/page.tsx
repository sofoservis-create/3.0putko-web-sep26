import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@workspace/db";
import {
  getDestination,
  getChildDestinations,
  getDestinationListings,
} from "@workspace/db/queries/destinations";
import { SiteHeader } from "../../_components/site-header";
import { DestinationCard } from "../../_components/destination-card";
import { ListingCard, type ListingRow } from "../../_components/listing-card";
import { listingsWord } from "../../_lib/format";
import { KIND_LABEL } from "../../_lib/kinds";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getDestination(db, slug);
  if (!destination) return { title: "Destinácia sa nenašla" };

  return {
    title: `${destination.name} — ubytovanie`,
    description:
      destination.description ??
      `Ubytovanie v destinácii ${destination.name}.`,
  };
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;

  const destination = await getDestination(db, slug);
  if (!destination) notFound();

  const [children, listings] = await Promise.all([
    getChildDestinations(db, slug),
    getDestinationListings(db, slug, { limit: 24 }),
  ]);

  const rows = listings as unknown as ListingRow[];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="font-ui text-sm font-medium uppercase tracking-wide text-link">
          {KIND_LABEL[destination.kind]}
        </p>

        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          {destination.name}
        </h1>

        {destination.description ? (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {destination.description}
          </p>
        ) : null}

        {/* This number came from the same predicate that produced the list
            below it, so it is a description of the page rather than a
            claim about it. */}
        <p className="mt-4 font-ui text-ink-muted">
          {destination.listingCount} {listingsWord(destination.listingCount)}
        </p>

        {children.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold text-ink">
              Konkrétnejšie miesta
            </h2>
            {/* Child counts come from each child's OWN circle, so they do
                not sum to the parent's — deliberately, and documented in
                lib/db/src/queries/destinations.ts. Presented as places to
                narrow to, never as a breakdown of the number above. */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((c) => (
                <DestinationCard key={c.slug} destination={c} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-ink">
            Ubytovanie
          </h2>

          {rows.length === 0 ? (
            <p className="mt-5 rounded-card border border-dashed border-border-strong p-8 text-center text-ink-muted">
              V tejto destinácii zatiaľ nemáme ubytovanie. Skúste širší
              región alebo sa vráťte neskôr.
            </p>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
