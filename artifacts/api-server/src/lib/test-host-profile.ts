import type { TestGuest, TestHostAccommodation, TestHostProfile } from "@workspace/db";

/**
 * Public Host Profile and host-level payout readiness.
 *
 * Contract summary
 * - The profile is owned by the authenticated host; the client never sends
 *   an id. `GET` answers a default (unsaved) profile derived from the account
 *   name until the host saves once, so the form always has something to
 *   show and `savedAt: null` tells the UI it is not persisted yet.
 * - Validation is field-level with machine-readable codes so the UI can
 *   render localized inline messages next to the right input. The same
 *   limits live in the client model; the server remains authoritative.
 * - Payout readiness is read-only and honest: there is no payout provider
 *   connected (Stripe Connect is not implemented), so `status` is always
 *   `not_connected` and the response lists what will be needed.
 */

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 60;
export const ABOUT_MAX = 1000;
export const AVATAR_URL_MAX = 2048;
export const MAX_LANGUAGES = 8;

/** ISO 639-1 codes a host may list; matches the client's picker. */
export const HOST_LANGUAGE_CODES = [
  "sk", "cs", "en", "de", "hu", "pl", "uk", "it", "fr", "es", "ru", "nl",
] as const;
export type HostLanguageCode = (typeof HOST_LANGUAGE_CODES)[number];

export const RESPONSE_TIMES = ["within_hour", "within_day", "within_few_days"] as const;
export type ResponseTime = (typeof RESPONSE_TIMES)[number];

export type HostProfileInput = {
  displayName: string;
  avatarUrl: string | null;
  about: string;
  languages: HostLanguageCode[];
  responseTime: ResponseTime | null;
};

export type HostProfileFieldError = {
  field: keyof HostProfileInput;
  code: "required" | "tooShort" | "tooLong" | "invalidUrl" | "invalidChoice" | "tooMany";
};

export type HostProfileValidation =
  | { ok: true; value: HostProfileInput }
  | { ok: false; errors: HostProfileFieldError[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

/** Accepts only absolute http(s) URLs; anything else is rejected. */
export const isAcceptableImageUrl = (value: string) => {
  if (value.length > AVATAR_URL_MAX || /\s/.test(value)) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname);
};

export const validateHostProfileInput = (body: unknown): HostProfileValidation => {
  const errors: HostProfileFieldError[] = [];
  const source = isRecord(body) ? body : {};

  const displayName = typeof source.displayName === "string" ? collapseWhitespace(source.displayName) : "";
  if (!displayName) errors.push({ field: "displayName", code: "required" });
  else if (displayName.length < DISPLAY_NAME_MIN) errors.push({ field: "displayName", code: "tooShort" });
  else if (displayName.length > DISPLAY_NAME_MAX) errors.push({ field: "displayName", code: "tooLong" });

  const rawAvatar = typeof source.avatarUrl === "string" ? source.avatarUrl.trim() : "";
  let avatarUrl: string | null = null;
  if (rawAvatar) {
    if (isAcceptableImageUrl(rawAvatar)) avatarUrl = rawAvatar;
    else errors.push({ field: "avatarUrl", code: "invalidUrl" });
  } else if (source.avatarUrl != null && typeof source.avatarUrl !== "string") {
    errors.push({ field: "avatarUrl", code: "invalidUrl" });
  }

  const about = typeof source.about === "string" ? source.about.replace(/\r\n/g, "\n").trim() : "";
  if (about.length > ABOUT_MAX) errors.push({ field: "about", code: "tooLong" });

  let languages: HostLanguageCode[] = [];
  if (source.languages != null) {
    if (!Array.isArray(source.languages)) {
      errors.push({ field: "languages", code: "invalidChoice" });
    } else {
      const seen = new Set<string>();
      for (const entry of source.languages) {
        if (typeof entry !== "string" || !(HOST_LANGUAGE_CODES as readonly string[]).includes(entry)) {
          errors.push({ field: "languages", code: "invalidChoice" });
          break;
        }
        seen.add(entry);
      }
      languages = HOST_LANGUAGE_CODES.filter((code) => seen.has(code));
      if (languages.length > MAX_LANGUAGES) errors.push({ field: "languages", code: "tooMany" });
    }
  }

  let responseTime: ResponseTime | null = null;
  if (source.responseTime != null && source.responseTime !== "") {
    if (typeof source.responseTime === "string" && (RESPONSE_TIMES as readonly string[]).includes(source.responseTime)) {
      responseTime = source.responseTime as ResponseTime;
    } else {
      errors.push({ field: "responseTime", code: "invalidChoice" });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { displayName, avatarUrl, about, languages, responseTime } };
};

export type PublicHostProfile = HostProfileInput & {
  /** When the host last saved; null until the first save. */
  savedAt: string | null;
};

/** What the account already knows; used until the host saves a profile. */
export const defaultHostProfile = (guest: Pick<TestGuest, "name">): PublicHostProfile => ({
  displayName: collapseWhitespace(guest.name).slice(0, DISPLAY_NAME_MAX),
  avatarUrl: null,
  about: "",
  languages: [],
  responseTime: null,
  savedAt: null,
});

export const publicHostProfile = (row: TestHostProfile): PublicHostProfile => ({
  displayName: row.displayName,
  avatarUrl: row.avatarUrl ?? null,
  about: row.about,
  languages: (Array.isArray(row.languages) ? row.languages : []).filter(
    (code): code is HostLanguageCode => (HOST_LANGUAGE_CODES as readonly string[]).includes(code),
  ),
  responseTime: (RESPONSE_TIMES as readonly string[]).includes(row.responseTime ?? "")
    ? (row.responseTime as ResponseTime)
    : null,
  savedAt: row.updatedAt.toISOString(),
});

export type PayoutReadiness = {
  /** The only value today; a connected provider would add `pending`/`ready`. */
  status: "not_connected";
  provider: null;
  /** No provider is wired up, so no onboarding can be started from the UI. */
  canConnect: false;
  /** Machine-readable steps a future onboarding will require, in order. */
  requirements: Array<"payout_provider" | "identity" | "bank_account" | "listing_assignment">;
  listings: {
    total: number;
    live: number;
    /** Listings whose Step 9 acknowledgement is ticked. */
    acknowledged: number;
  };
};

export const payoutReadiness = (
  listings: Array<Pick<TestHostAccommodation, "status" | "data">>,
): PayoutReadiness => {
  let live = 0;
  let acknowledged = 0;
  for (const listing of listings) {
    if (listing.status === "LIVE") live += 1;
    if (isRecord(listing.data) && listing.data.payoutAcknowledged === true) acknowledged += 1;
  }
  return {
    status: "not_connected",
    provider: null,
    canConnect: false,
    requirements: ["payout_provider", "identity", "bank_account", "listing_assignment"],
    listings: { total: listings.length, live, acknowledged },
  };
};
