import { describe, expect, it } from "vitest";
import {
  errorsFromResponse,
  isProfileDirty,
  toFormValues,
  toRequestBody,
  validateProfile,
} from "./hostProfileModel";

const values = {
  displayName: "  Jana  Nováková ",
  avatarUrl: " https://example.com/jana.jpg ",
  about: " Hello ",
  languages: ["en", "sk"],
  responseTime: "within_day",
};

describe("toFormValues", () => {
  it("turns server nulls into input-friendly values and drops unknown codes", () => {
    expect(toFormValues({ displayName: "Jana", avatarUrl: null, about: "", languages: ["xx", "en"], responseTime: null })).toEqual({
      displayName: "Jana",
      avatarUrl: "",
      about: "",
      languages: ["en"],
      responseTime: "",
    });
  });
});

describe("toRequestBody", () => {
  it("trims and orders languages canonically", () => {
    expect(toRequestBody(values)).toEqual({
      displayName: "Jana Nováková",
      avatarUrl: "https://example.com/jana.jpg",
      about: "Hello",
      languages: ["sk", "en"],
      responseTime: "within_day",
    });
  });

  it("sends null for an empty avatar and response time", () => {
    expect(toRequestBody({ ...values, avatarUrl: "  ", responseTime: "" })).toMatchObject({ avatarUrl: null, responseTime: null });
  });
});

describe("validateProfile", () => {
  it("accepts a complete profile", () => {
    expect(validateProfile(values, "en")).toEqual({});
  });

  it("requires a display name and flags bad links inline", () => {
    const errors = validateProfile({ ...values, displayName: " ", avatarUrl: "jana.jpg" }, "en");
    expect(Object.keys(errors)).toEqual(["displayName", "avatarUrl"]);
    expect(errors.avatarUrl).toMatch(/https:\/\//);
  });

  it("localizes messages in Slovak", () => {
    expect(validateProfile({ ...values, displayName: "J" }, "sk").displayName).toBe("Použite aspoň 2 znaky.");
  });

  it("caps the about text", () => {
    expect(validateProfile({ ...values, about: "a".repeat(1001) }, "en").about).toMatch(/1000/);
  });
});

describe("isProfileDirty", () => {
  it("ignores whitespace-only differences and language order", () => {
    const baseline = { ...values, displayName: "Jana Nováková", avatarUrl: "https://example.com/jana.jpg", about: "Hello", languages: ["sk", "en"] };
    expect(isProfileDirty(values, baseline)).toBe(false);
    expect(isProfileDirty({ ...values, about: "Hi" }, baseline)).toBe(true);
  });
});

describe("errorsFromResponse", () => {
  it("maps server field codes to localized messages, first code per field wins", () => {
    const error = { status: 400, data: { errors: [{ field: "displayName", code: "tooLong" }, { field: "displayName", code: "required" }, { field: "languages", code: "invalidChoice" }] } };
    const errors = errorsFromResponse(error, "en");
    expect(errors.displayName).toMatch(/60/);
    expect(errors.languages).toMatch(/list/);
  });

  it("returns nothing for a network error", () => {
    expect(errorsFromResponse(new Error("boom"), "en")).toEqual({});
  });
});
