import { requireSession } from "../_lib/session";

// Auth is enforced HERE, in the layout, so it covers every page under /ucet
// automatically — including ones added later by someone who forgets to
// check. The old system's equivalent is a client component wrapper, which
// hides the UI while leaving the endpoints behind it open.
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession("/ucet");
  return <>{children}</>;
}
