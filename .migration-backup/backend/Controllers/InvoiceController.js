// Controllers/InvoiceController.js
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Host from '../models/Host.js';
import {
  generateInvoicesForPeriod,
  generateInvoicesForPreviousMonth,
  periodAnchor,
} from '../utils/invoiceJob.js';

const ISSUED_STATUSES = new Set(['issued', 'emailed', 'paid']);
const POST_ISSUE_EDITABLE = new Set(['status', 'pdfUrl', 'externalUrl', 'invoiceNumber', 'emailSentAt']);

const isAdmin = (req) => req.auth?.kind === 'admin';

const ownsInvoice = (req, invoice) =>
  req.auth?.kind === 'host' && String(invoice.host?._id || invoice.host) === req.auth.id;

/** Fields a host is allowed to see */
const hostView = (invoice) => ({
  _id: invoice._id,
  invoiceNumber: invoice.invoiceNumber,
  description: invoice.description,
  periodStart: invoice.periodStart,
  periodEnd: invoice.periodEnd,
  invoiceMonth: invoice.invoiceMonth,
  invoiceYear: invoice.invoiceYear,
  grossAmountCents: invoice.grossAmountCents,
  netAmountCents: invoice.netAmountCents,
  vatAmountCents: invoice.vatAmountCents,
  currency: invoice.currency,
  billedBookings: invoice.billedBookings,
  status: invoice.status,
  dueDate: invoice.dueDate,
  emailSentAt: invoice.emailSentAt,
  pdfUrl: invoice.pdfUrl || invoice.externalUrl || null,
  createdAt: invoice.createdAt,
});

// ── Create (admin only) ──────────────────────────────────────────────
export const createInvoice = async (req, res) => {
  try {
    const {
      host, periodStart, periodEnd, invoiceMonth, invoiceYear,
      description, grossAmountCents, netAmountCents, vatAmountCents,
      currency, billedBookings, dueDate, status,
    } = req.body;

    if (!host || !mongoose.Types.ObjectId.isValid(host)) {
      return res.status(400).json({ message: 'Valid host id is required' });
    }

    const existingHost = await Host.findById(host);
    if (!existingHost) {
      return res.status(404).json({ message: 'Host not found' });
    }

    const invoice = new Invoice({
      host,
      periodStart,
      periodEnd,
      invoiceMonth,
      invoiceYear,
      description,
      grossAmountCents,
      netAmountCents,
      vatAmountCents,
      currency,
      billedBookings,
      dueDate,
      status,
      hostSnapshot: {
        name: existingHost.name,
        lastName: existingHost.lastName,
        companyName: existingHost.companyName,
        email: existingHost.email,
        streetNumber: existingHost.streetNumber,
        city: existingHost.city,
        zipcode: existingHost.zipcode,
        country: existingHost.countryCode || existingHost.country,
        billingSubjectType: existingHost.billingSubjectType || 'business',
        ico: existingHost.ico || existingHost.idNumber,
        dic: existingHost.dic || existingHost.tin,
        icDph: existingHost.icDph || existingHost.vatNumber,
      },
    });

    await invoice.save();
    return res.status(201).json({ message: 'Invoice created successfully', invoice });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'An invoice already exists for this host and month' });
    }
    console.error('Error creating invoice:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Get one invoice (admin or owning host) ───────────────────────────
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid invoice id is required' });
    }

    const invoice = isAdmin(req)
      ? await Invoice.findById(id).populate('host').exec()
      : await Invoice.findById(id).exec();

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!isAdmin(req) && !ownsInvoice(req, invoice)) {
      return res.status(403).json({ message: 'You do not have access to this invoice' });
    }

    return res.status(200).json(isAdmin(req) ? invoice : hostView(invoice));
  } catch (error) {
    console.error('Error retrieving invoice:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── List all invoices (admin only) ───────────────────────────────────
export const getAllInvoices = async (req, res) => {
  try {
    const { status, year, month } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (year) filter.invoiceYear = Number(year);
    if (month) filter.invoiceMonth = Number(month);

    const invoices = await Invoice.find(filter)
      .populate('host', 'name lastName companyName email ico dic icDph')
      .sort({ invoiceYear: -1, invoiceMonth: -1, createdAt: -1 })
      .exec();

    const totals = invoices.reduce(
      (acc, i) => ({
        grossCents: acc.grossCents + (i.grossAmountCents || 0),
        netCents: acc.netCents + (i.netAmountCents || 0),
        vatCents: acc.vatCents + (i.vatAmountCents || 0),
      }),
      { grossCents: 0, netCents: 0, vatCents: 0 }
    );

    return res.status(200).json({ count: invoices.length, totals, invoices });
  } catch (error) {
    console.error('Error listing invoices:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── List invoices of one host (host or admin) ────────────────────────
export const getInvoicesByHost = async (req, res) => {
  try {
    const { hostId } = req.params;

    const host = await Host.findById(hostId);
    if (!host) {
      return res.status(404).json({ message: 'Host not found' });
    }

    const invoices = await Invoice.find({ host: hostId })
      .sort({ invoiceYear: -1, invoiceMonth: -1 })
      .exec();

    return res.status(200).json(isAdmin(req) ? invoices : invoices.map(hostView));
  } catch (error) {
    console.error('Error listing invoices for host:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Trigger monthly job (admin only) ─────────────────────────────────
export const generateInvoices = async (req, res) => {
  try {
    const { year, month } = req.body || {};
    const parsedYear = year ? Number(year) : undefined;
    const parsedMonth = month ? Number(month) : undefined;

    if ((parsedYear && !parsedMonth) || (parsedMonth && !parsedYear)) {
      return res.status(400).json({ message: 'Provide both year and month, or neither' });
    }
    if (parsedMonth && (parsedMonth < 1 || parsedMonth > 12)) {
      return res.status(400).json({ message: 'Month must be between 1 and 12' });
    }

    const result =
      parsedYear && parsedMonth
        ? await generateInvoicesForPeriod(periodAnchor(parsedYear, parsedMonth))
        : await generateInvoicesForPreviousMonth();

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error generating invoices:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Update (admin only) ──────────────────────────────────────────────
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid invoice id is required' });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Never allow changing the host
    delete updates.host;
    delete updates.hostSnapshot;

    // Issued invoices: only non-financial fields may change
    if (ISSUED_STATUSES.has(invoice.status)) {
      const blocked = Object.keys(updates).filter((key) => !POST_ISSUE_EDITABLE.has(key));
      if (blocked.length) {
        return res.status(409).json({
          message: 'This invoice has been issued. Amounts and period cannot be changed.',
          blockedFields: blocked,
        });
      }
    }

    Object.assign(invoice, updates);
    await invoice.save();

    return res.status(200).json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Delete (admin only, only draft/failed) ───────────────────────────
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid invoice id is required' });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (ISSUED_STATUSES.has(invoice.status)) {
      return res.status(409).json({
        message: 'An issued invoice cannot be deleted. Use a credit note instead.',
        status: invoice.status,
        invoiceNumber: invoice.invoiceNumber,
      });
    }

    await invoice.deleteOne();
    return res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
