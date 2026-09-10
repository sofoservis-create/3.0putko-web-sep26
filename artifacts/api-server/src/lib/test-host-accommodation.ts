export type AccommodationData = Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const positiveNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const hasPhotoUrl = (value: unknown) =>
  typeof value === "string"
    ? isUrl(value)
    : isObject(value) && isUrl(value.url);

const isUrl = (value: unknown) => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const groupRequirements: Array<{
  step: string;
  requirements: Array<[string, (data: AccommodationData) => boolean]>;
}> = [
  {
    step: "basics",
    requirements: [
      ["name", (data) => nonEmptyString(data.name)],
      ["propertyType", (data) => nonEmptyString(data.propertyType)],
      ["description", (data) => nonEmptyString(data.description)],
    ],
  },
  {
    step: "location",
    requirements: [
      ["street", (data) => nonEmptyString(data.street)],
      ["city", (data) => nonEmptyString(data.city)],
      ["country", (data) => nonEmptyString(data.country)],
    ],
  },
  {
    step: "spaces",
    requirements: ["guests", "bedrooms", "beds", "bathrooms"].map(
      (field): [string, (data: AccommodationData) => boolean] => [
        field,
        (data) => positiveNumber(data[field]),
      ],
    ),
  },
  {
    step: "amenities",
    requirements: [
      [
        "amenities",
        (data) =>
          Array.isArray(data.amenities) &&
          data.amenities.some((amenity) => nonEmptyString(amenity)),
      ],
    ],
  },
  {
    step: "photos",
    requirements: [
      [
        "photoUrls",
        (data) =>
          Array.isArray(data.photoUrls) && data.photoUrls.some(hasPhotoUrl),
      ],
    ],
  },
  {
    step: "pricing",
    requirements: [
      ["nightlyPrice", (data) => positiveNumber(data.nightlyPrice)],
      ["minNights", (data) => positiveNumber(data.minNights)],
    ],
  },
  {
    step: "availability",
    requirements: [
      ["checkIn", (data) => nonEmptyString(data.checkIn)],
      ["checkOut", (data) => nonEmptyString(data.checkOut)],
      ["availabilityConfirmed", (data) => data.availabilityConfirmed === true],
    ],
  },
  {
    step: "readiness",
    requirements: [
      ["payoutAcknowledged", (data) => data.payoutAcknowledged === true],
      [
        "calendarChoice",
        (data) =>
          data.calendarChoice === "none" || data.calendarChoice === "connect",
      ],
    ],
  },
];

export const accommodationCompletion = (data: AccommodationData) => {
  const completedSteps: string[] = [];
  const missingRequirements: string[] = [];

  for (const group of groupRequirements) {
    const missing = group.requirements
      .filter(([, isComplete]) => !isComplete(data))
      .map(([requirement]) => requirement);
    if (missing.length === 0) completedSteps.push(group.step);
    else missingRequirements.push(...missing);
  }

  const completionPercent = Math.round(
    (completedSteps.length / groupRequirements.length) * 100,
  );
  return {
    completionPercent,
    completedSteps,
    missingRequirements,
    canPublish: completionPercent === 100,
  };
};

export const mergeAccommodationData = (
  current: AccommodationData,
  patch: AccommodationData,
): AccommodationData => {
  const merged: AccommodationData = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    merged[key] =
      isObject(value) && isObject(current[key])
        ? mergeAccommodationData(current[key], value)
        : value;
  }
  return merged;
};

export const parseAccommodationData = (
  body: unknown,
): { data: AccommodationData } | { error: string } => {
  if (!isObject(body)) return { error: "Accommodation data must be an object" };
  const candidate = "data" in body ? body.data : body;
  if (!isObject(candidate)) return { error: "data must be an object" };

  const hasProtectedField = (value: AccommodationData): boolean =>
    Object.entries(value).some(([key, child]) =>
      key === "owner" ||
      key === "ownerId" ||
      key === "status" ||
      (isObject(child) && hasProtectedField(child)),
    );
  if (hasProtectedField(body) || hasProtectedField(candidate)) {
    return { error: "owner and status are managed by the server" };
  }
  return { data: candidate };
};
export type AccommodationStatus = "DRAFT" | "READY" | "LIVE";

/**
 * Status after a payload change: a LIVE listing stays LIVE while it remains
 * complete, otherwise completeness decides between READY and DRAFT.
 */
export const nextAccommodationStatus = (
  current: AccommodationStatus,
  data: AccommodationData,
): AccommodationStatus => {
  const { canPublish } = accommodationCompletion(data);
  if (current === "LIVE" && canPublish) return "LIVE";
  return canPublish ? "READY" : "DRAFT";
};

export type AccommodationRow = {
  id: string;
  data: AccommodationData;
  status: AccommodationStatus;
  createdAt: Date;
  updatedAt: Date;
};

/** The accommodation as every host endpoint returns it (owner never leaks). */
export const publicAccommodation = (accommodation: AccommodationRow) => ({
  id: accommodation.id,
  data: accommodation.data,
  status: accommodation.status,
  createdAt: accommodation.createdAt,
  updatedAt: accommodation.updatedAt,
  ...accommodationCompletion(accommodation.data),
});
