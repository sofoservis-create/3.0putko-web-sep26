import axios from "axios";
import streamifier from "streamifier";
import cloudinary from "./cloudinary.js";

// ─── Strategy 1: Let Cloudinary fetch the URL directly (their servers) ────────
const uploadViaRemoteUrl = (url, publicId) =>
  cloudinary.uploader.upload(url, {
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    transformation: [
      { width: 1600, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  }).then(result => result.secure_url);

// ─── Strategy 2: Download with axios, stream to Cloudinary ────────────────────
const uploadViaAxiosStream = (url, publicId) =>
  axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      "Referer": new URL(url).origin,
    },
  }).then(response =>
    new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          resource_type: "image",
          transformation: [
            { width: 1600, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      streamifier.createReadStream(response.data).pipe(uploadStream);
    })
  );

/**
 * Upload multiple external image URLs to Cloudinary.
 *
 * Strategy per image (in order):
 *   1. Cloudinary remote URL upload  (Cloudinary fetches — avoids our server being blocked)
 *   2. Axios download + stream       (fallback if Cloudinary can't reach the host)
 *   3. Skip the image                (logs error, continues to next image)
 *
 * The accommodation is only skipped if ZERO images succeed.
 */
export const uploadAccommodationImages = async (imagesString, propertySlug) => {
  if (!imagesString) return [];

  const imageUrls = imagesString
    .split(",")
    .map(url => url.trim())
    .filter(Boolean);

  const uploadedImages = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const publicId = `accommodation-${propertySlug}-${i + 1}`;
    let secureUrl = null;

    // ── Strategy 1: Cloudinary remote URL fetch ──────────────────────────────
    try {
      secureUrl = await uploadViaRemoteUrl(url, publicId);
      console.log(`✅ [remote-url] Image ${i + 1}/${imageUrls.length} uploaded for "${propertySlug}"`);
    } catch (err1) {
      console.warn(`⚠️ [remote-url] Image ${i + 1} failed for "${propertySlug}": ${err1.message}`);

      // ── Strategy 2: Axios download → stream ──────────────────────────────
      await new Promise(r => setTimeout(r, 1500)); // small delay before retry
      try {
        secureUrl = await uploadViaAxiosStream(url, publicId);
        console.log(`✅ [axios-stream] Image ${i + 1}/${imageUrls.length} uploaded for "${propertySlug}"`);
      } catch (err2) {
        console.error(`❌ [axios-stream] Image ${i + 1} also failed for "${propertySlug}": ${err2.message} — skipping this image.`);
      }
    }

    if (secureUrl) uploadedImages.push(secureUrl);
  }

  if (uploadedImages.length === 0) {
    throw new Error(
      `All ${imageUrls.length} image(s) failed for "${propertySlug}". ` +
      `Check Cloudinary credentials (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) and image source URLs.`
    );
  }

  console.log(`📸 ${uploadedImages.length}/${imageUrls.length} images uploaded for "${propertySlug}"`);
  return uploadedImages;
};
