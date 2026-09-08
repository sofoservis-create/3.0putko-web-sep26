"use client"
//static import
import React from "react";
import SectionMagazine5 from "./SectionMagazine5";
import Header from "../../components/Header";
import FooterNav from "../../Shared/FooterNav";
import MenuBar from "../../Shared/MenuBar";
import HeroSearchForm2Mobile from "../../components/HeroSearchForm2Mobile";
//dynamic import
import dynamic from "@/app/components/NextDynamic";
const Subscribe = dynamic(() => import("../../components/Subscribe"), { ssr: false });
const BgGlassmorphism = dynamic(() => import("../../components/BgGlassmorphism"), { ssr: false });
const SectionLatestPosts = dynamic(() => import("./SectionLatestPosts"), { ssr: false });
const Footer = dynamic(() => import("../../components/Footer/Footer"), { ssr: false });

const ClientPage = ({ posts = [] }) => {
  return (
    <div className="nc-BlogPage relative lg:pt-24">
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
        style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <div className="">
          <MenuBar />
        </div>
      </div>
      <div className="hidden lg:block">
        <Header />
      </div>

      {/* ======== BG GLASS ======== */}
      <BgGlassmorphism />

      {/* ======== ALL SECTIONS ======== */}
      <div className="container relative">
        {/* === SECTION 1 === */}
        <div className="pt-12 pb-16 lg:pb-28">
          <SectionMagazine5 posts={posts} />
        </div>

        {/* === LATEST POSTS === */}
        <SectionLatestPosts posts={posts} className="py-16 lg:py-28" />

        {/* === SUBSCRIBE === */}
        <Subscribe className="pb-16 lg:pb-28" />
      </div>

      <Footer />
      <div className="lg:hidden">
        <FooterNav />
      </div>
    </div>
  );
};

export default ClientPage;