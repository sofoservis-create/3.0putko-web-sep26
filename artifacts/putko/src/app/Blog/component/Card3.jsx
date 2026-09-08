import Link from "@/app/components/NextLink";
import React from "react";

import NcImage from "../../Shared/NcImage/NcImage";
import PostCardMeta from "./PostCardMeta";
import CategoryBadgeList from "./CategoryBadgeList";

const Card3 = ({ className = "h-full", post }) => {
  const { title, image, summary, categories, slug } = post;  

  return (
    <div
      className={`nc-Card3 relative flex flex-col-reverse sm:flex-row sm:items-center rounded-[40px] group ${className}`}
      data-nc-id="Card3"
    >
      <div className="flex flex-col flex-grow">
        <div className="space-y-5 mb-4">
          <CategoryBadgeList categories={categories} />
          <div>
            <h2
              className={`nc-card-title block font-semibold text-neutral-900 text-xl`}
            >
              <Link href={`/Blog-Detail/${slug}`} className="line-clamp-2" title={title}>
                {title}
              </Link>
            </h2>
            <div className="hidden sm:block sm:mt-2">
              <span className="text-neutral-500 text-base line-clamp-1">
                {summary}
              </span>
            </div>
          </div>

          <PostCardMeta meta={post} />
        </div>
      </div>

      <div
        className={`block flex-shrink-0 sm:w-56 sm:ml-6 rounded-3xl overflow-hidden mb-5 sm:mb-0`}
      >
        <Link
          href={`/Blog-Detail/${slug}`}
          className={`block w-full h-0 aspect-h-9 sm:aspect-h-16 aspect-w-16 `}
        >
          <NcImage
            containerClassName="absolute inset-0"
            src={image}
            alt={title}
          />
        
        </Link>
      </div>
    </div>
  );
};

export default Card3;
