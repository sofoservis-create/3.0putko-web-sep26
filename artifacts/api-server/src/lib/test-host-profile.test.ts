import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultHostProfile,
  isAcceptableImageUrl,
  payoutReadiness,
  publicHostProfile,
  validateHostProfileInput,
} from "./test-host-profile.ts";

const valid = {
  displayName: "  Jana   Nováková ",
  avatarUrl: null,
  about: "  Welcome to the Tatras.\r\n\r\nWe love hiking. ",
  languages: ["en", "sk", "sk"],
  responseTime: "within_day",
};

describe("validateHostProfileInput", () => {
  it("normalises a valid payload", () => {
    const result = validateHostProfileInput(valid);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, {
      displayName: "Jana Nováková",
      avatarUrl: null,
      about: "Welcome to the Tatras.\n\nWe love hiking.",
      // De-duplicated and returned in the canonical picker order.
      languages: ["sk", "en"],
      responseTime: "within_day",
    });
  });

  it("requires a display name of sane length", () => {
    assert.deepEqual(validateHostProfileInput({ ...valid, displayName: "   " }), {
      ok: false,
      errors: [{ field: "displayName", code: "required" }],
    });
    assert.deepEqual(validateHostProfileInput({ ...valid, displayName: "J" }), {
      ok: false,
      errors: [{ field: "displayName", code: "tooShort" }],
    });
    assert.deepEqual(validateHostProfileInput({ ...valid, displayName: "x".repeat(61) }), {
      ok: false,
      errors: [{ field: "displayName", code: "tooLong" }],
    });
  });

  it("treats an empty avatar as none and rejects unmanaged URLs", () => {
    const empty = validateHostProfileInput({ ...valid, avatarUrl: "   " });
    assert.equal(empty.ok && empty.value.avatarUrl, null);
    const missing = validateHostProfileInput({ ...valid, avatarUrl: undefined });
    assert.equal(missing.ok && missing.value.avatarUrl, null);
    for (const bad of ["https://example.com/a.jpg", "javascript:alert(1)", "ftp://x/y.png", "not a url", "data:image/png;base64,AAAA"]) {
      assert.deepEqual(validateHostProfileInput({ ...valid, avatarUrl: bad }), {
        ok: false,
        errors: [{ field: "avatarUrl", code: "invalidUrl" }],
      }, bad);
    }
  });

  it("accepts managed photos only for their authenticated owner", () => {
    const owner = "11111111-1111-1111-1111-111111111111";
    const other = "22222222-2222-2222-2222-222222222222";
    const avatarUrl = `/api/test-auth/host-profile-photo/${owner}/33333333-3333-3333-3333-333333333333/avatar.webp`;
    const accepted = validateHostProfileInput({ ...valid, avatarUrl }, owner);
    assert.equal(accepted.ok && accepted.value.avatarUrl, avatarUrl);
    assert.deepEqual(validateHostProfileInput({ ...valid, avatarUrl }, other), {
      ok: false,
      errors: [{ field: "avatarUrl", code: "invalidUrl" }],
    });
  });

  it("caps the about text and rejects unknown languages or response times", () => {
    assert.deepEqual(validateHostProfileInput({ ...valid, about: "a".repeat(1001) }).ok, false);
    assert.deepEqual(validateHostProfileInput({ ...valid, languages: ["en", "klingon"] }), {
      ok: false,
      errors: [{ field: "languages", code: "invalidChoice" }],
    });
    assert.deepEqual(validateHostProfileInput({ ...valid, languages: "en" }), {
      ok: false,
      errors: [{ field: "languages", code: "invalidChoice" }],
    });
    assert.deepEqual(validateHostProfileInput({ ...valid, responseTime: "instantly" }), {
      ok: false,
      errors: [{ field: "responseTime", code: "invalidChoice" }],
    });
    const none = validateHostProfileInput({ ...valid, responseTime: "" });
    assert.equal(none.ok && none.value.responseTime, null);
  });

  it("reports every failing field at once", () => {
    const result = validateHostProfileInput({ displayName: "", avatarUrl: "nope", about: "x".repeat(1001) });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(result.errors.map((e) => e.field), ["displayName", "avatarUrl", "about"]);
  });

  it("ignores a non-object body", () => {
    assert.deepEqual(validateHostProfileInput(null), { ok: false, errors: [{ field: "displayName", code: "required" }] });
  });
});

describe("isAcceptableImageUrl", () => {
  it("accepts http and https only", () => {
    assert.equal(isAcceptableImageUrl("https://cdn.example.com/a.png?x=1"), true);
    assert.equal(isAcceptableImageUrl("http://cdn.example.com/a.png"), true);
    assert.equal(isAcceptableImageUrl("https://"), false);
    assert.equal(isAcceptableImageUrl(`https://example.com/${"a".repeat(2100)}`), false);
  });
});

describe("profile shapes", () => {
  it("derives an unsaved default from the account name", () => {
    assert.deepEqual(defaultHostProfile({ name: "  Peter " }), {
      displayName: "Peter",
      avatarUrl: null,
      about: "",
      languages: [],
      responseTime: null,
      savedAt: null,
    });
  });

  it("drops unknown stored values instead of leaking them", () => {
    const row = {
      guestId: "g",
      displayName: "Peter",
      avatarUrl: null,
      about: "hi",
      languages: ["sk", "xx"],
      responseTime: "whenever",
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-10T08:00:00Z"),
    };
    assert.deepEqual(publicHostProfile(row), {
      displayName: "Peter",
      avatarUrl: null,
      about: "hi",
      languages: ["sk"],
      responseTime: null,
      savedAt: "2026-09-10T08:00:00.000Z",
    });
  });
});

describe("payoutReadiness", () => {
  it("is never connected and counts the host's listings honestly", () => {
    const result = payoutReadiness([
      { status: "LIVE", data: { payoutAcknowledged: true } },
      { status: "DRAFT", data: {} },
      { status: "READY", data: { payoutAcknowledged: true } },
    ]);
    assert.equal(result.status, "not_connected");
    assert.equal(result.canConnect, false);
    assert.equal(result.provider, null);
    assert.deepEqual(result.listings, { total: 3, live: 1, acknowledged: 2 });
    assert.deepEqual(result.requirements, ["payout_provider", "identity", "bank_account", "listing_assignment"]);
  });

  it("handles a host with no listings", () => {
    assert.deepEqual(payoutReadiness([]).listings, { total: 0, live: 0, acknowledged: 0 });
  });
});
