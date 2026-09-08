import React, { Fragment, useContext, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import NcInputNumber from "./NcInputNumber";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import sk from "../../locales/sk";
import en from "../../locales/en";
import { FormContext } from "../../FormContext";

const ModalSelectGuests = ({ renderChildren, person }) => {
  const [showModal, setShowModal] = useState(false);
  const [guestData, setGuestData] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });

  // Fetch guest data from localStorage when component mounts
  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      const parsedData = JSON.parse(userData);
      if (parsedData?.guests) {
        setGuestData(parsedData.guests);
      }
    }
  }, []);

  const closeModal = () => setShowModal(false);
  const openModal = () => setShowModal(true);

  const totalGuests = guestData.adults + guestData.children + guestData.infants; // Infants INCLUDED
  const canIncreaseGuests = totalGuests < person;

  const handleGuestDataChange = (newValue, type) => {
    const updatedGuestData = { ...guestData, [type]: newValue };
    setGuestData(updatedGuestData);

    // Save updated guest data to localStorage
    const userData = JSON.parse(localStorage.getItem("userData")) || {};
    userData.guests = updatedGuestData;
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  // Render the button that opens the modal
  const renderButtonOpenModal = () => {
    return renderChildren ? (
      renderChildren({ openModal })
    ) : (
      <button onClick={openModal}>Select Guests</button>
    );
  };

  // Clear the guest data
  const handleClearData = () => {
    const resetGuestData = { adults: 1, children: 0, infants: 0 };
    setGuestData(resetGuestData);

    // Clear guest data from localStorage
    const userData = JSON.parse(localStorage.getItem("userData")) || {};
    userData.guests = resetGuestData;
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  return (
    <>
      {renderButtonOpenModal()}
      <Transition appear show={showModal} as={Fragment}>
        <Dialog as="div" className="HeroSearchFormMobile__Dialog relative z-50" onClose={closeModal}>
          <div className="fixed inset-0 bg-neutral-100">
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
                <Dialog.Panel className="relative h-full overflow-hidden flex-1 flex flex-col justify-between">
                  <>
                    <div className="absolute left-4 top-4">
                      <button type="button" className="flex h-11 w-11 items-center justify-center -m-3 focus:outline-none focus:ring-0" onClick={closeModal} aria-label="Zavrieť výber hostí">
                        <XMarkIcon className="w-5 h-5 text-black" />
                      </button>
                    </div>

                    <div className="flex-1 pt-12 p-1 flex flex-col overflow-hidden">
                      <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        <div className="flex-1 flex flex-col transition-opacity animate-[myblur_0.4s_ease-in-out] overflow-auto">
                          <div className="flex flex-col gap-4 p-4">
                            {/* Ensure vertical layout */}
                            <div className="flex flex-col">
                              <NcInputNumber
                                defaultValue={guestData.adults}
                                onChange={(value) => handleGuestDataChange(value, "adults")}
                                label={`${t.Adults}`}
                                desc={`${t.Ages13orabove}`}
                                max={canIncreaseGuests ? undefined : guestData.adults}
                                totalGuests={totalGuests}
                                person={person}
                              />
                            </div>
                            <div className="flex flex-col">
                              <NcInputNumber 
                                defaultValue={guestData.children}
                                onChange={(value) => handleGuestDataChange(value, "children")}
                                label={`${t.Children}`}
                                desc={`${t.Ages212}`}
                                max={canIncreaseGuests ? undefined : guestData.children}
                                totalGuests={totalGuests}
                                person={person}
                              />
                            </div>
                            <div className="flex flex-col">
                              <NcInputNumber
                                defaultValue={guestData.infants}
                                onChange={(value) => handleGuestDataChange(value, "infants")}
                                label={`${t.Infants}`}
                                desc={`${t.Ages02}`}
                                max={canIncreaseGuests ? undefined : guestData.infants} // Infants count towards total guests
                                totalGuests={totalGuests}
                                person={person}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between px-4 py-3 bg-white border-t border-neutral-200">
                      <button type="button" className="flex-shrink-0 font-semibold underline" onClick={handleClearData}>
                        {t.Cleardates}
                      </button>
                      <ButtonPrimary sizeClass="px-6 py-3 !rounded-xl" onClick={() => {
                        closeModal();
                        window.location.reload();
                      }}>
                        {t.Save}
                      </ButtonPrimary>
                    </div>
                  </>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ModalSelectGuests;
