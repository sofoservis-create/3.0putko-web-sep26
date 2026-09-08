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
// Update reservation route
router.put("/reservations/:id", updateReservation);
router.get("/deleted", getDeletedReservations); // Get deleted reservations
router.post("/restore/:id", restoreReservation); // Restore reservation
router.delete("/delete/:id", deleteReservationPermanently); // Permanently delete reservation
// GET: Get all reservations
router.get('/', getAllReservations);

// GET: Get a specific reservation by ID
router.get('/:id', getReservationById);

// PUT: Update a reservation
router.put('/name/:name', updateReservationByName);

// DELETE: Delete a reservation 
router.delete('/:id', deleteReservation);

// GET: Get reservations by name (new route)
router.get('/name/:name', getReservationByName);  // This is the new route

// Route to get reservations by accommodation provider
router.get('/provider/:providerId', getReservationByAccommodationProvider);

// New route for getting reservations by user ID
router.get('/user/:userId', getReservationsByUserId);

// Route to delete reservations by user ID
router.delete('/user/:userId', deleteReservationsByUserId); 

router.get("/check/:accommodationId/:providerId", checkReservationsForAccommodation);

export default router;
