// utils/normaliseReservationDates.js
//
// One-off migration: snap existing check-in / check-out values to UTC midnight
// of the calendar day the guest actually picked.
//
//   npm run normalise-dates          # report only, changes nothing
//   npm run normalise-dates -- --apply
//
// Bookings created before the fix stored the guest's LOCAL midnight, so a stay
// booked from Karachi (UTC+5) sits at 19:00 on the previous day. Every reader
// now normalises on the way out, so this migration is not required for
// correctness — it just makes the stored data say what it means, which matters
// for anything querying dates directly (reports, exports, Mongo shell).
//
// Safe to re-run: normalising an already-normalised date is a no-op.

import mongoose from "mongoose";
import "../config/env.js";
import Reservation from "../models/Reservation.js";
import { calendarDateUtc } from "./timezone.js";

const APPLY = process.argv.includes("--apply");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, {});
  console.log(`Connected. Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const reservations = await Reservation.find({}).select(
    "_id name checkInDate checkOutDate"
  );

  let shifted = 0;
  let untouched = 0;
  let skipped = 0;
  const examples = [];

  for (const r of reservations) {
    const inUtc = calendarDateUtc(r.checkInDate);
    const outUtc = calendarDateUtc(r.checkOutDate);

    if (!inUtc || !outUtc) {
      skipped++;
      console.warn(`  SKIP ${r._id}: unparseable dates`);
      continue;
    }

    const changed =
      inUtc.getTime() !== new Date(r.checkInDate).getTime() ||
      outUtc.getTime() !== new Date(r.checkOutDate).getTime();

    if (!changed) {
      untouched++;
      continue;
    }

    shifted++;
    if (examples.length < 10) {
      examples.push(
        `  ${r._id} ${r.name || ""}\n` +
          `    ${new Date(r.checkInDate).toISOString()} -> ${inUtc.toISOString()}\n` +
          `    ${new Date(r.checkOutDate).toISOString()} -> ${outUtc.toISOString()}`
      );
    }

    if (APPLY) {
      await Reservation.updateOne(
        { _id: r._id },
        { $set: { checkInDate: inUtc, checkOutDate: outUtc } }
      );
    }
  }

  console.log(examples.join("\n"));
  console.log(
    `\n${reservations.length} reservations: ${shifted} to normalise, ` +
      `${untouched} already correct, ${skipped} skipped`
  );
  if (shifted && !APPLY) {
    console.log("\nDry run — nothing was written. Re-run with --apply to commit.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("normaliseReservationDates failed:", err);
  process.exit(1);
});
