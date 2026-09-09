"use client";

import BackgroundSection from "../components/BackgroundSection";
import ListingImageGallery from "./component/listing-image-gallery/ListingImageGallery";
import { usePathname, useRouter, useSearchParams } from "@/app/components/NextNavigation";
import React from "react";
import MobileFooterSticky from "./component/MobileFooterSticky";
import Header from "../components/Header";
import HeroSearchForm2Mobile from "../components/HeroSearchForm2Mobile";
import MenuBar from "../Shared/MenuBar";

//dynamic import
import dynamic from "@/app/components/NextDynamic";
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
    const query = params.toString();
    router.push(query ? `${thisPathname}?${query}` : thisPathname);
  };

  return (
    <div className="ListingDetailPage overflow-x-clip">
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
        style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <MenuBar />
      </div>
      <div className="hidden lg:block">
        <Header/>
      </div>
      <div className="mt-4"></div>
      <ListingImageGallery
        isShowModal={modal === "PHOTO_TOUR_SCROLLABLE"}
        onClose={handleCloseModalImageGallery}
      />

      <div className="container ListingDetailPage__content pb-6 sm:pb-12 lg:pb-0">{children}</div>

      <div className="container py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:py-12 sm:pb-[calc(8rem+env(safe-area-inset-bottom))] lg:py-16">
        <div className="relative py-4 sm:py-10 lg:py-12">
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
