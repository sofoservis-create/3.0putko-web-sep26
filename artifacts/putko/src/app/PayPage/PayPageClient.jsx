"use client";

import React, { useState, useEffect, useContext } from "react";
import ButtonPrimary from "../Shared/ButtonPrimary";
import NcImage from "../Shared/NcImage/NcImage";
import Header from "../components/Header";
import Footer from "../components/Footer/Footer";
import FooterNav from "../Shared/FooterNav";
import HeroSearchForm2Mobile from "../components/HeroSearchForm2Mobile";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";
import MenuBar from "../Shared/MenuBar";

const PayPageClient = ({ className = "" }) => {
  const [userData, setUserData] = useState(null);
  const [reservation, setReservation] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [guests, setGuests] = useState({
    guestAdults: 0,
    guestChildren: 0,
    guestInfants: 0,
  });

  // Fetching the user data from localStorage
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("userData"));
    if (data) {
      setUserData(data);
      setStartDate(new Date(data.checkInDate));
      setEndDate(new Date(data.checkOutDate));
      setGuests({
        guestAdults: data.guests?.adults || 0,
        guestChildren: data.guests?.children || 0,
        guestInfants: data.guests?.infants || 0,
      });
    }
  }, []);

  // Update reservation state when userData is available
  useEffect(() => {
    if (userData) {
      setReservation((prev) => ({
        ...prev,
        checkInDate: userData.checkInDate || "",
        checkOutDate: userData.checkOutDate || "",
        numberOfPersons:
          (userData.guests?.adults || 0) +
          (userData.guests?.children || 0) +
          (userData.guests?.infants || 0),
        totalPrice: userData.total || 0,
        accommodationProvider: userData.data?.userId?._id || "user",
        accommodationId: userData.listingId || "",
      }));
    }
  }, [userData]);

  const translations = { en, sk };
    const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
    const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
  
      // Update language state when `lang` changes in FormContext
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
    
      const t = translations[language];

  const renderContent = () => {
    if (!userData) return null;

    const {
      _id,
      images,
      propertyType={},
      locationDetails,
      rentalform,
      beds,
      bathroom,
      priceMonThus,
      phoneNumber,
    } = userData.data || {};

    const currentPropertyType = propertyType[language] || propertyType["en"];
    const { city, country } = locationDetails || {};
    const image = images?.[0];
    const data = userData.data;
    const name = data?.name;
    const hostId = data?.userId;
    const hostName = hostId?.name;
    const hostEmail = hostId?.email;

    return (
      <div className="w-full flex flex-col sm:rounded-2xl sm:border border-neutral-200 space-y-8 px-0 sm:p-6 xl:p-8">
        <h2 className="text-3xl lg:text-4xl font-semibold">{t.Congratulations}</h2>
        <div className="border-b border-neutral-200"></div>

        <div className="space-y-6">
          <h3 className="text-2xl font-semibold">{t.Yourbooking}</h3>
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 w-full sm:w-40">
              <div className="aspect-w-4 aspect-h-3 sm:aspect-h-4 rounded-2xl overflow-hidden">
                <NcImage src={image || "https://via.placeholder.com/150"} />
              </div>
            </div>
            <div className="pt-5 sm:pb-5 sm:px-5 space-y-3">
              <div>
                <span className="text-sm text-neutral-500 line-clamp-1">
                  {`${currentPropertyType} in ${city || ""}, ${country || ""}`}
                </span>
                <span className="text-base sm:text-lg font-medium mt-1 block">
                  {name || ""}
                </span>
              </div>
              <span className="block text-sm text-neutral-500">
                {`${beds || 0} ${t.beds} · ${bathroom || 0} ${t.baths}`}
              </span>
              <div className="w-10 border-b border-neutral-200"></div>
            </div>
          </div>

          <div className="mt-6 border border-neutral-200 rounded-3xl flex flex-col sm:flex-row divide-y sm:divide-x sm:divide-y-0 divide-neutral-200">
            <div className="flex-1 p-5 flex space-x-4">
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t.date}</span>
                <span className="mt-1.5 text-lg font-semibold">
                  {`${startDate?.toLocaleDateString() || ""} - ${endDate?.toLocaleDateString() || ""}`}
                </span>
              </div>
            </div>
            <div className="flex-1 p-5 flex space-x-4">
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t.guests}</span>
                <span className="mt-1.5 text-lg font-semibold">
                  {`${guests.guestAdults + guests.guestChildren + guests.guestInfants} ${t.Guests}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-semibold">{t.Bookingdetail}</h3>
          <div className="flex flex-col space-y-4">
            {/* <div className="flex text-neutral-600">
              <span className="flex-1">Booking code</span>
              <span className="flex-1 font-medium text-neutral-900 ">
                {userData.bookingCode || "#000-000-000"}
              </span>
            </div> */}
            <div className="flex text-neutral-600">
              <span className="flex-1">{t.date}</span>
              <span className="flex-1 font-medium text-neutral-900">
                {startDate?.toLocaleDateString() || ""} - {endDate?.toLocaleDateString() || ""}
              </span>
            </div>
            <div className="flex text-neutral-600">
              <span className="flex-1">{t.Total}</span>
              <span className="flex-1 font-medium text-neutral-900">
                {userData.nights || "0"}{t.night}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold">{t.Hostdetail}</h3>
          <div className="flex flex-col space-y-4">
             
            <div className="flex text-neutral-600">
              <span className="flex-1">{t.name}</span>
              <span className="flex-1 font-medium text-neutral-900 text-[10px] leading-4 sm:text-lg">
                {hostName}
              </span>
            </div>
            <div className="flex text-neutral-600">
              <span className="flex-1">{t.email}</span>
              <span className="flex-1 font-medium text-neutral-900 text-[10px] leading-4 sm:text-lg">
                {hostEmail}
              </span>
            </div>
            <div className="flex text-neutral-600">
              <span className="flex-1">{t.HostNumber}</span>
              <span className="flex-1 font-medium text-neutral-900 text-[10px] leading-4 sm:text-lg">
                {phoneNumber || ""}  
              </span>
            </div>
          </div>
        </div>
        <div>
          <ButtonPrimary href="/listing-stay-map">{t.Exploremorestays}</ButtonPrimary>
        </div>
      </div>
    );
  };

  return (
    <div className={`nc-PayPage ${className}`} data-nc-id="PayPage">
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
      <main className="container mt-6 mb-24 lg:mb-32 lg:pt-24">
        <div className="max-w-4xl mx-auto">{renderContent()}</div>
      </main>
      <Footer />
        <div className="lg:hidden">
          <FooterNav/>
        </div>
    </div>
  );
};

export default PayPageClient;
