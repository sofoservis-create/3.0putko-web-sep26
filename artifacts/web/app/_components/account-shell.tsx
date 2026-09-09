import Link from "next/link";
import type { Route } from "next";
import { logout, switchMode } from "../_lib/auth-actions";
import type { Session } from "../_lib/session";

// `href: Route`, not `string`. typedRoutes then checks every nav entry
// against the routes that actually exist, so a nav item pointing at a page
// nobody built is a build failure rather than a 404 a user finds. That is
// the same class of problem as the old dashboard's `href: "#"` on all
// eleven items — there, nothing could break because nothing was a link.
export type NavItem = { href: Route; label: string; badge?: number };

/**
 * The frame around every /ucet and /host page.
 *
 * ONE shell for both sides, differing only in its nav items. The old system
 * has no guest account area at all — /Profile is host-only
 * (`allowedRoles={["host"]}`, Profile/page.js:160) and a guest's bookings
 * live on an unrelated /reservations page with its own header, its own
 * layout and its own login. Two areas that look like two products is what
 * "nothing matches" actually means; sharing the shell is what fixes it.
 *
 * Nav items are real hrefs, not client state. The old dashboard switches 13
 * panels with `activePage === "Payments" && <Payments/>` — one URL for
 * everything, so nothing is linkable, the back button does not work, and no
 * section can ever be opened from an email or a bookmark.
 */
export function AccountShell({
  session,
  nav,
  active,
  title,
  children,
}: {
  session: Session;
  nav: NavItem[];
  active: Route;
  title: string;
  children: React.ReactNode;
}) {
  const isHostArea = session.activeMode === "host";

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl font-bold text-ink">
              putko
            </Link>
            <span className="hidden text-sm text-ink-muted sm:inline">
              {isHostArea ? "Pre ubytovateľov" : "Môj účet"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode switch, shown only to accounts that really are hosts.
                One account, two views — not two logins. */}
            {session.isHost ? (
              <form
                action={async () => {
                  "use server";
                  await switchMode(isHostArea ? "guest" : "host");
                }}
              >
                <button
                  type="submit"
                  className="rounded-control px-3 py-2 text-sm font-medium text-link transition-colors hover:bg-black/[0.04] hover:text-link-hover"
                >
                  {isHostArea ? "Prepnúť na cestovanie" : "Prepnúť na ubytovateľa"}
                </button>
              </form>
            ) : null}

            <form
              action={async () => {
                "use server";
                await logout();
              }}
            >
              <button
                type="submit"
                className="rounded-control px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
              >
                Odhlásiť sa
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:py-12">
        {/* On mobile this is a horizontal scroller rather than a hamburger:
            the old dashboard hides an 11-item menu behind a drawer that
            closes on any outside click, which on a phone means one mis-tap
            per navigation. */}
        <nav className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-1 lg:flex-col">
            {nav.map((item) => {
              const isActive = item.href === active;
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-ink text-white"
                        : "text-ink-soft hover:bg-black/[0.04] hover:text-ink"
                    }`}
                  >
                    {item.label}
                    {item.badge ? (
                      <span
                        className={`rounded-pill px-1.5 text-xs font-semibold ${
                          isActive ? "bg-white/20" : "bg-brand/10 text-brand"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Consistent empty state — used wherever a list can legitimately be empty. */
export function EmptyState({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-border-strong p-8 text-center">
      <p className="text-ink-muted">{children}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
