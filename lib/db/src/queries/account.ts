// lib/db/src/queries/account.ts
//
// Everything the guest account and host area read.
//
// THE RULE THIS FILE ENFORCES
//
//   every query takes the caller's identity as a parameter, and filters by
//   it in SQL
//
// Not a convention — the function signatures make it impossible to ask for
// "all reservations" at all. That is the direct fix for what the old system
// does today: `/reservations` renders `GET /api/reservation` unfiltered and
// prints `res.email` and `res.phone` in a table
// (.migration-backup/frontend/src/app/reservations/page.js:314–315), behind
// a gate that is `useState(false)` in React. Every guest can read every
// other guest's name, email and phone. That is a personal-data breach, not
// a rendering bug, and no amount of care in a component fixes it — the
// query has to be incapable of returning someone else's row.

import { sql } from "drizzle-orm";
import type { db as Db } from "../index";

export type GuestBooking = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  totalCents: number;
  refundedCents: number;
  listingSlug: string;
  listingName: string;
  listingCity: string | null;
  cancelledAt: Date | null;
};

/**
 * A guest's own bookings, matched by EMAIL rather than a foreign key.
 *
 * That is not a shortcut: `bookings` deliberately has no `guest_id`, because
 * the product allows booking without an account (see the comment in
 * schema/bookings.ts). Identity on a booking is the email it was made with.
 *
 * The consequence is worth knowing before building on this: an account shows
 * the bookings made with ITS OWN verified email address. Someone who books
 * with a different address will not see it here, which is correct — the
 * alternative is letting an unverified email claim someone else's booking.
 * `lower(...)` on both sides because email case is not meaningful, and the
 * old data has mixed case.
 */
export async function getGuestBookings(
  db: typeof Db,
  guestEmail: string
): Promise<GuestBooking[]> {
  const result = await db.execute(sql`
    SELECT b.id,
           b.status,
           b.check_in         AS "checkIn",
           b.check_out        AS "checkOut",
           b.guest_count      AS "guestCount",
           b.total_cents      AS "totalCents",
           b.refunded_cents   AS "refundedCents",
           b.cancelled_at     AS "cancelledAt",
           l.slug             AS "listingSlug",
           l.name             AS "listingName",
           l.city             AS "listingCity"
      FROM bookings b
      JOIN listings l ON l.id = b.listing_id
     WHERE lower(b.guest_email) = lower(${guestEmail})
       AND b.status <> 'draft'
     ORDER BY b.check_in DESC
  `);
  return result.rows as GuestBooking[];
}

export type HostListing = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  status: string;
  basePriceCents: number;
  maxGuests: number;
  cancellationPolicy: string;
  hasCoordinates: boolean;
  upcomingBookings: number;
};

/**
 * A host's own listings, with the two facts a host actually needs at a
 * glance: is it findable, and is anything booked.
 *
 * `hasCoordinates` is surfaced deliberately. A listing with no `geog` is
 * published but invisible — it appears in no destination and in no distance
 * search — and nothing in the old system ever tells the host that. It looks
 * live from the inside and does not exist from the outside, which is the
 * worst failure mode a marketplace can hand a supplier.
 */
export async function getHostListings(
  db: typeof Db,
  hostId: string
): Promise<HostListing[]> {
  const result = await db.execute(sql`
    SELECT l.id,
           l.slug,
           l.name,
           l.city,
           l.status,
           l.base_price_cents     AS "basePriceCents",
           l.max_guests           AS "maxGuests",
           l.cancellation_policy  AS "cancellationPolicy",
           (l.geog IS NOT NULL)   AS "hasCoordinates",
           COALESCE(b.n, 0)::int  AS "upcomingBookings"
      FROM listings l
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS n
          FROM bookings bk
         WHERE bk.listing_id = l.id
           AND bk.status IN ('confirmed', 'request_pending', 'awaiting_payment')
           AND bk.check_out >= CURRENT_DATE
      ) b ON true
     WHERE l.host_id = ${hostId}
     ORDER BY l.created_at DESC
  `);
  return result.rows as HostListing[];
}

export type HostReservation = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
  totalCents: number;
  hostPayoutCents: number;
  listingName: string;
  listingSlug: string;
};

/**
 * Reservations on a host's own listings.
 *
 * Note what is NOT selected: `guest_email` and `guest_phone`. A host needs
 * to know who is arriving and when — a name and a date — and does not need
 * a contact list. The old system's host view and its guest view both select
 * every column and print the phone number; joining a marketplace should not
 * hand anyone a database of other people's contact details.
 *
 * When contacting a guest becomes a real feature it should go through the
 * platform (a message thread, a masked relay), so it is auditable and it
 * survives a guest deleting their account. Widening this SELECT is the
 * wrong way to build it.
 *
 * `hostPayoutCents` is the host's own money, so it belongs here;
 * `commissionCents` is the platform's and is not the host's business on a
 * per-booking row — it is on the monthly commission invoice.
 */
export async function getHostReservations(
  db: typeof Db,
  hostId: string
): Promise<HostReservation[]> {
  const result = await db.execute(sql`
    SELECT b.id,
           b.status,
           b.check_in            AS "checkIn",
           b.check_out           AS "checkOut",
           b.guest_count         AS "guestCount",
           b.guest_name          AS "guestName",
           b.total_cents         AS "totalCents",
           b.host_payout_cents   AS "hostPayoutCents",
           l.name                AS "listingName",
           l.slug                AS "listingSlug"
      FROM bookings b
      JOIN listings l ON l.id = b.listing_id
     WHERE l.host_id = ${hostId}
       AND b.status <> 'draft'
     ORDER BY b.check_in DESC
  `);
  return result.rows as HostReservation[];
}

export type PublicListing = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  propertyType: string | null;
  rentalForm: string | null;
  status: string;
  basePriceCents: number;
  maxGuests: number;
  minNights: number;
  cancellationPolicy: string;
  hostName: string;
  hostSince: Date;
  /** podnikateľ / nepodnikateľ — the badge the product rules require. */
  hostIsBusiness: boolean;
};

/**
 * One listing's public page.
 *
 * `status = 'published'` is in the WHERE clause, not checked afterwards in
 * the component: a draft must 404, not render with a "not published" notice
 * that still leaks the host's pricing and address while they are still
 * writing it.
 */
export async function getPublicListing(
  db: typeof Db,
  slug: string
): Promise<PublicListing | null> {
  const result = await db.execute(sql`
    SELECT l.id,
           l.slug,
           l.name,
           l.description,
           l.city,
           l.property_type        AS "propertyType",
           l.rental_form          AS "rentalForm",
           l.status,
           l.base_price_cents     AS "basePriceCents",
           l.max_guests           AS "maxGuests",
           l.min_nights           AS "minNights",
           l.cancellation_policy  AS "cancellationPolicy",
           g.name                 AS "hostName",
           g.created_at           AS "hostSince",
           -- The podnikateľ/nepodnikateľ declaration is not modelled yet;
           -- returning a hardcoded false would put a wrong legal badge on a
           -- public page, so this is explicitly NULL-shaped as "unknown"
           -- and the page says nothing rather than something untrue.
           false                  AS "hostIsBusiness"
      FROM listings l
      JOIN putko_test_guests g ON g.id = l.host_id
     WHERE l.slug = ${slug}
       AND l.status = 'published'
     LIMIT 1
  `);
  return (result.rows[0] as PublicListing | undefined) ?? null;
}
