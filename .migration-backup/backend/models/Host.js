import mongoose from 'mongoose';
import { missingBillingFieldsOf } from '../utils/hostBilling.js';
import { listPayoutAccounts, isAccountPayoutReady } from '../utils/payoutAccounts.js';

const HostSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  lastName: {
    type: String,
    required: false,
  },
  phone: { type: String }, // Changed from Number to String
  photo: { type: String },
  role: {
    type: String,
    enum: ["host", "admin"],
    default: "host",
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    default: "other",
  },
  dateOfBirth: {
    type: Date,
    required: false,
  },
  username: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: false,
  },
  aboutYou: {
    type: String,
    required: false,
  },
  languag: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: false
  },
  overallrating: {
    type: String,
    required: false
  },
  planName: {
    type: String,
    required: false
  },
  websiteInformation: {
    type: String,
    required: false
  },
  noteOnFilling: {
    type: String,
    required: false
  },
  companyName: {
    type: String,
    required: false
  },
  // A private individual has no IČO/DIČ but still needs an invoice name/address.
  billingSubjectType: { type: String, enum: ["business", "individual"], default: "business" },
  streetNumber: {
    type: String,
    required: false
  },
  city: {
    type: String,
    required: false
  },
  zipcode: {
    type: String,
    required: false
  },
  country: {
    type: String,
    required: false
  },
  idNumber: {
    type: String,
    required: false
  },
  tin: {
    type: String,
    required: false
  },
  vatNumber: {
    type: String,
    required: false
  },
  notifyUpcomingCheckin: {
  type: Boolean,
  default: false,
  },
  notifyUpcomingCheckout: {
    type: Boolean,
    default: false,
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Accommodation',
}],
// Reset Password Fields
// The host's DEFAULT connected account. Kept as the single source it always
// was, so every existing caller and every existing host document keeps working.
// A listing that names no account of its own pays out here.
stripeAccountId: { type: String },     // acct_...

/**
 * Every connected account this host holds.
 *
 * A host may run one account across all their properties, or a separate one per
 * property — an owner with an apartment in their own name and a chalet under a
 * company genuinely needs both, and the money has to land in the right place.
 * The listing picks which (Accommodation.payoutStripeAccountId).
 *
 * Capability state is mirrored per account rather than per host, because with
 * several accounts a single host-level `payoutsEnabled` cannot say which one is
 * ready. The top-level fields above remain, mirroring whichever account is the
 * default, so nothing that reads them has to change at once.
 */
