import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import Avatar from "./Avatar";

const PostCardMeta = ({
  className = "leading-none",
  meta,
  hiddenAvatar = false,
  size = "normal",
}) => {
  console.log("meta", meta);

  const { author, createdAt } = meta;

  const formattedDate = format(new Date(createdAt), "d. MMMM yyyy", {
    locale: sk,
  });

  return (
    <div
      className={`nc-PostCardMeta inline-flex items-center flex-wrap text-neutral-800 ${size === "normal" ? "text-sm" : "text-base"
        } ${className}`}
      data-nc-id="PostCardMeta"
    >
      {author.href ? (
        <Link
          href={author.href}
          className="flex-shrink-0 relative flex items-center space-x-2"
        >
          {!hiddenAvatar && (
            <Avatar
              radius="rounded-full"
              sizeClass={size === "normal" ? "h-7 w-7 text-sm" : "h-10 w-10 text-xl"}
              imgUrl={meta.authorImg || "/Image-16.avif"}
              userName={author}
            />
          )}
          <span className="block text-neutral-600 hover:text-black font-medium">
            {author}
          </span>
        </Link>
      ) : (
        <div className="flex-shrink-0 relative flex items-center space-x-2">
          {!hiddenAvatar && (
            <Avatar
              radius="rounded-full"
              sizeClass={size === "normal" ? "h-7 w-7 text-sm" : "h-10 w-10 text-xl"}
              imgUrl={meta.authorImg || "/Image-16.avif"}
              userName={author}
            />
          )}
          <span className="block text-neutral-600 font-medium">
            {author}
          </span>
        </div>
      )}
      <>
        <span className="text-neutral-500 mx-[6px] font-medium">
          ·
        </span>
        <span className="text-neutral-500 font-normal line-clamp-1">
          {formattedDate}
        </span>
      </>
    </div>
  );
};

export default PostCardMeta;