import { requireSession } from "../../_lib/session";
import { AccountShell } from "../../_components/account-shell";
import { guestNav } from "../_nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Osobné údaje" };

export default async function GuestProfilePage() {
  const session = await requireSession("/ucet/profil");

  const rows: Array<[string, string]> = [
    ["Meno", `${session.name} ${session.lastName}`],
    ["E-mail", session.email],
    ["Telefón", session.phoneNumber],
  ];

  return (
    <AccountShell
      session={session}
      nav={guestNav}
      active="/ucet/profil"
      title="Osobné údaje"
    >
      <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-2 px-4 py-3.5">
            <dt className="w-32 shrink-0 text-sm text-ink-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Read-only for now, and it says so rather than showing an edit form
          that does nothing. Editing needs email re-verification (changing
          the address changes which bookings this account can see — see
          getGuestBookings) and a current-password check on password change,
          which is exactly what audit finding C-01 is: the old endpoint
          takes the target account's id in the request body and needs
          neither. Shipping the form before those checks would reproduce it. */}
      <p className="mt-4 text-sm text-ink-muted">
        Úprava údajov a zmena hesla sa pripravujú. Zmena e-mailu bude
        vyžadovať overenie novej adresy a zmena hesla zadanie súčasného —
        bez toho by šlo cudzí účet prepísať.
      </p>
    </AccountShell>
  );
}
