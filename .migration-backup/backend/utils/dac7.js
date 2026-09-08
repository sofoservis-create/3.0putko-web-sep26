// utils/dac7.js
// DAC7 (Slovak act 250/2022) — annual report to the Financial Administration,
// due 31 January, covering every host who earned money through the platform.
// Penalties are 3 000 – 10 000 EUR and repeatable.
//
// The aggregate is maintained continuously as payouts settle, so the January
// export is a read of existing data rather than a reconstruction from records
// that may by then be incomplete or archived.

import Dac7Record from "../models/Dac7Record.js";
import Accommodation from "../models/Accommodation.js";
import { businessYearOf, startOfBusinessYearUtc, endOfBusinessYearUtc } from "./timezone.js";
import { resolveHostForReservation } from "../Controllers/PaymentController.js";

/** Nights between check-in and check-out. */
function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatPropertyAddress(listing) {
  if (!listing) return null;
  const d = listing.locationDetails || {};
  const parts = [d.streetAndNumber, d.city, d.zipCode, d.country].filter(Boolean);
  return parts.length ? parts.join(", ") : listing.location?.address || null;
}

/**
 * Fold a settled reservation into its host's yearly DAC7 aggregate.
 * Idempotent: `countedReservations` guarantees a reservation is counted once,
 * however many times a payout webhook or sweep retries.
 */
export async function recordReservationForDac7(reservation, host) {
  try {
    if (!host?._id) return null;

    const year = businessYearOf(reservation.transferredAt || new Date());
    const listing = await Accommodation.findById(
      reservation.accommodationId?._id || reservation.accommodationId
    ).select("locationDetails location name");

    const propertyAddress = formatPropertyAddress(listing);
    const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
    const consideration = Math.round(reservation.totalPriceCents || 0);
    const fees = Math.round(reservation.platformFeeCents || 0);

    const existing = await Dac7Record.findOne({ host: host._id, year });

    if (existing?.countedReservations?.some((id) => String(id) === String(reservation._id))) {
      return existing; // already counted
    }

    const identity = {
      hostName: [host.name, host.lastName].filter(Boolean).join(" ") || host.name,
      companyName: host.companyName,
      ico: host.ico || host.idNumber,
      dic: host.dic || host.tin,
      icDph: host.icDph || host.vatNumber,
      taxIdentificationNumber: host.dic || host.tin || host.ico || host.idNumber,
      address: {
        street: host.streetNumber,
        city: host.city,
        zip: host.zipcode,
        country: host.countryCode || host.country || "SK",
      },
      // The filing needs the real account identifier. `payoutIban` is Stripe's
      // masked form (SK****1234) and is only a fallback so the row is not empty
      // — a record carrying only the mask is reported as incomplete by
      // getDac7Summary rather than filed as if it were valid.
      iban: host.payoutIbanFull || host.payoutIban,
      ibanIsMasked: !host.payoutIbanFull,
      // Stamped by HostController only when the checksum passed. A number that
      // failed it is still accepted and stored — the profile save must not be
      // blocked — so the check moves here, where a bad identifier would actually
      // do damage.
      ibanVerified: Boolean(host.payoutIbanFull && host.payoutIbanVerifiedAt),
    };

    await Dac7Record.updateOne(
      { host: host._id, year },
      {
        $inc: {
          totalConsiderationCents: consideration,
          platformFeesCents: fees,
          numberOfNights: nights,
          bookingCount: 1,
        },
        $addToSet: {
          countedReservations: reservation._id,
          ...(propertyAddress ? { propertyAddresses: propertyAddress } : {}),
        },
        $set: { ...identity, lastAggregatedAt: new Date() },
        $setOnInsert: { host: host._id, year },
      },
      { upsert: true }
    );

    return Dac7Record.findOne({ host: host._id, year });
  } catch (err) {
    // Reporting data must never break a payout that already succeeded.
    console.error("recordReservationForDac7 error:", err.message);
    return null;
  }
}

/** Subtract a refund from the year's reportable consideration. */
export async function recordRefundForDac7(reservation, host, refundedCents) {
  try {
    if (!host?._id || !refundedCents) return;
    const year = businessYearOf(reservation.transferredAt || reservation.paidAt || new Date());
    await Dac7Record.updateOne(
      { host: host._id, year },
      { $inc: { refundedCents: Math.round(refundedCents) }, $set: { lastAggregatedAt: new Date() } }
    );
  } catch (err) {
    console.error("recordRefundForDac7 error:", err.message);
  }
}

