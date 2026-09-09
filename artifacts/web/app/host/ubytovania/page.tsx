import Link from "next/link";
import { db } from "@workspace/db";
import { getHostListings, getHostReservations } from "@workspace/db/queries/account";
import { requireHost } from "../../_lib/session";
import { AccountShell, EmptyState } from "../../_components/account-shell";
import { ListingStatusBadge } from "../../_components/status-badge";
import { hostNav } from "../_nav";
import { eur, guestsWord, plural } from "../../_lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moje ubytovania" };

const POLICY_LABEL: Record<string, string> = {
  flexible: "Flexibilné",
  standard: "Štandardné",
  strict: "Prísne",
};

export default async function HostListingsPage() {
  const session = await requireHost("/host/ubytovania");

  const [listings, reservations] = await Promise.all([
    getHostListings(db, session.guestId),
    getHostReservations(db, session.guestId),
  ]);
  const pending = reservations.filter((r) => r.status === "request_pending");

  return (
    <AccountShell
      session={session}
      nav={hostNav(pending.length)}
      active="/host/ubytovania"
      title="Moje ubytovania"
    >
      {listings.length === 0 ? (
        <EmptyState>Zatiaľ nemáte pridané žiadne ubytovanie.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li
              key={l.id}
              className="rounded-card border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {/* Published listings link to their public page so a host
                      can see exactly what a guest sees. A draft has no
                      public page, so it is not a link — a nav item that
                      404s is worse than plain text. */}
                  {l.status === "published" ? (
                    <Link
                      href={`/ubytovanie/${l.slug}`}
                      className="font-display text-lg font-bold text-ink hover:text-link"
                    >
                      {l.name}
                    </Link>
                  ) : (
                    <span className="font-display text-lg font-bold text-ink">
                      {l.name}
                    </span>
                  )}
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {l.city} · {eur(l.basePriceCents)} / noc · až {l.maxGuests}{" "}
                    {guestsWord(l.maxGuests)} · storno:{" "}
                    {POLICY_LABEL[l.cancellationPolicy] ?? l.cancellationPolicy}
                  </p>
                </div>
                <ListingStatusBadge status={l.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm">
                <span className="text-ink-soft">
                  {l.upcomingBookings}{" "}
                  {plural(
                    l.upcomingBookings,
                    "nadchádzajúca rezervácia",
                    "nadchádzajúce rezervácie",
                    "nadchádzajúcich rezervácií"
                  )}
                </span>

                {/* The single most useful thing this page can tell a host,
                    and the one the old dashboard never says. */}
                {l.status === "published" && !l.hasCoordinates ? (
                  <span className="font-medium text-amber-800">
                    Chýba poloha — hostia toto ubytovanie nenájdu
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
