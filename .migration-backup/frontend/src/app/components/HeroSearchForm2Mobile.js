"use client";

import React, { Fragment, useContext, useState, useEffect } from "react";
import { Dialog, Tab, Transition } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { useTimeoutFn } from "react-use";
import StaySearchForm from "../components/StaySearchForm";
import Link from "next/link";
import { FormContext } from "../FormContext";
import { format } from "date-fns";
import en from "../locales/en";
import sk from "../locales/sk"; 

import { useRouter, usePathname } from "next/navigation"; 

const HeroSearchForm2Mobile = () => {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
      const pathname = usePathname();

  // FOR RESET ALL DATA WHEN CLICK CLEAR BUTTON
  const [showDialog, setShowDialog] = useState(false);
  const {
    updateperson,
    updateCity,
    updatestartdate,
    updatendate,updateAccommodationName, 
    city,
    startdate,
    enddate,
  } = useContext(FormContext);

  const [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1);

  const translations = { en, sk };
    const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
    const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
  
    // Update language state when `lang` changes in FormContext
    useEffect(() => {
      setLanguage(lang || "sk");
    }, [lang]);
  
    const t = translations[language];

  function closeModal() {
    setShowModal(false);
  }

  function openModal() {
    setShowModal(true); 
  }
  const handleSearchButtonClick = () => {
    // Step 1: Get individual values from localStorage
    const adults = parseInt(localStorage.getItem("guestAdults")) || 0;
    const children = parseInt(localStorage.getItem("guestChildren")) || 0;
    const infants = parseInt(localStorage.getItem("guestInfants")) || 0;
  
    // Step 2: Calculate total guests (excluding infants)
    const totalGuests = adults + children + infants;
  
    // Step 3: Update context values
    updateperson(totalGuests.toString());
  
    // Check for accommodation first, else fallback to city
    const selectedAccommodation = localStorage.getItem("selectedAccommodation");
    const selectedCity = localStorage.getItem("selectedCity");
  
    if (selectedAccommodation) {
      updateAccommodationName(selectedAccommodation);
      updateCity(""); // clear city if accommodation is selected
    } else if (selectedCity) {
      updateCity(selectedCity);
      updateAccommodationName(""); // clear accommodation if only city is selected
    } else {
      updateCity("");
      updateAccommodationName("");
    }
  
    updatestartdate(localStorage.getItem("checkin") || "");
    updatendate(localStorage.getItem("checkout") || "");
  
    // Step 4: Route logic
    if (pathname !== "/listing-stay-map") {
      router.push("/listing-stay-map");
    } else {
      closeModal();
    }
  };
  

  // Effect to store dates in localStorage when startdate or enddate changes
  React.useEffect(() => {
    if (startdate) {
      localStorage.setItem("checkin", format(startdate, "yyyy-MM-dd"));
    }
    if (enddate) {
      localStorage.setItem("checkout", format(enddate, "yyyy-MM-dd"));
    }
  }, [startdate, enddate]);

  const renderButtonOpenModal = () => {
    return (
      <div className="flex items-center w-full gap-2">
        <Link href="/" className="flex-shrink-0">
          <img src="/P.avif" alt="logo" className="w-10 h-10 object-contain" />
        </Link>
        <button
          onClick={openModal}
          className="relative flex items-center flex-1 px-4 py-2 border rounded-full shadow-lg border-neutral-200 pr-11"
        >
          <MagnifyingGlassIcon className="flex-shrink-0 w-5 h-5" />

          <div className="flex-1 ml-3 overflow-hidden text-left">
            <span className="block text-sm font-medium">{t.Whereto}</span>
            <span className="block mt-0.5 text-xs font-light text-neutral-500">
              <span className="line-clamp-1">{t.Anywhere} • {t.Anyweek} • {t.Addguests}</span>
            </span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="HeroSearchForm2Mobile">
      {renderButtonOpenModal()}
      <Transition appear show={showModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative HeroSearchFormMobile__Dialog z-[999999]"
          onClose={closeModal}
        >
          <div className="fixed inset-0 bg-neutral-200">
            <div className="flex h-full">
              <Transition.Child
                as={Fragment}
                enter="ease-out transition-transform"
                enterFrom="opacity-0 translate-y-52"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in transition-transform"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-52"
              >
                <Dialog.Panel className="relative flex flex-col justify-between flex-1 min-h-screen overflow-y-auto">
                  {showDialog && (
                    <Tab.Group manual>
                      <div className="absolute left-4 top-4">
                        <button className="" onClick={() => { 
                         
                          closeModal();}}
                        >
                          <XMarkIcon className="w-5 h-5 text-black" />
                           
                        </button>
                      </div>

                      <Tab.List className="flex justify-center w-full pt-12 space-x-6 text-sm font-semibold sm:text-base text-neutral-500 sm:space-x-8">
                        {[`${t.Stay}`, ""].map((item, index) => (
                          <Tab key={index} as={Fragment}>
                            {({ selected }) => (
                              <div className="relative outline-none select-none focus:outline-none focus-visible:ring-0">
                                <div
                                  className={`${
                                    selected ? "text-black" : ""
                                  }`}
                                >
                                  {item}
                                </div>
                                {selected && (
                                  <span className="absolute inset-x-0 border-b-2 border-black top-full"></span>
                                )}
                              </div>
                            )}
                          </Tab>
                        ))}
                      </Tab.List>
                      <div className="flex-1 pt-3 px-1.5 sm:px-4 flex overflow-hidden">
                        <Tab.Panels className="flex-1 py-4 overflow-y-auto hiddenScrollbar">
                          <Tab.Panel>
                            <div className="transition-opacity animate-[myblur_0.4s_ease-in-out]">
                              <StaySearchForm />
                            </div>
                          </Tab.Panel>
                        </Tab.Panels>
                      </div>
                      <div
                        className={`z-50 flex justify-between px-4 py-3 bg-white border-t border-neutral-200 ${
                          showModal ? "fixed bottom-0 left-0 w-full" : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="flex-shrink-0 font-semibold underline"
                          onClick={() => {
                            updateCity("");
                            updatendate("");
                            updatestartdate("");
                            updateAccommodationName("");
                            updateperson("");
                            localStorage.removeItem("checkin");
                            localStorage.removeItem("selectedAccommodation");
                            localStorage.removeItem("selectedCity");
                            localStorage.removeItem("checkout");
                            localStorage.removeItem("guestValues");
                            localStorage.removeItem("guestAdults");
                            localStorage.removeItem("guestChildren");
                            localStorage.removeItem("guestInfants");
                            localStorage.removeItem("selectedCity");
                            setShowDialog(false);
                            resetIsShowingDialog();
                          }}
                        >
                          {t.Clearall}
                        </button>
                        
                          <button
                            className="px-6 py-3 text-white bg-[#238869] rounded-lg hover:bg-[#174d3d] focus:outline-none focus:ring-2 focus:ring-[#238869] focus:ring-offset-2"
                            onClick={handleSearchButtonClick}
                          >
                            {t.Search}
                          </button>
                        
                      </div>
                    </Tab.Group>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default HeroSearchForm2Mobile;
