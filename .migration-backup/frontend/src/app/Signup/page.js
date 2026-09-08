import React from 'react'
import Signup from './component/Signup'
import Footer from "../components/Footer/Footer"
import Header from '../components/Header'
import FooterNav from '../Shared/FooterNav'
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile'

// ✅ Static SEO metadata for Signup
export const metadata = {
  title: "Registrácia – Putko",
  description:
    "Vytvorte si účet na Putku a začnite rezervovať jedinečné ubytovania, spravovať rezervácie a objavovať top hotely a apartmány.",
  robots: {
    index: false,   // ❌ nezaradiť do indexu
    follow: true,   // ✅ povoliť sledovanie odkazov
  },
  keywords: [
    "registrácia",
    "vytvorenie účtu",
    "zaregistrovať sa",
    "Putko registrácia",
    "Putko vytvorenie účtu",
    "registrácia ubytovania",
    "rezervácia ubytovania účet"
  ],
  openGraph: {
    title: "Registrácia | Putko",
    description:
      "Vytvorte si účet na Putku a rezervujte ubytovanie, spravujte svoje rezervácie a objavujte najlepšie ponuky.",
    url: "https://putko.sk/signup",
    siteName: "Putko",
    images: [
      {
        url: "/P.png", // image from public folder
        width: 1200,
        height: 630,
        alt: "Registrácia na Putku"
      }
    ],
    type: "website"
  },
};

export default function Page() {
  return (
    <div className='max-w-[1920px] mx-auto'>
      
      <div className="hidden md:block">
        <Header/>
      </div>
      <div className='mb-20 mt-6 lg:pt-24'>
        <Signup/>
      </div>
      <Footer />
        <div className="lg:hidden">
          <FooterNav/>
        </div>
    </div>
  )
}
