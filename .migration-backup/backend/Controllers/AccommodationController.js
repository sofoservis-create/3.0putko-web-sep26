import Accommodation from "../models/Accommodation.js";
import mongoose from "mongoose";
import { createEvents } from 'ics';
import DeletedAccommodation from "../models/DeletedAccommodation.js";
import { getTransporter } from "../utils/mailer.js";
import { brandShell, button, detailTable, esc, logoAttachments } from "../utils/emailLayout.js";
import Host from "../models/Host.js";
import { eachDayOfInterval, format } from 'date-fns';
import ical from 'ical';
import axios from "axios";
import { getLatLngFromAddress } from "../utils/geocode.js";
import { slugify } from "../utils/slugify.js";
import redisClient from "../utils/redis.js";
import {
  checkListingPublishReadiness,
  publishBlockedMessage,
  hostBookingBlockers,
} from "../utils/listingGating.js";
import { ensureHostStripeStatusFresh, ensureListingStatuses } from "../utils/hostStripeSync.js";
import { occupiedDays } from "../utils/calendarHold.js";
import { bookingModeForHost, REQUEST_TO_BOOK_MODE } from "../utils/requestToBook.js";
import {
  LISTING_STATUS,
  listingStatusForHost,
  listingStatusFor,
  pendingRequirementsOf,
} from "../utils/listingStatus.js";
import { listPayoutAccounts, resolvePayoutAccount } from "../utils/payoutAccounts.js";
import { fetchIcal, assertFetchableIcalUrl } from "../utils/safeFetchIcal.js";

export const clearAccommodationCache = async () => {
  try {
    await redisClient.del("sitemap:accommodations");
    console.log("🧹 Accommodation cache cleared");
  } catch (err) {
    console.error("Error clearing accommodation cache:", err);
  }
};

// Fields the client must never set on a listing. Every one of them is derived
// from Stripe or from the platform's own state, and accepting them from the body
// let a caller hand themselves a PUBLISHED, bookable listing pointed at whatever
// connected account they named — or move somebody else's listing onto their own
// host id by posting a different `userId`.
const LISTING_SERVER_OWNED_FIELDS = [
  "listingStatus",
  "listingStatusUpdatedAt",
  "stripeAccountId",
  "stripeStatus",
  "stripeRequirements",
  "stripeEnabled",
  "payoutStripeAccountId", // has its own owner-checked route
  "isApproved",
  "averageRating",
  "reviews",
  "Reservation",
  "occupancyCalendar",     // has its own routes, with conflict checking
  "views",
  "clicks",
  "customerInterest",
  "icalExportUrl",
  "icalExportToken",
];

const stripServerOwnedListingFields = (data) => {
  for (const field of LISTING_SERVER_OWNED_FIELDS) delete data[field];
  return data;
};

