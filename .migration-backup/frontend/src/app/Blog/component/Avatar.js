"use client";
import React from "react";
import { avatarColors } from "@/app/Shared/contants";

const Avatar = ({
  containerClassName = "ring-1 ring-white",
  sizeClass = "h-6 w-6 text-sm",
  radius = "rounded-full",
  imgUrl = null,
  userName = "",

}) => {
  // Function to set background color based on the user's name
  const _setBgColor = (name) => {
    const backgroundIndex = Math.floor(
      name?.charCodeAt(0) % avatarColors.length
    );
    return avatarColors[backgroundIndex];
  };

  return (
    <div
      className={`wil-avatar relative flex-shrink-0 inline-flex items-center justify-center text-neutral-100 uppercase font-semibold shadow-inner ${radius} ${sizeClass} ${containerClassName}`}
      style={{ backgroundColor: imgUrl ? undefined : _setBgColor(userName) }}
    >
      {imgUrl ? (
        <img
          className={`absolute inset-0 w-full h-full object-cover ${radius}`}
          src={imgUrl}
          alt={userName}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
        />
      ) : (
        <span className="wil-avatar__name">{userName?.[0]}</span>
      )}
    </div>
  );
};

export default Avatar;
