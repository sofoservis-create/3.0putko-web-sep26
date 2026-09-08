import React, { useState, useMemo, useContext, useEffect } from "react";
import WidgetHeading1 from "./WidgetHeading1";
import Card3Small from "./Card3Small";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";

const WidgetPosts = ({ className = "bg-neutral-100", posts = [] }) => {
  const [showAll, setShowAll] = useState(false);
  const translations = { en, sk };
      const { lang } = useContext(FormContext);
      const [language, setLanguage] = useState(lang || "sk");
        
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
        
    const t = translations[language];

  // ✅ Sort posts by views (highest first)
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => (b.views || 0) - (a.views || 0));
  }, [posts]);

  const displayedPosts = showAll ? sortedPosts : sortedPosts.slice(0, 5);

  return (
    <div
      className={`nc-WidgetPosts rounded-3xl overflow-hidden ${className}`}
      data-nc-id="WidgetPosts"
    >
      <WidgetHeading1
        title={`🎯 ${t.PopularPosts}`}
        viewAll={{
          label: showAll ? t.Showless: t.Viewall,
        }}
        onClick={() => setShowAll(!showAll)}
      />
      <div className="flex flex-col divide-y divide-neutral-200">
        {displayedPosts.map((post) => (
          <Card3Small
            className="p-4 xl:px-5 xl:py-6 hover:bg-neutral-200"
            key={post.id || post._id}
            post={post}
          />
        ))}
      </div>
    </div>
  );
};

export default WidgetPosts;
