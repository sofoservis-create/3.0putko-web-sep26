import React from "react";
import Link from "@/app/components/NextLink";
import NcImage from "../../Shared/NcImage/NcImage";
import PostCardMeta from "./PostCardMeta";

const Card12 = ({ className = "h-full", post }) => {
  const { title, image, summary, slug } = post;

  return (
    <div
      className={`nc-Card12 group relative flex flex-col ${className}`}
      data-nc-id="Card12"
    >
      <Link
        href={`/Blog-Detail/${slug}`}
        className="block flex-shrink-0 flex-grow relative w-full h-0 aspect-w-4 aspect-h-3 rounded-3xl overflow-hidden"
      >
        <NcImage
          containerClassName="absolute inset-0"
          src={image}
          alt={title}
        />
       
      </Link>

      <div className="mt-8 pr-10 flex flex-col">
        <h2
          className={`nc-card-title block font-semibold text-neutral-900 transition-colors text-lg sm:text-2xl`}
        >
          <Link href={`/Blog-Detail/${slug}`} className="line-clamp-2" title={title}>
            {title}
          </Link>
        </h2>
        <span className="hidden sm:block mt-4 text-neutral-500">
          <span className="line-clamp-2">{summary}</span>
        </span>
        <PostCardMeta className="mt-5" meta={post} />
      </div>
    </div>
  );
};

export default Card12;
