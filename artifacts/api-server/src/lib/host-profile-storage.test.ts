import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOwnedStagingPath, managedPhotoOwner, orientedImageSize } from "./host-profile-storage.ts";

describe("Host profile photo ownership", () => {
  const owner = "11111111-1111-1111-1111-111111111111";
  const other = "22222222-2222-2222-2222-222222222222";
  const upload = "33333333-3333-3333-3333-333333333333";

  it("accepts only staging paths nested under the authenticated host", () => {
    assert.equal(isOwnedStagingPath(`host-profile-photos/staging/${owner}/${upload}`, owner), true);
    assert.equal(isOwnedStagingPath(`host-profile-photos/staging/${owner}/${upload}`, other), false);
    assert.equal(isOwnedStagingPath("../host-profile-photos/staging/x", owner), false);
  });

  it("extracts owner and immutable version from managed avatar URLs", () => {
    assert.deepEqual(
      managedPhotoOwner(`/api/test-auth/host-profile-photo/${owner}/${upload}/avatar.webp`),
      { guestId: owner, version: upload },
    );
    assert.equal(managedPhotoOwner(`https://example.com/${owner}.webp`), null);
    assert.equal(managedPhotoOwner(`/api/test-auth/host-profile-photo/${owner}/${upload}/profile.webp`), null);
  });

  it("uses post-rotation dimensions for phone photos with EXIF orientation", () => {
    assert.deepEqual(orientedImageSize(4032, 3024, 6), { width: 3024, height: 4032 });
    assert.deepEqual(orientedImageSize(4032, 3024, 1), { width: 4032, height: 3024 });
  });
});