/**
 * Rebuild a year from scratch. Use for backfilling historic data or after a
 * correction — the continuous aggregate remains the primary source.
 */
export async function rebuildDac7Year(year, { Reservation, Host }) {
  const start = startOfBusinessYearUtc(year);
  const end = endOfBusinessYearUtc(year);

  const reservations = await Reservation.find({
    payoutStatus: "released",
    transferredAt: { $gte: start, $lt: end },
  });

  await Dac7Record.deleteMany({ year });

  let counted = 0;
  const unresolved = [];

  for (const reservation of reservations) {
    // Resolve the host the same way the payout did.
    //
    // This used to be `Host.findById(reservation.accommodationProvider)`, which
    // ignores the known ambiguity between `accommodationProvider` and the
    // listing's `userId` — the very thing resolveHostForReservation exists to
    // handle. When the two disagreed, a rebuild silently attributed a host's
    // income to the wrong party or dropped it from the filing entirely.
    const { host, conflict } = await resolveHostForReservation(reservation);

    if (conflict || !host) {
      unresolved.push({
        reservationId: String(reservation._id),
        reason: conflict ? "host_conflict" : "host_not_found",
      });
      continue;
    }

    await recordReservationForDac7(reservation, host);
    if (reservation.refundAmountCents > 0) {
      await recordRefundForDac7(reservation, host, reservation.refundAmountCents);
    }
    counted++;
  }

  if (unresolved.length) {
    // A filing that quietly omits sellers is worse than one that reports a
    // problem: the penalty is 3 000 – 10 000 EUR and repeatable.
    console.error(
      `[dac7] ${unresolved.length} reservations could not be attributed to a host in ${year}`,
      unresolved
    );
  }

  return { year, reservationsProcessed: counted, unresolved };
}

const xmlEscape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const cents = (v) => (Math.round(Number(v) || 0) / 100).toFixed(2);

/**
 * DAC7 XML for a reporting year.
 *
 * The element names below follow the DAC7 / DPI schema shape. Confirm the exact
 * namespace and message-header values against the Financial Administration's
 * current XSD before the first live submission — the schema is versioned and
 * validated server-side on upload.
 */
export function buildDac7Xml(records, year, platform = {}) {
  const reportables = records
    .map((r) => {
      const net = Math.max(0, (r.totalConsiderationCents || 0) - (r.refundedCents || 0));
      return `
    <ReportableSeller>
      <Identity>
        <Name>${xmlEscape(r.companyName || r.hostName)}</Name>
        <TIN issuedBy="${xmlEscape(r.address?.country || "SK")}">${xmlEscape(r.taxIdentificationNumber)}</TIN>
        <VATIdentificationNumber>${xmlEscape(r.icDph || "")}</VATIdentificationNumber>
        <BusinessRegistrationNumber>${xmlEscape(r.ico || "")}</BusinessRegistrationNumber>
        <Address>
          <Street>${xmlEscape(r.address?.street || "")}</Street>
          <City>${xmlEscape(r.address?.city || "")}</City>
          <PostalCode>${xmlEscape(r.address?.zip || "")}</PostalCode>
          <CountryCode>${xmlEscape(r.address?.country || "SK")}</CountryCode>
        </Address>
      </Identity>
      <FinancialIdentifier>${xmlEscape(r.iban || "")}</FinancialIdentifier>
      <ImmovableProperty>
${(r.propertyAddresses || [])
  .map((address) => `        <PropertyListing><Address>${xmlEscape(address)}</Address></PropertyListing>`)
  .join("\n")}
        <NumberOfRentedDays>${r.numberOfNights || 0}</NumberOfRentedDays>
        <NumberOfTransactions>${r.bookingCount || 0}</NumberOfTransactions>
        <Consideration currency="EUR">${cents(net)}</Consideration>
        <FeesWithheld currency="EUR">${cents(r.platformFeesCents)}</FeesWithheld>
      </ImmovableProperty>
    </ReportableSeller>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<DAC7Report>
  <MessageSpec>
    <SendingEntity>${xmlEscape(platform.name || "Putko s.r.o.")}</SendingEntity>
    <SendingEntityIN>${xmlEscape(platform.ico || "")}</SendingEntityIN>
    <TransmittingCountry>SK</TransmittingCountry>
    <ReportingPeriod>${year}-12-31</ReportingPeriod>
    <Timestamp>${new Date().toISOString()}</Timestamp>
  </MessageSpec>
  <ReportableSellers>
${reportables}
  </ReportableSellers>
</DAC7Report>`;
}
