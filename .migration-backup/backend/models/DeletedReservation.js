import mongoose from "mongoose";

// Define the Reservation Schema
const DeletedReservationSchema = new mongoose.Schema({
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
  message: { type: String, default: "" },

  // Mirrored from Reservation so a soft-deleted booking can be restored without
  // losing its payment trail or the cancellation terms the guest agreed to.
  paymentStatus: { type: String },
  paymentIntentId: { type: String },
  checkoutSessionId: { type: String },
  totalPriceCents: { type: Number },
  platformFeeCents: { type: Number },
  stripeFeeCents: { type: Number },
  hostAmountCents: { type: Number },
  currency: { type: String },
  payoutStatus: { type: String },
  transferId: { type: String },
  refundId: { type: String },
  refundAmountCents: { type: Number },
  cancelledBy: { type: String },
  cancellationReason: { type: String },
  cancellationPolicySnapshot: { type: String },
  cancellationTiersSnapshot: {
    type: [{ _id: false, hoursBefore: Number, refundPercent: Number }],
    default: undefined,
  },
  paidAt: { type: Date },
  cancelledAt: { type: Date },
  transferredAt: { type: Date },
  finalizedAt: { type: Date },
  language: { type: String },

  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: Date.now }
});

// Create the Reservation model
const DeletedReservation = mongoose.model('DeletedReservation', DeletedReservationSchema);

export default DeletedReservation;
