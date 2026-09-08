// Routes/cancellationRoutes.js
import express from "express";
import {
  previewCancellation,
  cancelReservation,
  getListingPolicy,
} from "../Controllers/CancellationController.js";
import { requireReservationAccess } from "../auth/authorize.js";

const router = express.Router();

// What the guest would be refunded if they cancelled right now (read-only).
router.get(
  "/cancellation/preview/:reservationId",
  requireReservationAccess({ param: "reservationId" }),
  previewCancellation
);

// The policy shown on a listing before booking. Public — a prospective guest
// must be able to read the terms before committing to them.
router.get("/cancellation/policy/:accommodationId", getListingPolicy);

// Cancel a booking and issue the refund the snapshot allows.
//
// Unauthenticated this was the worst hole in the system: anyone holding a
// reservation id could POST `cancelledBy: "host"` and force a full refund on
// someone else's booking. The actor is now taken from the verified identity,
// never from the request body.
router.post(
  "/cancellation/:reservationId",
  requireReservationAccess({ param: "reservationId" }),
  cancelReservation
);

export default router;
