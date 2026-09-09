// Client-side mirror of the server's completion rules
// (artifacts/api-server/src/lib/test-host-accommodation.ts). The editor uses
// it to show inline messages before advancing a step; the server response
// (`completedSteps`, `missingRequirements`, `canPublish`) stays authoritative
// for completion and publishing and is never replaced by these checks.
import { EDITOR_STEP_IDS } from "./hostListingModel";

export const isHttpUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

const t = (language, en, sk) => (language === "en" ? en : sk);

/**
 * Server requirement id → editor step and localized label. The ids are the
 * exact strings the server returns in `missingRequirements`, so the review
 * sheet can link every missing item to its step and field.
 */
export const REQUIREMENTS = {
  name: { step: "basics", label: { en: "Property name", sk: "Názov ubytovania" } },
  propertyType: { step: "basics", label: { en: "Property type", sk: "Typ ubytovania" } },
  description: { step: "basics", label: { en: "Description", sk: "Popis" } },
  street: { step: "location", label: { en: "Street address", sk: "Ulica a číslo" } },
  city: { step: "location", label: { en: "City", sk: "Mesto" } },
  country: { step: "location", label: { en: "Country", sk: "Krajina" } },
  guests: { step: "spaces", label: { en: "Number of guests", sk: "Počet hostí" } },
  bedrooms: { step: "spaces", label: { en: "Number of bedrooms", sk: "Počet spální" } },
  beds: { step: "spaces", label: { en: "Number of beds", sk: "Počet postelí" } },
  bathrooms: { step: "spaces", label: { en: "Number of bathrooms", sk: "Počet kúpeľní" } },
  amenities: { step: "amenities", label: { en: "At least one amenity", sk: "Aspoň jedno vybavenie" } },
  photoUrls: { step: "photos", label: { en: "At least one photo", sk: "Aspoň jedna fotografia" } },
  nightlyPrice: { step: "pricing", label: { en: "Nightly price", sk: "Cena za noc" } },
  minNights: { step: "pricing", label: { en: "Minimum nights", sk: "Minimálny počet nocí" } },
  checkIn: { step: "availability", label: { en: "Check-in time", sk: "Čas príchodu" } },
  checkOut: { step: "availability", label: { en: "Check-out time", sk: "Čas odchodu" } },
  availabilityConfirmed: {
    step: "availability",
    label: { en: "Availability confirmation", sk: "Potvrdenie dostupnosti" },
  },
  calendarChoice: { step: "calendar", label: { en: "Calendar source", sk: "Zdroj kalendára" } },
  payoutAcknowledged: {
    step: "readiness",
    label: { en: "Payout acknowledgement", sk: "Potvrdenie podmienok výplat" },
  },
};

export const requirementLabel = (requirement, language) =>
  REQUIREMENTS[requirement]?.label[language === "en" ? "en" : "sk"] ?? requirement;

/** Editor step index that owns a server requirement, or -1 when unknown. */
export const requirementStepIndex = (requirement) => {
  const step = REQUIREMENTS[requirement]?.step;
  return step ? EDITOR_STEP_IDS.indexOf(step) : -1;
};

