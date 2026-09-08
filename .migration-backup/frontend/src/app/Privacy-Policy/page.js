import React from 'react'
import Footer from '../components/Footer/Footer'
import Header from '../components/Header'
import FooterNav from '../Shared/FooterNav'
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile'
import MenuBar from '../Shared/MenuBar'
import PrivacyPolicy from './component/content'

const page = () => {
  return (
    <div>
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
      <PrivacyPolicy />
      <Footer/>
      <div className="lg:hidden">
          <FooterNav/>
        </div>
    </div>
  )
}

export default page
