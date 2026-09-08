"use client";

import React, { useContext, useEffect, useState } from "react";
import Avatar from "./Avatar";
import { StarIcon } from "@heroicons/react/24/solid";
import CommentForm from "./CommentForm";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";
import ButtonSecondary from "./ButtonSecondary";

const Comment = ({
  className = "",
  isSmall = false,
  comment = {},
  blogId,
  onReplyAdded = null,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const formatDate = (dateString) => {
    if (!dateString) return t.UnknownDate;

    const date = new Date(dateString);
    return date.toLocaleDateString(language === "sk" ? "sk-SK" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const avatarSize = isSmall ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg";
  const textSize = isSmall ? "text-xs" : "text-sm";
  const spacing = isSmall ? "mb-4" : "mb-6";

  const handleReplyAdded = (newReply) => {
    onReplyAdded?.(newReply);
    setShowReplyForm(false);
  };

  return (
    <div className={`nc-Comment ${className} ${spacing}`} data-nc-id="Comment">
      <div className="flex space-x-4">
        <div className="pt-0.5">
          <Avatar
            sizeClass={avatarSize}
            radius="rounded-full"
            userName={comment.name || t.Anonymous}
            imgUrl={comment.avatar}
          />
        </div>

        <div className="flex-grow">
          <div className="flex justify-between space-x-3">
            <div className="flex flex-col">
              <div className={`${textSize} font-semibold`}>
                {comment.name || t.Anonymous}
              </div>
              <span className={`${textSize} text-neutral-500 dark:text-neutral-400 mt-0.5`}>
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {comment.rating > 0 && (
              <div className="flex text-yellow-500">
                {[...Array(Math.floor(comment.rating))].map((_, i) => (
                  <StarIcon
                    key={i}
                    className={isSmall ? "w-3 h-3" : "w-4 h-4"}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            className={`block mt-3 ${
              isSmall ? "text-sm" : "text-base"
            } text-neutral-6000 dark:text-neutral-300`}
          >
            {comment.comment || t.NoCommentProvided}
          </div>

          {/* Reply button */}
          {!isSmall && blogId && (
            <div className="mt-3">
              <ButtonSecondary
                size="small"
                onClick={() => setShowReplyForm((prev) => !prev)}
                className="text-xs"
              >
                {showReplyForm ? t.CancelReply : t.Reply}
              </ButtonSecondary>
            </div>
          )}
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && blogId && (
        <div className="mt-4 ml-12">
          <CommentForm
            blogId={blogId}
            parentCommentId={comment._id}
            onCommentAdded={handleReplyAdded}
            onCancel={() => setShowReplyForm(false)}
            className="border-l-2 border-neutral-200 dark:border-neutral-700 pl-4"
          />
        </div>
      )}
    </div>
  );
};

export default Comment;
