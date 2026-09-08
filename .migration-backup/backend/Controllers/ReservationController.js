import DeletedReservation from '../models/DeletedReservation.js';
import Reservation from '../models/Reservation.js';
import Accommodation from '../models/Accommodation.js';
import mongoose from 'mongoose';
import { finalizeReservation, buildCheckoutSession } from "./PaymentController.js";
import { getTransporter, MAIL_FROM } from "../utils/mailer.js";
import {
  brandShell,
  button,
  detailTable,
  esc,
  section,
  logoAttachments,
} from "../utils/emailLayout.js";
import { sendEvent } from "../utils/FacebookCAPI.js";
import { getTiersSnapshot, getPolicyNameSnapshot } from "../utils/cancellationPolicy.js";
import { calculateFees, DEFAULT_CURRENCY, PAYOUT_DELAY_HOURS } from "../config/payments.js";
import { quoteStay, priceMismatch, nightsBetween } from "../utils/pricing.js";
import { calendarDateUtc, businessMidnightUtc } from "../utils/timezone.js";
import Host from "../models/Host.js";
import { isHostBookingReady } from "../utils/listingGating.js";
import {
  bookingModeForHost,
  requestPurposeForHost,
  requestExpiryFrom,
  paymentLinkExpiryFrom,
  PAYMENT_LINK_HOURS,
} from "../utils/requestToBook.js";
import {
  sendHostBookingRequestEmail,
  sendGuestRequestReceivedEmail,
  sendGuestPaymentLinkEmail,
  sendGuestRequestClosedEmail,
} from "../utils/requestToBookEmails.js";
import { hostOnboardingGuidance } from "../utils/hostOnboardingSteps.js";



/**
 * GET /api/reservation/quote/:accommodationId?checkIn=&checkOut=&adults=&children=
 *
 * The authoritative price for a stay, straight from the listing. The browser
 * should display THIS rather than its own arithmetic — the booking will be
 * created at this figure regardless of what the client sends.
 */
