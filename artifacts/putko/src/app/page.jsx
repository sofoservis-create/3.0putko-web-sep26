export const metadata = {
  title: "Unikátne ubytovanie a apartmány | Glamping, chaty, domy na strome – Putko",
  description:
    "Objavte unikátne ubytovanie – glamping, chaty, farmy či domy na strome. Rezervujte si ideálny pobyt jednoducho online s okamžitým potvrdením a overenými recenziami.",
  authors: [{ name: "Tím Putko" }],
  creator: "Putko",
  publisher: "Putko",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://putko.sk"),
  alternates: {
    canonical: "https://putko.sk",
    languages: {
      "sk-SK": "/sk-SK",
      "en-US": "/en-US",
    },
  },
  openGraph: {
    type: "website",
    locale: "sk_SK",
    url: "https://putko.sk",
    title: "Unikátne ubytovanie | Glamping, chaty, domy na strome – Putko",
    description:
      "Objavte unikátne ubytovanie – glamping, chaty, farmy, hausboty či domy na strome. Rezervujte si pobyt jednoducho online.",
    siteName: "Putko",
    images: [
      {
        url: "https://putko.sk/putko.png",
        width: 1200,
        height: 630,
        alt:
          "Putko – Unikátne ubytovanie, glamping, chaty a domy na strome",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unikátne ubytovanie | Glamping, chaty, domy na strome – Putko",
    description:
      "Objavte unikátne ubytovanie – glamping, chaty, farmy či domy na strome. Rezervujte si pobyt jednoducho online.",
    images: ["https://putko.sk/putko.png"],
    creator: "@putko",
    site: "@putko",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};


import React from "react";
import Header from "./components/Header";
import MobileHeader from "./components/Header/MobileHeader";
import PainPointSection from "./components/PainPointSection";
import SectionFAQ from "./components/SectionFAQ";

//dynamic import
import dynamic from "@/app/components/NextDynamic";
import AnimatedHero from "./components/AnimateHero";
const StickySearchMobile = dynamic(() => import("./components/StickySearchMobile"));
const PropertyBanner = dynamic(() => import("./components/HeroComponent/PropertyBanner"));
const GridFeatureBooking = dynamic(() => import("./components/GridFeatureBooking"));
const BenefitsSection = dynamic(() => import("./components/BenefitsSection"));
const Footer = dynamic(() => import("./components/Footer/Footer"));
const GridFeaturePlaces = dynamic(() => import("./components/GridFeaturePlaces"));
const SectionGridCategoryBox = dynamic(() => import("./components/GridCategoryBox"));
const SectionHowItWork = dynamic(() => import("./components/HowItWork/SectionHowItWork"));
const TestimonialsSection = dynamic(() => import("./components/TestimonialsSection"));
const SavingsComparisonStrip = dynamic(() => import("./components/SavingsComparisonStrip"));

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["Organization", "WebSite"],
    "@id": "https://putko.sk/#organization",
    name: "Putko",
    url: "https://putko.sk",
    logo: "https://putko.sk/logo.png",
    description: "Discover and book unique stays including glamping, cabins, treehouses, farm stays and apartments with Putko.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Slovak"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "SK",
    },
    sameAs: [
      "https://www.facebook.com/people/Putkosk/61586547479071",
      "https://www.instagram.com/putko_sk/",
    ],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://putko.sk/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Unique Accommodation Booking Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Unique Stays Booking",
            description: "Book glamping, cabins, treehouses and unique accommodations",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Apartment Rental",
            description: "Rent apartments and vacation homes worldwide",
          },
        },
      ],
    },
  };

  const faqSchemaEN = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does booking on Putko work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Booking is simple! Just search for your location and dates, choose a property, and complete your booking. You will get instant confirmation."
        }
      },
      {
        "@type": "Question",
        "name": "What payment methods do you accept?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We accept major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for selected properties."
        }
      },
      {
        "@type": "Question",
        "name": "Can I cancel a reservation?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Cancellation policies depend on the property. Many offer free cancellation up to 24 hours before check-in."
        }
      },
      {
        "@type": "Question",
        "name": "Is Putko free for guests?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, browsing and searching properties is completely free. The price you see is final with no hidden fees."
        }
      },
      {
        "@type": "Question",
        "name": "How do I become a host?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Click 'List your property', create an account, and submit your listing. Our team will verify and publish it."
        }
      },
      {
        "@type": "Question",
        "name": "How can I contact support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Support is available 24/7 via live chat, email at support@putko.sk, or phone."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchemaEN),
        }}
      />
      <main className="putko-home-page lg:pt-5 bg-[#FFFEF9] flex flex-col">
        {/* Desktop header */}
        <div className="hidden lg:block bg-white">
          <Header />
        </div>

        {/* Mobile header overlaid on hero */}
        <div className="relative z-20">
          <MobileHeader />
          <AnimatedHero />
        </div>

        {/* --- HOMEPAGE SECTIONS --- */}
        <SavingsComparisonStrip />
        <PainPointSection />
        <SectionGridCategoryBox />
        <BenefitsSection />
        <GridFeaturePlaces />
        <TestimonialsSection />
        <section id="how-it-works">
          <SectionHowItWork />
        </section>
        <GridFeatureBooking />
        <PropertyBanner />
        <SectionFAQ />
        {/* ------------------------- */}

        <div className="bg-[#1A3A2E]">
          <Footer compactMobile />
          <StickySearchMobile dockInFooter />
        </div>
      </main>
    </>
  );
}
