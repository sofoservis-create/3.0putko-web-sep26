import {
  db,
  testHostAccommodationsTable,
  testHostProfilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { requireHostGuest } from "../lib/test-guest-auth";
import {
  defaultHostProfile,
  payoutReadiness,
  publicHostProfile,
  validateHostProfileInput,
} from "../lib/test-host-profile";

/**
 * Host-level (not per-property) settings for the development Host workspace:
 * the public Host Profile and read-only payout readiness. Personal details
 * and password stay on the shared `/test-auth/me` and `/change-password`
 * routes; this router never touches the account row.
 *
 * Every route resolves the host from the bearer session; the profile row is
 * keyed by that user id, so no client-supplied id can reach another host's
 * profile.
 */

const router: IRouter = Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
});

const loadProfile = async (guestId: string) => {
  const [row] = await db
    .select()
    .from(testHostProfilesTable)
    .where(eq(testHostProfilesTable.guestId, guestId))
    .limit(1);
  return row ?? null;
};

router.get("/test-auth/host-profile", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const row = await loadProfile(auth.guest.id);
  res.json({ profile: row ? publicHostProfile(row) : defaultHostProfile(auth.guest) });
});

router.put("/test-auth/host-profile", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const validation = validateHostProfileInput(req.body);
  if (!validation.ok) {
    res.status(400).json({
      message: "Invalid host profile",
      code: "invalidProfile",
      errors: validation.errors,
    });
    return;
  }
  const { value } = validation;
  const [row] = await db
    .insert(testHostProfilesTable)
    .values({ guestId: auth.guest.id, ...value })
    .onConflictDoUpdate({
      target: testHostProfilesTable.guestId,
      set: { ...value, updatedAt: new Date() },
    })
    .returning();
  res.json({ profile: publicHostProfile(row) });
});

router.get("/test-auth/host-payouts", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const listings = await db
    .select({
      status: testHostAccommodationsTable.status,
      data: testHostAccommodationsTable.data,
    })
    .from(testHostAccommodationsTable)
    .where(eq(testHostAccommodationsTable.ownerId, auth.guest.id));
  res.json({ payouts: payoutReadiness(listings) });
});

export default router;
