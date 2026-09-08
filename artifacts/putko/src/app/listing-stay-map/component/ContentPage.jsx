"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import HeroSection from "./HeroSection";
import Loading from "../../components/Loader/Loading";
import HeroSearchForm2Mobile from "../../components/HeroSearchForm2Mobile";
import FooterNav from "../../Shared/FooterNav";
import Header from "../component/Header";
import MenuBar from "../../Shared/MenuBar";
import TabFilters from "./TabFilters";
import { motion } from "framer-motion";
import dynamic from "@/app/components/NextDynamic";
import SectionGridHasMap from "./SectionGridHasMap";

const Footer = dynamic(() => import("../../components/Footer/Footer"), { ssr: false });

const ContentPage = () => {
  const [showHero, setShowHero] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mobileControlsVisible, setMobileControlsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const heroTimer = setTimeout(() => setShowHero(true), 0);
    const mapTimer = setTimeout(() => setShowMap(true), 50);
    return () => {
      clearTimeout(heroTimer);
      clearTimeout(mapTimer);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollY.current;

      if (currentScrollY <= 24) {
        setMobileControlsVisible(true);
      } else if (Math.abs(scrollDelta) >= 6) {
        setMobileControlsVisible(scrollDelta < 0);
      }

      lastScrollY.current = currentScrollY;
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    /* lg:pt-[96px] offsets the fixed Header + search-form overflow (card extends to ~91px) */
    <div className="lg:pt-[96px]" style={{ overflowAnchor: "none" }}>

      {/* ── Mobile: sticky search bar ── */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between bg-white/85 px-2 py-4 backdrop-blur-md transition-[translate,opacity] duration-200 ease-out lg:hidden"
        style={{
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          opacity: mobileControlsVisible ? 1 : 0,
          pointerEvents: mobileControlsVisible ? "auto" : "none",
          translate: mobileControlsVisible ? "0 0" : "0 -110%",
        }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <div>
          <MenuBar />
        </div>
      </div>

      {/* ── Desktop: Header is already fixed top-0 in its own component ── */}
      <div className="hidden lg:block max-w-[1940px] mx-auto">
        <Header />
      </div>

      {/* ── Desktop: destination context + filters in one static section ── */}
      <div className="mx-auto hidden max-w-[1940px] px-10 pb-4 pt-5 lg:block">
        <div>
          <Suspense fallback={null}>
            <HeroSection />
          </Suspense>
        </div>
        <div className="pt-3">
          <TabFilters />
        </div>
      </div>

      {/* ── Mobile: destination context + filters in one static section ── */}
      {showHero && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mx-auto mb-4 max-w-[1940px] px-4 pb-1 pt-4 lg:hidden"
        >
          <Suspense fallback={<Loading />}>
            <HeroSection />
          </Suspense>
          <div className="pt-3">
            <TabFilters />
          </div>
        </motion.div>
      )}

      {/* ── Map + Listings ── */}
      {showMap && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pb-24 mx-auto md:mx-auto lg:pb-28 2xl:pl-10 xl:pr-0 max-w-[1940px]"
        >
          <Suspense fallback={<Loading />}>
            <SectionGridHasMap />
          </Suspense>
        </motion.div>
      )}

      {/* ── Footer ── */}
      <Footer />

      {/* ── Mobile footer nav ── */}
      <div className="lg:hidden">
        <FooterNav />
      </div>
    </div>
  );
};

export default ContentPage;