/** DOM id of the control that satisfies a requirement / field error. */
export const fieldElementId = (field) => `listing-field-${String(field).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

const STEP_VALIDATORS = {
  basics: (data, language, errors) => {
    if (!nonEmpty(data.name)) errors.name = t(language, "Enter a property name.", "Zadajte názov ubytovania.");
    if (!nonEmpty(data.propertyType)) errors.propertyType = t(language, "Choose a property type.", "Vyberte typ ubytovania.");
    if (!nonEmpty(data.description)) errors.description = t(language, "Add a short description.", "Pridajte krátky popis.");
  },
  location: (data, language, errors) => {
    if (!nonEmpty(data.street)) errors.street = t(language, "Enter the street and number.", "Zadajte ulicu a číslo.");
    if (!nonEmpty(data.city)) errors.city = t(language, "Enter the city.", "Zadajte mesto.");
    if (!nonEmpty(data.country)) errors.country = t(language, "Enter the country.", "Zadajte krajinu.");
  },
  spaces: (data, language, errors) => {
    for (const field of ["guests", "bedrooms", "beds", "bathrooms"]) {
      if (!positive(data[field])) errors[field] = t(language, "Enter at least 1.", "Zadajte aspoň 1.");
    }
  },
  amenities: (data, language, errors) => {
    const list = Array.isArray(data.amenities) ? data.amenities.filter(nonEmpty) : [];
    if (list.length === 0) errors.amenities = t(language, "Select at least one amenity.", "Vyberte aspoň jedno vybavenie.");
  },
  photos: (data, language, errors) => {
    const photos = Array.isArray(data.photoUrls) ? data.photoUrls : [];
    const valid = photos.some((photo) =>
      typeof photo === "string" ? isHttpUrl(photo) : isHttpUrl(photo?.url),
    );
    if (!valid) errors.photoUrls = t(language, "Add at least one photo link.", "Pridajte aspoň jeden odkaz na fotografiu.");
  },
  pricing: (data, language, errors) => {
    if (!positive(data.nightlyPrice)) errors.nightlyPrice = t(language, "Enter a nightly price above €0.", "Zadajte cenu za noc vyššiu ako 0 €.");
    if (!positive(data.minNights) || !Number.isInteger(data.minNights)) {
      errors.minNights = t(language, "Minimum stay must be a whole number of at least 1 night.", "Minimálny pobyt musí byť celé číslo, aspoň 1 noc.");
    }
  },
  availability: (data, language, errors) => {
    if (!nonEmpty(data.checkIn)) errors.checkIn = t(language, "Set a check-in time.", "Nastavte čas príchodu.");
    if (!nonEmpty(data.checkOut)) errors.checkOut = t(language, "Set a check-out time.", "Nastavte čas odchodu.");
    if (data.availabilityConfirmed !== true) {
      errors.availabilityConfirmed = t(language, "Confirm that your availability is up to date.", "Potvrďte, že vaša dostupnosť je aktuálna.");
    }
  },
  calendar: (data, language, errors) => {
    if (data.calendarChoice !== "none" && data.calendarChoice !== "connect") {
      errors.calendarChoice = t(language, "Choose how you manage availability.", "Vyberte, ako spravujete dostupnosť.");
      return;
    }
    if (data.calendarChoice !== "connect") return;
    const feeds = Array.isArray(data.calendarFeeds) ? data.calendarFeeds : [];
    if (feeds.length === 0) {
      errors.calendarFeeds = t(language, "Add at least one calendar link, or choose manual only.", "Pridajte aspoň jeden odkaz na kalendár alebo zvoľte len manuálne.");
      return;
    }
    feeds.forEach((feed, index) => {
      if (!isHttpUrl(feed?.url)) {
        errors[`calendarFeeds.${index}.url`] = t(language, "Enter a valid http(s) calendar link.", "Zadajte platný http(s) odkaz na kalendár.");
      }
    });
  },
  readiness: (data, language, errors) => {
    if (data.payoutAcknowledged !== true) {
      errors.payoutAcknowledged = t(language, "Acknowledge the payout status to finish setup.", "Potvrďte stav výplat, aby ste dokončili nastavenie.");
    }
  },
};

/** Inline errors for one editor step: `{ field: message }`, empty when valid. */
export const validateStep = (stepId, data = {}, language = "sk") => {
  const errors = {};
  STEP_VALIDATORS[stepId]?.(data || {}, language, errors);
  return errors;
};

export const hasErrors = (errors) => Boolean(errors) && Object.keys(errors).length > 0;

/** First field id (in declaration order) that has an error, or null. */
export const firstErrorField = (errors) => {
  const keys = Object.keys(errors || {});
  return keys.length ? keys[0] : null;
};
