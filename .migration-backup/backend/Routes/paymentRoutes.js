// Routes/paymentRoutes.js
import express from "express";
import { cancelPayment, createCheckoutSession, createHostExpressAccount, releasePayoutToHost, verifyPayment, sendPaymentEmail, refreshHostStripeStatus, getFeePreview, listHostStripeAccounts, connectAdditionalStripeAccount, createStripeAccountLink, setDefaultStripeAccount } from "../Controllers/PaymentController.js";
import { requireHostSelf, requireReservationAccess } from "../auth/authorize.js";

const router = express.Router();

// checkout session — the guest paying for their own booking (proved by the
// reservation's capability token), or the owning host / an admin.
router.post(
  "/create-checkout-session",
  requireReservationAccess({ source: "body", param: "reservationId" }),
  createCheckoutSession
);

// fee split for a given amount. Deliberately public: it is a pure function of a
// number and exposes nothing about any booking, and hosts need it before they
// have an account.
router.get("/fee-preview", getFeePreview);

// host onboarding — the host themselves, or an admin. Previously any hostId.
router.post(
  "/host/create-express-account",
  requireHostSelf({ param: "hostId", source: "body" }),
  createHostExpressAccount
);

// Every connected account this host holds, for the "use an existing account"
// dropdown. Host-self or admin: an acct_ id is not public.
router.get(
  "/host/:hostId/stripe-accounts",
  requireHostSelf({ param: "hostId", source: "params" }),
  listHostStripeAccounts
);

// Connect an ADDITIONAL account alongside the ones the host already has, for a
// property that pays out somewhere different. create-express-account above
// deliberately reuses the existing account; this one deliberately does not.
router.post(
  "/host/connect-account",
  requireHostSelf({ param: "hostId", source: "body" }),
  connectAdditionalStripeAccount
);

// A fresh onboarding link for ONE named account. create-express-account above
// can only ever reopen the DEFAULT account, which left a host whose second
// account needed a document with nowhere to go.
router.post(
  "/host/account-link",
  requireHostSelf({ param: "hostId", source: "body" }),
  createStripeAccountLink
);

// Which account listings fall back to when they name none. Moves real money, so
// host-self or admin only.
router.post(
  "/host/default-account",
  requireHostSelf({ param: "hostId", source: "body" }),
  setDefaultStripeAccount
);

// verify onboarding against the Stripe API (never trust the return_url alone)
router.post(
  "/host/refresh-status",
  requireHostSelf({ param: "hostId", source: "body" }),
  refreshHostStripeStatus
);

// release payout — the host withdrawing their own earnings, or an admin.
// The daily sweep is the normal path; this is the manual "Withdraw" button.
// Never the guest, and never anonymously: this moves real money.
router.post(
  "/release-payout",
  requireReservationAccess({
    source: "body",
    param: "reservationId",
    allow: ["host", "admin"],
  }),
  releasePayoutToHost
);

// verify payment / reconcile from the success page. Authorised by possession of
// the Stripe session id, which only completing that checkout yields; it reads
// state from Stripe and never accepts an amount from the client.
router.post("/verify-payment", verifyPayment);

// payment cancelled (user closed Stripe)
router.post(
  "/cancel",
  requireReservationAccess({ source: "body", param: "reservationId" }),
  cancelPayment
);

// Send a payment link by email — host or admin only
router.post(
  "/send-payment-email",
  requireReservationAccess({ source: "body", param: "reservationId", allow: ["host", "admin"] }),
  sendPaymentEmail
);

// webhook - IMPORTANT: raw body parser used in index.js before express.json OR include raw here
// router.post("/webhook", handleStripeWebhook);

export default router;
