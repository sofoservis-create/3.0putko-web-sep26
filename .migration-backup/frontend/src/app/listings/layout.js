"use client";

import BackgroundSection from "../components/BackgroundSection";
import ListingImageGallery from "./component/listing-image-gallery/ListingImageGallery";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React from "react";
import MobileFooterSticky from "./component/MobileFooterSticky";
import Header from "../components/Header";
import HeroSearchForm2Mobile from "../components/HeroSearchForm2Mobile";
import MenuBar from "../Shared/MenuBar";

//dynamic import
import dynamic from "next/dynamic";
const SectionSliderNewCategories = dynamic(() => import("./component/SectionSliderNewCategories"), { ssr: false });
const Footer = dynamic(() => import("../components/Footer/Footer"), { ssr: false });

const DetailtLayoutInner = ({ children }) => {
  const router = useRouter();
  const thisPathname = usePathname();
  const searchParams = useSearchParams(); 
  const modal = searchParams?.get("modal");

  const handleCloseModalImageGallery = () => {
    const params = new URLSearchParams(document.location.search);
    params.delete("modal");
    router.push(`${thisPathname}/?${params.toString()}`);
  };

  return (
    <div className="ListingDetailPage">
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
        style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <button>
          <MenuBar />
        </button>
      </div>
      <div className="hidden lg:block">
        <Header/>
      </div>
      <div className="mt-4"></div>
      <ListingImageGallery
        isShowModal={modal === "PHOTO_TOUR_SCROLLABLE"}
        onClose={handleCloseModalImageGallery}
      />

      <div className="container ListingDetailPage__content">{children}</div>

      <div className="container py-24 lg:py-32">
        <div className="relative py-16">
          <BackgroundSection />
          <SectionSliderNewCategories
            heading="Explore by types of stays"
            subHeading="Explore houses based on 10 types of stays"
            categoryCardType="card5"
            itemPerRow={5}
            sliderStyle="style2"
          />
        </div>
        
      </div>
      <MobileFooterSticky />
      <Footer />
    </div> 
  );
};

const DetailtLayout = ({ children }) => {
  return (
    <DetailtLayoutInner>{children}</DetailtLayoutInner>
  );
};

export default DetailtLayout;
