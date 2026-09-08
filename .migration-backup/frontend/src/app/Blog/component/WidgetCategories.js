import React, { useContext, useEffect, useState } from "react";
import WidgetHeading1 from "./WidgetHeading1";
import CardCategory1 from "./CardCategory1";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";

const WidgetCategories = ({
  className = "bg-neutral-100",
  categories = [],
  onSelectCategory,
}) => {
  const [showAll, setShowAll] = useState(false);
   const translations = { en, sk };
      const { lang } = useContext(FormContext);
      const [language, setLanguage] = useState(lang || "sk");
    
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
    
    const t = translations[language];

  const sortedCategories = [...categories].sort((a, b) => b.count - a.count);
  const displayedCategories = showAll ? sortedCategories : sortedCategories.slice(0, 5);

  return (
    <div
      className={`nc-WidgetCategories rounded-3xl overflow-hidden ${className}`}
      data-nc-id="WidgetCategories"
    >
      <WidgetHeading1
        title={`✨ ${t.Trendingtopics}`}
        viewAll={{
          label: showAll ? t.Showless: t.Viewall,
          href: "#",
        }}
        onClick={() => setShowAll(!showAll)}
      />
      <div className="flow-root">
        <div className="flex flex-col divide-y divide-neutral-200">
          {displayedCategories.map((category, index) => (
            <CardCategory1
              key={index}
              className="p-4 xl:p-5 hover:bg-neutral-200"
              taxonomy={category}
              size="normal"
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WidgetCategories;
