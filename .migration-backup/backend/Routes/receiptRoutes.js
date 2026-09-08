// Routes/receiptRoutes.js
import express from "express";
import { downloadReceipt, requestHostInvoice } from "../Controllers/ReceiptController.js";
import { requireReservationAccess } from "../auth/authorize.js";

const router = express.Router();

// Payment receipt PDF for the guest — a receipt, not a tax invoice.
// Carries the guest's name, email and stay details, so it is never public.
router.get(
  "/receipts/:reservationId",
  requireReservationAccess({ param: "reservationId" }),
  downloadReceipt
);

// Ask the host for a proper invoice for the accommodation service.
router.post(
  "/receipts/:reservationId/request-invoice",
  requireReservationAccess({ param: "reservationId" }),
  requestHostInvoice
);

export default router;
