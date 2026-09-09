import Link from "next/link";
import { db } from "@workspace/db";
import { getHostListings, getHostReservations } from "@workspace/db/queries/account";
import { requireHost } from "../_lib/session";
import { AccountShell, EmptyState } from "../_components/account-shell";
import { StatusBadge } from "../_components/status-badge";
import { hostNav } from "./_nav";
import { eur, plural, formatStay } from "../_lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prehľad ubytovateľa" };

export default async function HostOverviewPage() {
  const session = await requireHost("/host");

  const [listings, reservations] = await Promise.all([
    getHostListings(db, session.guestId),
    getHostReservations(db, session.guestId),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const pending = reservations.filter((r) => r.status === "request_pending");
  // Soonest arrival first — see the note in app/ucet/page.tsx. A host
  // looking at "Najbližšie príchody" is asking who turns up next.
  const upcoming = reservations
    .filter((r) => r.checkOut >= today && r.status === "confirmed")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  // Only confirmed, not-yet-cancelled money. Counting requests as revenue
  // would show a host a number they cannot spend.
  const expectedPayout = upcoming.reduce((sum, r) => sum + r.hostPayoutCents, 0);

  // A published listing with no coordinates is invisible: it is in no
  // destination and in no distance search. The host has no way to discover
  // that from the outside, so it is surfaced first, before anything else.
  const invisible = listings.filter(
    (l) => l.status === "published" && !l.hasCoordinates
  );

  return (
    <AccountShell
      session={session}
      nav={hostNav(pending.length)}
      active="/host"
      title="Prehľad"
    >
      {invisible.length > 0 ? (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            {invisible.length}{" "}
            {plural(invisible.length, "ubytovanie nemá", "ubytovania nemajú", "ubytovaní nemá")}{" "}
            polohu na mape
          </p>
          <p className="mt-1 text-sm text-amber-900/80">
            Bez súradníc sa ubytovanie nezobrazí v žiadnej destinácii ani vo
            vyhľadávaní podľa vzdialenosti — je zverejnené, ale hostia ho
            nenájdu.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Čaká na potvrdenie" value={String(pending.length)} highlight={pending.length > 0} />
        <Stat label="Potvrdené pobyty" value={String(upcoming.length)} />
        <Stat label="Očakávaná výplata" value={eur(expectedPayout)} />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-ink">
            Najbližšie príchody
          </h2>
          <Link
            href="/host/rezervacie"
            className="font-ui text-sm font-semibold text-link hover:text-link-hover"
          >
            Všetky rezervácie →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState>Žiadne potvrdené nadchádzajúce pobyty.</EmptyState>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">
                    {r.listingName}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatStay(r.checkIn, r.checkOut)} · {r.guestName} ·{" "}
                    {r.guestCount} {plural(r.guestCount, "hosť", "hostia", "hostí")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <span className="font-ui font-semibold text-ink">
                    {eur(r.hostPayoutCents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AccountShell>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-card border p-4 ${
        highlight ? "border-brand/30 bg-brand/[0.06]" : "border-border bg-surface"
      }`}
    >
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
