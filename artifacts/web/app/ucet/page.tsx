import Link from "next/link";
import { db } from "@workspace/db";
import { getGuestBookings } from "@workspace/db/queries/account";
import { requireSession } from "../_lib/session";
import { AccountShell, EmptyState } from "../_components/account-shell";
import { StatusBadge } from "../_components/status-badge";
import { guestNav } from "./_nav";
import { eur, plural, formatStay } from "../_lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Môj účet" };

export default async function AccountOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ "nie-ste-ubytovatel"?: string }>;
}) {
  const session = await requireSession("/ucet");
  const params = await searchParams;

  const bookings = await getGuestBookings(db, session.email);
  const today = new Date().toISOString().slice(0, 10);
  // Ascending: a section headed "Najbližšie pobyty" has to lead with the
  // SOONEST stay. getGuestBookings orders by check_in DESC, which is right
  // for a history list and exactly wrong here — taken unsorted, slice(0, 3)
  // would show the three furthest-away stays under a "nearest" heading.
  const upcoming = bookings
    .filter((b) => b.checkOut >= today && b.status !== "cancelled")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <AccountShell
      session={session}
      nav={guestNav}
      active="/ucet"
      title={`Dobrý deň, ${session.name}`}
    >
      {params["nie-ste-ubytovatel"] ? (
        <p className="mb-6 rounded-card bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Táto časť je pre ubytovateľov. Váš účet zatiaľ nemá aktivované
          prenajímanie.
        </p>
      ) : null}

      <section>
        <h2 className="font-display text-xl font-bold text-ink">
          Najbližšie pobyty
        </h2>

        {upcoming.length === 0 ? (
          <div className="mt-4">
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
              Zatiaľ nemáte žiadne nadchádzajúce rezervácie.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.slice(0, 3).map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/ubytovanie/${b.listingSlug}`}
                    className="font-display text-lg font-bold text-ink hover:text-link"
                  >
                    {b.listingName}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatStay(b.checkIn, b.checkOut)} · {b.guestCount}{" "}
                    {plural(b.guestCount, "hosť", "hostia", "hostí")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <span className="font-ui font-semibold text-ink">
                    {eur(b.totalCents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* An honest prompt rather than a dead "become a host" button: the
          host flow needs Stripe onboarding, which is a later phase. */}
      {!session.isHost ? (
        <section className="mt-10 rounded-card border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-bold text-ink">
            Máte chatu alebo apartmán?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Prenajímanie cez Putko sa pripravuje — registrácia ubytovateľov
            bude dostupná spolu s výplatami cez Stripe.
          </p>
        </section>
      ) : null}
    </AccountShell>
  );
}
