"use client";

import React, { useContext, useEffect, useState } from "react";
import ButtonSecondary from "./ButtonSecondary";
import Textarea from "./Textarea";
import Input from "./Input";
import { StarIcon } from "@heroicons/react/24/solid";
import { toast } from "react-toastify";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";

const CommentForm = ({ 
  blogId, 
  onCommentAdded, 
  parentCommentId = null,
  onCancel = null,
  className = ""  
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    comment: "",
    rating: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({
      ...prev,
      rating,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.comment.trim()
    ) {
      toast.error(t.RequiredFieldsError);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t.InvalidEmailError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/blog-comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogId,
            name: formData.name.trim(),
            email: formData.email.trim(),
            comment: formData.comment.trim(),
            rating: parseInt(formData.rating),
            parentCommentId,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(t.CommentAddedSuccess);
        setFormData({
          name: "",
          email: "",
          comment: "",
          rating: 5,
        });

        onCommentAdded?.(data.comment);
        onCancel?.();
      } else {
        toast.error(data.error || t.CommentAddFailed);
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error(t.CommentSubmitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`nc-CommentForm ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t.Name} *
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t.YourName}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              {t.Email} *
            </label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t.YourEmail}
              required
            />
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t.Rating}
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingChange(star)}
                className="focus:outline-none"
              >
                <StarIcon
                  className={`w-6 h-6 ${
                    star <= formData.rating
                      ? "text-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">
              ({formData.rating}{" "}
              {formData.rating === 1 ? t.Star : t.Stars})
            </span>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {t.Comment} *
          </label>
          <Textarea
            name="comment"
            value={formData.comment}
            onChange={handleInputChange}
            placeholder={t.CommentPlaceholder}
            required
            rows={4}
          />
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <ButtonSecondary
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {t.SubmitComment}
          </ButtonSecondary>

          {onCancel && (
            <ButtonSecondary
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 rounded-lg font-medium"
            >
              {t.Cancel}
            </ButtonSecondary>
          )}
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