export const getStayQuote = async (req, res) => {
  try {
    const { accommodationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(accommodationId)) {
      return res.status(400).json({ error: "Invalid accommodation ID" });
    }

    const listing = await Accommodation.findById(accommodationId).select(
      "pricePerNight pricePerPerson flexiblePrices petFeePerNight"
    );
    if (!listing) return res.status(404).json({ error: "Accommodation not found" });

    const quote = quoteStay(listing, {
      checkInDate: req.query.checkIn,
      checkOutDate: req.query.checkOut,
      adults: req.query.adults,
      children: req.query.children,
    });

    if (!quote.ok) {
      return res.status(400).json({ error: "Could not price this stay", reason: quote.error });
    }

    res.json({
      totalCents: quote.totalCents,
      total: quote.totalCents / 100,
      currency: DEFAULT_CURRENCY,
      breakdown: quote.breakdown,
    });
  } catch (err) {
    console.error("getStayQuote error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new reservation
export const createReservation = async (req, res) => {
  try {
    // The amount is NEVER taken from the request body. Whatever the client sent
    // is stripped here and recomputed from the listing below; without this a
    // guest could post totalPrice: 1 for a 500 EUR stay and every downstream
    // figure (fee, payout, refund, DAC7) would inherit the forged number.
    const { totalPrice: claimedPrice, totalPriceCents: claimedCents, ...safeBody } = req.body;
    const reservation = new Reservation(safeBody);

    // Check-in and check-out are calendar dates, not instants. A browser date
    // picker serialises the guest's LOCAL midnight, so a guest in Karachi (UTC+5)
    // picking 10 September sends 2026-09-09T19:00:00Z — which reads back as the
    // 9th anywhere west of them. Snapping to UTC midnight of the intended day
    // stores the date the guest actually chose, so every later reader agrees.
    reservation.checkInDate = calendarDateUtc(reservation.checkInDate);
    reservation.checkOutDate = calendarDateUtc(reservation.checkOutDate);

    if (!reservation.checkInDate || !reservation.checkOutDate) {
      return res.status(400).json({ error: "Valid check-in and check-out dates are required" });
    }

    // Guests must be 18. Nothing in this system asked, anywhere: not at
    // registration, not at checkout, not here. A minor was able to enter a
    // binding accommodation contract with a host, which under § 9 Občianskeho
    // zákonníka they cannot validly do — leaving the host with an unenforceable
    // booking and Putko having taken the money for it.
    //
    // A self-declared date of birth is the weakest form of this check, and it is
    // what a booking flow can reasonably ask for; it establishes that the guest
    // asserted they were of age, which is the point.
    const dob = req.body?.dateOfBirth;
    if (dob) {
      const born = calendarDateUtc(dob);
      const eighteenth = born && new Date(born);
      if (eighteenth) eighteenth.setUTCFullYear(eighteenth.getUTCFullYear() + 18);

      if (!eighteenth || eighteenth > new Date()) {
        return res.status(400).json({
          error: "Guests must be at least 18 years old to book",
          code: "under_age",
        });
      }
      reservation.guestDateOfBirth = born;
    } else if (String(process.env.REQUIRE_GUEST_AGE_CONFIRMATION || "true") === "true") {
      // No date of birth supplied: fall back to an explicit confirmation, so the
      // guest has at least been asked. Turn the flag off only while the booking
      // form is being updated to collect it.
      if (req.body?.confirmedAdult !== true) {
        return res.status(400).json({
          error: "Please confirm you are at least 18 years old",
          code: "age_confirmation_required",
        });
      }
      reservation.guestConfirmedAdultAt = new Date();
    }

    // Freeze the cancellation terms and the money figures at booking time.
    // The guest is agreeing to THESE terms; a later edit to the listing (or to
    // the standard policy definitions) must not change this booking.
    // `payoutStripeAccountId` is not part of the policy snapshot — it is here so
    // the request-to-book email can describe the account THIS listing pays into.
    // Without it every multi-account host would be told about their default.
    const listing = await Accommodation.findById(reservation.accommodationId).select(
      "name cancellationPolicyType customPolicyTiers pricePerNight pricePerPerson flexiblePrices petFeePerNight payoutStripeAccountId person nightMin nightMax"
    );
    if (!listing) {
      return res.status(404).json({ error: "Accommodation not found" });
    }

    // WHO the booking belongs to comes from the listing, not from the request.
    //
    // `accommodationProvider` arrived in the body and was stored as-is. A crafted
    // booking naming someone else's host id had that host emailed the guest's
    // name, email address, dates and price — a PII disclosure to an attacker's
    // own host account — and left the booking permanently unpayable, because
    // resolveHostForReservation refuses when the provider and the listing owner
    // disagree.
    const listingOwner = await Accommodation.findById(reservation.accommodationId).select("userId");
    if (listingOwner?.userId) {
      reservation.accommodationProvider = listingOwner.userId;
    }

    reservation.cancellationPolicySnapshot = getPolicyNameSnapshot(listing);
    reservation.cancellationTiersSnapshot = getTiersSnapshot(listing);

    // --- Party size ---
    //
    // The price was computed from `guests.adults` / `guests.children` in the
    // body while `numberOfPersons` — the count the booking is actually made for,
    // and the one the host is shown — came from a different body field that was
    // never reconciled with it. On a listing priced per person, posting
    // `numberOfPersons: 8` with `guests: { adults: 1 }` produced a confirmed
    // eight-person booking charged for one. The client picks the number of
    // guests; it does not get to pick the number the price is computed from.
    const requestedAdults = Number(req.body?.guests?.adults ?? req.body?.adults ?? 0);
    const requestedChildren = Number(req.body?.guests?.children ?? req.body?.children ?? 0);
    const requestedInfants = Number(req.body?.guests?.infants ?? req.body?.infants ?? 0);

    const declaredParty = requestedAdults + requestedChildren + requestedInfants;
    // Whichever count is HIGHER is the one the stay is priced and validated on,
    // so neither field can be used to understate the party.
    const partySize = Math.max(declaredParty, Number(reservation.numberOfPersons) || 0);
    if (partySize < 1) {
      return res.status(400).json({ error: "At least one guest is required" });
    }
    reservation.numberOfPersons = partySize;

    // Occupancy. Nothing checked this, so a listing sleeping 4 could be booked
    // for 12 — and on a per-person listing the guest was charged for 12 while
    // the host discovered the problem on arrival day.
    if (listing.person && partySize > listing.person) {
      return res.status(400).json({
        error: `This property sleeps ${listing.person}`,
        code: "over_capacity",
      });
    }

    // Minimum / maximum stay. Enforced only in the browser until now, so a
    // direct POST ignored both.
    const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
    if (listing.nightMin && nights < listing.nightMin) {
      return res.status(400).json({
        error: `Minimum stay is ${listing.nightMin} night(s)`,
        code: "below_min_nights",
      });
    }
    if (listing.nightMax && nights > listing.nightMax) {
      return res.status(400).json({
        error: `Maximum stay is ${listing.nightMax} night(s)`,
        code: "above_max_nights",
      });
    }

    // --- Authoritative price, computed from the listing ---
    //
    // Infants are excluded from the per-person rate (matching the checkout
    // page), but they still count towards occupancy above.
    const payingAdults = Math.max(
      1,
      partySize - requestedInfants > 0 ? partySize - requestedInfants : partySize
    );
    const quote = quoteStay(listing, {
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      adults: payingAdults,
      children: 0,
    });

    if (!quote.ok) {
      return res.status(400).json({ error: "Could not price this stay", reason: quote.error });
    }

    const mismatch = priceMismatch(
      claimedCents ?? Math.round((Number(claimedPrice) || 0) * 100),
      quote.totalCents
    );
    if (mismatch) {
      // Not fatal: the server figure is correct by construction, so the booking
      // proceeds at the listing's real price. It is logged loudly because it
      // means either a tampered request or a genuine frontend/backend drift.
      console.warn(
        `[pricing] reservation quote mismatch on listing ${listing._id}: ` +
          `client ${mismatch.claimedCents}c vs server ${mismatch.serverCents}c ` +
          `(${mismatch.direction})`
      );
    }

    reservation.totalPriceCents = quote.totalCents;
    reservation.totalPrice = quote.totalCents / 100;
    reservation.priceBreakdown = quote.breakdown;
    if (!reservation.currency) reservation.currency = DEFAULT_CURRENCY;

    // Expected split, so the host can see what they will receive before payment.
    const { platformFeeCents, hostPayoutCents } = calculateFees(reservation.totalPriceCents);
    reservation.platformFeeCents = platformFeeCents;
    reservation.hostAmountCents = hostPayoutCents;

    // --- Instant booking, or a request? ---
    //
    // Decided by REQUEST_TO_BOOK_MODE (see utils/requestToBook.js). On
    // `unonboarded` that is every listing, whatever its status; on `published`
    // only listings whose host can already be paid, so they can vet the guest.
    //
    // Either way a request charges nothing here, creates no Stripe session, and
    // leaves the dates on the market until the host approves and the guest
    // actually pays.
    const host = await Host.findById(reservation.accommodationProvider).catch(() => null);
    reservation.bookingMode = bookingModeForHost(host);

    if (reservation.bookingMode === "request") {
      reservation.requestExpiresAt = requestExpiryFrom();
      reservation.isApproved = "pending";
      reservation.paymentStatus = "unpaid";
    }

    const savedReservation = await reservation.save();

    if (savedReservation.bookingMode === "request") {
      // Both mails are fire-and-forget. The request is already recorded, and
      // losing it because SMTP blinked would be far worse than a missing email
      // the host can still see in their dashboard.
      const hostEmail = host?.email;
      if (hostEmail) {
        sendHostBookingRequestEmail({
          to: hostEmail,
          reservation: savedReservation,
          listingName: listing?.name,
          hostName: host?.name,
          // Which of the two purposes this request serves — an un-onboarded
          // host is being persuaded to connect an account, an onboarded one is
          // simply vetting the guest. Decides the wording, not the flow.
          needsOnboarding: requestPurposeForHost(host) === "onboarding",
          // ...and, for the first of those, exactly what is still outstanding.
          // Computed against THIS listing, so a host holding several payout
          // accounts is told about the one this booking would pay into.
          onboarding: hostOnboardingGuidance(host, listing),
        }).then((sent) => {
          if (sent) {
            Reservation.updateOne(
              { _id: savedReservation._id },
              { $set: { requestEmailSentAt: new Date() } }
            ).catch(() => {});
          }
        });
      } else {
        console.error(
          `[request-to-book] no email on host ${reservation.accommodationProvider} — ` +
            `request ${savedReservation._id} cannot be delivered`
        );
      }

      sendGuestRequestReceivedEmail({
        to: savedReservation.email,
        reservation: savedReservation,
        listingName: listing?.name,
      });
    }

    // Facebook CAPI - InitiateCheckout
    const { fbp, fbc } = req.body;
    try {
        const eventData = {
            eventName: 'InitiateCheckout',
            productId: savedReservation._id.toString(),
            quantity: 1,
            currency: savedReservation.currency || 'eur',
            value: savedReservation.totalPrice || 0,
            contentName: 'Reservation',
            eventSourceUrl: req.headers.referer || req.headers.origin || '', 
        };

        const listItems = [
             {
                id: savedReservation.accommodationId.toString(),
                quantity: 1,
                delivery_category: 'home_delivery' // or 'in_store' or whatever fits
             }
        ];
        
        // We can pass more user data if available
        const userPayload = {
            email: savedReservation.email,
            clientIp: req.ip || req.connection.remoteAddress,
            clientUserAgent: req.headers['user-agent'],
            fbp: fbp,
            fbc: fbc
        };

        sendEvent('InitiateCheckout', eventData, userPayload); // async, don't await to not block response
    } catch (e) {
        console.error("FB CAPI Error (InitiateCheckout):", e);
    }

    // The capability token is returned exactly once, here. It is the only proof
    // an anonymous guest has that this booking is theirs, so the client must
    // keep it for checkout, receipt download and cancellation.
    res.status(201).json({
      ...savedReservation.toObject(),
      accessToken: savedReservation.accessToken,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all reservations
export const getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find();
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all deleted reservations
export const getDeletedReservations = async (req, res) => {
  try {
    const reservations = await DeletedReservation.find();
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Permanently delete a reservation
export const deleteReservationPermanently = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRes = await DeletedReservation.findByIdAndDelete(id);

    if (!deletedRes) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.status(200).json({ message: "Reservation permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const restoreReservation = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the deleted reservation
    const deletedReservation = await DeletedReservation.findById(id);
    if (!deletedReservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Move back to Reservations collection
    const restoredReservation = new Reservation({
      ...deletedReservation.toObject(),
      createdAt: deletedReservation.createdAt, // Keep original creation date
    });

    await restoredReservation.save(); // Save the restored reservation
    await DeletedReservation.findByIdAndDelete(id); // Remove from deleted collection

    res.status(200).json({ message: "Reservation restored successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single reservation by ID
export const getReservationById = async (req, res) => {
    try {
      let { id } = req.params;
      
      // Log the received id for debugging
    //   console.log("Received ID:", id);
  
      // Remove any leading/trailing characters like curly braces
      id = id.replace(/[^a-fA-F0-9]/g, ''); // This strips out anything that isn't a valid hex character
      
      // Validate if the cleaned id is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid reservation ID' });
      }
  
      // `userId` is NOT on the reservation schema — it is commented out in
      // models/Reservation.js, because a guest books without an account. Asking
      // Mongoose to populate it throws StrictPopulateError (strictPopulate has
      // defaulted to true since Mongoose 6), so this endpoint answered 500 to
      // every request. The guest-facing "request sent" page reads it, and a 500
      // there is indistinguishable from a missing booking: it told guests their
      // request could not be found moments after it was created.
      const reservation = await Reservation.findById(id).populate('accommodationId');
      
      if (!reservation) {
        return res.status(404).json({ message: 'Reservation not found' });
      }
  
      res.status(200).json(reservation);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

// Update a reservation
export const updateReservationByName = async (req, res) => {
  try {
    const { name } = req.params; // Extract reservation name from URL parameters
    // Same allowlist as updateReservation — this route reached the same document
    // with the same unrestricted body.
    const updates = Object.fromEntries(
      Object.entries(req.body || {}).filter(([key]) => RESERVATION_UPDATABLE_FIELDS.has(key))
    );

    // The path segment was interpolated straight into a regular expression, so
    // `/name/.*` matched every booking and updated whichever came back first,
    // and a crafted pattern is a CPU-exhaustion primitive. Escaped and anchored.
    const nameLiteral = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find the reservation by name (case-insensitive exact match) and update it
    const updatedReservation = await Reservation.findOneAndUpdate(
      { name: { $regex: `^${nameLiteral}$`, $options: 'i' } },
      { $set: updates }, // Apply updates to the fields
      { new: true, runValidators: true } // Return the updated document and run validators
    )
    .populate('accommodationId') // Populate accommodationId if needed
    .select('-userId'); // Exclude userId from results

    // If reservation not found
    if (!updatedReservation) {
      return res.status(404).json({ message: `No reservation found for the name "${name}"` });
    }

    res.status(200).json(updatedReservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Delete a reservation
export const deleteReservation = async (req, res) => {
  try {
    const deletedReservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!deletedReservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.status(200).json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get reservations by name
export const getReservationByName = async (req, res) => {
  try {
    const { name } = req.params;

    // Escaped and anchored: unescaped, `/name/.*` returned the whole collection
    // and a crafted pattern burned CPU on every document.
    const nameLiteral = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find reservations where the name matches (case-insensitive exact match)
    const reservations = await Reservation.find({
      name: { $regex: `^${nameLiteral}$`, $options: 'i' }
    })
    .populate('accommodationId') // Populate accommodationId as needed
    .select('-userId'); // Exclude userId field from results

    if (!reservations.length) {
      return res.status(404).json({ message: 'No reservations found for the given name' });
    }

    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get reservations by accommodation provider ID
export const getReservationByAccommodationProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    // Validate if the provided providerId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: 'Invalid accommodation provider ID' });
    }

    // A session is not authorisation. Without this, any signed-in account could
    // read every booking of any host by putting their id in the path — guest
    // names, emails, phone numbers, amounts and payout state.
    const callerId = String(req.userId || "");
    if (callerId !== String(providerId) && req.role !== "admin" && req.role !== "superadmin") {
      return res.status(403).json({ message: "Not your bookings" });
    }

    // Find reservations that match the accommodation provider ID
    const reservations = await Reservation.find({
      accommodationProvider: providerId
    }).populate('accommodationId').lean();

    if (!reservations.length) {
      return res.status(404).json({ message: 'No reservations found for the given accommodation provider' });
    }

    // When each booking's payout unlocks, decided HERE rather than in the
    // browser.
    //
    // The payouts page used to reconstruct this rule for itself, comparing the
    // browser's local midnight for the check-in date against a local midnight
    // "today". Two things drift out of that. The viewer's midnight is not
    // Europe/Bratislava's, so a host abroad got a window shifted by hours; and
    // flooring "now" to midnight makes the client coarse to the nearest day,
    // which agrees with the server only while PAYOUT_DELAY_HOURS happens to be a
    // multiple of 24. At any other value the host is shown a locked, disabled
    // Withdraw button for hours after the money became withdrawable — or, worse,
    // an enabled one before it did, which fails when pressed.
    //
    // `businessMidnightUtc` + PAYOUT_DELAY_HOURS is exactly what
    // `payoutReservation` enforces, so the button and the gate cannot disagree.
    const withPayoutTiming = reservations.map((r) => ({
      ...r,
      payoutUnlocksAt: new Date(
        businessMidnightUtc(r.checkInDate).getTime() + PAYOUT_DELAY_HOURS * 3600 * 1000
      ),
      payoutDelayHours: PAYOUT_DELAY_HOURS,
    }));

    res.status(200).json(withPayoutTiming);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get reservations by user ID
export const getReservationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate if the provided userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Same rule as the provider route above: the caller may only read their own.
    const callerId = String(req.userId || "");
    if (callerId !== String(userId) && req.role !== "admin" && req.role !== "superadmin") {
      return res.status(403).json({ message: "Not your bookings" });
    }

    // Find reservations that match the user ID.
    // Same StrictPopulateError as getReservationById above: `userId` is not on
    // the schema, so populating it threw and this endpoint answered 500 rather
    // than the list — or the 404 below when the guest genuinely had none.
    const reservations = await Reservation.find({ userId: userId }).populate('accommodationId');

    if (!reservations.length) {
      return res.status(404).json({ message: 'No reservations found for the given user' });
    }

    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete reservations by user ID
export const deleteReservationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate if the provided userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Delete all reservations that match the user ID
    const deletedReservations = await Reservation.deleteMany({ userId: userId });

    if (deletedReservations.deletedCount === 0) {
      return res.status(404).json({ message: 'No reservations found for the given user' });
    }

    res.status(200).json({ message: 'Reservations deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update Reservation Controller
// Fields a caller may set on an existing booking.
//
// `findByIdAndUpdate(id, req.body)` applied WHATEVER arrived. Every money field
// is on this schema, so a request could set `paymentStatus: "paid"` on an unpaid
// booking, rewrite `hostAmountCents` and `totalPriceCents`, clear `transferId`
// to make an already-paid-out booking eligible for a second transfer, or set
// `totalPriceCents: 0` and then approve it as a free stay — which blocks the
// calendar and mails a confirmation without a cent changing hands.
//
// Amounts, payment state, payout state and the policy snapshot are all set by
// the server from the listing and from Stripe, and are never accepted here.
const RESERVATION_UPDATABLE_FIELDS = new Set([
  "name",
  "username",
  "phone",
  "message",
  "language",
  "numberOfPersons",
  "isApproved",
  "cancellationReason",
]);

export const updateReservation = async (req, res) => {
  const { id } = req.params; // Reservation ID from the URL
  const updateData = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => RESERVATION_UPDATABLE_FIELDS.has(key))
  );
  const { language } = req.body; // Extract language if provided

  try {
    // Validate reservation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid reservation ID" });
    }

    // Find the reservation first to check current state
    let reservation = await Reservation.findById(id).populate('accommodationId');
    if (!reservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    // Update language if provided
    if (language) {
      reservation.language = language;
      await reservation.save();
    }

    // Check if we are approving the reservation and it's not already approved
    if (updateData.isApproved === "approved" && reservation.isApproved !== "approved") {
      // Check if total price is 0 (or very small)
      const amountCents = reservation.totalPriceCents || Math.round((reservation.totalPrice || 0) * 100);

      if (amountCents <= 0) {
        // Zero price: Skip payment, finalize immediately
        console.log(`Reservation ${id} has 0 price. Auto-confirming.`);

        // Update reservation status directly
        reservation.paymentStatus = "paid"; // Mark as paid/free
        reservation.isApproved = "approved";
        await reservation.save();

        // Trigger calendar block + confirmation email
        await finalizeReservation(reservation._id);

        return res.status(200).json({
          message: "Reservation approved and confirmed (Free stay)",
          reservation
        });
      }

      // Normal flow: Create Stripe Session.
      //
      // This used to hand-roll its own session with a second Stripe client. It
      // had drifted from the guest-facing path: card-only (no Apple/Google Pay),
      // no PaymentIntent metadata, no locale, no snapshot backfill and no audit
      // line. It now goes through the same builder as every other checkout.
      if (amountCents > 0) {
        try {
          const { session } = await buildCheckoutSession(reservation, {
            language: reservation.language,
          });

          // Save session ID to updates
          updateData.checkoutSessionId = session.id;
          updateData.paymentStatus = "unpaid"; // Ensure it's unpaid initially

          // 2. Send Email to Guest
          const transporter = getTransporter();

          const checkInDate = new Date(reservation.checkInDate).toLocaleDateString();
          const checkOutDate = new Date(reservation.checkOutDate).toLocaleDateString();

          const lang = reservation.language || 'sk'; // Default to Slovak

          const t = {
            en: {
              subject: "Your Reservation is Approved – Complete Payment",
              title: "Your Reservation is Approved!",
              greeting: "Dear",
              approvedMessage: `Good news! Your reservation for <strong>${reservation.accommodationId?.name || "Accommodation"}</strong> has been approved by the host.`,
              detailsHeader: "Reservation Details",
              checkIn: "Check-in",
              checkOut: "Check-out",
              guests: "Guests",
              totalAmount: "Total Amount",
              paymentInstruction: "To confirm your booking, please complete the payment by clicking the button below:",
              payButton: "Pay Now",
              fallbackLink: "If the button above doesn't work, copy and paste this link into your browser:"
            },
            sk: {
              subject: "Vaša rezervácia je schválená – Dokončite platbu",
              title: "Vaša rezervácia je schválená!",
              greeting: "Vážený/á",
              approvedMessage: `Dobrá správa! Vaša rezervácia pre <strong>${reservation.accommodationId?.name || "Ubytovanie"}</strong> bola schválená hostiteľom.`,
              detailsHeader: "Podrobnosti rezervácie",
              checkIn: "Príchod",
              checkOut: "Odchod",
              guests: "Hostia",
              totalAmount: "Celková suma",
              paymentInstruction: "Na potvrdenie vašej rezervácie prosím dokončite platbu kliknutím na tlačidlo nižšie:",
              payButton: "Zaplatiť teraz",
              fallbackLink: "Ak tlačidlo vyššie nefunguje, skopírujte a vložte tento odkaz do vášho prehliadača:"
            }
          };

          const text = t[lang] || t.sk;

          const mailOptions = {
            from: MAIL_FROM,
            to: reservation.email,
            subject: text.subject,
            attachments: logoAttachments(),
            html: brandShell({
              preheader: `${checkInDate} – ${checkOutDate} · €${(amountCents / 100).toFixed(2)}`,
              title: text.title,
              bodyHtml: `
                <p style="margin:0 0 14px 0;">${text.greeting} <strong>${esc(reservation.name)}</strong>,</p>
                <p style="margin:0 0 4px 0;">${text.approvedMessage}</p>
                ${section(
                  text.detailsHeader,
                  detailTable([
                    [text.checkIn, checkInDate],
                    [text.checkOut, checkOutDate],
                    [text.guests, String(reservation.numberOfPersons)],
                    [text.totalAmount, `€${(amountCents / 100).toFixed(2)}`],
                  ])
                )}
                <p style="margin:18px 0 0 0;">${text.paymentInstruction}</p>
                ${button(session.url, text.payButton)}
                <p style="margin:0;color:#6B7280;font-size:13px;word-break:break-all;">
                  ${text.fallbackLink}<br />${esc(session.url)}
                </p>`,
            }),
          };

          await transporter.sendMail(mailOptions);
          console.log(`Payment email sent to ${reservation.email}`);

        } catch (err) {
          console.error("Error generating Stripe session or sending email:", err);
          // We don't block the approval, but we should probably log it or alert
        }
      }
    }

    // Perform the update
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      updateData, // Fields to update
      { new: true, runValidators: true } // Return the updated document and validate data
    );

    // Check if the reservation exists
    if (!updatedReservation) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    // Respond with the updated reservation
    res.status(200).json({
      message: "Reservation updated successfully",
      reservation: updatedReservation,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({ error: error.message });
  }
};

/* ────────────────────────────────────────────────────────────────────────────
 * Request to book — host responds
 * ──────────────────────────────────────────────────────────────────────────── */

/** Load a request and confirm the caller is the host it belongs to. */
const loadRequestForHost = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid reservation id" });
    return null;
  }

  const reservation = await Reservation.findById(id);
  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return null;
  }

  // The host id must come from the verified token, never the body — otherwise
  // anyone could approve anyone else's request and mail out a payment link.
  const callerId = String(req.userId || req.user?._id || "");
  if (!callerId || callerId !== String(reservation.accommodationProvider)) {
    res.status(403).json({ error: "Not your reservation" });
    return null;
  }

  if (reservation.bookingMode !== "request") {
    res.status(409).json({
      error: "This booking was paid at checkout — there is nothing to approve.",
      code: "not_a_request",
    });
    return null;
  }

  return reservation;
};

/**
 * POST /api/reservation/:id/approve
 *
 * The host accepts. This is the moment the guest is asked for money, so it is
 * also the moment the host must genuinely be able to receive it — hence the
 * check below, which is about the host's live Stripe state rather than the
 * listing's published status. A listing can be PUBLISHED and its host's account
 * restricted an hour later, and there is no version of this flow where charging
 * a guest for a host with nowhere to be paid is acceptable.
 */
export const approveBookingRequest = async (req, res) => {
  try {
    const reservation = await loadRequestForHost(req, res);
    if (!reservation) return;

    if (reservation.isApproved === "cancelled") {
      return res.status(409).json({
        error: "This request has already been cancelled or has expired.",
        code: "request_closed",
      });
    }
    if (reservation.paymentStatus === "paid") {
      return res.status(409).json({ error: "Already paid", code: "already_paid" });
    }

    const host = await Host.findById(reservation.accommodationProvider);
    if (!isHostBookingReady(host)) {
      // 409, not 403: the host is who they say they are, they simply cannot be
      // paid yet. The client turns this into "connect your payout account".
      return res.status(409).json({
        error:
          "Connect a payout account before accepting — there would be nowhere to send the money.",
        code: "host_not_payout_ready",
      });
    }

    // Creating the session also holds the dates for this guest, which is what
    // makes "first one confirmed wins" true: further requests for the same
    // nights can no longer be approved while this link is live.
    let session;
    try {
      ({ session } = await buildCheckoutSession(reservation, {
        language: reservation.language,
        // The link is mailed, so it must outlive the browser session a normal
        // checkout assumes.
        expiresInHours: PAYMENT_LINK_HOURS,
      }));
    } catch (err) {
      if (err.code === "dates_unavailable") {
        return res.status(409).json({
          error: "Those dates have since been taken by a confirmed booking.",
          code: err.code,
          conflictDays: err.conflictDays || [],
        });
      }
      throw err;
    }

    reservation.isApproved = "approved";
    reservation.requestApprovedAt = new Date();
    reservation.paymentLinkUrl = session.url;
    reservation.paymentLinkExpiresAt = paymentLinkExpiryFrom();
    await reservation.save();

    const listing = await Accommodation.findById(reservation.accommodationId).select("name");

    await sendGuestPaymentLinkEmail({
      to: reservation.email,
      reservation,
      listingName: listing?.name,
      paymentUrl: session.url,
      expiresAt: reservation.paymentLinkExpiresAt,
    });

    res.status(200).json({
      message: "Request approved. The guest has been sent a payment link.",
      reservation,
      paymentUrl: session.url,
      paymentLinkExpiresAt: reservation.paymentLinkExpiresAt,
    });
  } catch (error) {
    console.error("approveBookingRequest error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/reservation/:id/decline
 *
 * The host says no. Nothing was ever charged, so there is no refund to make —
 * the request is simply closed and the guest is told, with somewhere to go next.
 */
export const declineBookingRequest = async (req, res) => {
  try {
    const reservation = await loadRequestForHost(req, res);
    if (!reservation) return;

    if (reservation.paymentStatus === "paid") {
      return res.status(409).json({
        error: "This booking is already paid — cancel it instead so the guest is refunded.",
        code: "already_paid",
      });
    }
    if (reservation.isApproved === "cancelled") {
      return res.status(200).json({ message: "Already closed.", reservation });
    }

    reservation.isApproved = "cancelled";
    reservation.cancelledBy = "host";
    reservation.cancelledAt = new Date();
    reservation.requestDeclinedAt = new Date();
    if (req.body?.reason) reservation.cancellationReason = String(req.body.reason).slice(0, 500);
    await reservation.save();

    const listing = await Accommodation.findById(reservation.accommodationId).select("name");

    await sendGuestRequestClosedEmail({
      to: reservation.email,
      reservation,
      listingName: listing?.name,
      reason: "declined",
      hostMessage: req.body?.reason,
    });

    res.status(200).json({ message: "Request declined. The guest has been notified.", reservation });
  } catch (error) {
    console.error("declineBookingRequest error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Close out requests nobody answered.
 *
 * Run on a schedule. An unanswered request costs the guest nothing, but leaving
 * it open forever means they never learn to look elsewhere — so after the
 * window it lapses and they get alternatives.
 */
export const expireStaleBookingRequests = async () => {
  const now = new Date();

  try {
    const stale = await Reservation.find({
      bookingMode: "request",
      isApproved: "pending",
      paymentStatus: { $ne: "paid" },
      requestExpiresAt: { $lt: now },
      requestExpiredAt: { $exists: false },
    }).limit(200);

    if (!stale.length) return;

    console.log(`[request-to-book] expiring ${stale.length} unanswered request(s)`);

    for (const reservation of stale) {
      try {
        reservation.isApproved = "cancelled";
        reservation.requestExpiredAt = now;
        reservation.cancelledAt = now;
        reservation.cancellationReason = "Host did not respond in time";
        await reservation.save();

        if (reservation.requestExpiryEmailSentAt) continue;

        const listing = await Accommodation.findById(reservation.accommodationId).select("name");
        const sent = await sendGuestRequestClosedEmail({
          to: reservation.email,
          reservation,
          listingName: listing?.name,
          reason: "expired",
        });

        if (sent) {
          reservation.requestExpiryEmailSentAt = new Date();
          await reservation.save();
        }
      } catch (err) {
        console.error(
          `[request-to-book] could not expire request ${reservation._id}:`,
          err.message
        );
      }
    }
  } catch (err) {
    console.error("[request-to-book] expiry sweep failed:", err.message);
  }
};

export const checkReservationsForAccommodation = async (req, res) => {
  try {
    const { accommodationId, providerId } = req.params;

    const today = new Date();

    const count = await Reservation.countDocuments({
      accommodationId,
      accommodationProvider: providerId,
      isApproved: "approved",               // ignore cancelled or rejected
      checkOutDate: { $gte: today }         // ignore past stays
    });

    return res.json({ count });
  } catch (error) {
    console.error("Error checking reservations:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
