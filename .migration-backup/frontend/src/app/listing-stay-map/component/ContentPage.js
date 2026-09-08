"use client";

import React, { Suspense, useEffect, useState } from "react";
import HeroSection from "./HeroSection";
import Loading from "../../components/Loader/Loading";
import HeroSearchForm2Mobile from "../../components/HeroSearchForm2Mobile";
import FooterNav from "../../Shared/FooterNav";
import Header from "../component/Header";
import MenuBar from "../../Shared/MenuBar";
import TabFilters from "./TabFilters";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import SectionGridHasMap from "./SectionGridHasMap";

const Footer = dynamic(() => import("../../components/Footer/Footer"), { ssr: false });

const ContentPage = () => {
  const [showHero, setShowHero] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const heroTimer = setTimeout(() => setShowHero(true), 0);
    const mapTimer = setTimeout(() => setShowMap(true), 50);
    return () => {
      clearTimeout(heroTimer);
      clearTimeout(mapTimer);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 72);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    /* lg:pt-[96px] offsets the fixed Header + search-form overflow (card extends to ~91px) */
    <div className="lg:pt-[96px]" style={{ overflowAnchor: "none" }}>

      {/* ── Mobile: sticky search bar ── */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
        style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
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

      {/* ── Desktop: sticky strip = HeroSection + FilterBar, below the fixed Header ── */}
      <div className="hidden lg:block sticky top-[96px] z-40 bg-white shadow-sm pt-2" style={{ overflowAnchor: "none" }}>
        {/* Destination context strip — slides up and hides on scroll */}
        <div
          className="max-w-[1940px] mx-auto px-4 lg:px-10 overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: scrolled ? "0px" : "100px",
            opacity: scrolled ? 0 : 1,
            paddingTop: scrolled ? "0px" : undefined,
            paddingBottom: scrolled ? "0px" : undefined,
          }}
        >
          <Suspense fallback={null}>
            <HeroSection />
          </Suspense>
        </div>

        {/* Filter bar — compresses vertically on scroll */}
        <div className="max-w-[1940px] mx-auto px-4 lg:px-10">
          <div
            className={`bg-white border-b border-neutral-200 transition-all duration-300 ease-in-out ${
              scrolled ? "py-1.5 px-5" : "rounded-2xl border border-neutral-200 shadow-sm py-2.5 px-5"
            }`}
          >
            <TabFilters />
          </div>
        </div>
      </div>

      {/* ── Mobile: hero strip + filters (scroll away naturally) ── */}
      {showHero && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-[1940px] mx-auto relative mb-0 px-4 lg:hidden"
        >
          <Suspense fallback={<Loading />}>
            <HeroSection />
          </Suspense>
        </motion.div>
      )}

      {showHero && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="max-w-[1940px] mx-auto px-4 pt-2 mb-4 lg:hidden sticky top-[88px] z-40 bg-white/95 backdrop-blur-sm shadow-sm"
        >
          <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-2.5">
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
