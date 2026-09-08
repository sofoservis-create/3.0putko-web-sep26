import mongoose from "mongoose";
import crypto from "crypto";

// Define the Reservation Schema
const reservationSchema = new mongoose.Schema({
  // Capability token for the guest who made this booking.
  //
  // Guests can book without an account, so there is no user id to authorise
  // them against — yet the booking must not be actionable by anyone who can
  // guess a reservation id (ObjectIds are timestamp-ordered, not secret).
  // This is issued at creation, returned once to the booking client, and
  // accepted in place of a bearer token for guest-level actions.
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(32).toString("hex"),
    select: false,
  },
  checkInDate: {
    type: Date,
    required: true,
  },
  checkOutDate: {
    type: Date,
    required: true,
  },
  numberOfPersons: {
    type: Number,
    required: true,
    default: 1,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: false,
  },
  // surname: {
  //   type: String,
  //   required: true,
  // },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
  phone: {
    type: String,
    required: true,
  },
  // agreeToTerms: {
  //   type: Boolean,
  //   required: true,
  // },
  // diet: {
  //   type: String,
  //   default: "", // Default value if not provided
  // },
  // withChildren: {
  //   type: Boolean,
  //   default: false,
  // },
  // withPet: {
  //   type: Boolean,
  //   default: false,
  // },
  // useVoucher: {
  //   type: Boolean,
  //   default: false,
  // },
  // issueInvoice: {
  //   type: Boolean,
  //   default: false,
  // },
  // userId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User', // Reference to the User model
  //   required: true // Ensure that every accommodation has a user associated with it
  // },
  accommodationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Accommodation', // Assuming you have an Accommodation model
  },
  accommodationProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Assuming you have an Accommodation model
  },
  isApproved: {
    type: String,
    enum: ["pending", "approved", "cancelled"],
    default: "pending",
  },
  reviewEmailSent: {
    type: Boolean,
    default: false,
  },

  // --- Request to book (transitional flow) ---
  //
  // 'instant' is the ordinary flow: the guest pays at checkout. 'request' is
  // used when the host has no usable payout account — nothing is charged, the
  // host is emailed, and a payment link is only issued once they approve.
  // See utils/requestToBook.js for why.
  bookingMode: {
    type: String,
    enum: ["instant", "request"],
    default: "instant",
    index: true,
  },
  // When an unanswered request lapses. Only set on bookingMode 'request'.
  requestExpiresAt: { type: Date },
  requestApprovedAt: { type: Date },
  requestDeclinedAt: { type: Date },
  requestExpiredAt: { type: Date },
  // The link mailed to the guest after approval, and when it stops working.
  paymentLinkUrl: { type: String },
  paymentLinkExpiresAt: { type: Date },
  // Guards the "request received" and "request expired" mails against a retry
  // or a second cron pass sending them twice.
  requestEmailSentAt: { type: Date },
  requestExpiryEmailSentAt: { type: Date },
  message: { type: String, default: "" },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid", "refunded", "partially_refunded", "failed"],
    default: "unpaid"
  },
  paymentIntentId: { type: String },
  // The Stripe charge behind the PaymentIntent.
  //
  // PaymentController.applyPaidCheckoutSession WRITES this on every settled
  // booking, but it was never declared here — so Mongoose's strict mode silently
  // discarded it on every save. The dispute handler then looks bookings up by
  // `{ chargeId: dispute.charge }`, a field that is therefore never present, and
  // `charge.dispute.created` could not be matched to a booking through that
  // branch at all.
  chargeId: { type: String, index: true },
  checkoutSessionId: { type: String },
  totalPriceCents: { type: Number },      // store cents
  // How the total was arrived at, recorded at booking time. The amount is
  // computed server-side from the listing (utils/pricing.js); this is the
  // audit trail for why it came to that figure.
  priceBreakdown: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined,
  },
  platformFeeCents: { type: Number },
  stripeFeeCents: { type: Number },
  hostAmountCents: { type: Number },
  // Was read from the document but never declared, so it was always undefined
  // and call sites fell back to differing hardcoded currencies.
  currency: { type: String, default: "eur", lowercase: true },
  payoutStatus: {
    type: String,
    enum: ["pending", "released", "failed"],
    default: "pending"
  },
  transferId: { type: String }, // store Stripe transfer ID
  language: { type: String, default: "sk" }, // User's preferred language

  // --- Guest age ---
  // Guests must be 18 (§ 9 Občianskeho zákonníka: a minor cannot validly enter
  // this contract). Nothing recorded or checked this before. One of the two is
  // set at booking time — see createReservation.
  guestDateOfBirth: { type: Date },
  guestConfirmedAdultAt: { type: Date },

  // --- Cancellation policy snapshot ---
  // Copied from the listing when the booking is created, and never re-read from
  // the listing afterwards. If the host edits the policy — or if the standard
  // policy definitions change — existing bookings keep the terms the guest
  // actually agreed to at payment time.
  cancellationPolicySnapshot: {
    type: String,
    enum: ["flexible", "standard", "strict", "custom"],
  },
  cancellationTiersSnapshot: {
    type: [
      {
        _id: false,
        hoursBefore: { type: Number, required: true },
        refundPercent: { type: Number, required: true },
      },
    ],
    default: undefined,
  },

  // --- Refunds ---
  refundId: { type: String },
  refundAmountCents: { type: Number, default: 0 },
  cancelledBy: { type: String, enum: ["guest", "host", "admin"] },
  cancellationReason: { type: String },

  // --- Disputes ---
  disputeStatus: { type: String },
  disputeId: { type: String },

  // --- Lifecycle timestamps (all UTC) ---
  paidAt: { type: Date },
  cancelledAt: { type: Date },
  transferredAt: { type: Date },
  // Set once the confirmation email + calendar update have run, so that a
  // webhook retry cannot re-send emails or re-book the calendar.
  finalizedAt: { type: Date },

  // --- Payout bookkeeping ---
  payoutAttempts: { type: Number, default: 0 },
  payoutLastError: { type: String },
  payoutLastAttemptAt: { type: Date },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/** Gross amount in cents, tolerating legacy rows that only have the float. */
reservationSchema.methods.grossCents = function grossCents() {
  return Math.round(
    Number(this.totalPriceCents) || Math.round((Number(this.totalPrice) || 0) * 100)
  );
};

// Create the Reservation model
const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
