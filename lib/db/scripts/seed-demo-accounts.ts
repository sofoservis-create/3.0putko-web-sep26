// lib/db/scripts/seed-demo-accounts.ts
//
// ⚠️  DEMO ACCOUNTS AND BOOKINGS. Fictional people, fictional stays, and a
// password printed to the terminal below — this exists so /prihlasenie,
// /ucet and /host can be opened and looked at during development. It
// refuses to run with NODE_ENV=production, which is a speed bump; the real
// control is not pointing DATABASE_URL at production.
//
// Passwords go through @workspace/auth, the same scrypt implementation the
// application verifies with. Seeding with a hand-rolled hash would produce
// accounts that cannot log in, which is the sort of thing that wastes an
// afternoon.
//
//   DATABASE_URL=... pnpm exec tsx scripts/seed-demo-accounts.ts

import { sql } from "drizzle-orm";
import { db, pool } from "../src/index";
import { hashPassword } from "../../auth/src/index";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo accounts with NODE_ENV=production.");
  process.exit(1);
}

const PASSWORD = "putko-demo-2026";
const HOST_EMAIL = "demo-host@putko.example";
const GUEST_EMAIL = "demo-hostka@putko.example";

// The three fixed tiers, expanded. Snapshotted onto each booking so a host
// editing their policy later cannot retroactively change what an existing
// guest was promised — the refund path must never JOIN back to the listing.
const POLICIES: Record<string, Array<{ hoursBefore: number; refundPercent: number }>> = {
  flexible: [{ hoursBefore: 24, refundPercent: 100 }, { hoursBefore: 0, refundPercent: 0 }],
  standard: [{ hoursBefore: 120, refundPercent: 100 }, { hoursBefore: 24, refundPercent: 50 }, { hoursBefore: 0, refundPercent: 0 }],
  strict: [{ hoursBefore: 336, refundPercent: 100 }, { hoursBefore: 168, refundPercent: 50 }, { hoursBefore: 0, refundPercent: 0 }],
};

const COMMISSION_RATE = 0.06;

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const hash = await hashPassword(PASSWORD);

// Host: give the existing demo listing owner a usable login and activate
// host mode, so /host has an account behind it.
await db.execute(sql`
  UPDATE putko_test_guests
     SET password_hash = ${hash},
         host_activated_at = COALESCE(host_activated_at, now()),
         role = 'host',
         is_verified = true
   WHERE email = ${HOST_EMAIL}
`);

// Guest.
await db.execute(sql`
  INSERT INTO putko_test_guests
    (email, password_hash, name, last_name, phone_number, gender, role, is_verified)
  VALUES (${GUEST_EMAIL}, ${hash}, 'Zuzana', 'Demová', '+421900111222', 'unspecified', 'guest', true)
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_verified = true
`);

// Bookings for the guest, across three demo listings and three states, so
// every branch of the account pages has something real to render.
// [listingSlug, checkInOffset, nights, guests, status, refundedShare]
const BOOKINGS: Array<[string, number, number, number, string, number]> = [
  ["chalet-demanovska-dolina", 21, 3, 8, "confirmed", 0],
  ["apartman-solisko-strbske-pleso", 60, 4, 3, "request_pending", 0],
  ["penzion-hrabusice-pri-raji", -30, 2, 6, "completed", 0],
  ["byt-v-centre-kosic", -90, 2, 2, "cancelled", 1],
];

let written = 0;
for (const [slug, offset, nights, guests, status, refundShare] of BOOKINGS) {
  const checkIn = day(offset);
  const checkOut = day(offset + nights);

  const [listing] = (
    await db.execute(sql`
      SELECT id, base_price_cents, cancellation_policy
        FROM listings WHERE slug = ${slug}
    `)
  ).rows as Array<{ id: string; base_price_cents: number; cancellation_policy: string }>;

  if (!listing) {
    console.error(`  skipped ${slug} — no such listing (run seed:demo-listings first)`);
    continue;
  }

  // Commission is 6 % of the charge, and the host payout is the remainder —
  // computed here the way the real thing must: the platform transfers LESS
  // than it charged. There is no separate fee line and no second API call.
  const total = listing.base_price_cents * nights;
  const commission = Math.round(total * COMMISSION_RATE);
  const payout = total - commission;
  const refunded = Math.round(total * refundShare);

  await db.execute(sql`
    INSERT INTO bookings
      (listing_id, guest_name, guest_email, guest_phone, guest_confirmed_adult_at,
       check_in, check_out, guest_count, status,
       total_cents, commission_cents, host_payout_cents, refunded_cents,
       cancellation_policy_snapshot,
       cancelled_by, cancelled_at)
    VALUES
      (${listing.id}, 'Zuzana Demová', ${GUEST_EMAIL}, '+421900111222', now(),
       ${checkIn}::date, ${checkOut}::date, ${guests}, ${status}::booking_status,
       ${total}, ${commission}, ${payout}, ${refunded},
       ${JSON.stringify(POLICIES[listing.cancellation_policy] ?? POLICIES.standard)}::jsonb,
       ${status === "cancelled" ? "guest" : null},
       ${status === "cancelled" ? sql`now()` : sql`NULL`})
    ON CONFLICT DO NOTHING
  `);
  written++;
}

// Calendar blocks for the confirmed stay, so availability and the account
// pages tell the same story. Inserted through the same exclusion-constrained
// table everything else uses — if a demo stay overlapped another, this would
// fail loudly rather than quietly creating a double booking.
await db.execute(sql`
  INSERT INTO calendar_blocks (listing_id, stay, source, booking_id)
  SELECT b.listing_id, daterange(b.check_in, b.check_out, '[)'), 'booking', b.id
    FROM bookings b
   WHERE b.guest_email = ${GUEST_EMAIL}
     AND b.status = 'confirmed'
     AND NOT EXISTS (SELECT 1 FROM calendar_blocks cb WHERE cb.booking_id = b.id)
`);

console.log(`Demo accounts ready (${written} bookings).\n`);
console.log(`  Guest  ${GUEST_EMAIL}`);
console.log(`  Host   ${HOST_EMAIL}`);
console.log(`  Heslo  ${PASSWORD}\n`);
console.log("Demo data only. Never seed this against production.");

await pool.end();
