import React, { useContext, useEffect, useState } from "react";
import Tag from "../../Shared/Tag/Tag";
import WidgetHeading1 from "./WidgetHeading1";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";

const WidgetTags = ({
  className = "bg-neutral-100",
  tags = [],
  onSelectTag,
}) => {
  const [showAll, setShowAll] = useState(false);
  const translations = { en, sk };
    const { lang } = useContext(FormContext);
    const [language, setLanguage] = useState(lang || "sk");
      
    useEffect(() => {
      setLanguage(lang || "sk");
    }, [lang]);
      
  const t = translations[language];

  const sortedTags = [...tags].sort((a, b) => b.count - a.count);

  const displayedTags = showAll ? sortedTags : sortedTags.slice(0, 6);

  return (
    <div
      className={`nc-WidgetTags rounded-3xl overflow-hidden ${className}`}
      data-nc-id="WidgetTags"
    >
      <WidgetHeading1
        title={`🏷 ${t.Discovermoretags}`}
        viewAll={{
          label: showAll ? t.Showless: t.Viewall,
        }}
        onClick={() => setShowAll(!showAll)}
      />
      <div className="flex flex-wrap p-4 xl:p-5">
        {displayedTags.map((tag, index) => {
          const tagObj = {
            name: tag.name,
            count: tag.count,
          };

          return (
            <span
              key={index}
              onClick={() => onSelectTag(tag.name)}
              className="cursor-pointer"
            >
              <Tag className="mr-2 mb-2" tag={tagObj} hideCount={false} />
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default WidgetTags;
