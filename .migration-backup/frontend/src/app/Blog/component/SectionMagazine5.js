import React from "react";
import Card12 from "./Card12";
import Card13 from "./Card13";

const SectionMagazine5 = ({ posts }) => {
  return (
    <div className="nc-SectionMagazine5">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
        {/* Render Card12 for the first post */}
        {posts[0] && <Card12 post={posts[0]} />}

        {/* Render Card13 for the rest of the posts */}
        <div className="grid gap-6 md:gap-8">
          {posts
            .filter((_, i) => i < 4 && i > 0)
            .map((item, index) => (
              <Card13 key={index} post={item} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SectionMagazine5;
