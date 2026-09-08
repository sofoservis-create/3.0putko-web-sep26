"use client";
import React, { useContext, useEffect, useState } from "react";
import {
  Handshake,
  MessageSquare,
  CreditCard,
  Euro,
} from "lucide-react"; // ✅ Replaced Fa icons with Lucide equivalents
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

function Features() {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  return (
    <div className="px-8 bg-[#292a34] py-20">
      <div className="text-white">
        <div className="container mx-auto">
          {/* Header Section */}
          <h2 className="mb-12 text-4xl font-extrabold text-center lg:text-left">
            {t.features_title}
          </h2>

          {/* Features Grid */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="flex flex-col items-start p-8 bg-[#1f2029] rounded-lg hover:bg-[#353743] hover:shadow-lg hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-center mb-6 bg-green-500 rounded-full w-14 h-14">
                <Euro className="w-6 h-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{t.feature1_title}</h3>
              <p className="text-gray-300">{t.feature1_description}</p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-start p-8 bg-[#1f2029] rounded-lg hover:bg-[#353743] hover:shadow-lg hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-center mb-6 bg-green-500 rounded-full w-14 h-14">
                <Handshake className="w-6 h-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{t.feature2_title}</h3>
              <p className="text-gray-300">{t.feature2_description}</p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-start p-8 bg-[#1f2029] rounded-lg hover:bg-[#353743] hover:shadow-lg hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-center mb-6 bg-green-500 rounded-full w-14 h-14">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{t.feature3_title}</h3>
              <p className="text-gray-300">{t.feature3_description}</p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-start p-8 bg-[#1f2029] rounded-lg hover:bg-[#353743] hover:shadow-lg hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-center mb-6 bg-green-500 rounded-full w-14 h-14">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{t.feature4_title}</h3>
              <p className="text-gray-300">{t.feature4_description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Features;
