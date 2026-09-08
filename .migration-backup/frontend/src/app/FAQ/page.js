import React from 'react'
import Footer from '../components/Footer/Footer'
import Header from '../components/Header'
import FooterNav from '../Shared/FooterNav'
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile'
import FAQ from './component/FAQ'
import MenuBar from '../Shared/MenuBar'
// ✅ Static SEO Metadata
export const metadata = {
  title: "Často kladené otázky – Putko",
  description:
    "Nájdite odpovede na najčastejšie otázky o rezerváciách, ubytovaní, platbách a nastavení účtu na Putku. Rýchla pomoc pre cestovateľov aj hostiteľov.",
  keywords: [
    "Putko FAQ",
    "často kladené otázky",
    "pomoc s rezerváciou",
    "otázky o cestovaní",
    "Putko podpora",
    "ubytovanie Putko",
    "platby Putko",
  ],
  alternates: {
    canonical: "https://putko.sk/FAQ",   // ✅ canonical here
  },
  openGraph: {
    title: "Často kladené otázky | Putko",
    description:
      "Získajte rýchle odpovede o rezerváciách, platbách, zrušeniach a ďalších témach na stránke Putko FAQ.",
    url: "https://Putko.sk/FAQ",
    siteName: "Putko",
    images: [
      {
        url: "/P.png", // ✅ Place an image in /public folder
        width: 1200,
        height: 630,
        alt: "Putko FAQ – Pomoc s rezerváciami",
      },
    ],
    locale: "sk_SK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Často kladené otázky | Putko",
    description:
      "Nájdite odpovede na otázky o rezerváciách, účtoch a platbách na stránke Putko FAQ.",
    images: ["/P.png"],
  },
};

export default function page() {
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
      <section>
        <FAQ />
      </section>
      <Footer/>
      <div className="lg:hidden">
        <FooterNav/>
      </div>
    </div>
  )
}
