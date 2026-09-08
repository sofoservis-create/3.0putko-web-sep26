"use client";
import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // For navigation in Next.js
import Footer from '../components/Footer/Footer';
import FooterNav from '../Shared/FooterNav';
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile';
import Header from '../components/Header';
import MenuBar from '../Shared/MenuBar';
import en from '../locales/en';
import sk from '../locales/sk';
import { FormContext } from '../FormContext';

const EmailClient = () => {
  const router = useRouter();

  const translations = { en, sk };
      const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
      const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
    
        // Update language state when `lang` changes in FormContext
        useEffect(() => {
          setLanguage(lang || "sk");
        }, [lang]);
      
        const t = translations[language];

  useEffect(() => {
    // Automatically redirect to login page after 5 seconds
    const timer = setTimeout(() => {
      router.push('/login');
    }, 5000);

    return () => clearTimeout(timer); // Clear timeout on component unmount
  }, [router]);

  const handleOkClick = () => {
    router.push('/login'); // Redirect to login immediately
  };

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

      <div className="flex flex-col items-center justify-center text-center py-60">
        <p className="font-bold text-3xl mb-6">
          {t.Pleasecheckyouremailandverifyyouraccount}
        </p>
        <button
          onClick={handleOkClick}
          className="bg-green-800 text-white font-medium px-6 py-3 rounded-lg"
        >
          {t.ComeBacktoLogin}
        </button>
      </div>

      <Footer />
      <div className="lg:hidden">
        <FooterNav />
      </div>
    </div>
  );
};

export default EmailClient;
