import express from 'express';
import {
  createReservation,
  getAllReservations,
  getReservationById,
  updateReservationByName,
  deleteReservation,
  getReservationByName,
  getReservationByAccommodationProvider,
  getReservationsByUserId,
  deleteReservationsByUserId,
  updateReservation,
  getDeletedReservations,
  restoreReservation,
  deleteReservationPermanently,
  checkReservationsForAccommodation,
  getStayQuote,
  approveBookingRequest,
  declineBookingRequest
} from '../Controllers/ReservationController.js';
import { authenticate } from '../auth/verifyToken.js';
import { requireAdmin, requireReservationAccess } from '../auth/authorize.js';

const router = express.Router();

// Request to book — the host answers.
// Authenticated: the caller must be the host the request belongs to, and the
// controller checks that against the token rather than anything in the body.
router.post('/:id/approve', authenticate, approveBookingRequest);
router.post('/:id/decline', authenticate, declineBookingRequest);

// The authoritative price for a stay. Declared before '/:id' so "quote" is not
// swallowed as a reservation id.
router.get('/quote/:accommodationId', getStayQuote);

// POST: Create a new reservation
router.post('/', createReservation);

// Every route below reads or writes somebody's booking: guest name, email,
// phone, dates, amounts, payment and payout state. All of them were open to the
// internet — `GET /` alone returned the entire reservation collection.
//
// Single-booking routes go through requireReservationAccess, which admits the
// owning host, the booking's guest, an admin, or the holder of the booking's own
// capability token, and nobody else. The bulk and by-name routes have no
// per-object owner to check against, so they are admin-only.
// Update reservation route
router.put("/reservations/:id", requireReservationAccess({ param: "id", allow: ["host", "admin"] }), updateReservation);
router.get("/deleted", requireAdmin, getDeletedReservations); // Get deleted reservations
router.post("/restore/:id", requireAdmin, restoreReservation); // Restore reservation
router.delete("/delete/:id", requireAdmin, deleteReservationPermanently); // Permanently delete reservation
// GET: Get all reservations
router.get('/', requireAdmin, getAllReservations);

// GET: Get a specific reservation by ID
router.get('/:id', requireReservationAccess({ param: "id" }), getReservationById);

// PUT: Update a reservation
router.put('/name/:name', requireAdmin, updateReservationByName);

// DELETE: Delete a reservation 
router.delete('/:id', requireReservationAccess({ param: "id", allow: ["host", "admin"] }), deleteReservation);

// GET: Get reservations by name (new route)
router.get('/name/:name', requireAdmin, getReservationByName);  // This is the new route

// Route to get reservations by accommodation provider
router.get('/provider/:providerId', authenticate, getReservationByAccommodationProvider);

// New route for getting reservations by user ID
router.get('/user/:userId', authenticate, getReservationsByUserId);

// Route to delete reservations by user ID
router.delete('/user/:userId', requireAdmin, deleteReservationsByUserId); 

router.get("/check/:accommodationId/:providerId", checkReservationsForAccommodation);

export default router;
