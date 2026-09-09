"use client";

import "./styles/index.css";
import { usePathname, useRouter, useSearchParams } from "@/app/components/NextNavigation";
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import Modal from "./components/Modal";
import { useLastViewedPhoto } from "./utils/useLastViewedPhoto";
import { Dialog, Transition } from "@headlessui/react";
import LikeSaveBtns from "../LikeSaveBtns";
import { FormContext } from "../../../FormContext";
import { ArrowLeft, X } from "lucide-react";

export const getNewParam = ({ paramName = "photoId", value }) => {
  let params = new URLSearchParams(document.location.search);
  params.set(paramName, String(value));
  return params.toString();
};

const ListingImageGallery = ({ images = [], onClose, isShowModal }) => {
  const { images: formImages } = useContext(FormContext);
  const searchParams = useSearchParams();
  const photoId = searchParams?.get("photoId");
  const router = useRouter();
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef(null);
  const thisPathname = usePathname();

  const PHOTOS = formImages?.map((url, index) => ({ id: index, url })) || [];

  const [failedImages, setFailedImages] = useState([]);

  useEffect(() => {
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  const handleClose = () => {
    onClose && onClose();
  };

  const renderContent = () => {
    if (PHOTOS.length === 0) {
      return <p>No images available.</p>;
    }

    return (
      <div>
        <div className="gap-4 columns-1 sm:columns-2 xl:columns-3">
          {/* Close Button */}
          <button
            className="absolute top-2 right-0 z-10 p-2 m-2 text-white bg-black rounded-full focus:outline-none hover:bg-gray-800"
            onClick={onClose}
            aria-label="Close gallery"
          >
            <X />
          </button>
          {PHOTOS.map(({ id, url }) => (
            <button
              type="button"
              aria-label={`Open photo ${id + 1} of ${PHOTOS.length}`}
              key={id}
              ref={id === Number(lastViewedPhoto) ? lastViewedPhotoRef : null}
              className="relative block w-full mb-5 after:content group cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight focus:outline-none focus:ring-2 focus:ring-[#357965] focus:ring-offset-2"
              onClick={() => {
                // Set the photoId in the URL when clicking on the image
                let params = new URLSearchParams(document.location.search);
                params.set("photoId", id); // Set photoId to the image ID
                router.push(`${thisPathname}?${params.toString()}`);
              }}
            >
              {failedImages.includes(id) ? (
                <div className="flex aspect-[3/2] items-center justify-center rounded-lg bg-[#1e4636] p-4 text-center font-semibold text-white">Putko<br /><span className="text-xs font-normal">Fotografia nie je dostupná</span></div>
              ) : (
                <img src={url} alt={`Photo ${id + 1}`} width={720} height={480} loading="lazy" onError={() => setFailedImages((current) => [...new Set([...current, id])])} className="transition transform rounded-lg brightness-90 will-change-auto group-hover:brightness-110" style={{ transform: "translate3d(0, 0, 0)" }} />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {photoId && (
        <Modal
          images={PHOTOS} // Use PHOTOS array
          onClose={() => {
            setLastViewedPhoto(photoId);
            let params = new URLSearchParams(document.location.search);
            params.delete("photoId");
            const query = params.toString();
            router.push(query ? `${thisPathname}?${query}` : thisPathname);
          }}
        />
      )}
      <Transition appear show={isShowModal} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-white" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white xl:px-10">
              <button
                className="flex items-center justify-center w-10 h-10 rounded-full focus:outline-none focus:ring-0 hover:bg-neutral-100"
                onClick={handleClose}
                aria-label="Close gallery"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <LikeSaveBtns />
            </div>

            <div className="flex items-center justify-center min-h-full pt-0 text-center sm:p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-5"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-5"
              >
                <Dialog.Panel className="w-full max-w-screen-lg p-4 pt-0 mx-auto text-left transition-all transform">
                  {renderContent()}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ListingImageGallery;
