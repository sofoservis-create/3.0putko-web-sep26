import { describe, expect, it } from "vitest";
import { EDITOR_STEP_IDS } from "./hostListingModel";
import { REQUIREMENTS, fieldElementId, requirementStepIndex, validateStep } from "./hostEditorValidation";

const completeListing = {
  name: "Alpha",
  propertyType: "cabin",
  description: "Quiet cabin",
  street: "Hlavná 1",
  city: "Poprad",
  country: "Slovakia",
  guests: 4,
  bedrooms: 2,
  beds: 3,
  bathrooms: 1,
  amenities: ["wifi"],
  photoUrls: ["https://example.com/a.jpg"],
  nightlyPrice: 80,
  minNights: 2,
  checkIn: "15:00",
  checkOut: "10:00",
  availabilityConfirmed: true,
  calendarChoice: "none",
  payoutAcknowledged: true,
};

describe("hostEditorValidation", () => {
  it("accepts a listing that satisfies every server requirement", () => {
    for (const stepId of EDITOR_STEP_IDS) {
      expect(validateStep(stepId, completeListing, "en")).toEqual({});
    }
  });

  it("maps every requirement id to a real editor step", () => {
    for (const requirement of Object.keys(REQUIREMENTS)) {
      expect(requirementStepIndex(requirement)).toBeGreaterThanOrEqual(0);
    }
    expect(requirementStepIndex("unknown")).toBe(-1);
  });

  it("mirrors the server's positive-number and non-empty checks", () => {
    expect(Object.keys(validateStep("spaces", { guests: 0, bedrooms: "2", beds: null, bathrooms: 1 }, "en"))).toEqual([
      "guests",
      "bedrooms",
      "beds",
    ]);
    expect(validateStep("basics", { name: "  ", propertyType: "cabin", description: "" }, "sk")).toEqual({
      name: "Zadajte názov ubytovania.",
      description: "Pridajte krátky popis.",
    });
    expect(validateStep("pricing", { nightlyPrice: 10, minNights: 1.5 }, "en")).toHaveProperty("minNights");
  });

  it("accepts photo entries as strings or { url } but only with http(s) links", () => {
    expect(validateStep("photos", { photoUrls: [{ url: "https://x.test/a.jpg" }] }, "en")).toEqual({});
    expect(validateStep("photos", { photoUrls: ["ftp://x.test/a.jpg", "not a url"] }, "en")).toHaveProperty("photoUrls");
  });

  it("validates calendar feeds only when the host chose to connect them", () => {
    expect(validateStep("calendar", { calendarChoice: "none", calendarFeeds: [{ url: "bad" }] }, "en")).toEqual({});
    expect(validateStep("calendar", { calendarChoice: "connect", calendarFeeds: [] }, "en")).toHaveProperty("calendarFeeds");
    expect(
      validateStep("calendar", { calendarChoice: "connect", calendarFeeds: [{ url: "https://a.test/c.ics" }, { url: "nope" }] }, "en"),
    ).toEqual({ "calendarFeeds.1.url": "Enter a valid http(s) calendar link." });
    expect(validateStep("calendar", {}, "en")).toHaveProperty("calendarChoice");
  });

  it("produces DOM-safe field ids", () => {
    expect(fieldElementId("calendarFeeds.1.url")).toBe("listing-field-calendarFeeds-1-url");
  });
});
