"use client";

import React, { useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Heading from "../../Shared/Heading";
import NcImage from "../../Shared/NcImage/NcImage";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { FormContext } from "../../FormContext";

const FOUNDER_DEMO = [
  { id: "2", name: `Ján Jakel`, avatar: "/Jan.avif" },
  { id: "1", name: `Viliam Štajgár`, avatar: "/Villiam.avif" },
  { id: "4", name: `Martin Tkáč`, avatar: "/Martin.avif" },
  { id: "3", name: `Dušan H.`, avatar: "/Dusan.avif" },
];

const SectionFounder = () => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  return (
    <div className="relative py-16">
      <div className="max-w-[1400px] mx-auto px-6">
        {/* Simplified Heading Area */}
        <div className="mb-16">
          <Heading desc={t.founder_description}>{t.founder_heading}</Heading>
        </div>

        {/* Minimalist Gallery */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {FOUNDER_DEMO.map((item, index) => (
            <motion.div
              key={item.id}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
            >
              {/* Clean Portrait Framing */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl mb-6">
                <NcImage
                  containerClassName="absolute inset-0"
                  className="object-cover w-full h-full"
                  src={item.avatar}
                />
              </div>
              
              {/* Name Only - Maximalist Impact */}
              <h3 className="text-2xl font-fraunces font-semibold text-[#1a1a1a] tracking-tight">
                {item.name}
              </h3>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SectionFounder;