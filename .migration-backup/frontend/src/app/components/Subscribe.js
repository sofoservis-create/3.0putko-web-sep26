"use client";

import React, { useContext, useEffect, useState } from "react";
import Input from "./Input/Input";
import { ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import en from "../locales/en";
import sk from "../locales/sk";
import { FormContext } from "../FormContext";

const Subscribe = ({ className = "" }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const handleSubscribe = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError(t.InvalidEmail);
      toast.error(t.InvalidEmailToast);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.SomethingWentWrong);
      }

      setMessage(data.message || t.SubscribeSuccess);
      toast.success(t.SubscribeSuccess);
      setEmail("");
      setError("");
    } catch (err) {
      const errorMessage = err.message || t.GenericError;
      setError(errorMessage);
      toast.error(errorMessage);
      setMessage("");
    }
  };

  return (
    <div
      className={`nc-SectionSubscribe2 relative flex flex-col lg:flex-row lg:items-center ${className}`}
      data-nc-id="SectionSubscribe2"
    >
      <div className="flex-shrink-0 mb-10 lg:mb-0 lg:mr-10 lg:w-2/5">
        <h2 className="text-4xl font-semibold">
          {t.JoinNewsletter}
        </h2>

        <span className="block mt-5 text-neutral-500">
          {t.NewsletterDescription}
        </span>

        <ul className="mt-10 space-y-4">
          <li className="flex items-center space-x-4">
            <span className="inline-flex px-2.5 py-1 rounded-full font-medium text-xs text-blue-800 bg-blue-100 hover:bg-blue-800 hover:text-white transition-colors">
              01
            </span>
            <span className="font-medium text-neutral-700">
              {t.BenefitDiscount}
            </span>
          </li>

          <li className="flex items-center space-x-4">
            <span className="inline-flex px-2.5 py-1 rounded-full font-medium text-xs text-[#991b1b] bg-[#fee2e2] hover:bg-[#991b1b] hover:text-white transition-colors">
              02
            </span>
            <span className="font-medium text-neutral-700">
              {t.BenefitPremium}
            </span>
          </li>
        </ul>

        <form className="relative max-w-sm mt-10">
          <Input
            aria-required="true"
            placeholder={t.EnterEmail}
            type="email"
            rounded="rounded-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleSubscribe();
            }}
            className="absolute transform top-1/2 -translate-y-1/2 right-[5px] ttnc-ButtonCircle flex items-center justify-center rounded-full !leading-none bg-[#238869] hover:bg-[#115742] text-neutral-50 w-9 h-9"
          >
            <ArrowRight />
          </button>
        </form>
      </div>

      <div className="flex-grow">
        <img src="/SVG-subcribe2.png" alt="Subscribe illustration" />
      </div>
    </div>
  );
};

export default Subscribe;
