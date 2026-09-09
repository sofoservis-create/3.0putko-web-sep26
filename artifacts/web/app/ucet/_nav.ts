import type { NavItem } from "../_components/account-shell";

/** Guest account navigation. Real routes, one per section. */
export const guestNav: NavItem[] = [
  { href: "/ucet", label: "Prehľad" },
  { href: "/ucet/rezervacie", label: "Moje rezervácie" },
  { href: "/ucet/profil", label: "Osobné údaje" },
];
