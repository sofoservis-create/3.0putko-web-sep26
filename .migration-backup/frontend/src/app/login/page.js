import React from 'react'
import Login from './component/login'
import Footer from "../components/Footer/Footer"
import FooterNav from '../Shared/FooterNav'
import Header from '../components/Header'
import Head from 'next/head'
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile'
import MenuBar from '../Shared/MenuBar'

export default function Page() {
  return (
    <>
      <Head>
        <title>Prihlásenie – Putko</title>
        <meta name="description" content="Prihláste sa do Putko a spravujte svoje rezervácie a ubytovania." />
        <meta name="robots" content="noindex, follow" />

        {/* Open Graph / Social */}
        <meta property="og:title" content="Prihlásenie | Putko" />
        <meta property="og:description" content="Prihláste sa do Putko a spravujte svoje rezervácie a ubytovania." />
        <meta property="og:url" content="https://putko.sk/login" />
        <meta property="og:site_name" content="Putko" />
        <meta property="og:image" content="/P.png" />
        <meta property="og:type" content="website" />
      </Head>
    
    <div className='max-w-[1920px] mx-auto lg:pt-24' >
     
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
      <div className='mb-20 mt-6'>
        <Login/>
      </div>
      <Footer />
      <div className="lg:hidden">
          <FooterNav/>
        </div>
    </div>
    </>
  )
}
