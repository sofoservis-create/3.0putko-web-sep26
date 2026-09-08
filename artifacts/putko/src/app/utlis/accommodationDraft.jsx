/**
 * Autosave for the add-accommodation form.
 *
 * The form is long — property type, capacity, eight amenity groups, pricing,
 * photos, availability — and until now a refresh, a closed tab or a stray back
 * button threw all of it away. Nothing was written anywhere until Submit.
 *
 * The draft lives in the browser rather than on the server, and that is a
 * deliberate choice: the Accommodation schema marks eleven fields `required`
 * (name, slug, propertyType, person, nightMin/nightMax, phoneNumber…), so a
 * half-filled listing cannot be persisted server-side without relaxing those
 * constraints — which would let genuinely incomplete listings into the
 * catalogue. Browser storage also covers the failure modes that actually lose
 * work: a crash, a closed tab, a refresh. It saves on every change rather than
 * at a milestone.
 *
 * Everything here is defensive. Storage can be full, disabled, or holding a
 * draft written by an older version of the form, and none of those may stop a
 * host filling in the page.
 */

const PREFIX = "putko:accommodation-draft";

/** Drafts older than this are ignored — a month-old form is not worth restoring. */
export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Bump when the saved shape changes incompatibly. A draft carrying a different
 * version is discarded rather than restored into a form that no longer matches.
 */
const DRAFT_VERSION = 1;

/**
 * One key per listing being edited, plus a separate one for a brand-new
 * listing, so editing an existing property never clobbers a new one in progress.
 */
export const draftKey = (accommodationId) =>
  accommodationId ? `${PREFIX}:${accommodationId}` : `${PREFIX}:new`;

export const saveDraft = (accommodationId, values) => {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(
      draftKey(accommodationId),
      JSON.stringify({ version: DRAFT_VERSION, savedAt: Date.now(), values })
    );
    return true;
  } catch (err) {
    // Quota exceeded, or storage disabled in this browser. The form keeps
    // working; the host simply has no safety net.
    console.warn("Could not autosave the listing draft:", err?.message || err);
    return false;
  }
};

/**
 * @returns {{values: object, savedAt: number}|null}
 */
export const loadDraft = (accommodationId) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(accommodationId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.version !== DRAFT_VERSION) return null;
    if (!parsed?.values || typeof parsed.values !== "object") return null;
    if (Date.now() - (parsed.savedAt || 0) > DRAFT_MAX_AGE_MS) {
      clearDraft(accommodationId);
      return null;
    }

    return { values: parsed.values, savedAt: parsed.savedAt };
  } catch {
    // Corrupt or unreadable — treat as no draft rather than breaking the form.
    return null;
  }
};

export const clearDraft = (accommodationId) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(accommodationId));
  } catch {
    /* nothing to do — a stale draft is harmless, it expires on its own */
  }
};

/** "just now" / "5 minutes ago" / a date, for the restore prompt. */
export const describeSavedAt = (savedAt, language = "sk") => {
  const diffMs = Date.now() - savedAt;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return language === "en" ? "just now" : "pred chvíľou";
  if (minutes < 60) {
    return language === "en" ? `${minutes} min ago` : `pred ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return language === "en" ? `${hours} h ago` : `pred ${hours} h`;
  }

  return new Date(savedAt).toLocaleString(language === "en" ? "en-GB" : "sk-SK");
};
