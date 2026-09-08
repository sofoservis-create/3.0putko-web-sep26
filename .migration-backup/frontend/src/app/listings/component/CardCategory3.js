import React from "react";
import Link from "next/link";
import Image from "next/image";

const CardCategory3 = ({ className = "", taxonomy }) => {
  const { count, name, href = "/", thumbnail } = taxonomy;

  return (
    <Link href={href} className={`nc-CardCategory3 flex flex-col ${className}`}>
      <div
        className={`flex-shrink-0 relative w-full aspect-w-5 aspect-h-5 sm:aspect-h-6 h-0 rounded-2xl overflow-hidden group`}
      >
        <Image
          src={thumbnail || ""}
          className="object-cover w-full h-full rounded-2xl"
          alt="places"
          fill
          sizes="(max-width: 400px) 100vw, 300px"
        />
        <span className="absolute inset-0 transition-opacity bg-black opacity-0 group-hover:opacity-100 bg-opacity-10"></span>
      </div>
      <div className="mt-4 truncate">
        <h2
          className={`text-base sm:text-lg text-neutral-900 font-medium truncate`}
        >
          {name}
        </h2>
        <span
          className={`block mt-1.5 text-sm text-neutral-600`}
        >
          
        </span>
      </div>
    </Link>
  );
};

export default CardCategory3;