stripeAccounts: [{
  accountId: { type: String, required: true },
  // Host-supplied, e.g. "Osobný účet" / "s.r.o." — Stripe has no such concept,
  // and "acct_1Nv…" is not something a host can choose between.
  label: { type: String, trim: true },
  chargesEnabled: { type: Boolean, default: false },
  payoutsEnabled: { type: Boolean, default: false },
  // Whether Stripe will accept a transfer to this account. THIS is the
  // capability Putko actually uses — the platform charges the guest and moves
  // the host's share with transfers.create — and it is what readiness is judged
  // on. `chargesEnabled` is kept alongside it for display and for accounts
  // connected before `card_payments` was dropped, but is no longer a gate; see
  // utils/stripeHelpers.js -> connectedAccountCreateParams.
  transfersActive: { type: Boolean },
  requirementsDue: [{ type: String }],
  // The rest of what Stripe says about this account. Storing only
  // `currently_due` meant a RESTRICTED account was indistinguishable from one
  // quietly verifying: same empty list, same "Verifying" badge, and no way for
  // the host to learn what had gone wrong.
  pastDue: [{ type: String }],
  pendingVerification: [{ type: String }],
  eventuallyDue: [{ type: String }],
  disabledReason: { type: String },
  requirementErrors: [{
    _id: false,
    requirement: { type: String },
    code: { type: String },
    reason: { type: String },
  }],
  currentDeadline: { type: Date },
  futureDue: [{ type: String }],
  futureDeadline: { type: Date },
  // Derived in describeAccountState(): active | pending | verifying | restricted
  payoutState: {
    type: String,
    enum: ["active", "pending", "verifying", "restricted"],
  },
  statusUpdatedAt: { type: Date },
  connectedAt: { type: Date, default: Date.now },
  // Masked payout destination as Stripe reports it, for the host to tell two
  // accounts apart at a glance.
  payoutIban: { type: String },
}],
// Connected account ids this host previously held that the platform key can no
// longer reach — almost always because the platform's Stripe account or API key
// changed, leaving the old acct_... behind on a different platform. Kept rather
// than discarded: if one ever turns out to hold a balance, this is the only
// record that it was ever ours.
stripeAccountIdHistory: [{
  accountId: { type: String },
  discardedAt: { type: Date },
  reason: { type: String },
}],
payoutsEnabled: { type: Boolean, default: false },
// Refreshed from the account.updated webhook and from accounts.retrieve on
// return from onboarding — the return_url alone is never trusted.
chargesEnabled: { type: Boolean, default: false },
// Mirrors the DEFAULT account's `transfersActive`. See the subdocument above
// for why this, and not `chargesEnabled`, is what readiness is judged on.
stripeTransfersActive: { type: Boolean },
onboardingComplete: { type: Boolean, default: false },
stripeRequirementsDue: [{ type: String }],
stripePastDue: [{ type: String }],
stripeDisabledReason: { type: String },
stripePayoutState: {
  type: String,
  enum: ["active", "pending", "verifying", "restricted"],
},
stripeStatusUpdatedAt: { type: Date },
// Masked payout account as Stripe reports it on the connected account —
// country + last four only (e.g. "SK****1234"). Stripe does not expose the full
// IBAN of a connected account's external account, so this alone cannot satisfy
// DAC7. Putko never touches these funds; Stripe pays the host directly.
payoutIban: { type: String },

// The full IBAN, supplied by the host.
//
// DAC7 (act 250/2022) requires the seller's financial account identifier in the
// annual filing, and the masked value above is not it. There is no way to derive
// this from Stripe, so it is collected from the host, validated, and used only
// for the filing.
payoutIbanFull: { type: String, select: false },
payoutIbanVerifiedAt: { type: Date },

// --- Slovak invoicing identity ---
// `idNumber` / `tin` / `vatNumber` above are legacy free-text fields with no
// defined mapping. These are the explicit, validated equivalents.
ico: { type: String },       // IČO — business ID
dic: { type: String },       // DIČ — tax ID
icDph: { type: String },     // IČ DPH — VAT ID (null when not VAT registered)
isVatPayer: { type: Boolean, default: false },
vatinParagraph: { type: String },
countryCode: { type: String, default: 'SK' },  // ISO 3166-1 alpha-2
// Local accommodation tax per person per night, set per obec. Informational —
// shown to guests, not collected by Putko.
localTaxPerPersonNight: { type: Number, default: 0 },
resetPasswordToken: { type: String },
resetPasswordExpires: { type: Date },
isVerified: { type: Boolean, default: false },
}, { timestamps: true });

// Fields required before Putko can raise a compliant Slovak invoice for its fee.
// The rule itself lives in utils/hostBilling.js so the booking gate — which sees
// lean objects with no schema methods — applies exactly the same definition.
HostSchema.methods.missingBillingFields = function missingBillingFields() {
  return missingBillingFieldsOf(this);
};

HostSchema.methods.isBillingComplete = function isBillingComplete() {
  return this.missingBillingFields().length === 0;
};

/**
 * True once Stripe will accept a transfer to this host's default account.
 *
 * Judged on `transfers` + payouts, not charges: Putko charges the guest on the
 * platform account, so a host account never needs `card_payments` — and since
 * the platform stopped requesting it, `chargesEnabled` is false on every newly
 * connected account. The shared rule lives in utils/payoutAccounts.js so this
 * and the booking gate can never drift apart.
 */
HostSchema.methods.isStripeReady = function isStripeReady() {
  if (!this.stripeAccountId) return false;
  return isAccountPayoutReady(listPayoutAccounts(this).find((a) => a.isDefault));
};

const Host = mongoose.model('Host', HostSchema);

export default Host;
