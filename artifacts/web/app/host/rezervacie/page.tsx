import { db } from "@workspace/db";
import { getHostReservations } from "@workspace/db/queries/account";
import { requireHost } from "../../_lib/session";
import { AccountShell, EmptyState } from "../../_components/account-shell";
import { StatusBadge } from "../../_components/status-badge";
import { hostNav } from "../_nav";
import { eur, plural, formatStay } from "../../_lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rezervácie" };

export default async function HostReservationsPage() {
  const session = await requireHost("/host/rezervacie");

  // Scoped by host_id in SQL — this cannot return another host's bookings.
  const reservations = await getHostReservations(db, session.guestId);
  const pending = reservations.filter((r) => r.status === "request_pending");

  return (
    <AccountShell
      session={session}
      nav={hostNav(pending.length)}
      active="/host/rezervacie"
      title="Rezervácie"
    >
      {reservations.length === 0 ? (
        <EmptyState>Zatiaľ žiadne rezervácie.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="px-4 py-3 font-medium">Ubytovanie</th>
                <th className="px-4 py-3 font-medium">Termín</th>
                <th className="px-4 py-3 font-medium">Hosť</th>
                <th className="px-4 py-3 font-medium">Stav</th>
                <th className="px-4 py-3 text-right font-medium">Výplata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {r.listingName}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {formatStay(r.checkIn, r.checkOut)}
                  </td>
                  {/* Name only. No email column, no phone column — the old
                      system prints both, to every host and (via the
                      unfiltered /reservations page) to every guest. */}
                  <td className="px-4 py-3 text-ink-soft">
                    {r.guestName}
                    <span className="ml-2 text-ink-muted">
                      · {r.guestCount}{" "}
                      {plural(r.guestCount, "hosť", "hostia", "hostí")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-ui font-semibold text-ink">
                    {eur(r.hostPayoutCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-ink-muted">
        Výplata je suma po odpočítaní 6 % provízie. Kontakt na hosťa
        nezobrazujeme — komunikácia pôjde cez platformu, aby zostala
        dohľadateľná.
      </p>
    </AccountShell>
  );
}
