import type { NavItem } from "../_components/account-shell";

/**
 * Host navigation — four items, not eleven.
 *
 * The old dashboard has eleven: Overview, Reservation requests, My public
 * profile, Add new accommodation, Booking calendar, Calendar
 * synchronization, Manage listing, Personal profile, Change password, User
 * guide, Payments, Messages. Several are the same thing from two angles
 * ("Add new accommodation" and "Manage listing"; "My public profile" and
 * "Personal profile"), and a user guide inside the nav is a sign the nav
 * needs explaining.
 *
 * These four are what exists and works today. Calendar sync, payouts and
 * messages arrive as routes when their backing features do — an empty tab
 * teaches people the product is broken.
 */
export function hostNav(pendingCount = 0): NavItem[] {
  return [
    { href: "/host", label: "Prehľad" },
    { href: "/host/rezervacie", label: "Rezervácie", badge: pendingCount || undefined },
    { href: "/host/ubytovania", label: "Moje ubytovania" },
    { href: "/ucet/profil", label: "Osobné údaje" },
  ];
}
