import express from "express";
import { getAllReviews, createReview, getReviewsByAccommodation } from "../Controllers/ReviewController.js";

const router = express.Router({ mergeParams: true });

// Get all reviews
router.route("/").get(getAllReviews);
router.route("/:accommodationId").get(getReviewsByAccommodation);

// Create a review for a specific accommodation
router.route("/:accommodationId")
  .post(createReview); // Removed authentication middleware

export default router;
