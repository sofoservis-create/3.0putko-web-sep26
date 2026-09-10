import { randomUUID } from "node:crypto";
import { Storage, type File } from "@google-cloud/storage";
import sharp from "sharp";

const SIDECAR = "http://127.0.0.1:1106";
export const HOST_PHOTO_MAX_BYTES = 12 * 1024 * 1024;
export const HOST_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const privateDir = () => {
  const value = process.env.PRIVATE_OBJECT_DIR;
  if (!value) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  const [, bucket, ...parts] = value.split("/");
  if (!bucket) throw new Error("PRIVATE_OBJECT_DIR is invalid");
  return { bucket: storage.bucket(bucket), prefix: parts.join("/").replace(/\/$/, "") };
};

const object = (name: string): File => {
  const { bucket, prefix } = privateDir();
  return bucket.file(`${prefix}/${name}`);
};

const signPut = async (name: string, contentType: string) => {
  const { bucket, prefix } = privateDir();
  const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucket.name,
      object_name: `${prefix}/${name}`,
      method: "PUT",
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      content_type: contentType,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Could not create upload URL (${response.status})`);
  const body = await response.json() as { signed_url: string };
  return body.signed_url;
};

export const requestHostPhotoUpload = async (guestId: string, contentType: string) => {
  const uploadId = randomUUID();
  const objectPath = `host-profile-photos/staging/${guestId}/${uploadId}`;
  return { uploadUrl: await signPut(objectPath, contentType), objectPath };
};

export const isOwnedStagingPath = (path: string, guestId: string) =>
  /^host-profile-photos\/staging\/[0-9a-f-]+\/[0-9a-f-]+$/.test(path) &&
  path.startsWith(`host-profile-photos/staging/${guestId}/`);

type Crop = { x: number; y: number; size: number };

export const orientedImageSize = (width: number, height: number, orientation?: number) =>
  orientation && orientation >= 5 && orientation <= 8
    ? { width: height, height: width }
    : { width, height };

export const prepareHostPhoto = async (guestId: string, stagingPath: string, crop: Crop) => {
  if (!isOwnedStagingPath(stagingPath, guestId)) throw Object.assign(new Error("Photo is not owned by this host"), { status: 403 });
  const version = stagingPath.split("/").at(-1)!;
  const base = `host-profile-photos/final/${guestId}/${version}`;
  const result = {
    avatarUrl: `/api/test-auth/host-profile-photo/${guestId}/${version}/avatar.webp`,
    profileUrl: `/api/test-auth/host-profile-photo/${guestId}/${version}/profile.webp`,
  };
  const finalFiles = ["avatar", "profile"].map((variant) => object(`${base}/${variant}.webp`));
  const existing = await Promise.all(finalFiles.map((file) => file.exists()));
  if (existing.every(([exists]) => exists)) return result;

  const source = object(stagingPath);
  const [metadata] = await source.getMetadata();
  const bytes = Number(metadata.size ?? 0);
  if (!bytes || bytes > HOST_PHOTO_MAX_BYTES) throw Object.assign(new Error("Photo is too large"), { status: 413, code: "fileTooLarge" });
  const [buffer] = await source.download();
  let pipeline;
  try {
    pipeline = sharp(buffer, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
    const info = await pipeline.metadata();
    if (!info.width || !info.height) throw new Error("Missing dimensions");
    const oriented = orientedImageSize(info.width, info.height, info.orientation);
    const maxSize = Math.min(oriented.width, oriented.height);
    const size = Math.max(1, Math.min(maxSize, Math.round(crop.size * maxSize)));
    const left = Math.max(0, Math.min(oriented.width - size, Math.round(crop.x * (oriented.width - size))));
    const top = Math.max(0, Math.min(oriented.height - size, Math.round(crop.y * (oriented.height - size))));
    pipeline = sharp(buffer, { failOn: "error", limitInputPixels: 50_000_000 }).rotate().extract({ left, top, width: size, height: size });
  } catch {
    await source.delete({ ignoreNotFound: true });
    throw Object.assign(new Error("Photo could not be decoded"), { status: 400, code: "corruptImage" });
  }

  const variants = [
    { name: "avatar", size: 256, quality: 82 },
    { name: "profile", size: 768, quality: 86 },
  ];
  try {
    await Promise.all(variants.map(async ({ name, size, quality }) => {
      const output = await pipeline.clone().resize(size, size, { fit: "cover" }).webp({ quality }).toBuffer();
      await object(`${base}/${name}.webp`).save(output, {
        resumable: false,
        contentType: "image/webp",
        metadata: { cacheControl: "public,max-age=31536000,immutable", metadata: { ownerId: guestId } },
      });
    }));
    await source.delete({ ignoreNotFound: true });
    return result;
  } catch (error) {
    await Promise.all(finalFiles.map((file) => file.delete({ ignoreNotFound: true })));
    throw error;
  }
};

export const managedPhotoOwner = (url: string) => {
  const match = url.match(/^\/api\/test-auth\/host-profile-photo\/([0-9a-f-]+)\/([0-9a-f-]+)\/avatar\.webp$/);
  return match ? { guestId: match[1], version: match[2] } : null;
};

export const serveHostPhoto = async (guestId: string, version: string, variant: string) => {
  if (!/^[0-9a-f-]+$/.test(guestId) || !/^[0-9a-f-]+$/.test(version) || !["avatar", "profile"].includes(variant)) return null;
  const file = object(`host-profile-photos/final/${guestId}/${version}/${variant}.webp`);
  const [exists] = await file.exists();
  return exists ? file : null;
};

export const deleteManagedHostPhoto = async (url: string | null | undefined) => {
  if (!url) return;
  const parsed = managedPhotoOwner(url);
  if (!parsed) return;
  await Promise.all(["avatar", "profile"].map((variant) =>
    object(`host-profile-photos/final/${parsed.guestId}/${parsed.version}/${variant}.webp`).delete({ ignoreNotFound: true }),
  ));
};

export const deleteHostPhotoVersion = async (guestId: string, version: string) => {
  if (!/^[0-9a-f-]+$/.test(version)) return;
  await Promise.all([
    ...["avatar", "profile"].map((variant) =>
      object(`host-profile-photos/final/${guestId}/${version}/${variant}.webp`).delete({ ignoreNotFound: true }),
    ),
    object(`host-profile-photos/staging/${guestId}/${version}`).delete({ ignoreNotFound: true }),
  ]);
};