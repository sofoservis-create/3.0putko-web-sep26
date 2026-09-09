import Link from "next/link";
import { db } from "@workspace/db";
import { getGuestBookings } from "@workspace/db/queries/account";
import { requireSession } from "../../_lib/session";
import { AccountShell, EmptyState } from "../../_components/account-shell";
import { StatusBadge } from "../../_components/status-badge";
import { guestNav } from "../_nav";
import { eur, plural, formatStay } from "../../_lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moje rezervácie" };

export default async function GuestReservationsPage() {
  const session = await requireSession("/ucet/rezervacie");

  // Scoped to this account's own email, in SQL. There is no code path here
  // that could return anyone else's booking — compare the old
  // /reservations page, which fetches every reservation on the platform and
  // prints each guest's email and phone in a table.
  const bookings = await getGuestBookings(db, session.email);
  const today = new Date().toISOString().slice(0, 10);

  // Upcoming reads forwards (soonest first — it is a plan); past reads
  // backwards (most recent first — it is a history). Same list, opposite
  // orders, because they answer opposite questions.
  const upcoming = bookings
    .filter((b) => b.checkOut >= today && b.status !== "cancelled")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = bookings.filter(
    (b) => b.checkOut < today || b.status === "cancelled"
  );

  return (
    <AccountShell
      session={session}
      nav={guestNav}
      active="/ucet/rezervacie"
      title="Moje rezervácie"
    >
      <p className="-mt-2 mb-6 text-sm text-ink-muted">
        Zobrazujeme rezervácie zadané s adresou{" "}
        <span className="font-medium text-ink-soft">{session.email}</span>.
      </p>

      {bookings.length === 0 ? (
        <EmptyState
          action={
            <Link
              href="/miesta"
              className="inline-block rounded-control bg-brand px-4 py-2 font-ui text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Prezrieť destinácie
            </Link>
          }
        >
          Zatiaľ ste u nás nič nerezervovali.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          <BookingGroup title="Nadchádzajúce" bookings={upcoming} />
          <BookingGroup title="Minulé a zrušené" bookings={past} />
        </div>
      )}
    </AccountShell>
  );
}

function BookingGroup({
  title,
  bookings,
}: {
  title: string;
  bookings: Awaited<ReturnType<typeof getGuestBookings>>;
}) {
  if (bookings.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {bookings.map((b) => (
          <li
            key={b.id}
            className="rounded-card border border-border bg-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/ubytovanie/${b.listingSlug}`}
                  className="font-display text-lg font-bold text-ink hover:text-link"
                >
                  {b.listingName}
                </Link>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {b.listingCity} · {formatStay(b.checkIn, b.checkOut)} ·{" "}
                  {b.guestCount} {plural(b.guestCount, "hosť", "hostia", "hostí")}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border pt-3 font-ui text-sm">
              <span className="text-ink-soft">
                Cena{" "}
                <span className="font-semibold text-ink">
                  {eur(b.totalCents)}
                </span>
              </span>
              {/* Refunds are shown whenever one exists, on the guest's own
                  row. A guest should never have to email support to find
                  out how much of their money came back. */}
              {b.refundedCents > 0 ? (
                <span className="text-ink-soft">
                  Vrátené{" "}
                  <span className="font-semibold text-ink">
                    {eur(b.refundedCents)}
                  </span>
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
