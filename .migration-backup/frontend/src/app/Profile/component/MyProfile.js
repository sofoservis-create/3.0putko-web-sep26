"use client";
import React, { useState, useEffect, useContext } from "react";
import { Tab } from "@headlessui/react";
import Avatar from "../../Shared/Avatar";
import useFetchData from "../../hooks/useFetchData";
import StayCard2 from "../../components/GridFeaturePlaces/StayCardFeatured";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import Header from "@/app/components/Header/Header";
import { Globe, CalendarDays, ShieldCheck, Home, FileText } from "lucide-react";

function MyProfile({ className = "" }) {
  const { selectedpage, updateSelectedpage, lang } = useContext(FormContext);
  const translations = { en, sk };
  const [language, setLanguage] = useState(lang || "sk");
  const [hostData, setHostData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];
  const userr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const users = userr ? JSON.parse(userr) : null;
  const id = users?._id;

  const formattedDate = hostData?.createdAt
    ? new Intl.DateTimeFormat(language === "sk" ? "sk-SK" : "en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(hostData.createdAt))
    : "...";

  useEffect(() => {
    const fetchHostData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${id}`);
        if (!response.ok) throw new Error("Failed to fetch host data");
        const data = await response.json();
        setHostData(data);
      } catch (error) {
        console.error("Error fetching host data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchHostData();
    }
  }, [id]);

  const { data: accommodationData = [], loading } = useFetchData(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${id}`
  );

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 6);
  };

  const photo = hostData?.photo;
  const userName = hostData?.name;
  const isVerified = hostData?.isVerified;

  const renderSidebar = () => {
    return (
      <div className="w-full space-y-6">
        {/* Profile Card Main Shell - Soft Light Green */}
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-6 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex flex-col items-center text-center">
            <div className="relative mt-2">
              <Avatar
                id={id || ""}
                imgUrl={photo}
                userName={userName}
                isVerified={isVerified}
                hasChecked={false}
                sizeClass="w-24 h-24 ring-4 ring-emerald-200/50 rounded-2xl object-cover shadow-xs"
              />
              {isVerified && (
                <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white p-1.5 rounded-xl shadow-md border-2 border-white">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-800 mt-4 tracking-tight">{hostData?.name || ""}</h2>
            
            {isVerified && (
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                Verified Account
              </span>
            )}
          </div>

          {hostData?.aboutYou && (
            <div className="mt-5 pt-4 border-t border-emerald-100">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">
                <FileText className="w-3.5 h-3.5" />
                {t.aboutYou}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic font-normal">
                "{hostData.aboutYou}"
              </p>
            </div>
          )}
        </div>

        {/* Modular Account Data Grid Split - Soft Light Green Elements inside white card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-3">
          {/* Item 1 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/70 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.listings || "Stays"}</span>
            </div>
            <span className="text-sm font-black text-slate-800">{accommodationData.length}</span>
          </div>

          {/* Item 2 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/70 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.Language || "Language"}</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{hostData?.languag || "Slovak, English"}</span>
          </div>

          {/* Item 3 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/70 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CalendarDays className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.Joinedin || "Member"}</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{formattedDate}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderListingsSection = () => {
    return (
      <div className="space-y-6">
        {/* Dynamic Descriptive Subheader Panel - Soft Light Green */}
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-6 shadow-xs">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {hostData?.name || ""} &mdash; {t.listings}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            {hostData?.name || ""} {t.listingsisveryrichstarreviewshelphimtobe || "properties hosted with genuine guest feedback"}.
          </p>
        </div>

        {/* Tab Panel Listings Grid */}
        <Tab.Group>
          <Tab.Panels>
            <Tab.Panel className="focus:outline-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase animate-pulse">Loading</span>
                </div>
              ) : accommodationData && accommodationData.length ? (
                <>
                  {/* MODIFIED RESPONSIVE BREAKPOINT CLASS HERE */}
                  {/* grid-cols-1: Shows exactly 1 card below 1024px (encompassing 768px up to 1023px) */}
                  {/* lg:grid-cols-2: Snaps cleanly into 2 columns at 1024px and wider viewports */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {accommodationData.slice(0, visibleCount).map((stay) => (
                      <div 
                        key={stay._id} 
                        className="group bg-emerald-50/30 border border-emerald-100/70 hover:border-amber-400 rounded-2xl p-2.5 shadow-2xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                      >
                        <StayCard2 data={stay} />
                      </div>
                    ))}
                  </div>

                  {/* Show More Interactive Pagination Action */}
                  {visibleCount < accommodationData.length && (
                    <div className="flex items-center justify-center pt-8">
                      <button
                        onClick={handleShowMore}
                        className="px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all duration-200 transform active:scale-95"
                      >
                        {t.Showmemore || "Show more listings"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-3xl p-16 text-center bg-emerald-50/20 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 mb-3 border border-emerald-100">
                    <Home className="w-4 h-4" />
                  </div>
                  <p className="text-slate-600 font-bold text-sm">{t.Noaccommodationsavailable || "No active properties listed yet"}.</p>
                </div>
              )}
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    );
  };

  return (
    <div className={`space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 ${className}`}>
      {/* 1. Dynamic Site Custom Header Hook */}
      <div className="hidden lg:block border-b border-gray-100 pb-3">
        <Header title={`${t.Yourprofile || "Your Profile"}`} subtitle="" showAddButton={false} />
      </div>

      {/* 2. Main Page Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        {/* Left Side: Modular Meta Columns */}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 z-10">
          {renderSidebar()}
        </div>

        {/* Right Side: Fluid Content Area */}
        <div className="lg:col-span-8 xl:col-span-9">
          {renderListingsSection()}
        </div>
      </div>
    </div>
  );
}

export default MyProfile;