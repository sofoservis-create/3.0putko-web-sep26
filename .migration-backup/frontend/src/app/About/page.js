import React from "react";
import BgGlassmorphism from "../components/BgGlassmorphism";
import Hero from "./component/Hero";
import SectionFounder from "./component/SectionFounder";
import Header from "../components/Header";
import FooterNav from "../Shared/FooterNav";
import HeroSearchForm2Mobile from "../components/HeroSearchForm2Mobile";
import MenuBar from "../Shared/MenuBar";

// Dynamic imports
import dynamic from "next/dynamic";
const Footer = dynamic(() => import("../components/Footer/Footer"), { ssr: false });

export const metadata = {
  title: "About Us - Putko",
  description:
    "Learn more about Putko, an independent platform built to connect travelers with unique stays and trusted hosts. Our mission is to inform, educate, and entertain millions across the world of travel.",
  keywords: [
    "About Putko",
    "Putko company",
    "vacation rentals",
    "holiday stays",
    "Putko Slovensko",
    "meet the team"
  ],
  alternates: {
    canonical: "https://putko.sk/About",   // ✅ canonical here
  },
  openGraph: {
    title: "About Us | Putko",
    description:
      "Discover Putko’s mission, vision, and story. We’re here to make travel easier by connecting guests with amazing accommodations and hosts.",
    url: "https://Putko.sk/About",
    siteName: "Putko",
    images: [
      {
        url: "/about-hero-right.png", // from public folder
        width: 1200,
        height: 630,
        alt: "About Putko"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | Putko",
    description:
      "Discover Putko’s mission, vision, and story. We’re here to make travel easier by connecting guests with amazing accommodations and hosts.",
    images: ["/about-hero-right.png"]
  }
}

export default function Page() {
  return (
    <div
      className={`nc-PageAbout overflow-hidden relative`}
      data-nc-id="PageAbout"
    >
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md md:hidden"
        style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <button>
          <MenuBar />
        </button>
      </div>
      <div className="hidden md:block">
        <Header/>
      </div>
      {/* ======== BG GLASS ======== */}
      <BgGlassmorphism />

      <div className="container py-10 space-y-14 lg:py-10 lg:space-y-20">
        <Hero
          rightImg="/about-hero-right.avif"
          heading="👋 About Us."
          btnText=""
          subHeading="We’re impartial and independent, and every day we create distinctive, world-class programmes and content which inform, educate and entertain millions of people in the around the world."
        />

        <SectionFounder />

      </div>
      <Footer />
      <div className="lg:hidden">
          <FooterNav/>
        </div>
    </div>
  );
};
