import Link from "@/app/components/NextLink";
import React from "react";
import PostCardMeta from "./PostCardMeta";
import NcImage from "../../Shared/NcImage/NcImage";

const Card13 = ({ className = "", post }) => {
    // console.log("Card13", post);
  const { title, image, date, summary, slug } = post;

  // console.log("titleCard13", title);

  return (
    <div className={`nc-Card13 relative flex ${className}`} data-nc-id="Card13">
      <div className="flex flex-col h-full py-2">
        <h2 className="nc-card-title block font-semibold text-base">
          <Link href={`/Blog-Detail/${slug}`} className="line-clamp-2" title={title}>
            {title}
          </Link>
        </h2>
        <span className="hidden sm:block my-3 text-neutral-500">
          <span className="line-clamp-2">{summary}</span>
        </span>
        <span className="mt-4 block sm:hidden text-sm text-neutral-500">
          {date}
        </span>
        <div className="mt-auto hidden sm:block">
          <PostCardMeta meta={post} />
        </div>
      </div>

      <Link
        href={`/Blog-Detail/${slug}`}
        className="block relative h-full flex-shrink-0 w-2/5 sm:w-1/3 ml-3 sm:ml-5"
      >
        <NcImage
          containerClassName="absolute inset-0"
          className="object-cover w-full h-full rounded-xl sm:rounded-3xl"
          src={image}
          alt={title}
        />
      </Link>
    </div>
  );
};

export default Card13;
