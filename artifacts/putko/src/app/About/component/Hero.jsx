"use client";

import React, { useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { FormContext } from "../../FormContext";

const Hero = ({ className = "", rightImg, heading, subHeading, btnText }) => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  return (
    <section className={`relative py-20 overflow-hidden ${className}`}>
      <div className="max-w-[1400px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* LEFT CONTENT - Refined Editorial Layout */}
        <div className="space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true }}
          >
            <h1 className="text-5xl md:text-7xl font-fraunces text-[#1a1a1a] leading-[0.95] tracking-tight">
              {t.about_us_heading || heading}
            </h1>
          </motion.div>

          <motion.p
            className="text-lg text-neutral-600 leading-relaxed max-w-md border-l-2 border-[#38a186] pl-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            viewport={{ once: true }}
          >
            {t.about_us_description || subHeading}
          </motion.p>
        </div>

        {/* RIGHT IMAGE - Full Focus Editorial Aesthetic */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <div className="h-[500px] rounded-[2.5rem] overflow-hidden shadow-sm">
            <img 
              src={rightImg} 
              alt="About Putko" 
              className="w-full h-full object-cover" 
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;