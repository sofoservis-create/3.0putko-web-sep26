"use client";
import React, { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Menu } from "lucide-react";
import { usePathname } from "@/app/components/NextNavigation";
import NavMobile from "./NavMobile";

const MenuBar = ({
  className = "min-w-11 min-h-11 p-2.5 rounded-lg text-neutral-700",
  iconClassName = "h-8 w-8",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  // Close when navigating to another route
  useEffect(() => {
    setIsVisible(false);
  }, [pathname]);

  const handleOpenMenu = () => setIsVisible(true);
  const handleCloseMenu = () => setIsVisible(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={handleOpenMenu}
        className={`focus:outline-none flex items-center justify-center ${className}`}
        aria-label="Otvoriť menu"
      >
        <Menu className={iconClassName} />
      </button>

      {/* Animated Sidebar */}
      <Transition show={isVisible} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleCloseMenu}>
          {/* Backdrop overlay */}
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          {/* Sidebar sliding panel */}
          <div className="fixed inset-0 flex justify-end">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-200"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="relative w-72 max-w-full bg-white dark:bg-neutral-900 shadow-xl h-full overflow-y-auto">
                <NavMobile onClickClose={handleCloseMenu} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default MenuBar;
