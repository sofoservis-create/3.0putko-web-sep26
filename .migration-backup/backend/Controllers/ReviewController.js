import Review from "../models/Review.js";
import Accommodation from "../models/Accommodation.js";

// Get all reviews
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({});
    res.status(200).json({ success: true, message: "Successful", data: reviews });
  } catch (err) {
    res.status(404).json({ success: false, message: "Not found", error: err.message });
  }
};

// Get reviews by accommodationId
export const getReviewsByAccommodation = async (req, res) => {
  const { accommodationId } = req.params;
  try {
    const reviews = await Review.find({ accommodation: accommodationId });
    res.status(200).json({ success: true, message: "Successful", data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create a review (Guest or Auth not required)
export const createReview = async (req, res) => {
  const { overallRating, categoryRatings, reviewText, pluses, cons, name, email } = req.body;

  if (!req.body.accommodation) req.body.accommodation = req.params.accommodationId;

  // Validation
  if (!overallRating || overallRating < 1 || overallRating > 5) {
    return res
      .status(400)
      .json({ success: false, message: "Overall rating must be between 1 and 5." });
  }
  if (!reviewText) {
    return res.status(400).json({ success: false, message: "Review text is required." });
  }
  if (!name) {
    return res.status(400).json({ success: false, message: "Name is required." });
  }
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    const newReview = new Review({
      accommodation: req.body.accommodation,
      name,
      email,
      reviewText,
      pluses,
      cons,
      overallRating,
      categoryRatings: {
        Location: categoryRatings?.Location || 0,
        Communication: categoryRatings?.Communication || 0,
        Equipment: categoryRatings?.Equipment || 0,
        Cleanliness: categoryRatings?.Cleanliness || 0,
        ClientCare: categoryRatings?.ClientCare || 0,
        WiFi: categoryRatings?.WiFi || 0,
        Activities: categoryRatings?.Activities || 0,
        PriceQuality: categoryRatings?.PriceQuality || 0,
      },
    });

    const savedReview = await newReview.save();

    // Add review to Accommodation (make sure Accommodation has "reviews: [ObjectId]")
    await Accommodation.findByIdAndUpdate(req.body.accommodation, {
      $push: { reviews: savedReview._id },
    });

    res
      .status(200)
      .json({ success: true, message: "Review submitted successfully", data: savedReview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
