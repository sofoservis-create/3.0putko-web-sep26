import mongoose from "mongoose";

// DAC7 (Slovak act 250/2022) requires an annual report to the Financial
// Administration by 31 January covering every host who earned through Putko.
// Penalties run 3 000 – 10 000 EUR and are repeatable.
//
// This aggregate is maintained continuously — one row per host per year, updated
// as payouts and refunds happen — rather than being computed at the deadline
// from data that may by then be incomplete.
const Dac7RecordSchema = new mongoose.Schema(
  {
    host: { type: mongoose.Schema.Types.ObjectId, ref: "Host", required: true, index: true },
    year: { type: Number, required: true, index: true },

    // Reportable totals, all integer cents.
    totalConsiderationCents: { type: Number, default: 0 },
    platformFeesCents: { type: Number, default: 0 },
    refundedCents: { type: Number, default: 0 },
    numberOfNights: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },

    // Identity snapshot, captured at reporting time so a later profile edit
    // cannot retroactively alter what was reported.
    hostName: { type: String },
    companyName: { type: String },
    ico: { type: String },
    dic: { type: String },
    icDph: { type: String },
    taxIdentificationNumber: { type: String },
    address: {
      street: String,
      city: String,
      zip: String,
      country: String,
    },
    iban: { type: String },
    // True when only Stripe's masked value (SK****1234) was available. Such a
    // row is not filable as it stands — the host has to supply the full number.
    ibanIsMasked: { type: Boolean, default: true },
    // Whether the number on file passed the ISO 7064 mod-97 checksum when the
    // host entered it. Entry no longer refuses an IBAN that fails, so a typo can
    // reach this record — and filing one is filing a wrong account identifier.
    // Defaults false so rows written before this field existed are re-checked
    // rather than assumed good.
    ibanVerified: { type: Boolean, default: false },
    propertyAddresses: [{ type: String }],

    // Which reservations are already counted — makes the aggregation idempotent
    // under webhook retries and payout re-runs.
    countedReservations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reservation" }],

    lastAggregatedAt: { type: Date, default: Date.now },
    exportedAt: { type: Date },
  },
  { timestamps: true }
);

Dac7RecordSchema.index({ host: 1, year: 1 }, { unique: true });

const Dac7Record = mongoose.model("Dac7Record", Dac7RecordSchema);

export default Dac7Record;
