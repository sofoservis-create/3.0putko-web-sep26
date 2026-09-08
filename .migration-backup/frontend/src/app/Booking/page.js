import React from 'react'
import Hero from './component/Hero'
import Features from './component/Features'
import FAQ from './component/FAQ'
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile'
import Header from '../components/Header'
import FooterNav from '../Shared/FooterNav'
import MenuBar from '../Shared/MenuBar'

import dynamic from "next/dynamic";
const Footer = dynamic(() => import("../components/Footer/Footer"), { ssr: false });

// ✅ Metadata for SEO
export const metadata = {
  title: "Sprievodca rezerváciou – Putko",
  description: "Zistite, ako jednoducho rezervovať ubytovanie na Putku. Podrobný sprievodca rezerváciou s tipmi pre hostí aj hostiteľov pre bezstarostné cestovanie.",
  keywords: "sprievodca rezerváciou, rezervácia Putko, ako rezervovať, cestovné tipy, rezervácia pre hostí, sprievodca pre hostiteľov, ubytovanie",
  alternates: {
    canonical: "https://putko.sk/Booking",   // ✅ canonical here
  },
  openGraph: {
    title: "Sprievodca rezerváciou | Putko",
    description: "Podrobný sprievodca rezerváciou na Putku. Zistite, ako môžu hostia a hostitelia jednoducho spravovať rezervácie.",
    url: "https://putko.sk/Booking",
    siteName: "Putko",
    type: "website",
  },

};

export default function Page() {
  return (
    <div className='max-w-[1920px] mx-auto'>
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
      <div className='lg:py-20 lg:px-4'>
        <Hero/>
      </div>
      <Features/>
      <FAQ/>
    <Footer/>
    <div className="lg:hidden">
      <FooterNav/>
    </div>
    </div>
  )
}