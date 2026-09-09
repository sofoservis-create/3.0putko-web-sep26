import { db } from "@workspace/db";
import { getTopLevelDestinations } from "@workspace/db/queries/destinations";
import { SiteHeader } from "../_components/site-header";
import { DestinationCard } from "../_components/destination-card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kam ísť na Slovensku",
  description: "Všetky destinácie s dostupným ubytovaním.",
};

export default async function AllDestinationsPage() {
  // The same query as the home page grid, with the limit lifted — not a
  // second copy of it. No SQL lives in this app: if the membership rule
  // ever changes, it changes in one file and every page follows.
  const destinations = await getTopLevelDestinations(db, null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Kam ísť na Slovensku
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">
          Zobrazujeme len destinácie, kde je dostupné ubytovanie.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => (
            <DestinationCard key={d.slug} destination={d} />
          ))}
        </div>
      </main>
    </>
  );
}
