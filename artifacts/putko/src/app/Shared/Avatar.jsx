import React from "react";
import { avatarColors } from "./contants";

const Avatar = ({
  containerClassName = "ring-1 ring-white",
  sizeClass = "h-6 w-6 text-sm",
  id,
  radius = "rounded-full",
  imgUrl = null,
  userName = "",
  createdAt,
  isVerified = false,
  hasChecked,
  hasCheckedClass = "w-4 h-4 -top-0.5 -right-0.5",
}) => {

  // ✅ Use provided image URL or fallback color
  const url = imgUrl || "";
  const name = userName || "";

  // Function to set background color based on the user's name
  const _setBgColor = (name) => {
    const backgroundIndex = Math.floor(
      name.charCodeAt(0) % avatarColors.length
    );
    return avatarColors[backgroundIndex];
  };

  return (
    <div
      className={`wil-avatar relative flex-shrink-0 inline-flex items-center justify-center text-neutral-100 uppercase font-semibold shadow-inner ${radius} ${sizeClass} ${containerClassName}`}
      style={{ backgroundColor: url ? undefined : _setBgColor(name) }}
    >
      {url ? (
        <img
          className={`absolute inset-0 w-full h-full object-cover ${radius}`}
          src={url}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
        />
      ) : (
        <span className="wil-avatar__name">{name?.[0]}</span>
      )}

      {isVerified && (
        <span
          className={`bg-teal-800 rounded-full font-bold flex items-center justify-center absolute  ${hasCheckedClass}`}
          style={{ color: "#fff" }}
        >
           ✔
        </span>
        
      )}
    </div>
  );
};

export default Avatar;
