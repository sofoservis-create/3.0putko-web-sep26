import type { Metadata } from "next";
import { Fraunces, DM_Sans, Inter } from "next/font/google";
import "./globals.css";

// Three families, and only the weights actually used. The original loads
// five families at every weight 400–900 on every page — see the note in
// globals.css. Subsetting to latin-ext matters here specifically: without
// it, "Štrbské Pleso", "Vysoké Tatry" and "Demänovská" fall back to a
// system font mid-heading, which is visible and ugly.
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  // The original ships title "Putko" / description "Hotel and Apartment
  // Booking Website" — in English, on a Slovak site, with no location.
  title: {
    default: "Putko — ubytovanie na Slovensku",
    template: "%s | Putko",
  },
  description:
    "Chaty, apartmány a penzióny po celom Slovensku. Rezervujte priamo u ubytovateľa.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // lang="sk", not the original's lang="en" on Slovak content — it is
    // what tells a screen reader which language to pronounce and Google
    // which market to rank this in.
    //
    // The font variables go on <html>, NOT on <body> where the Next.js
    // docs put them, and the difference is load-bearing here. globals.css
    // defines --font-display as `var(--font-fraunces), Georgia, serif` on
    // :root. If --font-fraunces is only declared on <body>, that
    // substitution FAILS at :root, which under CSS custom-property rules
    // makes --font-display guaranteed-invalid there — and every descendant
    // then inherits the invalid value, so nothing on the page ever gets
    // Fraunces. It fails silently: the font file loads fine, the build is
    // clean, and headings just quietly render in the system sans.
    // (Found by reading computed styles in a real browser, not by looking
    // at the page — the fallback looked deliberate.)
    <html
      lang="sk"
      className={`${fraunces.variable} ${dmSans.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
