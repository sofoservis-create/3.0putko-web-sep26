import { requireHost } from "../_lib/session";

// Host gating in the layout — server-side, before any child renders, and
// automatic for every route added under /host later.
export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireHost("/host");
  return <>{children}</>;
}
