import React from "react";
import { ChevronRight, Users } from "lucide-react";
import Link from "@/app/components/NextLink";
import { useHostNavigation } from "../HostNavigationGuard";
import { hostPaths } from "../hostRoutes";
import { formatMoney, formatStay, guestsLabel, nightsLabel, stagePresentation } from "./reservationModel";

/**
 * One row of the Reservations list: guest, property, dates, guests and total.
 * The whole card is the link to the detail; open requests get an amber edge
 * so they stand out while scrolling.
 */
export default function ReservationCard({ reservation, language, showProperty = true, urgent = false }) {
  const { linkProps } = useHostNavigation();
  const stage = stagePresentation(reservation.stage, language);
  return (
    <li>
      <Link
        {...linkProps(hostPaths.reservation(reservation.id))}
        className={`flex min-h-[72px] items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:border-[#DFBA73] ${
          urgent ? "border-amber-300 border-l-4 border-l-amber-500" : "border-neutral-200"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-bold text-[#1E3E2B]">{reservation.guest?.name}</p>
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${stage.badge}`}>{stage.label}</span>
          </div>
          {showProperty && <p className="mt-0.5 truncate text-[13px] text-neutral-500">{reservation.listing?.name}</p>}
          <p className="mt-1 text-[14px] font-semibold text-[#1E3E2B]">{formatStay(reservation, language)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-neutral-600">
            <span>{nightsLabel(reservation.nights, language)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1"><Users size={13} /> {guestsLabel(reservation.guests, language)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-bold text-[#1E3E2B]">{formatMoney(reservation.totalCents, reservation.currency, language)}</span>
          </p>
        </div>
        <ChevronRight size={20} className="shrink-0 text-neutral-400" />
      </Link>
    </li>
  );
}
