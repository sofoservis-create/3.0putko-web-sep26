import React from 'react';
import Footer from '../components/Footer/Footer';
import Header from '../components/Header';
import FooterNav from '../Shared/FooterNav';
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile';
import MenuBar from '../Shared/MenuBar';

function Page() {
  return (
    <div className='max-w-[1920px] mx-auto'>
      {/* Mobile Header */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
        style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <button>
          <MenuBar />
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>

      {/* 404 Section */}
      <section className="flex justify-center items-center min-h-[50vh] px-4">
        <img 
          src='/404.png' 
          alt="404 Not Found" 
          className="w-full max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] mx-auto"
        />
      </section>

      {/* Footer */}
      <Footer />

      {/* Mobile Footer Navigation */}
      <div className="lg:hidden">
        <FooterNav />
      </div>
    </div>
  );
}

export default Page;
