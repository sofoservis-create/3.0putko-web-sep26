import { useEffect } from "react";
import { useLocation } from "wouter";

const SITE_URL = "https://putko.sk";
const DEFAULT_DESCRIPTION =
  "Objavte overené ubytovanie na Slovensku a rezervujte si svoj ďalší pobyt jednoducho cez Putko.";

const pageMetadata = {
  "/": {
    title: "Unikátne ubytovanie a apartmány | Glamping, chaty, domy na strome – Putko",
    description:
      "Objavte unikátne ubytovanie – glamping, chaty, farmy či domy na strome. Rezervujte si ideálny pobyt jednoducho online s okamžitým potvrdením a overenými recenziami.",
  },
  "/about": {
    title: "O nás – Putko",
    description:
      "Spoznajte Putko, slovenskú platformu, ktorá prepája cestovateľov s jedinečnými pobytmi a dôveryhodnými hostiteľmi.",
  },
  "/blog": {
    title: "Cestovateľský blog – Putko",
    description: "Inšpirácie, tipy a príbehy pre cestovanie a pobyty na Slovensku.",
  },
  "/booking": {
    title: "Sprievodca rezerváciou – Putko",
    description: "Zistite, ako jednoducho rezervovať ubytovanie na Putku.",
  },
  "/faq": {
    title: "Často kladené otázky – Putko",
    description: "Odpovede na najčastejšie otázky hostí a hostiteľov na Putku.",
  },
  "/listing-stay-map": {
    title: "Ubytovanie na mape – Putko",
    description: "Vyhľadajte overené pobyty na Slovensku podľa lokality.",
  },
  "/privacy-policy": {
    title: "Ochrana osobných údajov – Putko",
    description: "Informácie o spracovaní a ochrane osobných údajov na Putku.",
  },
  "/terms-&-condition": {
    title: "Všeobecné obchodné podmienky – Putko",
    description: "Pravidlá a podmienky používania platformy Putko.",
  },
  "/user-guide": {
    title: "Používateľská príručka – Putko",
    description: "Praktická príručka pre hostí a hostiteľov na Putku.",
  },
};

const privateRoutePrefixes = [
  "/admin",
  "/book-now",
  "/checkout",
  "/checking-log-detail",
  "/forget-password",
  "/host/onboard",
  "/login",
  "/payment-",
  "/paypage",
  "/account",
  "/host",
  "/request-sent",
  "/reservations",
  "/reset-password",
  "/review",
  "/signup",
  "/verify",
];

function appendMeta(attribute, key, content) {
  if (!content) return;
  const element = document.createElement("meta");
  element.setAttribute(attribute, key);
  element.setAttribute("content", content);
  element.dataset.putkoRouteMeta = "true";
  document.head.appendChild(element);
}

export default function RouteMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    document
      .querySelectorAll("[data-putko-route-meta]")
      .forEach((element) => element.remove());

    const pathname = location.split("?")[0] || "/";
    const path = pathname.toLowerCase();
    const isListing = path.startsWith("/listings/");
    const isBlogDetail = path.startsWith("/blog-detail/");
    const isHostDetail = path.startsWith("/host-detail/");
    const isPrivate = privateRoutePrefixes.some((prefix) =>
      path.startsWith(prefix),
    );

    const fallback = isListing
      ? { title: "Detail ubytovania – Putko", description: DEFAULT_DESCRIPTION }
      : isBlogDetail
        ? { title: "Článok – Putko", description: "Cestovateľské tipy a inšpirácie od Putka." }
        : isHostDetail
          ? { title: "Profil hostiteľa – Putko", description: "Spoznajte hostiteľa na Putku." }
          : { title: "Putko", description: DEFAULT_DESCRIPTION };
    const metadata = pageMetadata[path] || fallback;
    const canonical = `${SITE_URL}${pathname === "/" ? "" : pathname}`;
    const robots = isPrivate ? "noindex, nofollow" : "index, follow";

    document.title = metadata.title;
    appendMeta("name", "description", metadata.description);
    appendMeta("name", "robots", robots);
    appendMeta("property", "og:title", metadata.title);
    appendMeta("property", "og:description", metadata.description);
    appendMeta("property", "og:url", canonical);
    appendMeta("property", "og:site_name", "Putko");
    appendMeta("property", "og:type", isBlogDetail ? "article" : "website");
    appendMeta("name", "twitter:card", "summary_large_image");
    appendMeta("name", "twitter:title", metadata.title);
    appendMeta("name", "twitter:description", metadata.description);

    const canonicalLink = document.createElement("link");
    canonicalLink.rel = "canonical";
    canonicalLink.href = canonical;
    canonicalLink.dataset.putkoRouteMeta = "true";
    document.head.appendChild(canonicalLink);

    return () => {
      document
        .querySelectorAll("[data-putko-route-meta]")
        .forEach((element) => element.remove());
    };
  }, [location]);

  return null;
}