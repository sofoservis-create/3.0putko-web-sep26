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
import {
  deleteManagedHostPhoto,
  deleteHostPhotoVersion,
  HOST_PHOTO_MAX_BYTES,
  HOST_PHOTO_TYPES,
  prepareHostPhoto,
  requestHostPhotoUpload,
  serveHostPhoto,
} from "../lib/host-profile-storage";

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

router.post("/test-auth/host-profile-photo/upload-url", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const { size, contentType } = req.body ?? {};
  if (!Number.isInteger(size) || size <= 0 || size > HOST_PHOTO_MAX_BYTES) {
    res.status(413).json({ message: "Photo is too large", code: "fileTooLarge" });
    return;
  }
  if (!HOST_PHOTO_TYPES.includes(contentType)) {
    res.status(400).json({ message: "Unsupported photo type", code: "unsupportedType" });
    return;
  }
  res.json(await requestHostPhotoUpload(auth.guest.id, contentType));
});

router.post("/test-auth/host-profile-photo/prepare", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const { objectPath, crop } = req.body ?? {};
  if (typeof objectPath !== "string" || !crop || ![crop.x, crop.y, crop.size].every((value) => typeof value === "number" && value >= 0 && value <= 1)) {
    res.status(400).json({ message: "Invalid crop", code: "invalidCrop" });
    return;
  }
  try {
    res.json(await prepareHostPhoto(auth.guest.id, objectPath, crop));
  } catch (error) {
    const typed = error as Error & { status?: number; code?: string };
    res.status(typed.status ?? 500).json({ message: typed.message, code: typed.code ?? "photoProcessingFailed" });
  }
});

router.delete("/test-auth/host-profile-photo/:version", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const version = String(req.params.version);
  const active = await loadProfile(auth.guest.id);
  if (active?.avatarUrl?.includes(`/${version}/`)) {
    res.status(409).json({ message: "Active profile photo cannot be discarded" });
    return;
  }
  await deleteHostPhotoVersion(auth.guest.id, version);
  res.sendStatus(204);
});

router.get("/test-auth/host-profile-photo/:guestId/:version/:file", async (req, res): Promise<void> => {
  const guestId = String(req.params.guestId);
  const version = String(req.params.version);
  const variant = String(req.params.file).replace(/\.webp$/, "");
  const file = await serveHostPhoto(guestId, version, variant);
  if (!file) {
    res.status(404).json({ message: "Photo not found" });
    return;
  }
  res.set({ "Content-Type": "image/webp", "Cache-Control": "public,max-age=31536000,immutable" });
  file.createReadStream().on("error", (error) => {
    req.log.warn({ error }, "Could not stream host profile photo");
    if (!res.headersSent) res.sendStatus(404);
  }).pipe(res);
});

router.put("/test-auth/host-profile", async (req, res): Promise<void> => {
  const auth = await requireHostGuest(req, res);
  if (!auth) return;
  const validation = validateHostProfileInput(req.body, auth.guest.id);
  if (!validation.ok) {
    res.status(400).json({
      message: "Invalid host profile",
      code: "invalidProfile",
      errors: validation.errors,
    });
    return;
  }
  const { value } = validation;
  const previous = await loadProfile(auth.guest.id);
  const [row] = await db
    .insert(testHostProfilesTable)
    .values({ guestId: auth.guest.id, ...value })
    .onConflictDoUpdate({
      target: testHostProfilesTable.guestId,
      set: { ...value, updatedAt: new Date() },
    })
    .returning();
  res.json({ profile: publicHostProfile(row) });
  if (previous?.avatarUrl !== row.avatarUrl) {
    void deleteManagedHostPhoto(previous?.avatarUrl).catch((error) => req.log.warn({ error }, "Could not remove replaced host photo"));
  }
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
