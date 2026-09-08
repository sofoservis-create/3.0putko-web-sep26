import Badge from "../../Shared/Badge";
import React from "react";

const CategoryBadgeList = ({
  className = "flex flex-wrap space-x-2",
  itemClass = "",
  categories = "",
}) => {
  
  // Predefined list of colors blue, red,pink,gray,green,indigo,yellow,purple
  const color = [ "red", "green","pink","gray", "blue", "indigo", "yellow", "purple"];
  
  // Randomly pick a color from the list
  const getRandomColor = () => color[Math.floor(Math.random() * color.length)];
  return (
    <div
      className={`nc-CategoryBadgeList ${className}`}
      data-nc-id="CategoryBadgeList"
    >
      {categories ? (
        // Render a single badge
        <Badge
          className={itemClass}
          name={categories || "Unnamed"}
          href={categories.href || "#"}
          color={categories.color || getRandomColor()}
        />
      ) : (
        <div>No Categories Available</div>
      )}
    </div>
  );
};

export default CategoryBadgeList;
