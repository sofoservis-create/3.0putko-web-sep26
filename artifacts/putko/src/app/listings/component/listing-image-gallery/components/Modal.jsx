"use client";

import { usePathname, useRouter, useSearchParams } from "@/app/components/NextNavigation";
import { useState } from "react";
import useKeypress from "react-use-keypress";
import { getNewParam } from "../ListingImageGallery";
import SharedModal from "./SharedModal";

export default function Modal({ images, onClose }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const thisPathname = usePathname();
  const photoId = searchParams?.get("photoId");
  let index = Number(photoId);

  const [curIndex, setCurIndex] = useState(index);

  function handleClose() {
    if (onClose) {
      onClose();
    }
  }

  function changePhotoId(newVal) {
    setCurIndex(newVal);
    const newUrl = `${thisPathname}?${getNewParam({ value: newVal })}`;
    window.history.replaceState(null, "", newUrl);
  }

  useKeypress("ArrowRight", () => {
    if (curIndex + 1 < images.length) {
      changePhotoId(curIndex + 1);
    }
  });

  useKeypress("ArrowLeft", () => {
    if (curIndex > 0) {
      changePhotoId(curIndex - 1);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="relative flex flex-col items-center w-full max-w-5xl">
        {/* <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white bg-black rounded-full p-2 hover:bg-gray-700"
        >
          Close
        </button> */}
        <SharedModal
          index={curIndex}
          images={images}
          changePhotoId={changePhotoId}
          closeModal={handleClose}
          navigation={true}
        />
      </div>
    </div>
  );
}
