import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Host",
      required: true,
      index: true,
    },

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    invoiceMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    invoiceYear: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    grossAmountCents: {
      type: Number,
      required: true,
    },

    netAmountCents: {
      type: Number,
      required: true,
    },

    vatAmountCents: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "eur",
      lowercase: true,
    },

    // Number of bookings included in this invoice
    billedBookings: {
      type: Number,
      default: 0,
    },

    // Reservation IDs included in this invoice
    reservations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reservation",
      },
    ],

    status: {
      type: String,
      enum: [
        "draft",
        "creating",
        "issued",
        "emailed",
        "paid",
        "failed",
      ],
      default: "draft",
    },

    dueDate: Date,

    invoiceNumber: String,

    externalInvoiceId: String,

    externalUrl: String,

    pdfUrl: String,

    failureReason: String,

    emailSentAt: Date,

    hostSnapshot: {
      name: String,
      lastName: String,
      companyName: String,
      email: String,
      streetNumber: String,
      city: String,
      zipcode: String,
      country: String,
      billingSubjectType: String,
      ico: String,
      dic: String,
      icDph: String,
    },

    superfakturaResponse: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

/**
 * Prevent duplicate invoices.
 *
 * One host can only have ONE invoice
 * for one month.
 */
InvoiceSchema.index(
  {
    host: 1,
    invoiceMonth: 1,
    invoiceYear: 1,
  },
  {
    unique: true,
  }
);

const Invoice = mongoose.model("Invoice", InvoiceSchema);

export default Invoice;
