import express from 'express';
import { authenticate, restrict } from '../auth/verifyToken.js';
import { identify, requireAdmin, requireAuth, requireListingOwner } from '../auth/authorize.js';
import {
  createAccommodation,
  getPublishReadiness,
  getAccommodations,
  getAccommodationById,
  updateAccommodation,
  deleteAccommodation,
  updateAccommodationByAccommodationId,
  getUserAccommodations,
  incrementViewCount,
  incrementClickCount,
  customerInterest,
  searchAccommodationsByCategorys,
  addToOccupancyCalendar,
  deleteOccupancyEntry,
  removeCalendarSync,
  saveCalendarSync,
  setListingPayoutAccount,
  removeCalendarSyncFeed,
  updateCalendarSyncStatus,
  searchAccommodationsByCategory,
  deleteAccommodationImages,
  generateICS,
  getDeletedAccommodations,
  restoreAccommodation,
  deletePermanently,
  getAccommodationBySlug,
  approveListing,
  fixCoordinatesForOne,
  getStripeEnabledAccommodations,
  getAllRecommendedAccommodations,
  getAccommodationCounts,
  getLatestAccommodations,
  getAccommodationSitemap,
  getListingStats
} from '../Controllers/AccommodationController.js';

const router = express.Router();

// Static routes should be placed before dynamic ones
router.get("/accommodation/approve-listing", requireAdmin, approveListing); // ✅ This must be before :id
router.get("/accommodation/stripe-enabled", getStripeEnabledAccommodations);
router.get('/accommodation/recommended', getAllRecommendedAccommodations);
// GET counts for all fixed cities
router.get("/accommodation/counts-by-city", getAccommodationCounts);
router.get("/accommodation/latest", getLatestAccommodations);
// ✅ NEW SITEMAP ROUTE
router.get("/accommodation/sitemap", getAccommodationSitemap);
// ✅ Listing stats (property count + review count + avg rating) — filter-aware
router.get("/accommodation/listing-stats", getListingStats);

// Search accommodations by category (this should be first)
router.get("/accommodations/searching", searchAccommodationsByCategory);
router.get("/accommodation/search", searchAccommodationsByCategorys);
// The token may travel as a path segment (what most channel managers accept in
// a subscription URL) or as ?token=. Either way it is required — see generateICS.
router.get("/accommodation/:id/calendar/:token.ics", generateICS);
router.get("/accommodation/:id/calendar.ics", generateICS);
router.post("/accommodation", requireAuth, createAccommodation);
// Whether a host may publish listings yet, and what is still missing.
router.get("/accommodation/publish-readiness/:hostId", getPublishReadiness);
router.get("/accommodation/deleted", requireAdmin, getDeletedAccommodations);  // Get deleted accommodations
router.get("/accommodation", getAccommodations);
router.put("/accommodation/restore/:id", requireAdmin, restoreAccommodation);  // Restore deleted accommodation
router.get("/accommodation/:id", getAccommodationById);
router.put("/accommodation/:id", requireListingOwner(), updateAccommodation);
router.get("/accommodation/slug/:slug", getAccommodationBySlug);
router.delete("/accommodation/deleted/:id", requireAdmin, deletePermanently);
router.delete("/:accommodationId/occupancy/:entryId", requireListingOwner({ param: "accommodationId" }), deleteOccupancyEntry);
router.get("/accommodation/user/:userId", getUserAccommodations);
router.put("/accommodation/:id/occupancyCalendar", requireListingOwner(), addToOccupancyCalendar);
router.put("/accommodation/updateOccupancyCalendar/:userId", requireAdmin, updateAccommodationByAccommodationId);
// Must sit before the plain /accommodation/:id delete so the sub-path wins.
// Which of the host's connected accounts this listing pays out to.
//
// `identify` rather than `authenticate`: it normalises guest / host / admin
// tokens into `req.auth` and — unlike the two-argument `authenticate` — does not
// reject an anonymous caller itself. The controller does the rejecting, because
// the question here is not "is anyone signed in" but "is this the host who owns
// this listing", which cannot be answered until the listing has been loaded.
//
// This route decides where a property's takings are sent and was previously
// open to anyone who knew a listing id.
router.put("/accommodation/:id/payout-account", identify, setListingPayoutAccount);

// Multi-feed calendar sync. The per-feed routes carry an extra path segment, so
// they cannot be shadowed by the "disconnect everything" route below them.
router.put("/accommodation/:id/calendar-sync", requireListingOwner(), saveCalendarSync);
router.put("/accommodation/:id/calendar-sync/:feedId/status", requireListingOwner(), updateCalendarSyncStatus);
router.delete("/accommodation/:id/calendar-sync/:feedId", requireListingOwner(), removeCalendarSyncFeed);
router.delete("/accommodation/:id/calendar-sync", requireListingOwner(), removeCalendarSync);
router.delete("/accommodation/:id", requireListingOwner(), deleteAccommodation);
router.delete("/accommodation/:id/images", requireListingOwner(), deleteAccommodationImages);
router.put("/accommodation/fix-coordinates/:id", requireListingOwner(), fixCoordinatesForOne);

// Routes for incrementing view and click counts
router.put('/accommodation/:id/view', incrementViewCount);
router.put('/accommodation/:id/click', incrementClickCount);
router.put('/accommodation/:id/interest', customerInterest);



export default router;
