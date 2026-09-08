"use client";
import React, { useState, useEffect, useContext } from "react";
import Avatar from "../../Shared/Avatar";
import ButtonSecondary from "../../Shared/ButtonSecondary";
import StayCardFeatured from "@/app/listing-stay-map/component/StayCardFeatured";
import Header from "../../components/Header";
import { FormContext } from "../../FormContext";
import FooterNav from "../../Shared/FooterNav";
import HeroSearchForm2Mobile from "../../components/HeroSearchForm2Mobile";
import en from "../../locales/en";
import sk from "../../locales/sk";
import MenuBar from "../../Shared/MenuBar";

import dynamic from "@/app/components/NextDynamic";
const Footer = dynamic(() => import("../../components/Footer/Footer"), { ssr: false });

const ClientPage = ({ className = "", hostData, accommodationData = [] }) => {
  const [visibleCount, setVisibleCount] = useState(6);
  const { lang } = useContext(FormContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const formattedDate = hostData?.createdAt
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(hostData.createdAt)
      )
    : "Unknown";

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 6);
  };

  return (
    <div className={`nc-AuthorPage min-h-screen bg-[#fcfdfa] text-neutral-900 font-inter ${className}`} data-nc-id="AuthorPage">
      {/* Mobile Top Navigation Sticky Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-white/90 backdrop-blur-md lg:hidden border-b border-neutral-200">
        <div className="flex-1 max-w-xs">
          <HeroSearchForm2Mobile />
        </div>
        <button className="p-2 text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors">
          <MenuBar />
        </button>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:block bg-white border-b border-neutral-200">
        <Header />
      </div>

      {/* Putko Brand Header Background Banner */}
      <div className="w-full h-32 md:h-56 bg-[#1e4636] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 mb-24 lg:mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Profile Sidebar Module */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 md:p-8 flex flex-col items-center text-center transition-all">
              <div className="relative group">
                <Avatar 
                  id={hostData?._id || ""} 
                  userName={hostData?.name}
                  imgUrl={hostData?.photo}
                  createdAt={hostData?.createdAt}
                  isVerified={hostData?.isVerified}
                  hasChecked 
                  hasCheckedClass="w-7 h-7 -top-1 right-2 shadow-sm text-[#319a7a]" 
                  sizeClass="w-32 h-32 ring-4 ring-white shadow-md" 
                />
              </div>

              <div className="mt-5 space-y-2 w-full">
                {/* Fixed font matching your custom configuration layer */}
                <h1 
                  className="text-3xl font-bold tracking-tight font-fraunces block text-[#1e4636]"
                  style={{ color: "#1e4636", display: "block" }}
                >
                  {hostData?.name || "Host Profile"}
                </h1>
                
                {hostData?.isVerified && (
                  <div className="flex justify-center">
                    <span 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eef7f4] border border-[#d1eae1] text-[#1e4636]"
                      style={{ color: "#1e4636" }}
                    >
                      <svg className="w-3.5 h-3.5 text-[#319a7a]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
                      </svg>
                      {t.PutkoVerifiedHost}
                    </span>
                  </div>
                )}
              </div>

              {hostData?.aboutYou && (
                <>
                  <hr className="w-16 border-t-2 border-[#319a7a]/20 my-6" />
                  <p className="text-neutral-700 leading-relaxed text-sm text-center max-w-sm font-inter">
                    "{hostData.aboutYou}"
                  </p>
                </>
              )}

              <hr className="w-full border-t border-neutral-200 my-6" />

              {/* Host Quick Metadata Cards */}
              <div className="w-full space-y-4 text-left font-inter">
                <div className="flex items-center space-x-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <div className="p-2 bg-white rounded-lg text-[#319a7a] shadow-sm border border-neutral-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">{t.Language || "Speaks"}</span>
                    <span className="text-sm font-bold text-neutral-900">{hostData?.languag || "Slovak"}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <div className="p-2 bg-white rounded-lg text-[#319a7a] shadow-sm border border-neutral-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">{t.Joinedin || "Member since"}</span>
                    <span className="text-sm font-bold text-neutral-900">{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Accommodation List Grid Section */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-neutral-200 pb-5 gap-2">
              <div>
                {/* Main page listing section heading targeted with custom font styling */}
                <h2 className="text-2xl md:text-3xl font-bold font-fraunces tracking-tight text-[#1e4636] md:text-white">
                  {hostData?.name || "Host"}'s {t.listings || "listings"}
                </h2>

                <p className="text-sm text-neutral-600 md:text-neutral-200 mt-1 font-inter">
                  {t.VerifiedAccommodations || "Explore verified stays offered directly by this owner."}
                </p>
              </div>
              <span className="self-start inline-flex items-center px-3 py-1 bg-neutral-100 text-neutral-800 text-xs font-bold rounded-md uppercase tracking-wider border border-neutral-200 font-inter">
                {accommodationData.length} {accommodationData.length === 1 ? 'Stay' : 'Stays'}
              </span>
            </div>

            {/* Render direct conditional template logic without Headless UI wrappers */}
            {accommodationData.length ? (
              <>
                {/* Grid Styled Accommodation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 xl:gap-8 mt-4">
                  {accommodationData.slice(0, visibleCount).map((stay) => (
                    <div key={stay._id} className="transition-transform duration-300 hover:-translate-y-1">
                      <StayCardFeatured data={stay} />
                    </div>
                  ))}
                </div>

                {/* Pagination Control Call to Action */}
                {visibleCount < accommodationData.length && (
                  <div className="flex items-center justify-center mt-12 pt-4 border-t border-neutral-200 font-inter">
                    <ButtonSecondary onClick={handleShowMore}>{t.Showmemore}</ButtonSecondary>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-dashed border-neutral-300 rounded-3xl p-8 font-inter">
                <div className="p-4 bg-neutral-50 rounded-full text-neutral-500 mb-4 border border-neutral-100">
                  <svg className="w-10 h-10 stroke-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-10.5h16.5M2.25 9h19.5M4.5 12h15m-15 3h15m-15 3h15M2.25 21V4.5A2.25 2.25 0 014.5 2.25h15A2.25 2.25 0 012.15 4.5V21" />
                  </svg>
                </div>
                <p className="text-neutral-800 font-bold text-lg">{t.Noaccommodationsavailable || "No current listings available for this host."}</p>
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
      
      {/* Mobile Sticky Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <FooterNav />
      </div>
    </div>
  );
};

export default ClientPage;