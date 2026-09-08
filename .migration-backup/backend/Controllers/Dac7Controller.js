// Controllers/Dac7Controller.js
import Dac7Record from "../models/Dac7Record.js";
import Reservation from "../models/Reservation.js";
import Host from "../models/Host.js";
import { buildDac7Xml, rebuildDac7Year } from "../utils/dac7.js";
import { businessYearOf } from "../utils/timezone.js";

/** GET /api/dac7/:year — the aggregate as JSON, for review before filing. */
export const getDac7Summary = async (req, res) => {
  try {
    const year = Number(req.params.year) || businessYearOf(new Date()) - 1;
    const records = await Dac7Record.find({ year }).populate("host", "name email");

    const totals = records.reduce(
      (acc, r) => ({
        consideration: acc.consideration + (r.totalConsiderationCents || 0),
        refunded: acc.refunded + (r.refundedCents || 0),
        fees: acc.fees + (r.platformFeesCents || 0),
        nights: acc.nights + (r.numberOfNights || 0),
        bookings: acc.bookings + (r.bookingCount || 0),
      }),
      { consideration: 0, refunded: 0, fees: 0, nights: 0, bookings: 0 }
    );

    // Rows that would be rejected or incomplete if filed as they stand.
    // A masked IBAN counts as missing: "SK****1234" is not a financial account
    // identifier, and filing it would be filing a blank. An unverified one counts
    // too: entry accepts a number that fails the mod-97 checksum rather than
    // blocking the host's profile save, so this is the last point at which a
    // typo can be caught before it is filed as the seller's account.
    const incomplete = records
      .filter(
        (r) =>
          !r.taxIdentificationNumber ||
          !r.address?.street ||
          !r.address?.city ||
          !r.iban ||
          r.ibanIsMasked ||
          (!r.ibanIsMasked && !r.ibanVerified)
      )
      .map((r) => ({
        hostId: r.host?._id,
        hostName: r.hostName || r.host?.name,
        missing: [
          !r.taxIdentificationNumber && "TIN/IČO",
          !r.address?.street && "street",
          !r.address?.city && "city",
          !r.iban && "IBAN",
          r.iban && r.ibanIsMasked && "full IBAN (only Stripe's masked value is on file)",
          r.iban && !r.ibanIsMasked && !r.ibanVerified &&
            "a valid IBAN (the number on file fails its check digits)",
        ].filter(Boolean),
      }));

    res.json({
      year,
      hostCount: records.length,
      totals,
      incomplete,
      // Filing with incomplete rows risks a 3 000 – 10 000 EUR penalty, so the
      // count is surfaced rather than left to be noticed in the list.
      readyToFile: incomplete.length === 0,
      records,
    });
  } catch (err) {
    console.error("getDac7Summary error:", err);
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/dac7/:year/export.xml — the filing itself. */
export const exportDac7Xml = async (req, res) => {
  try {
    const year = Number(req.params.year) || businessYearOf(new Date()) - 1;
    const records = await Dac7Record.find({ year });

    if (!records.length) {
      return res.status(404).json({ error: `No DAC7 data aggregated for ${year}` });
    }

    const xml = buildDac7Xml(records, year, {
      name: process.env.PLATFORM_LEGAL_NAME || "Putko s.r.o.",
      ico: process.env.PLATFORM_ICO || "",
    });

    await Dac7Record.updateMany({ year }, { $set: { exportedAt: new Date() } });

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="dac7-${year}.xml"`);
    res.send(xml);
  } catch (err) {
    console.error("exportDac7Xml error:", err);
    res.status(500).json({ error: err.message });
  }
};

/** POST /api/dac7/:year/rebuild — recompute a year from the reservations. */
export const rebuildDac7 = async (req, res) => {
  try {
    const year = Number(req.params.year);
    if (!year) return res.status(400).json({ error: "Valid year required" });

    const result = await rebuildDac7Year(year, { Reservation, Host });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("rebuildDac7 error:", err);
    res.status(500).json({ error: err.message });
  }
};
