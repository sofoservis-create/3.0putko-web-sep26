import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight text-ink"
        >
          putko
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/miesta"
            className="rounded-control px-3 py-2 text-sm font-medium text-link transition-colors hover:bg-black/[0.03] hover:text-link-hover"
          >
            Kam ísť
          </Link>
          {/* Deliberately not a live link yet — see the note at the bottom
              of the home page. A nav that leads to 404s is worse than a nav
              that admits what is not built. */}
          <span
            className="hidden rounded-control px-3 py-2 text-sm font-medium text-ink-muted sm:inline"
            title="Zatiaľ nedostupné"
          >
            Prenajať ubytovanie
          </span>
        </nav>
      </div>
    </header>
  );
}
