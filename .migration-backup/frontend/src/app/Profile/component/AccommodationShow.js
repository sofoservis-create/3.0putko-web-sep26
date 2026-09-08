"use client";
import React, { useState, useEffect, useContext } from 'react';
import useFetchData from '../../hooks/useFetchData.js';
import Loading from '../../components/Loader/Loading.js';
import Error from '../../components/Error/Error.js';
import { toast } from 'react-toastify';
import { FormContext } from '../../FormContext.js';
import AddAccommodation from './AddAccommodation';
import en from '../../locales/en';
import sk from '../../locales/sk';
import Header from '@/app/components/Header/Header';
import { MapPin, Pencil, StarIcon, Trash2, Home, Users, BedDouble, Bath } from 'lucide-react';
import ListingStatusBadge from './ListingStatusBadge';

const AccommodationShow = ({ onMenuClick }) => {
  const [editingAccommodationId, setEditingAccommodationId] = useState(null);
  const [accommodation, setAccommodation] = useState([]); 
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
              
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);
              
  const t = translations[language];

  const userr = typeof window !== "undefined" ? localStorage.getItem('user') : null;
  const users = userr ? JSON.parse(userr) : null;
  const userId = users?._id;

  const { data: accommodationData, loading, error } = useFetchData(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`);

  const handleEditClick = (accommodationId) => {
    setEditingAccommodationId(accommodationId);
  };

  const closeUpdateForm = () => {
    setEditingAccommodationId(null);
  };

  const handleDelete = async (id) => {
    try {
      const check = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/reservation/check/${id}/${userId}`
      );
      const checkData = await check.json();

      if (checkData.count > 0) {
        toast.error(t.Hostcannotdeletethispropertyasithasactivereservation);
        return;
      }

      const isConfirmed = window.confirm(
        `${t.AreyousureyouwanttodeletethispropertylistingPleaseconfirm}`
      );
      if (!isConfirmed) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(t.Accommodationdeletedsuccessfully);
        setAccommodation(prev => prev.filter(p => p._id !== id));
      } else {
        toast.error(result.message || t.Failedtodeleteaccommodation);
      }

    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t.Anunexpectederroroccurred);
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title={`${t.Accommodation}`}
        subtitle=""
        showAddButton={true}
      />

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loading />
        </div>
      )}
      
      {error && (
        <div className="max-w-md mx-auto py-10">
          <Error />
        </div>
      )}

      {!editingAccommodationId ? (
        accommodationData && accommodationData.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 pt-2">
            {accommodationData.map((property) => {  
              const averageRating = property?.averageRating || '';
              const reviews = property?.reviews || '';
              const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
              const safeAverage = typeof averageRating === "number" ? averageRating : 0.0;
              
              return (
                <div 
                  key={property._id} 
                  className="group flex flex-col w-full bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  {/* Premium Upper Background Accent Patch */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#DFBA73]/5 rounded-bl-full pointer-events-none mix-blend-multiply" />

                  {/* Asymmetric Design Image Frame Wrapper */}
                  <div className="p-4 pb-0">
                    <div className="w-full aspect-[4/3] overflow-hidden relative bg-gray-50 rounded-tl-2xl rounded-br-2xl border border-slate-100 shadow-2xs">
                      <img
                        src={property.images[0] || '/placeholder-large.png'}
                        alt={property.name}
                        className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      
                      {/* Floating Sophisticated Glassmorphism Rating Badge */}
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm border border-white/40 flex items-center gap-1">
                        <StarIcon className="text-[#DFBA73] fill-[#DFBA73] w-3.5 h-3.5" />
                        <span className="text-xs font-bold text-[#1E3E2B]">{safeAverage.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-500 font-medium">({reviewCount})</span>
                      </div>

                      {/* Lifecycle badge. On the image rather than in the body
                          so a host scanning the grid can see at a glance which
                          of their listings are actually live.

                          `onImage` swaps in the opaque palette. Passing a
                          `bg-*` of our own instead would be wrong twice over:
                          it would flatten the status colour that is the point
                          of the badge, and two competing Tailwind background
                          classes do not resolve by their order in the class
                          attribute — whichever lands later in the generated
                          stylesheet wins, so it would be a coin flip. */}
                      <div className="absolute top-3 right-3">
                        <ListingStatusBadge
                          status={property.listingStatus}
                          t={t}
                          size="xs"
                          onImage
                          className="shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clean Property Content Details */}
                  <div className="p-5 flex flex-col justify-between flex-1 space-y-5">
                    <div className="space-y-3">
                      <h3 className="font-extrabold text-base text-[#1E3E2B] tracking-tight line-clamp-1 group-hover:text-[#319A81] transition-colors duration-200">
                        {property.name}
                      </h3>

                      {/* Structural Premium Utility Meta Indicators */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                        <div className="flex flex-col items-center justify-center p-1.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
                          <Users className="w-3.5 h-3.5 text-[#319A81] mb-1" />
                          <span>{property.person} {t.persons}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
                          <BedDouble className="w-3.5 h-3.5 text-[#319A81] mb-1" />
                          <span>{property.bedroom} {t.bedrooms}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
                          <Bath className="w-3.5 h-3.5 text-[#319A81] mb-1" />
                          <span>{property.bathroom} {t.bathrooms}</span>
                        </div>
                      </div>

                      {/* Location Data Indicator Row */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="p-1 rounded-md bg-[#1E3E2B]/5 text-[#1E3E2B]">
                          <MapPin className="shrink-0 w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 truncate">
                          {property.locationDetails?.streetAndNumber || 'Unknown location'}
                        </p>
                      </div>
                    </div>

                    {/* Actions Canvas Container */}
                    <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between gap-3 relative">
                      <button
                        onClick={() => handleDelete(property._id)} 
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50/40 hover:bg-red-50 border border-red-100/30 rounded-xl transition-all duration-200 flex-1 active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 
                        {t.Delete}
                      </button>

                      <button
                        onClick={() => handleEditClick(property._id)} 
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl transition-all duration-200 flex-1 shadow-xs hover:shadow-md active:scale-95 transform"
                      >
                        <Pencil className="w-3.5 h-3.5" /> 
                        {t.Edit}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center bg-white shadow-3xs">
            <div className="w-14 h-14 rounded-2xl bg-[#1E3E2B]/5 flex items-center justify-center text-[#1E3E2B]/40 mb-4 border border-[#1E3E2B]/10">
              <Home className="w-6 h-6" />
            </div>
            <p className="text-slate-700 font-bold text-base">{t.Youhavenoaccommodationsfound || "No accommodations found"}.</p>
          </div>
        )
      ) : (
        <AddAccommodation accommodationId={editingAccommodationId} onClose={closeUpdateForm} />
      )}
    </div>
  );
};

export default AccommodationShow;