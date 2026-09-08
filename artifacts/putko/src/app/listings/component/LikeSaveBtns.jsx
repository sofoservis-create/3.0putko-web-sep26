import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { Heart } from "lucide-react";
import {
  addGuestFavorite,
  announceFavoritesChanged,
  getGuestFavorites,
  isTestGuestToken,
  removeGuestFavorite,
} from "../../utlis/guestAccountApi";

const LikeSaveBtns = ({data, slug}) => {
  const [favorite, setFavorite] = useState([]);
  const { user, role, token } = useContext(AuthContext);
  const usesSecureGuestFavorites = role === "guest" && isTestGuestToken(token);
  const _id = data || "";

  // Fetching user favorites when user context is available
  useEffect(() => {
    if (user) {
      if (usesSecureGuestFavorites) {
        getGuestFavorites()
          .then((result) => setFavorite(result.favorites || []))
          .catch(() => setFavorite([]));
      } else {
        fetchMyFavorites(user._id);
      }
    }
  }, [user, usesSecureGuestFavorites]);

  useEffect(() => {
    if (!usesSecureGuestFavorites) return undefined;
    const sync = (event) => setFavorite(event.detail || []);
    window.addEventListener("putko:favorites-changed", sync);
    return () => window.removeEventListener("putko:favorites-changed", sync);
  }, [usesSecureGuestFavorites]);

  const fetchMyFavorites = async (userId) => {
    if (!userId) {
      toast.error("You need to be logged in to view favorites.");
      return;
    }

    try {
      const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/favorite/my-favorites?userId=${userId}`);
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
      const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/favorite/add`, {
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
      const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/favorite/remove/${_id}`, {  // Using _id
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
    if (usesSecureGuestFavorites) {
      const request = favorite.includes(_id)
        ? removeGuestFavorite(_id)
        : addGuestFavorite(_id);
      request
        .then((result) => {
          setFavorite(result.favorites);
          announceFavoritesChanged(result.favorites);
          toast.success(
            favorite.includes(_id)
              ? "Odstránené z uložených"
              : "Uložené do obľúbených",
          );
        })
        .catch((error) => toast.error(error.message));
      return;
    }
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
      <div className="flex items-center text-neutral-700 text-sm -mx-2 -my-1">
        <button type="button" aria-label="Share listing" className="min-h-[44px] px-3 flex items-center justify-center rounded-lg hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#357965] focus:ring-offset-2 transition-colors" onClick={handleShare}>
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
          <span className="hidden sm:block ml-2.5 font-medium">Share</span>
        </button>
        <button type="button" aria-label={favorite.includes(_id) ? "Remove listing from saved" : "Save listing"} className="min-h-[44px] px-3 flex items-center justify-center rounded-lg hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#357965] focus:ring-offset-2 transition-colors" onClick={() => handleToggleFavorite(_id)}>
        {favorite.includes(_id) ? ( // If the item is in favorites
          <Heart
            className="w-5 h-5 text-green-500"
            fill="#22c55e"        // ✅ Green fill (Tailwind's green-500)
            stroke="#22c55e"      // ✅ Matching stroke color
          />
        ) : (
          <Heart
            className="w-5 h-5 text-neutral-700 hover:text-green-700" // Gray heart visible on white screen
          />
        )}
        <span className="hidden sm:block ml-2.5 font-medium">Save</span> {/* Text visible on white screen */}
        </button>
      
      </div>
    </div>
  );
};

export default LikeSaveBtns;