// Create a new accommodation
export const createAccommodation = async (req, res) => {
  try {
    const accommodationData = stripServerOwnedListingFields({ ...req.body });

    // The owner is the authenticated caller, not whatever the body claims.
    accommodationData.userId = req.auth?.id || accommodationData.userId;

    // Generate a URL-friendly slug from the name (which is the title).
    // slugify transliterates accents (á → a, č → c, ľ → l) rather than
    // dropping them, so Slovak titles keep their letters in the URL.
    const baseSlug = slugify(accommodationData.name);

    // Ensure the `slug` is unique
    let slug = baseSlug;
    let existing = await Accommodation.findOne({ slug });
    let counter = 1;
    while (existing) {
      slug = `${baseSlug}-${counter}`;
      existing = await Accommodation.findOne({ slug });
      counter++;
    }

    // Add the generated `slug` to the accommodation data
    accommodationData.slug = slug;

    // A listing must not take MONEY until the host can be paid and Putko holds
    // the billing details it needs to invoice its fee. It may still be CREATED:
    // hosts normally build the listing first and connect Stripe afterwards, and
    // refusing the create leaves them with nothing to point the payout setup at.
    //
    // That is what `listingStatus` is for. The listing is stamped with where its
    // host stands right now — DRAFT with no account, PENDING while Stripe
    // verifies — and the `account.updated` webhook flips it to PUBLISHED the
    // moment onboarding finishes. Nobody has to come back and publish it.
    const readiness = await checkListingPublishReadiness(accommodationData.userId);
    const host = await Host.findById(accommodationData.userId).catch(() => null);

    accommodationData.listingStatus = listingStatusFor(accommodationData, host);
    accommodationData.listingStatusUpdatedAt = new Date();

    if (!readiness.ready) {
      console.warn(
        `Listing created by an unready host ${accommodationData.userId} ` +
          `(${accommodationData.listingStatus}): ${readiness.reasons.join(", ")}`
      );
    }

    // Save the accommodation
    const accommodation = new Accommodation(accommodationData);
    await accommodation.save();

    await clearAccommodationCache();

    res.status(200).json({
      message: "Accommodation Data Stored Successfully",
      accommodation,
      listingStatus: accommodation.listingStatus,
      publishReadiness: readiness,
      // Present only when there is something for the host to act on, so the UI
      // can show one warning without having to re-implement the blocker wording.
      publishWarning: readiness.ready ? null : publishBlockedMessage(readiness),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Whether this host's listings may be published, and what is missing if not.
export const getPublishReadiness = async (req, res) => {
  try {
    const { hostId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(hostId)) {
      return res.status(400).json({ error: "Invalid host ID" });
    }
    res.status(200).json(await checkListingPublishReadiness(hostId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all accommodations for a specific user
export const getUserAccommodations = async (req, res) => {
  const { userId } = req.params; // Assuming the userId is passed as a URL parameter

  try {
    // Validate that the userId is a valid ObjectId
    // Find all accommodations where the userId matches
    const accommodations = await Accommodation.find({ userId }).populate('userId', 'name email').lean(); // Optionally populate user info

    if (accommodations.length === 0) {
      return res.status(404).json({ message: "No accommodations found for this user" });
    }

    // Mongoose does not apply schema defaults to `.lean()` reads, so a listing
    // that has no `stripeEnabled` value stored comes back `undefined` — which
    // every consumer then reads as an explicit "off". Apply the `default: true`
    // by hand so callers get a real boolean.
    for (const accommodation of accommodations) {
      accommodation.stripeEnabled = accommodation.stripeEnabled !== false;
    }

    // Most listings on the platform predate `listingStatus` and have no value
    // stored, and a missing value is read as DRAFT — so a fully onboarded host
    // saw "Nepripojené" on every one of their properties. This is the endpoint
    // the host's own screens read ("Moje ubytovania", the payouts page), so the
    // status is derived here from the account each listing actually pays out to,
    // and the correction is persisted so the stored field converges.
    const owner = await Host.findById(userId)
      .select("stripeAccountId stripeAccounts chargesEnabled payoutsEnabled stripeRequirementsDue")
      .lean()
      .catch(() => null);
    ensureListingStatuses(accommodations, owner);

    res.status(200).json(accommodations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccommodations = async (req, res) => {
  try {
    const cacheKey = "accommodations:all";

    // Try getting from cache
    let cachedData = null;
    try {
      cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log("⚡ CACHE HIT! Returning cached accommodations");
        return res.status(200).json(JSON.parse(cachedData));
      } else {
        console.log("🐢 CACHE MISS! Fetching from MongoDB");
      }
    } catch (err) {
      console.error("Redis GET failed:", err);
    }

    // Fetch only the required fields
    const accommodations = await Accommodation.find()
      .select("_id name slug pricePerNight location locationDetails images recommended averageRating reviews description")
      .lean();

    // Cache the result
    try {
      const setResult = await redisClient.setEx(cacheKey, 3600, JSON.stringify(accommodations));
      console.log("✅ Cached accommodations in Redis:", setResult); // should print "OK"
    } catch (err) {
      console.error("Redis SET failed:", err);
    }

    res.status(200).json(accommodations);

  } catch (error) {
    console.error("Error in getAccommodations:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get accommodation by ID
//
// The host's Stripe account id and billing columns ride along so the Reserve
// button knows whether this host may take a booking. They are stripped from the
// response by `withHostBookingReady` below and replaced with a single derived
// boolean — the connected account id and the host's tax identity are not public
// information, and the client only ever needs the answer, not the inputs.
//
// `onboardingComplete` is deliberately NOT sent. It is absent on almost every
// host document (it is only written when `account.updated` fires), and a client
// cannot distinguish absent from false, so shipping it invites exactly the
// fail-open check it replaced.
const HOST_BOOKING_GATE_FIELDS = [
  'stripeAccountId', 'stripeAccounts',
  'chargesEnabled', 'payoutsEnabled', 'stripeStatusUpdatedAt',
  'ico', 'idNumber', 'dic', 'tin',
  'streetNumber', 'city', 'zipcode', 'countryCode', 'country',
];

const HOST_PUBLIC_FIELDS = ['name', 'email', ...HOST_BOOKING_GATE_FIELDS].join(' ');

/**
 * Replace the host's raw gate inputs with one derived, always-present decision.
 *
 * The client reads exactly one field — `bookable` — and never recombines flags
 * of its own. It previously had to AND `hostBookingReady` with the listing's own
 * `stripeEnabled` switch, and that second term is where the Reserve button was
 * dying: `stripeEnabled` is declared `default: true` on the schema, but Mongoose
 * does NOT apply schema defaults to `.lean()` results, so any listing document
 * that has no `stripeEnabled` value physically stored in MongoDB came back
 * `undefined`. `Boolean(undefined)` is false, so those listings showed a disabled
 * Reserve button no matter how complete the host's onboarding and billing were —
 * finishing onboarding changed `hostBookingReady` to true and nothing happened.
 * The default is applied explicitly below, where the lean read drops it.
 *
 * `listingStatus` travels alongside it so the host's own screens can show the
 * DRAFT / PENDING / PUBLISHED badge without re-deriving the rule. The global
 * `bookingGateEnforced` flag it used to carry is gone — there is no rollout
 * switch any more, each listing publishes itself.
 *
 * Mutates and returns a lean object. Callers must use `.lean()`.
 */
const withHostBookingReady = async (accommodation) => {
  let host = accommodation?.userId;

  // Mongoose skips schema defaults on lean reads — apply `stripeEnabled`'s
  // `default: true` by hand so a document that predates the field is not read as
  // an explicit "off".
  const stripeEnabled = accommodation?.stripeEnabled !== false;
  accommodation.stripeEnabled = stripeEnabled;

  let blockers = hostBookingBlockers(host);

  // A host who has finished onboarding but whose `account.updated` webhook never
  // arrived reads as not-ready forever. Re-read from Stripe — but only for a host
  // who is currently failing AND has an account to ask about, so a ready host and
  // a host who has never connected both cost nothing.
  if (blockers.length && host?.stripeAccountId) {
    try {
      const hydrated = await Host.findById(host._id);
      if (hydrated) {
        const refreshed = await ensureHostStripeStatusFresh(hydrated);
        host = refreshed.toObject ? refreshed.toObject() : refreshed;
        accommodation.userId = { ...accommodation.userId, ...host };
        blockers = hostBookingBlockers(host);
      }
    } catch (err) {
      // Never let a Stripe hiccup take a listing page down; the host simply
      // stays blocked on what we already knew.
      console.error('withHostBookingReady: status refresh failed:', err.message);
    }
  }

  const hostReady = blockers.length === 0;

  accommodation.hostBookingReady = hostReady;

  // Lifecycle. Recomputed here rather than trusted from the document, because
  // the refresh above may have just learned that onboarding finished — and
  // because listings written before this field existed carry no value at all.
  // The stored field is the one search filters on; this is the one the page
  // renders, so a listing is never shown as PENDING a moment after it published.
  const liveStatus = listingStatusFor(accommodation, host);
  accommodation.listingStatus = liveStatus;
  accommodation.listingStatusUpdatedAt =
    accommodation.listingStatusUpdatedAt || host?.stripeStatusUpdatedAt || null;
  // What Stripe is still waiting for. Host-facing only — stripped for guests by
  // the caller, along with the rest of the host's gate inputs.
  accommodation.listingStatusRequirements =
    liveStatus === LISTING_STATUS.PENDING ? pendingRequirementsOf(host, accommodation) : [];
  // The connected account id itself is NOT echoed here. This function serves the
  // public listing page, and an acct_ id is the host's, not the guest's
  // business — the host's own screens read it from their listings endpoint.
  // The stored field is stripped below for the same reason.

  // The single decision the Reserve button reads. No environment flag involved
  // any more — a listing becomes bookable when its own host is finished.
  //
  // `hostReady` is deliberately ANDed on top of PUBLISHED rather than folded
  // into it. PUBLISHED is exactly what Stripe reports (charges_enabled +
  // payouts_enabled), which is the status the host is shown and the one the
  // spec defines. Putko additionally needs billing details on file to invoice
  // its own fee, and that is not Stripe's business to report — so it gates
  // booking without muddying the status badge. In practice hostReady implies
  // PUBLISHED, so this only ever subtracts.
  accommodation.bookable =
    stripeEnabled && liveStatus === LISTING_STATUS.PUBLISHED && hostReady;
  // Which flow the button starts: 'instant' takes payment at checkout,
  // 'request' sends the host a booking request and charges nothing. This is the
  // field that keeps a listing open while its host is still un-onboarded — see
  // utils/requestToBook.js. It is computed here rather than in the client so the
  // rule lives in one place.
  accommodation.bookingMode = stripeEnabled ? bookingModeForHost(host) : "instant";
  // Why not, for the host's own dashboard. Guests are shown "Coming Soon"; only
  // the reason codes travel, never the host's tax identity or account id.
  accommodation.bookingBlockers = hostReady ? [] : blockers;

  // Never ship a payout destination to a guest.
  delete accommodation.payoutStripeAccountId;

  const raw = accommodation.userId;
  if (raw && typeof raw === 'object') {
    for (const field of HOST_BOOKING_GATE_FIELDS) delete raw[field];
  }

  return accommodation;
};

export const getAccommodationById = async (req, res) => {
  try {
    // `.lean()` so withHostBookingReady can strip the gate fields — on a
    // hydrated document `delete` is a no-op and the account id would ship.
    const accommodation = await Accommodation.findById(req.params.id)
      .populate('userId', HOST_PUBLIC_FIELDS)
      .lean();
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }
    res.status(200).json(await withHostBookingReady(accommodation));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update the occupancyCalendar for a specific user by userId
export const updateAccommodationByAccommodationId = async (req, res) => {
  const { accommodationId } = req.params; // Get accommodationId from the request parameters
  const { occupancyCalendar } = req.body; // Expecting occupancyCalendar data in request body

  try {
    // Find the accommodation associated with the accommodationId
    const accommodation = await Accommodation.findByIdAndUpdate(
      accommodationId, // Match the document by accommodationId
      { $push: { occupancyCalendar } }, // Add new occupancyCalendar entries
      { new: true } // Return the updated document
    );

    // If accommodation not found
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    res.status(200).json({ message: "Occupancy Calendar updated successfully", accommodation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an accommodation by ID
export const updateAccommodation = async (req, res) => {
  try {
    const updatedAccommodationData = stripServerOwnedListingFields({ ...req.body });

    // Ownership is not transferable through an update. Without this a caller
    // could post someone else's host id and hand the listing — and its bookings
    // — to another account.
    delete updatedAccommodationData.userId;

    // The slug is permanent. It is generated once on create and forms the public
    // listing URL (/listings/<slug>), so regenerating it on update would break
    // existing links and search rankings. Strip any incoming slug so neither the
    // client nor a renamed title can change it.
    delete updatedAccommodationData.slug;

    // Find and update the accommodation by its ID
    const updatedAccommodation = await Accommodation.findByIdAndUpdate(
      req.params.id,
      updatedAccommodationData,
      { new: true }
    ).populate('userId', 'name email'); // Populate user info in response

    if (!updatedAccommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    await clearAccommodationCache();

    res.status(200).json({ message: "Accommodation updated successfully", updatedAccommodation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete accommodation by ID
export const deleteAccommodation = async (req, res) => {
  try {
    const accommodation = await Accommodation.findById(req.params.id);

    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    // Create a new deleted accommodation record
    const deletedAccommodation = new DeletedAccommodation({
      ...accommodation.toObject(), // Copy all fields
      deletedAt: new Date(),
    });

    await deletedAccommodation.save();  // Save to DeletedAccommodation collection
    await Accommodation.findByIdAndDelete(req.params.id); // Remove from Accommodation
    await clearAccommodationCache();
    res.status(200).json({ message: "Accommodation moved to deleted list" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all Deleted Accommodation
export const getDeletedAccommodations = async (req, res) => {
  try {
    const deletedAccommodations = await DeletedAccommodation.find().populate('userId', 'name email')

    res.status(200).json(deletedAccommodations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Restore Accommodation
export const restoreAccommodation = async (req, res) => {
  try {
    const deletedAccommodation = await DeletedAccommodation.findById(req.params.id);

    if (!deletedAccommodation) {
      return res.status(404).json({ message: "Deleted accommodation not found" });
    }

    // Move back to Accommodation collection
    const restoredAccommodation = new Accommodation({
      ...deletedAccommodation.toObject(),
      createdAt: deletedAccommodation.createdAt,  // Keep original creation date
    });

    await restoredAccommodation.save();  // Save to Accommodation collection
    await DeletedAccommodation.findByIdAndDelete(req.params.id); // Remove from DeletedAccommodation

    res.status(200).json({ message: "Accommodation restored successfully", restoredAccommodation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Permanently delete accommodation
export const deletePermanently = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete from DeletedAccommodation
    const deletedAcc = await DeletedAccommodation.findByIdAndDelete(id);

    if (!deletedAcc) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    res.status(200).json({ message: "Accommodation permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Search accommodations by property type
export const searchAccommodationsByCategorys = async (req, res) => {
  try {
    const { category, city, country, location } = req.query; // Get query parameters
    let filters = []; // Initialize an empty array for filters

    // Create filters based on provided query parameters
    if (category) {
      filters.push({ propertyType: category }); // Add category filter
    }

    if (city) {
      filters.push({ 'locationDetails.city': city }); // Add city filter
    }

    if (country) {
      filters.push({ 'locationDetails.country': country }); // Add country filter
    }

    if (location) {
      filters.push({ 'location.address': location }); // Add location filter
    }

    // If no filters are provided, return all accommodations
    if (filters.length === 0) {
      const allAccommodations = await Accommodation.find().populate('userId', 'name email');
      return res.status(200).json(allAccommodations);
    }

    // Fetch accommodations based on the provided filters using $or
    const accommodations = await Accommodation.find({ $or: filters }).populate('userId', 'name email'); // Populate user details

    // Return the accommodations, whether found or empty
    if (accommodations.length === 0) {
      return res.status(404).json({ message: "No accommodations found for the selected criteria." });
    }

    res.status(200).json(accommodations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch accommodations' });
  }
};

// Increment accommodation view count
export const incrementViewCount = async (req, res) => {
  const { id } = req.params; // accommodation ID

  try {
    const accommodation = await Accommodation.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } }, // Increment the views by 1
      { new: true } // Return the updated document
    );

    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    res.status(200).json({ message: "View count incremented", accommodation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Increment accommodation click count
export const incrementClickCount = async (req, res) => {
  const { id } = req.params; // accommodation ID

  try {
    const accommodation = await Accommodation.findByIdAndUpdate(
      id,
      { $inc: { clicks: 1 } }, // Increment the clicks by 1
      { new: true } // Return the updated document
    );

    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    res.status(200).json({ message: "Click count incremented", accommodation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Increment customer interest
export const customerInterest = async (req, res) => {
  try {
    const accommodation = await Accommodation.findByIdAndUpdate(
      req.params.id,
      { $inc: { customerInterest: 1 } }, // Increment the customer interest count by 1
      { new: true }
    );
    res.status(200).json(accommodation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addToOccupancyCalendar = async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, guestName, status, source, calendarSyncId } = req.body;

  try {
    if (!status || status === 'cancelled') {
      return res.status(400).json({ message: "Cancelled or empty status. Not adding to calendar." });
    }

    const accommodation = await Accommodation.findById(id);
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    const requestedDates = eachDayOfInterval({ start: newStart, end: newEnd }).map(date =>
      format(date, 'yyyy-MM-dd')
    );

    // Get all booked dates. Lapsed checkout holds are ignored — a guest who
    // abandoned Stripe must not keep the dates blocked.
    const existingBookedDates = occupiedDays(accommodation);

    // Filter out conflicting dates
    const nonConflictingDates = requestedDates.filter(date => !existingBookedDates.has(date));

    if (nonConflictingDates.length === 0) {
      return res.status(409).json({ message: "All requested dates conflict with existing bookings. Nothing stored." });
    }

    // Group contiguous non-conflicting dates into ranges
    const groupedRanges = [];
    let tempRange = [];

    for (let i = 0; i < nonConflictingDates.length; i++) {
      const current = new Date(nonConflictingDates[i]);
      const next = i + 1 < nonConflictingDates.length ? new Date(nonConflictingDates[i + 1]) : null;

      tempRange.push(current);

      if (!next || (next - current) !== 86400000) {
        groupedRanges.push([...tempRange]);
        tempRange = [];
      }
    }

    // Add the non-conflicting ranges
    const isImported = source === 'ics';
    groupedRanges.forEach(range => {
      accommodation.occupancyCalendar.push({
        startDate: range[0],
        endDate: range[range.length - 1],
        guestName: guestName || '',
        status: status || 'booked',
        source: isImported ? 'ics' : 'manual',
        // Which feed brought this row in, so disconnecting one calendar takes
        // only its own dates and leaves the host's other feeds alone.
        calendarSyncId:
          isImported && mongoose.Types.ObjectId.isValid(calendarSyncId)
            ? calendarSyncId
            : undefined,
      });
    });

    await accommodation.save();

    res.status(200).json({
      message: `Added ${groupedRanges.length} non-conflicting date range(s) to the calendar.`,
      addedRanges: groupedRanges.map(r => ({
        startDate: format(r[0], 'yyyy-MM-dd'),
        endDate: format(r[r.length - 1], 'yyyy-MM-dd'),
      })),
      accommodation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOccupancyEntry = async (req, res) => {
  const { accommodationId, entryId } = req.params; // Get accommodationId and entryId from request parameters

  try {
    // Find the accommodation by ID
    const accommodation = await Accommodation.findById(accommodationId);

    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found." });
    }

    // Remove the specific occupancyCalendar entry by entryId.
    //
    // The second filter used to drop every row whose status was not booked /
    // blocked / available — which is to say every 'held' row. Deleting ONE
    // manual block therefore silently destroyed every live checkout hold on the
    // listing, and the guests holding them were paying at Stripe: their dates
    // went back on sale mid-payment, and confirmHold refused their booking after
    // the money was taken. Only the named entry is removed.
    const before = accommodation.occupancyCalendar.length;
    accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter(
      (entry) => entry._id.toString() !== entryId
    );

    if (accommodation.occupancyCalendar.length === before) {
      return res.status(404).json({ message: "Occupancy entry not found." });
    }


    // Save the updated accommodation document
    await accommodation.save();

    res.status(200).json({
      message: "Occupancy entry deleted successfully.",
      occupancyCalendar: accommodation.occupancyCalendar, // Return the updated calendar
    });
  } catch (error) {
    console.error("Error deleting occupancy entry:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/accommodation/:id/payout-account
 *
 * Point one listing at one of its host's connected accounts.
 *
 * A host may run a single account across every property or a separate one per
 * property, and both have to work — so this is per listing, and passing null
 * means "use my default", which is what every listing meant before multiple
 * accounts existed.
 *
 * Changing the account changes the listing's status: a property moved onto a
 * freshly connected account is PENDING again until Stripe verifies it, because
 * there is now genuinely nowhere verified to pay it.
 */
export const setListingPayoutAccount = async (req, res) => {
  const { id } = req.params;
  const { accountId } = req.body || {};

  try {
    const accommodation = await Accommodation.findById(id);
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    // Only the owning host (or an admin) may repoint a listing's payouts.
    //
    // The account-belongs-to-this-host check below is not enough on its own: it
    // stops money being sent to a stranger, but it did nothing to stop a
    // stranger deciding WHICH of the host's accounts a property pays. With this
    // now driven by a control on the payouts page, the route needs a real owner
    // check rather than obscurity of the listing id.
    const isOwner =
      req.auth?.kind === "admin" ||
      (req.auth?.kind === "host" && String(req.auth.id) === String(accommodation.userId));

    if (!isOwner) {
      return res.status(403).json({
        message: "You may only change the payout account of your own listing.",
        code: "not_listing_owner",
      });
    }

    const host = await Host.findById(accommodation.userId);
    const accounts = listPayoutAccounts(host);

    if (accountId) {
      // Refuse an account this host does not hold. Without this check a client
      // could point a listing at any acct_ id on the platform and have its
      // takings transferred to a stranger.
      if (!accounts.some((a) => a.accountId === accountId)) {
        return res.status(400).json({
          message: "That payout account does not belong to this host.",
          code: "unknown_account",
        });
      }
      accommodation.payoutStripeAccountId = accountId;
    } else {
      // Explicit null = fall back to the host's default.
      accommodation.payoutStripeAccountId = null;
    }

    accommodation.listingStatus = listingStatusFor(accommodation, host);
    accommodation.listingStatusUpdatedAt = new Date();
    await accommodation.save();

    res.status(200).json({
      message: "Payout account updated.",
      payoutStripeAccountId: accommodation.payoutStripeAccountId,
      listingStatus: accommodation.listingStatus,
    });
  } catch (error) {
    console.error("setListingPayoutAccount error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Normalise one feed row coming off the client.
 * Returns null when the URL is unusable, so a blank row a host left behind in
 * the form never becomes a feed the cron then tries to fetch every three hours.
 */
const normalizeCalendarFeed = async (feed) => {
  const rawUrl = typeof feed?.url === "string" ? feed.url.trim() : "";
  if (!rawUrl) return null;

  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    // Rejects anything that is not a public https URL. Merely parsing it, which
    // is all this used to do, happily accepted http://127.0.0.1:6379/ and
    // http://169.254.169.254/ — and the cron then fetched it every three hours.
    await assertFetchableIcalUrl(withProtocol);
  } catch {
    return null;
  }

  const label = typeof feed?.label === "string" ? feed.label.trim() : "";
  return {
    _id: mongoose.Types.ObjectId.isValid(feed?._id) ? feed._id : undefined,
    url: withProtocol,
    label: label.slice(0, 60),
  };
};

/**
 * Replace a listing's set of external iCal feeds.
 *
 * The whole list is sent at once because that is how the host edits it — rows
 * added, renamed and deleted in one form, saved once. Existing `_id`s are
 * carried through so the sync metadata on each feed, and the `calendarSyncId`
 * on every date it imported, survive a save that only renamed a sibling row.
 *
 * Feeds the host dropped take their imported dates with them; the same rule as
 * a full disconnect applies, only rows tagged `source: 'ics'` are ever touched.
 */
export const saveCalendarSync = async (req, res) => {
  const { id } = req.params;
  const incoming = Array.isArray(req.body?.feeds) ? req.body.feeds : [];

  try {
    const accommodation = await Accommodation.findById(id);
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    const normalized = (await Promise.all(incoming.map(normalizeCalendarFeed))).filter(Boolean);

    // Same link twice would import every night twice over.
    const seen = new Set();
    const feeds = normalized.filter((feed) => {
      const key = feed.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (incoming.length && !feeds.length) {
      return res.status(400).json({ message: "No valid calendar URL provided." });
    }

    const previous = accommodation.calendarSync || [];
    const keptIds = new Set(feeds.filter((f) => f._id).map((f) => String(f._id)));
    const droppedIds = previous
      .map((f) => String(f._id))
      .filter((prevId) => !keptIds.has(prevId));

    accommodation.calendarSync = feeds.map((feed) => {
      const existing = feed._id
        ? previous.find((p) => String(p._id) === String(feed._id))
        : null;

      // A changed URL is a different calendar — its sync history no longer
      // describes what the row now points at, so it starts over as 'never'.
      const urlUnchanged = existing && existing.url === feed.url;

      return {
        ...(feed._id ? { _id: feed._id } : {}),
        url: feed.url,
        label: feed.label,
        lastSyncAt: urlUnchanged ? existing.lastSyncAt : undefined,
        lastSyncStatus: urlUnchanged ? existing.lastSyncStatus : "never",
        lastSyncError: urlUnchanged ? existing.lastSyncError : undefined,
        lastImportedCount: urlUnchanged ? existing.lastImportedCount : 0,
      };
    });

    let removedCount = 0;
    if (droppedIds.length) {
      const dropped = new Set(droppedIds);
      const before = accommodation.occupancyCalendar.length;
      accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter(
        (entry) =>
          !(entry.source === "ics" && dropped.has(String(entry.calendarSyncId)))
      );
      removedCount = before - accommodation.occupancyCalendar.length;
    }

    // The nightly cron and the legacy single-feed screens still read `url`.
    // Keeping it pointed at the first feed means a host who never opens the new
    // list keeps working, and null once the list is empty so `syncBookings`
    // drops the listing from its working set instead of failing on every run.
    accommodation.url = accommodation.calendarSync[0]?.url || null;

    await accommodation.save();

    res.status(200).json({
      message: "Calendar feeds saved.",
      removedCount,
      calendarSync: accommodation.calendarSync,
    });
  } catch (error) {
    console.error("Error saving calendar sync:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Record the outcome of a sync run against one feed, so the sidebar overview
 * can show "last synced" and "error" per calendar rather than per listing.
 */
export const updateCalendarSyncStatus = async (req, res) => {
  const { id, feedId } = req.params;
  const { status, error: syncError, importedCount } = req.body || {};

  try {
    const accommodation = await Accommodation.findById(id);
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    const feed = accommodation.calendarSync.id(feedId);
    if (!feed) {
      return res.status(404).json({ message: "Calendar feed not found" });
    }

    feed.lastSyncStatus = status === "error" ? "error" : "ok";
    feed.lastSyncAt = new Date();
    feed.lastSyncError = status === "error" ? String(syncError || "").slice(0, 300) : undefined;
    feed.lastImportedCount = Number.isFinite(importedCount) ? importedCount : 0;

    await accommodation.save();

    res.status(200).json({ message: "Sync status updated.", calendarSync: accommodation.calendarSync });
  } catch (error) {
    console.error("Error updating calendar sync status:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Disconnect one feed, leaving the listing's other calendars connected.
 */
export const removeCalendarSyncFeed = async (req, res) => {
  const { id, feedId } = req.params;
  const removeImported =
    req.query.removeImported === "true" || req.body?.removeImported === true;

  try {
    const accommodation = await Accommodation.findById(id);
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    const feed = accommodation.calendarSync.id(feedId);
    if (!feed) {
      return res.status(404).json({ message: "Calendar feed not found" });
    }

    feed.deleteOne();

    let removedCount = 0;
    if (removeImported) {
      const before = accommodation.occupancyCalendar.length;
      accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter(
        (entry) =>
          !(entry.source === "ics" && String(entry.calendarSyncId) === String(feedId))
      );
      removedCount = before - accommodation.occupancyCalendar.length;
    }

    accommodation.url = accommodation.calendarSync[0]?.url || null;

    await accommodation.save();

    res.status(200).json({
      message: "Calendar feed removed.",
      removedCount,
      calendarSync: accommodation.calendarSync,
    });
  } catch (error) {
    console.error("Error removing calendar feed:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Disconnect a listing's external iCal feed.
 *
 * Clearing `url` is what actually stops the import — `syncBookings` only picks
 * up accommodations whose url is set, so an empty string would keep the listing
 * in the cron's working set and fail on every run. Hence null, not "".
 *
 * With `removeImported`, the nights the feed brought in are swept as well.
 * Only rows tagged `source: 'ics'` go: a paid Putko booking carries a
 * reservationId and a host's own manual block looks identical to an imported
 * one otherwise, so neither may be touched. Rows imported before this tag
 * existed are left in place for the host to clear by hand.
 */
export const removeCalendarSync = async (req, res) => {
  const { id } = req.params;
  const removeImported =
    req.query.removeImported === "true" || req.body?.removeImported === true;

  try {
    const accommodation = await Accommodation.findById(id);
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    const hadUrl = Boolean(accommodation.url) || (accommodation.calendarSync || []).length > 0;
    accommodation.url = null;
    // Disconnect every feed, not just the legacy one, or the cron would keep
    // importing from the rows the host thought they had just removed.
    accommodation.calendarSync = [];

    let removedCount = 0;
    if (removeImported) {
      const before = accommodation.occupancyCalendar.length;
      accommodation.occupancyCalendar = accommodation.occupancyCalendar.filter(
        (entry) => entry.source !== "ics"
      );
      removedCount = before - accommodation.occupancyCalendar.length;
    }

    await accommodation.save();

    res.status(200).json({
      message: hadUrl
        ? "Calendar sync removed."
        : "No calendar sync was connected.",
      removedCount,
      accommodation,
    });
  } catch (error) {
    console.error("Error removing calendar sync:", error);
    res.status(500).json({ error: error.message });
  }
};

//  Get search  accommodation by ID
export const searchAccommodationsByCategory = async (req, res) => {
  try {
    const {
      category,
      city,
      country,
      propertyType,
      location,
      minPrice,
      maxPrice,
      pet,
      smoking,
      rentalform,
      parkingFacilities,
      services,
      bathroomAmenities,
      kitchenDiningAmenities,
      heatingCoolingAmenities,
      safetyAmenities,
      wellnessAmenities,
      outdoorAmenities,
      checkIn,
      meals,
      person,
      beds,
      bedroomCount,
      bathroomCount,
      startDate,
      endDate,
      partyOrganizing,
      name,
      page = 1,
      limit = 6,
      mapOnly = false,
      sortOption,
    } = req.query;

    // `limit` went straight into the query. `?limit=100000` returned the whole
    // catalogue in one response — a scraping and memory-exhaustion primitive.
    const pageSize = Math.min(Math.max(parseInt(limit) || 6, 1), 48);
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNumber - 1) * pageSize;

    let filters = {};

    // Default ranking. Availability is applied as a FILTER below when dates are
    // supplied, so among the remaining candidates the order is price ascending,
    // with `recommended` first as a tiebreak.
    //
    // NOTE: distance is not in this ordering because there is no distance to
    // sort by — the listing model stores a bare lat/lng with no geospatial
    // index, and nothing in this codebase computes a distance. See
    // audit/REPORT.md; ranking by proximity needs a 2dsphere index first.
    let sortQuery = { recommended: -1, pricePerNight: 1 };
    if (sortOption === "lowToHigh") {
      sortQuery = { pricePerNight: 1 };
    } else if (sortOption === "highToLow") {
      sortQuery = { pricePerNight: -1 };
    }

    // Property Type filter (using 'en' subfield)
    if (propertyType) {
      let servicesArray;
      try {
        servicesArray = JSON.parse(propertyType);
      } catch (error) {
        servicesArray = propertyType.replace(/\[|\]/g, '').split(',').map(s => s.trim());
      }
      filters['propertyType.en'] = { $in: servicesArray };
    }

    // Location filters
    if (city) filters['locationDetails.city'] = city.toLowerCase();
    if (country) filters['locationDetails.country'] = country;
    if (location) filters['location.address'] = location;

    // Price range
    if (minPrice || maxPrice) {
      filters.pricePerNight = {};
      if (minPrice) filters.pricePerNight.$gte = parseFloat(minPrice);
      if (maxPrice) filters.pricePerNight.$lte = parseFloat(maxPrice);
    }

    // Single-value filters using 'en' subfield
    if (pet) filters['pet.en'] = pet;
    if (smoking) filters['smoking.en'] = smoking;
    if (rentalform) filters['rentalform.en'] = rentalform;
    if (partyOrganizing) filters['partyOrganizing.en'] = partyOrganizing;

    // Accommodation Name (case-insensitive search) - support both `name` and legacy `accommodationName`
    if (name) {
      // Escaped: the raw query string was compiled as a regular expression, so
      // `?name=(a%2B)%2B%24` is catastrophic backtracking evaluated against every
      // document in the collection.
      const nameLiteral = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filters.$or = [
        { name: { $regex: nameLiteral, $options: "i" } },
        { 'name.en': { $regex: nameLiteral, $options: "i" } }, // Adjust based on actual schema
        { accommodationName: { $regex: nameLiteral, $options: "i" } },
      ];
    }

    // Person capacity
    if (person) {
      filters.person = { $gte: parseInt(person) };
    }

    if (beds) filters.beds = { $lte: parseInt(beds) };

    // Bedroom and Bathroom counts

    if (bedroomCount) filters.bedroom = { $gte: parseInt(bedroomCount) };

    if (bathroomCount) filters.bathroom = { $gte: parseInt(bathroomCount) };

    // Array-based amenities filters (using 'en' subfield)
    const handleArrayFilter = (param, field) => {
      if (param) {
        let arr;
        try {
          arr = JSON.parse(param);
        } catch (error) {
          arr = param.replace(/\[|\]/g, '').split(',').map(s => s.trim());
        }
        filters[`${field}.en`] = { $in: arr };
      }
    };

    handleArrayFilter(services, 'services');
    handleArrayFilter(bathroomAmenities, 'bathroomAmenities');
    handleArrayFilter(kitchenDiningAmenities, 'kitchenDiningAmenities');
    handleArrayFilter(heatingCoolingAmenities, 'heatingCoolingAmenities');
    handleArrayFilter(safetyAmenities, 'safetyAmenities');
    handleArrayFilter(wellnessAmenities, 'wellnessAmenities');
    handleArrayFilter(outdoorAmenities, 'outdoorAmenities');
    handleArrayFilter(parkingFacilities, 'parkingFacilities');
    handleArrayFilter(checkIn, 'checkIn');
    handleArrayFilter(meals, 'meals');

    // Date range availability check
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Excluded Dates Filter — NEWLY ADDED
      filters.excludedDates = {
        $not: {
          $elemMatch: {
            $gte: start,
            $lte: end
          }
        }
      };
      // A listing is unavailable if a confirmed booking OR a live checkout hold
      // overlaps the requested range. Matching only `status: "booked"` showed
      // listings as free while another guest was mid-payment for them.
      filters.occupancyCalendar = {
        $not: {
          $elemMatch: {
            $and: [
              {
                $or: [
                  { startDate: { $lt: end, $gte: start } },
                  { endDate: { $gt: start, $lte: end } },
                  { startDate: { $lte: start }, endDate: { $gte: end } }
                ]
              },
              {
                // "blocked" was missing, so a host's own manual block did not
                // remove the listing from results. The guest saw it as
                // available, picked those dates, and was refused at checkout
                // with "Those dates have just been taken" — because
                // utils/calendarHold.js DOES count blocked rows. The search
                // index and the booking gate must agree on what "taken" means.
                $or: [
                  { status: "booked" },
                  { status: "blocked" },
                  { status: "held", holdExpiresAt: { $gt: new Date() } }
                ]
              }
            ]
          }
        }
      };
    }

    // Execute query with projection, pagination and sorting
    if (mapOnly === 'true' || mapOnly === true) {
      // Capped. This returned EVERY matching listing with no limit, on every
      // search, alongside the paginated query — the single largest response the
      // API produces and the one a mobile client pays for twice.
      const allMarkers = await Accommodation.find(filters)
        .select('_id name slug images averageRating reviews location description pricePerNight')
        .sort({ recommended: -1 })
        .limit(Number(process.env.SEARCH_MAP_MARKER_LIMIT || 500))
        .lean();

      return res.status(200).json({
        accommodations: allMarkers,
        totalCount: allMarkers.length,
      });
    }

    const totalCount = await Accommodation.countDocuments(filters);
    const accommodations = await Accommodation.find(filters)
      .select('_id name slug images locationDetails pricePerNight averageRating reviews recommended location description')
      .sort(sortQuery)
      .skip(skip)
      .limit(pageSize)
      .lean();

    res.status(200).json({
      accommodations,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: pageNumber
    });
  } catch (error) {
    console.error('Error fetching accommodations:', error);
    res.status(500).json({ error: 'Failed to fetch accommodations' });
  }
};

export const deleteAccommodationImages = async (req, res) => {
  const { imageToDelete } = req.body;

  // Validate `imageToDelete` from request body
  if (!imageToDelete || typeof imageToDelete !== "string") {
    return res.status(400).json({
      message: "Please provide a valid image URL to delete",
    });
  }

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid accommodation ID format",
    });
  }

  try {
    const accommodation = await Accommodation.findById(id);
    if (!accommodation) {
      return res.status(404).json({
        message: "Accommodation not found",
      });
    }

    if (!accommodation.images.includes(imageToDelete)) {
      return res.status(400).json({
        message: "The provided image URL was not found in the accommodation's images",
      });
    }

    accommodation.images = accommodation.images.filter(
      (image) => image !== imageToDelete
    );
    await accommodation.save();

    return res.status(200).json({
      message: "Image deleted successfully",
      deletedImage: imageToDelete,
      remainingImages: accommodation.images,
    });
  } catch (error) {
    console.error("Error deleting image:", error.message);
    return res.status(500).json({
      message: "An error occurred while deleting the image",
      error: error.message,
    });
  }
};

export const generateICS = async (req, res) => {
  const { id } = req.params;
  const token = req.query.token || req.params.token;

  try {
    // Keyed on the secret, not on the listing id. The id is public and
    // enumerable, so the old route handed anyone the occupancy of any property.
    const accommodation = token
      ? await Accommodation.findOne({ _id: id, icalExportToken: String(token) }).select(
          "+icalExportToken"
        )
      : null;

    if (!token) {
      return res.status(401).json({ error: "A calendar token is required" });
    }

    // Always respond in ICS format, even if empty
    if (!accommodation) {
      res.setHeader("Content-Type", "text/calendar;charset=utf-8");
      return res.send(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YourCompany//Calendar Export//EN
END:VCALENDAR`);
    }

    const events = (accommodation.occupancyCalendar || []).map((entry) => {
      const startDate = new Date(entry.startDate);
      const endDate = new Date(entry.endDate);
      endDate.setDate(endDate.getDate() + 1);

      return {
        start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()],
        end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()],
        // No guest identity in an outbound feed. The consumers of this file are
        // Airbnb, Booking.com and the like; they need the DATES blocked, and
        // nothing else. Publishing "Reserved - Jana Nováková" to a third-party
        // channel is a disclosure of personal data with no basis for it, and it
        // is what the old title did.
        title: "Reserved",
        description: `Status: ${entry.status || "Unknown"}`,
        uid: `${entry._id}@putko.sk`,
      };
    });

    createEvents(events, (error, value) => {
      if (error) {
        console.error("ICS generation error:", error);
        // Still return valid ICS shell to satisfy Booking.com
        res.setHeader("Content-Type", "text/calendar;charset=utf-8");
        return res.send(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YourCompany//Calendar Export//EN
END:VCALENDAR`);
      }

      res.setHeader("Content-Type", "text/calendar;charset=utf-8");
      res.setHeader("Content-Disposition", "inline; filename=calendar.ics");
      res.send(value);
    });
  } catch (error) {
    console.error("Error generating ICS:", error);
    // Even on error, always return valid ICS header so Booking.com doesn’t get stuck
    res.setHeader("Content-Type", "text/calendar;charset=utf-8");
    res.send(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//YourCompany//Calendar Export//EN
END:VCALENDAR`);
  }
};

// Fetch accommodation by slug
export const getAccommodationBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Optional: Normalize the slug (convert to lowercase and replace spaces with dashes)
    const sanitizedSlug = slug.replace(/\s+/g, '-').toLowerCase();

    // Correct query to match the 'slug' field, not '_id'
    const accommodation = await Accommodation.findOne({ slug: sanitizedSlug }).populate('userId', HOST_PUBLIC_FIELDS).lean();

    if (!accommodation) {
      return res.status(404).json({ message: 'Accommodation not found' });
    }

    res.status(200).json(await withHostBookingReady(accommodation));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveListing = async (req, res) => {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ message: "Slug is required." });
  }

  try {
    // Find the accommodation by slug and approve it by setting isVerified to true
    const accommodation = await Accommodation.findOneAndUpdate(
      { slug: slug },
      { isApproved: true },
      { new: true }
    );

    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found." });
    }

    // Fetch host information using UserID from the User model
    const host = await Host.findById(accommodation.userId);

    if (!host) {
      return res.status(404).json({ message: "Host not found." });
    }

    // Set up nodemailer transporter
    const transporter = getTransporter();

    const mailOptions = {
      from: '"Putko Support" <support@putko.sk>',
      to: "support@putko.sk",  // Change this if you want to send it to the host's email
      subject: `✅ Host schválil svoju ponuku`,
      attachments: logoAttachments(),
      html: brandShell({
        preheader: `${host.name || "Neznámy hostiteľ"} — ${accommodation.name || ""}`,
        title: "Hostiteľ schválil svoju ponuku",
        bodyHtml: `
          <p style="margin:0 0 4px 0;">
            <strong>${esc(host.name || "Neznámy")}</strong> schválil svoju ponuku na platforme Putko.
          </p>
          ${detailTable([
            ["Hostiteľ", host.name || "Neznámy"],
            ["E-mail", host.email || "Email nie je dostupný"],
            accommodation.name && ["Ponuka", accommodation.name],
          ])}
          ${button(`${process.env.CLIENT_SITE_URL}/listings/${accommodation.slug}`, "Zobraziť ponuku")}`,
      }),
    };

    // Send the email to support
    await transporter.sendMail(mailOptions);

    // Redirect to frontend listing detail page after approval
    return res.redirect(`${process.env.CLIENT_SITE_URL}/listings/${slug}`);

  } catch (err) {
    console.error("❌ Error approving listing:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const syncBookings = async () => {
  try {
    // Either shape counts as connected: a listing on the new multi-feed list,
    // or one still carrying only the legacy single `url`.
    const accommodations = await Accommodation.find({
      $or: [
        { url: { $ne: null } },
        { "calendarSync.0": { $exists: true } },
      ],
    });

    console.log(`[${new Date().toISOString()}] Sync started. Processing ${accommodations.length} accommodations.`);

    for (let index = 0; index < accommodations.length; index++) {
      const accommodation = accommodations[index];
      const { url, _id, name, occupancyCalendar } = accommodation;

      console.log(`→ (${index + 1}/${accommodations.length}) Processing accommodation: ${name || _id}`);

      // One entry per calendar to pull. Listings that never opened the new
      // screen still have exactly one, built from the legacy field.
      const feeds = (accommodation.calendarSync || []).length
        ? accommodation.calendarSync.map((feed) => ({
            feedId: feed._id,
            url: feed.url,
            label: feed.label || "iCal",
            doc: feed,
          }))
        : url
          ? [{ feedId: null, url, label: "iCal", doc: null }]
          : [];

      let updated = false;

      for (const feed of feeds) {
        try {
          // Guarded fetch: https only, no private/loopback/link-local
          // destinations, redirects re-validated per hop, hard timeout and size
          // cap. `axios.get(feed.url)` had none of these — the URL comes from a
          // host-editable form, so it was a server-side request forgery
          // primitive against the platform's own network, and a slow feed with
          // no timeout stalled the whole sync loop for every other listing.
          const icsBody = await fetchIcal(feed.url);
          const parsedData = ical.parseICS(icsBody);

          const events = Object.values(parsedData).filter(event => event.type === "VEVENT");

          let addedCount = 0;
          // Every UID this feed still carries. Anything previously imported from
          // this feed and NOT in here has been deleted or moved upstream, and
          // must give its dates back — see the reconciliation below.
          const seenUids = new Set();

          // RRULE is not expanded. `ical@0.8` exposes `event.rrule` but does not
          // materialise the occurrences, so only the FIRST instance of a
          // recurring block is imported and every later one is silently dropped
          // — dates the channel considers blocked stay bookable here, which is a
          // direct route to a double booking. Flagged loudly rather than
          // pretended away; expanding them needs a recurrence library.
          const recurring = events.filter((event) => event.rrule);
          if (recurring.length) {
            console.error(
              `⚠️  ${name || _id} / ${feed.label} — ${recurring.length} recurring event(s) ` +
                `imported as a single occurrence. Later occurrences are NOT blocked.`
            );
          }

          for (const event of events) {
            const normalizeDate = (date) => {
              const d = new Date(date);
              // Strip time & timezone (keep only date)
              d.setHours(12, 0, 0, 0);
              return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
            };

            // Airbnb DTEND is exclusive → subtract 1 day
            const rawStart = new Date(event.start);
            const rawEnd = new Date(event.end);
            rawEnd.setDate(rawEnd.getDate() - 1);

            const newStart = normalizeDate(rawStart);
            const newEnd = normalizeDate(rawEnd);

            const guestName = (event.summary || "ICS Guest").trim();
            const status = "booked";
            // RFC 5545 §3.8.4.7: UID is the stable identity of an event across
            // updates. Matching on (start, end, summary, status) instead meant an
            // event whose DATES changed upstream was imported as a NEW row while
            // the old row stayed forever — the nights it used to cover were then
            // blocked permanently, on a listing nobody was booking. And a channel
            // that varies its summary text ("Reserved" vs "CLOSED - Not
            // available") produced a duplicate on every single sync.
            const uid = event.uid ? String(event.uid) : null;
            if (uid) seenUids.add(uid);

            const exists = occupancyCalendar.some(entry => {
              // Prefer identity when both sides have one.
              if (uid && entry.icsUid) return String(entry.icsUid) === uid;

              const entryStart = normalizeDate(entry.startDate);
              const entryEnd = normalizeDate(entry.endDate);

              const entryGuest = (entry.guestName || "ICS Guest").trim();
              const entryStatus = (entry.status || "booked").trim();

              const match =
                entryStart === newStart &&
                entryEnd === newEnd &&
                entryGuest === guestName &&
                entryStatus === status;

              // console.log('🔍 Comparing booking:', {
              //   entryStart,
              //   newStart,
              //   entryEnd,
              //   newEnd,
              //   entryGuest,
              //   guestName,
              //   entryStatus,
              //   status,
              //   match
              // });

              return match;
            });

            if (!exists) {
              console.log('➕ No match found. Adding booking:', {
                startDate: newStart,
                endDate: newEnd,
                guestName,
                status
              });

              occupancyCalendar.push({
                startDate: new Date(`${newStart}T00:00:00Z`),
                endDate: new Date(`${newEnd}T00:00:00Z`),
                guestName,
                status,
                source: 'ics',
                icsUid: uid || undefined,
                calendarSyncId: feed.feedId || undefined,
              });

              updated = true;
              addedCount++;
            } else if (uid) {
              // Known event: move it if the dates changed upstream, rather than
              // leaving the old range blocked and adding a second row.
              const existing = occupancyCalendar.find(
                (entry) => String(entry.icsUid || "") === uid
              );
              if (existing && normalizeDate(existing.startDate) !== newStart) {
                existing.startDate = new Date(`${newStart}T00:00:00Z`);
                existing.endDate = new Date(`${newEnd}T00:00:00Z`);
                updated = true;
              } else if (existing && normalizeDate(existing.endDate) !== newEnd) {
                existing.endDate = new Date(`${newEnd}T00:00:00Z`);
                updated = true;
              }
            } else {
              console.log('✅ Duplicate booking found. Skipping.');
            }
          }

          // DELETION RECONCILIATION.
          //
          // The importer only ever ADDED. When a guest cancelled on Airbnb the
          // event disappeared from the feed, and the block here stayed — for
          // good. Nights the host could sell were silently dead, with nothing in
          // the UI to say why, and the loss compounded with every cancellation.
          //
          // Only rows this feed created and that carry a UID are considered:
          // rows imported before UIDs were recorded cannot be matched against
          // the feed, so removing them would be a guess, and a wrong guess here
          // frees dates that are genuinely booked.
          if (feed.feedId) {
            const before = occupancyCalendar.length;
            for (let i = occupancyCalendar.length - 1; i >= 0; i--) {
              const entry = occupancyCalendar[i];
              if (entry.source !== 'ics') continue;
              if (String(entry.calendarSyncId || '') !== String(feed.feedId)) continue;
              if (!entry.icsUid) continue;
              if (seenUids.has(String(entry.icsUid))) continue;
              occupancyCalendar.splice(i, 1);
            }
            const removed = before - occupancyCalendar.length;
            if (removed) {
              updated = true;
              console.log(
                `➖ ${name || _id} / ${feed.label} — released ${removed} block(s) no longer in the feed.`
              );
            }
          }

          if (feed.doc) {
            feed.doc.lastSyncAt = new Date();
            feed.doc.lastSyncStatus = 'ok';
            feed.doc.lastSyncError = undefined;
            feed.doc.lastImportedCount = addedCount;
            updated = true;
          }

          console.log(
            addedCount
              ? `✅ ${name || _id} / ${feed.label} — ${addedCount} new booking(s) added.`
              : `✓ ${name || _id} / ${feed.label} — all bookings already exist.`
          );
        } catch (error) {
          console.error(`❌ Error syncing ${name || _id} / ${feed.label}:`, error.message);
          // A dead link on one calendar must not stop the host's other calendars
          // from importing, so the failure is recorded and the loop carries on.
          if (feed.doc) {
            feed.doc.lastSyncAt = new Date();
            feed.doc.lastSyncStatus = 'error';
            feed.doc.lastSyncError = String(error.message || '').slice(0, 300);
            updated = true;
          }
        }
      }

      if (updated) {
        try {
          await accommodation.save();
        } catch (saveError) {
          console.error(`❌ Error saving ${name || _id}:`, saveError.message);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Sync complete.`);
  } catch (err) {
    console.error("🚨 Sync error:", err.message);
  }
};

// Fix ONE accommodation by ID
export const fixCoordinatesForOne = async (req, res) => {
  try {
    const { id } = req.params;
    const acc = await Accommodation.findById(id);

    if (!acc) return res.status(404).json({ error: "Accommodation not found" });

    // 👇 use streetAndNumber as the full address
    const fullAddress = acc.locationDetails?.streetAndNumber;
    if (!fullAddress) {
      return res.status(400).json({ error: "No streetAndNumber found" });
    }

    const coords = await getLatLngFromAddress(fullAddress);

    if (coords) {
      acc.location.latitude = coords.latitude;
      acc.location.longitude = coords.longitude;
      acc.location.address = fullAddress; // optional sync

      await acc.save();

      return res.json({
        success: true,
        id: acc._id,
        addressUsed: fullAddress,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } else {
      return res.status(400).json({ error: "Could not find coordinates for this address" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getStripeEnabledAccommodations = async (req, res) => {
  try {
    const accommodations = await Accommodation.find({
      stripeEnabled: true,
    })
    .sort({ createdAt: -1 })
    .lean();

    res.status(200).json(accommodations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
};


// controllers/accommodationController.js
export const getAllRecommendedAccommodations = async (req, res) => {
  try {
    const cacheKey = "accommodations:recommended";

    // 1️⃣ Check cache first
    let cachedData = null;
    try {
      cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log("⚡ CACHE HIT! Returning recommended accommodations");
        return res.status(200).json(JSON.parse(cachedData));
      } else {
        console.log("🐢 CACHE MISS! Fetching recommended accommodations from MongoDB");
      }
    } catch (err) {
      console.error("Redis GET failed:", err);
    }

    // 2️⃣ Fetch from MongoDB
    const recommendedStays = await Accommodation.find({ recommended: true })
      .select("_id name slug pricePerNight location locationDetails images recommended averageRating reviews description")
      .sort({ createdAt: -1 })
      .lean();

    // 3️⃣ Cache the result for 1 hour
    try {
      const setResult = await redisClient.setEx(cacheKey, 3600, JSON.stringify(recommendedStays));
      console.log("✅ Cached recommended accommodations in Redis:", setResult);
    } catch (err) {
      console.error("Redis SET failed:", err);
    }

    res.status(200).json(recommendedStays);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recommended stays" });
  }
};

// controllers/accommodationController.js
export const getAccommodationCounts = async (req, res) => {
  try {
    const CACHE_KEY = "accommodations:counts:city";

    // ✅ 1. Try Redis first
    let cachedData = null;
    try {
      cachedData = await redisClient.get(CACHE_KEY);
      if (cachedData) {
        console.log("⚡ CACHE HIT! Returning city counts");
        return res.status(200).json(JSON.parse(cachedData));
      } else {
        console.log("🐢 CACHE MISS! Fetching city counts from MongoDB");
      }
    } catch (err) {
      console.error("Redis GET failed:", err);
    }

    const DEMO_CATS = [
      "bratislava",
      "košice",
      "banská bystrica",
      "trenčín",
      "žilina",
      "prešov",
      "trnava",
      "nitra",
      "poprad",
      "martin",
      "ružomberok",
      "spišská nová ves"
    ];

    const counts = await Promise.all(
      DEMO_CATS.map(async (city) => {
        const filters = {
          "locationDetails.city": {
            $regex: `^${city.trim()}$`,
            $options: "i"
          }
        };

        const count = await Accommodation.countDocuments(filters);
        return { city, count };
      })
    );

    // ✅ 2. Store in Redis (10 min cache)
    try {
      const result = await redisClient.setEx(
        CACHE_KEY,
        14400, // 4 hours
        JSON.stringify(counts)
      );
      console.log("💾 Cached city counts:", result);
    } catch (err) {
      console.error("Redis SET failed:", err);
    }

    res.status(200).json(counts);

  } catch (error) {
    console.error("Error fetching accommodation counts:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getLatestAccommodations = async (req, res) => {
  try {
    const cacheKey = "accommodations:latest:8";

    // Try fetching from Redis first
    let cachedData = null;
    try {
      cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log("⚡ CACHE HIT! Returning latest accommodations");
        return res.status(200).json(JSON.parse(cachedData));
      } else {
        console.log("🐢 CACHE MISS! Fetching latest accommodations from MongoDB");
      }
    } catch (err) {
      console.error("Redis GET failed:", err);
    }

    // Fetch latest 8 from MongoDB
    const latestAccommodations = await Accommodation.find()
      .select("_id name slug pricePerNight location locationDetails images averageRating reviews description")
      .limit(8)
      .lean();

    // Cache for 10 minutes
    try {
      await redisClient.setEx(cacheKey, 600, JSON.stringify(latestAccommodations));
      console.log("💾 Cached latest accommodations for 10 mins: OK");
    } catch (err) {
      console.error("Redis SET failed:", err);
    }

    res.status(200).json(latestAccommodations);

  } catch (error) {
    console.error("Error fetching latest accommodations:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /accommodation/listing-stats
// Returns { propertyCount, totalReviews, averageRating } for the current
// search/filter context (same query params as searchAccommodationsByCategory).
// ────────────────────────────────────────────────────────────────────────────
export const getListingStats = async (req, res) => {
  try {
    const {
      category,
      city,
      country,
      propertyType,
      location,
      minPrice,
      maxPrice,
      pet,
      smoking,
      rentalform,
      parkingFacilities,
      services,
      bathroomAmenities,
      kitchenDiningAmenities,
      heatingCoolingAmenities,
      safetyAmenities,
      wellnessAmenities,
      outdoorAmenities,
      checkIn,
      meals,
      person,
      beds,
      bedroomCount,
      bathroomCount,
      startDate,
      endDate,
      partyOrganizing,
      name,
    } = req.query;

    let filters = {};

    if (propertyType) {
      let arr;
      try { arr = JSON.parse(propertyType); }
      catch { arr = propertyType.replace(/\[|\]/g, '').split(',').map(s => s.trim()); }
      filters['propertyType.en'] = { $in: arr };
    }

    if (city) filters['locationDetails.city'] = city.toLowerCase();
    if (country) filters['locationDetails.country'] = country;
    if (location) filters['location.address'] = location;

    if (minPrice || maxPrice) {
      filters.pricePerNight = {};
      if (minPrice) filters.pricePerNight.$gte = parseFloat(minPrice);
      if (maxPrice) filters.pricePerNight.$lte = parseFloat(maxPrice);
    }

    if (pet) filters['pet.en'] = pet;
    if (smoking) filters['smoking.en'] = smoking;
    if (rentalform) filters['rentalform.en'] = rentalform;
    if (partyOrganizing) filters['partyOrganizing.en'] = partyOrganizing;

    if (name) {
      filters.$or = [
        { name: { $regex: name, $options: 'i' } },
        { 'name.en': { $regex: name, $options: 'i' } },
        { accommodationName: { $regex: name, $options: 'i' } },
      ];
    }

    if (person) filters.person = { $gte: parseInt(person) };
    if (beds) filters.beds = { $lte: parseInt(beds) };
    if (bedroomCount) filters.bedroom = { $gte: parseInt(bedroomCount) };
    if (bathroomCount) filters.bathroom = { $gte: parseInt(bathroomCount) };

    const handleArrayFilter = (param, field) => {
      if (param) {
        let arr;
        try { arr = JSON.parse(param); }
        catch { arr = param.replace(/\[|\]/g, '').split(',').map(s => s.trim()); }
        filters[`${field}.en`] = { $in: arr };
      }
    };

    handleArrayFilter(services, 'services');
    handleArrayFilter(bathroomAmenities, 'bathroomAmenities');
    handleArrayFilter(kitchenDiningAmenities, 'kitchenDiningAmenities');
    handleArrayFilter(heatingCoolingAmenities, 'heatingCoolingAmenities');
    handleArrayFilter(safetyAmenities, 'safetyAmenities');
    handleArrayFilter(wellnessAmenities, 'wellnessAmenities');
    handleArrayFilter(outdoorAmenities, 'outdoorAmenities');
    handleArrayFilter(parkingFacilities, 'parkingFacilities');
    handleArrayFilter(checkIn, 'checkIn');
    handleArrayFilter(meals, 'meals');

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filters.excludedDates = {
        $not: { $elemMatch: { $gte: start, $lte: end } }
      };
      filters.occupancyCalendar = {
        $not: {
          $elemMatch: {
            $or: [
              { startDate: { $lt: end, $gte: start } },
              { endDate: { $gt: start, $lte: end } },
              { startDate: { $lte: start }, endDate: { $gte: end } }
            ],
            status: 'booked'
          }
        }
      };
    }

    // Count matching properties
    const propertyCount = await Accommodation.countDocuments(filters);

    // Aggregate total reviews and average rating from matching accommodations
    const stats = await Accommodation.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: { $size: { $ifNull: ['$reviews', []] } } },
          avgRating: { $avg: '$averageRating' },
        }
      }
    ]);

    const totalReviews = stats[0]?.totalReviews ?? 0;
    const averageRating = stats[0]?.avgRating
      ? parseFloat(stats[0].avgRating.toFixed(1))
      : 0;

    res.status(200).json({ propertyCount, totalReviews, averageRating });
  } catch (error) {
    console.error('Error in getListingStats:', error);
    res.status(500).json({ error: 'Failed to fetch listing stats' });
  }
};

// Lightweight Accommodation Sitemap API
export const getAccommodationSitemap = async (req, res) => {
  try {
    const CACHE_KEY = "sitemap:accommodations";

    // 1. Redis check
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      console.log("⚡ Accommodation Sitemap CACHE HIT");
      return res.json(JSON.parse(cached));
    }

    console.log("🐢 Accommodation Sitemap CACHE MISS");

    // 2. Fetch minimal data ONLY
    const accommodations = await Accommodation.find()
      .select("slug name description createdAt updatedAt")
      .lean();

    // 3. Cache (1 day)
    await redisClient.setEx(
      CACHE_KEY,
      86400, // 24 hours
      JSON.stringify(accommodations)
    );

    res.json(accommodations);

  } catch (error) {
    console.error("Accommodation sitemap error:", error);
    res.status(500).json({ error: "Error fetching accommodation sitemap" });
  }
};