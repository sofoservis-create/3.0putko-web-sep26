"use client";
import React, { useState } from "react";

const ReviewForm = ({ accommodationId }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    reviewText: "",
    overallRating: 0,
    pluses: "",
    cons: "",
    categoryRatings: {
      Location: 0,
      Communication: 0,
      Equipment: 0,
      Cleanliness: 0,
      ClientCare: 0,
      WiFi: 0,
      Activities: 0,
      PriceQuality: 0,
    },
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle category rating changes
  const handleCategoryChange = (category, value) => {
    setFormData({
      ...formData,
      categoryRatings: { ...formData.categoryRatings, [category]: value },
    });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reviews/${accommodationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("✅ Review submitted successfully!");
        setFormData({
          name: "",
          email: "",
          reviewText: "",
          overallRating: 0,
          pluses: "",
          cons: "",
          categoryRatings: {
            Location: 0,
            Communication: 0,
            Equipment: 0,
            Cleanliness: 0,
            ClientCare: 0,
            WiFi: 0,
            Activities: 0,
            PriceQuality: 0,
          },
        });
      } else {
        setErrorMsg(data.message || "Something went wrong.");
      }
    } catch (err) {
      setErrorMsg("Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-10 px-4 bg-gray-50">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl p-8">
        <h2 className="text-3xl font-bold mb-6 text-green-800 text-center">
          Leave Your Review
        </h2>

        {/* Success & Error Messages */}
        {successMsg && (
          <p className="text-green-700 mb-4 text-center font-medium">
            {successMsg}
          </p>
        )}
        {errorMsg && (
          <p className="text-red-600 mb-4 text-center font-medium">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-green-600 focus:outline-none"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-green-600 focus:outline-none"
              required
            />
          </div>

          {/* Overall Rating */}
          <div>
            <label className="block mb-3 text-lg font-semibold text-gray-800">
              Overall Rating
            </label>
            <div className="flex space-x-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() =>
                    setFormData({ ...formData, overallRating: star })
                  }
                  className={`text-3xl transition ${
                    formData.overallRating >= star
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Category Ratings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Rate by Category
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Object.keys(formData.categoryRatings).map((category) => (
                <div key={category} className="flex flex-col">
                  <span className="mb-2 text-gray-700">{category}</span>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => handleCategoryChange(category, star)}
                        className={`text-2xl transition ${
                          formData.categoryRatings[category] >= star
                            ? "text-green-600"
                            : "text-gray-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <textarea
              name="reviewText"
              placeholder="Write your review..."
              value={formData.reviewText}
              onChange={handleChange}
              rows="4"
              className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-green-600 focus:outline-none"
              required
            />
          </div>

          {/* Pluses & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <textarea
              name="pluses"
              placeholder="Pluses (What did you like?)"
              value={formData.pluses}
              onChange={handleChange}
              rows="2"
              className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
            <textarea
              name="cons"
              placeholder="Cons (What can be improved?)"
              value={formData.cons}
              onChange={handleChange}
              rows="2"
              className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-green-800 text-white font-semibold hover:bg-green-700 transition-all disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ✅ Page Component (dynamic route)
export default function Page({ params }) {
  const { id } = params;

  if (!id) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 text-lg">
          ❌ Invalid review link. Accommodation ID missing.
        </p>
      </div>
    );
  }

  return <ReviewForm accommodationId={id} />;
}
