// Routes/invoiceRoutes.js
import express from 'express';
import {
  createInvoice,
  getInvoiceById,
  getAllInvoices,
  getInvoicesByHost,
  generateInvoices,
  updateInvoice,
  deleteInvoice,
} from '../Controllers/InvoiceController.js';
import { requireAdmin, requireAuth, requireHostSelf } from '../auth/authorize.js';

const router = express.Router();

// Manual creation — corrections and pre-automation periods.
router.post('/invoices', requireAdmin, createInvoice);

// Run the monthly job on demand. Declared before the ':id' routes so it can
// never be read as a resource id.
//
// Admin-only. This was the one write route on this router with no guard, which
// was survivable only while INVOICE_DRY_RUN was on: with dry-run off it issues
// real Slovak tax documents against real hosts, and an unauthenticated caller
// could fire it repeatedly for any period they chose.
router.post('/invoices/generate', requireAdmin, generateInvoices);

// A host's own invoices — that host, or an admin.
router.get(
  '/invoices/host/:hostId',
  requireHostSelf({ param: 'hostId', source: 'params' }),
  getInvoicesByHost
);

// Full list, with totals — admin only.
router.get('/invoices', requireAdmin, getAllInvoices);

// One invoice. Ownership is checked in the controller, because either an admin
// or the invoiced host may read it.
router.get('/invoices/:id', requireAuth, getInvoiceById);

router.put('/invoices/:id', requireAdmin, updateInvoice);

router.delete('/invoices/:id', requireAdmin, deleteInvoice);

export default router;
