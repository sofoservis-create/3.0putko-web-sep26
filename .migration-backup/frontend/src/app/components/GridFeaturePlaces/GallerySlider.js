"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import Link from "next/link";

export default function GallerySlider({
  className = "",
  galleryImgs,
  ratioClass = "aspect-w-4 aspect-h-3",
  imageClass = "",
  uniqueID = "uniqueID",
  // ⬇️ Use top-only rounding for image container
  galleryClass = "rounded-t-xl",
  stayId,
  href = `/listings/${stayId}`,
  navigation = true,
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});

  const images = galleryImgs;
  const currentImage = images[index];

  // ✅ Cloudinary optimizer
  const optimizeCloudinary = (url, width = 400) => {
    if (!url?.includes("res.cloudinary.com")) return url;

    return url.replace(
      "/upload/",
      `/upload/f_auto,q_auto,w_${width},h_${Math.round(width * 0.75)},c_fill/`
    );
  };

  // ✅ Preload next/prev images
  const preloadImage = (src) => {
  if (!src) return;
    const img = new window.Image(); // ✅ browser Image constructor
    img.src = optimizeCloudinary(src);
  };

  const changePhotoId = (newVal) => {
    setDirection(newVal > index ? 1 : -1);
    setIndex(newVal);
    preloadImage(images[newVal]);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => index < images.length - 1 && changePhotoId(index + 1),
    onSwipedRight: () => index > 0 && changePhotoId(index - 1),
    trackMouse: true,
  });

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 220 : -220,
      opacity: 0,
      scale: 0.97,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: (direction) => ({
      x: direction > 0 ? -220 : 220,
      opacity: 0,
      scale: 1.04,
      transition: {
        duration: 0.35,
        ease: [0.65, 0, 0.35, 1],
      },
    }),
  };

  return (
    <MotionConfig>
      <div className={`relative group group/cardGallerySlider ${className}`} {...handlers}>
        <div className={`w-full overflow-hidden ${galleryClass}`}>
          <Link href={href} className={`relative flex items-center justify-center ${ratioClass}`}>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 will-change-transform"
              >
                {!loadedImages[index] && (
                  <div className="relative w-full h-full overflow-hidden rounded-t-xl bg-neutral-200/70 backdrop-blur-md">
                    <div className="absolute inset-0 shimmer-glow" />
                  </div>
                )}

                <img
                  src={optimizeCloudinary(currentImage, 400)}
                  srcSet={`
                    ${optimizeCloudinary(currentImage, 300)} 300w,
                    ${optimizeCloudinary(currentImage, 400)} 400w,
                    ${optimizeCloudinary(currentImage, 600)} 600w
                  `}
                  sizes="(max-width: 768px) 100vw, 400px"
                  alt="listing gallery image"
                  loading={index === 0 ? "eager" : "lazy"} // ✅ First image eager
                  fetchpriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out rounded-t-xl ${imageClass} ${
                    loadedImages[index] ? "opacity-100 scale-100" : "opacity-0 scale-[1.06]"
                  }`}
                  onLoad={() =>
                    setLoadedImages((prev) => ({ ...prev, [index]: true }))
                  }
                />
              </motion.div>
            </AnimatePresence>
          </Link>
        </div>

        {/* navigation buttons */}
        {navigation && (
          <div className="transition-opacity duration-200 opacity-0 group-hover/cardGallerySlider:opacity-100">
            {index > 0 && (
              <button
                className="absolute flex items-center justify-center w-8 h-8 -translate-y-1/2 bg-white border rounded-full left-3 top-1/2 border-neutral-200 hover:border-neutral-300"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  changePhotoId(index - 1);
                }}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
            )}
            {index + 1 < images.length && (
              <button
                className="absolute flex items-center justify-center w-8 h-8 -translate-y-1/2 bg-white border rounded-full right-3 top-1/2 border-neutral-200 hover:border-neutral-300"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  changePhotoId(index - 1);
                }}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* dots nav */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center space-x-1.5">
          {(() => {
            const maxDots = 6;
            const total = images.length;

            let start = Math.max(0, index - Math.floor(maxDots / 2));
            let end = Math.min(total, start + maxDots);

            if (end - start < maxDots) start = Math.max(0, end - maxDots);

            return images.slice(start, end).map((_, i) => {
              const actualIndex = start + i;

              return (
                <button
                  key={actualIndex}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    actualIndex === index ? "bg-white scale-[1.4]" : "bg-white/60"
                  }`}
                  onClick={() => changePhotoId(actualIndex)}
                />
              );
            });
          })()}
        </div>
      </div>
    </MotionConfig>
  );
}
