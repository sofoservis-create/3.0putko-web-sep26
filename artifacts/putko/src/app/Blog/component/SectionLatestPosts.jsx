"use client";
import React, { useContext, useEffect, useState } from "react";
import WidgetTags from "./WidgetTags";
import WidgetCategories from "./WidgetCategories";
import WidgetPosts from "./WidgetPosts";
import Card3 from "./Card3";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import Heading from "../../Shared/Heading";
import Pagination from "../../Shared/Pagination";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "@/app/FormContext";

const SectionLatestPosts = ({
  posts = [],
  postCardName = "card3",
  className = "",
}) => {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

  const translations = { en, sk };
    const { lang } = useContext(FormContext);
    const [language, setLanguage] = useState(lang || "sk");
  
    useEffect(() => {
      setLanguage(lang || "sk");
    }, [lang]);
  
  const t = translations[language];

  useEffect(() => {
    // Extract categories with counts
    const categoryCountMap = posts.reduce((acc, post) => {
      const cats = Array.isArray(post.categories)
        ? post.categories
        : post.categories
        ? [post.categories]
        : [];

      cats.forEach((category) => {
        acc[category] = (acc[category] || 0) + 1;
      });
      return acc;
    }, {});
    const uniqueCategories = Object.entries(categoryCountMap).map(
      ([name, count]) => ({ name, count })
    );
    setCategories(uniqueCategories);

    // Extract tags with counts
    const tagCountMap = posts.reduce((acc, post) => {
      const tgs = Array.isArray(post.tags)
        ? post.tags
        : post.tags
        ? [post.tags]
        : [];

      tgs.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {});
    const uniqueTags = Object.entries(tagCountMap).map(
      ([name, count]) => ({ name, count })
    );
    setTags(uniqueTags);
  }, [posts]);

  // Handlers
  const handleSelectTag = (tag) => {
    setSelectedTag(tag);
    setSelectedCategory(null);
    setVisibleCount(4);
  };

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedTag(null);
    setVisibleCount(4);
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedTag(null);
    setVisibleCount(4);
  };

  // Filtering
  const filteredPosts = posts.filter((post) => {
    const cats = Array.isArray(post.categories)
      ? post.categories
      : post.categories
      ? [post.categories]
      : [];
    const tgs = Array.isArray(post.tags)
      ? post.tags
      : post.tags
      ? [post.tags]
      : [];

    if (selectedCategory) {
      return cats.includes(selectedCategory);
    }
    if (selectedTag) {
      return tgs.includes(selectedTag);
    }
    return true;
  });

  // Visible posts
  const visiblePosts = filteredPosts.slice(0, visibleCount);

  const renderCard = (post) => {
    switch (postCardName) {
      case "card3":
        return <Card3 key={post._id} className="" post={post} />;
      default:
        return null;
    }
  };

  return (
    <div className={`nc-SectionLatestPosts relative ${className}`}>
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-3/5 xl:w-2/3 xl:pr-14">
          <div className="flex justify-between items-center">
            <Heading>
              {selectedCategory
                ? `${t.Trending}: ${selectedCategory} 🎈`
                : selectedTag
                ? `${t.Tagged}: ${selectedTag} 🏷`
                : `${t.LatestArticles} 🎈`}
            </Heading>
            {(selectedCategory || selectedTag) && (
              <button
                onClick={handleResetFilters}
                className="text-sm text-blue-600 underline hover:text-blue-800"
              >
                {t.ResetFilter}
              </button>
            )}
          </div>

          <div className="grid gap-6 md:gap-8 grid-cols-1">
            {visiblePosts.length > 0 ? (
              visiblePosts.map((post) => renderCard(post))
            ) : (
              <p>{t.Nopostsfoundforthisfilter}.</p>
            )}
          </div>

          <div className="flex flex-col mt-12 md:mt-20 space-y-5 sm:space-y-0 sm:space-x-3 sm:flex-row sm:justify-between sm:items-center">
            <Pagination />
            {visibleCount < filteredPosts.length && (
              <div className="flex justify-center mt-8">
                <ButtonPrimary
                  onClick={() => setVisibleCount(visibleCount + 5)}
                >
                  {t.Showmemore}
                </ButtonPrimary>
              </div>
            )}
          </div>
        </div>

        <div className="w-full space-y-7 mt-24 lg:mt-0 lg:w-2/5 lg:pl-10 xl:pl-0 xl:w-1/3">
          <WidgetTags tags={tags} onSelectTag={handleSelectTag}/>
          <WidgetCategories categories={categories} onSelectCategory={handleSelectCategory}/>
          <WidgetPosts posts={posts} />
        </div>
      </div>
    </div>
  );
};

export default SectionLatestPosts;
