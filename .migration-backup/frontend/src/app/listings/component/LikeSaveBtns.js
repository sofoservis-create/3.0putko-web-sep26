import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { Heart } from "lucide-react";

const LikeSaveBtns = ({data, slug}) => {
  const [favorite, setFavorite] = useState([]);
  const { user } = useContext(AuthContext);
  const _id = data || "";

  // Fetching user favorites when user context is available
  useEffect(() => {
    if (user) {
      fetchMyFavorites(user._id);
    }
  }, [user]);

  const fetchMyFavorites = async (userId) => {
    if (!userId) {
      toast.error("You need to be logged in to view favorites.");
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/favorite/my-favorites?userId=${userId}`);
      const result = await response.json();
      if (response.ok) {
        setFavorite(result.favorites || []); // Ensure favorites is an array
        // console.log("Fetched Favorites:", result.favorites);
      } else {
        console.error(result.error);
        // toast.error(result.error || "Error fetching favorites.");
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Error fetching favorites: " + error.message);
    }
  };
 
  const toggleFavorite = async (_id) => {  // Updated to use _id
    if (!user) {
      toast.error("You need to be logged in to add favorites.");
      return;
    }

    const isFavorite = favorite.includes(_id);  // Using _id

    if (isFavorite) {
      toast.info("This accommodation is already in your favorites!");
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/favorite/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id,
          accommodationId: _id,  // Updated to use _id
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Added to favorites!");
        setFavorite([...favorite, _id]);  // Using _id
      } else {
        console.error(result.error);
        toast.error(result.error || "Error adding to favorites.");
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
      toast.error("Error adding to favorites: " + error.message);
    }
  };

  const removeFavorite = async (_id) => {  // Updated to use _id
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/favorite/remove/${_id}`, {  // Using _id
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user._id,
          accommodationId: _id,  // Updated to use _id
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Removed from favorites!");
        setFavorite(favorite.filter((id) => id !== _id));  // Using _id
      } else {
        console.error(result.error);
        toast.error(result.error || "Error removing from favorites.");
      }
    } catch (error) {
      console.error("Error updating favorite:", error);
      toast.error("Error removing from favorites: " + error.message);
    }
  };

  const handleToggleFavorite = (_id) => {  // Updated to use _id
    const isFavorite = favorite.includes(_id);  // Using _id
    if (isFavorite) {
      removeFavorite(_id);  // Using _id
    } else {
      toggleFavorite(_id);  // Using _id
    }
  };
  const handleShare = () => {
    const link = `${window.location.origin}/listings/${slug}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast.success("Link copied to clipboard!");
      })
      .catch((error) => {
        toast.error("Failed to copy the link: " + error.message);
      });
  };
  return (
    <div className="flow-root">
      <div className="flex text-neutral-700 text-sm -mx-3 -my-1.5">
        <span className="py-1.5 px-3 flex rounded-lg hover:bg-neutral-100 cursor-pointer" onClick={handleShare}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="hidden sm:block ml-2.5">Share</span>
        </span>
        <span className="flex px-3 py-1 cursor-pointer hover:bg-neutral-100">
        {favorite.includes(_id) ? ( // If the item is in favorites
          <Heart
            className="p-1 text-xl text-green-500 rounded-full sm:text-2xl"
            fill="#22c55e"        // ✅ Green fill (Tailwind's green-500)
            stroke="#22c55e"      // ✅ Matching stroke color
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(_id);
            }}
          />
        ) : (
          <Heart
            className="p-1 text-xl text-gray-700 sm:text-2xl hover:text-green-700 hover:border-green-800" // Gray heart visible on white screen
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(_id); // Toggle favorite
            }}
          />
        )}
        <span className="hidden sm:block ml-2.5 text-gray-700">Save</span> {/* Text visible on white screen */}
      </span>
      
      </div>
    </div>
  );
};

export default LikeSaveBtns;
