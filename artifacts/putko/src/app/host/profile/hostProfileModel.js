// Public Host Profile: client-side model. Limits and choices mirror the
// server (`api-server/src/lib/test-host-profile.ts`); the server stays
// authoritative and its field-level error codes are localized here too.

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 60;
export const ABOUT_MAX = 1000;
export const MAX_LANGUAGES = 8;

const t = (language, en, sk) => (language === "en" ? en : sk);

// Native (endonym) labels so a host recognises their language in either UI
// language; order matches the server's canonical order.
export const HOST_LANGUAGES = [
  { code: "sk", label: "Slovenčina" },
  { code: "cs", label: "Čeština" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "hu", label: "Magyar" },
  { code: "pl", label: "Polski" },
  { code: "uk", label: "Українська" },
  { code: "it", label: "Italiano" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ru", label: "Русский" },
  { code: "nl", label: "Nederlands" },
];
export const HOST_LANGUAGE_CODES = HOST_LANGUAGES.map((item) => item.code);

export const RESPONSE_TIMES = ["within_hour", "within_day", "within_few_days"];

export const responseTimeLabel = (value, language) => {
  switch (value) {
    case "within_hour":
      return t(language, "Within an hour", "Do hodiny");
    case "within_day":
      return t(language, "Within a day", "Do 24 hodín");
    case "within_few_days":
      return t(language, "Within a few days", "Do niekoľkých dní");
    default:
      return t(language, "Not stated", "Neuvedené");
  }
};

export const emptyProfile = () => ({
  displayName: "",
  avatarUrl: "",
  about: "",
  languages: [],
  responseTime: "",
});

/** Server profile → form values (nulls become empty strings for inputs). */
export const toFormValues = (profile) => ({
  displayName: profile?.displayName ?? "",
  avatarUrl: profile?.avatarUrl ?? "",
  about: profile?.about ?? "",
  languages: Array.isArray(profile?.languages)
    ? HOST_LANGUAGE_CODES.filter((code) => profile.languages.includes(code))
    : [],
  responseTime: RESPONSE_TIMES.includes(profile?.responseTime) ? profile.responseTime : "",
});

/** Form values → request body (trimmed; the server normalises further). */
export const toRequestBody = (values) => ({
  displayName: values.displayName.replace(/\s+/g, " ").trim(),
  avatarUrl: values.avatarUrl.trim() || null,
  about: values.about.trim(),
  languages: HOST_LANGUAGE_CODES.filter((code) => values.languages.includes(code)),
  responseTime: values.responseTime || null,
});

/** True when the form differs from the last loaded/saved profile. */
export const isProfileDirty = (values, baseline) =>
  JSON.stringify(toRequestBody(values)) !== JSON.stringify(toRequestBody(baseline));

export const isHttpUrl = (value) => {
  if (!value || /\s/.test(value) || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const fieldErrorMessage = (field, code, language) => {
  switch (`${field}.${code}`) {
    case "displayName.required":
      return t(language, "Enter the name travellers will see.", "Zadajte meno, ktoré uvidia cestovatelia.");
    case "displayName.tooShort":
      return t(language, `Use at least ${DISPLAY_NAME_MIN} characters.`, `Použite aspoň ${DISPLAY_NAME_MIN} znaky.`);
    case "displayName.tooLong":
      return t(language, `Keep it under ${DISPLAY_NAME_MAX} characters.`, `Maximálne ${DISPLAY_NAME_MAX} znakov.`);
    case "avatarUrl.invalidUrl":
      return t(language, "Enter a full image link starting with https://.", "Zadajte úplný odkaz na obrázok začínajúci https://.");
    case "about.tooLong":
      return t(language, `Keep your introduction under ${ABOUT_MAX} characters.`, `Predstavenie môže mať najviac ${ABOUT_MAX} znakov.`);
    case "languages.tooMany":
      return t(language, `Choose up to ${MAX_LANGUAGES} languages.`, `Vyberte najviac ${MAX_LANGUAGES} jazykov.`);
    case "languages.invalidChoice":
      return t(language, "Choose languages from the list.", "Vyberte jazyky zo zoznamu.");
    case "responseTime.invalidChoice":
      return t(language, "Choose a response time from the list.", "Vyberte čas odpovede zo zoznamu.");
    default:
      return t(language, "Check this field.", "Skontrolujte toto pole.");
  }
};

/** Same rules as the server; returns `{ field: message }` (empty = valid). */
export const validateProfile = (values, language) => {
  const errors = {};
  const body = toRequestBody(values);
  if (!body.displayName) errors.displayName = fieldErrorMessage("displayName", "required", language);
  else if (body.displayName.length < DISPLAY_NAME_MIN) errors.displayName = fieldErrorMessage("displayName", "tooShort", language);
  else if (body.displayName.length > DISPLAY_NAME_MAX) errors.displayName = fieldErrorMessage("displayName", "tooLong", language);
  if (body.avatarUrl && !isHttpUrl(body.avatarUrl)) errors.avatarUrl = fieldErrorMessage("avatarUrl", "invalidUrl", language);
  if (body.about.length > ABOUT_MAX) errors.about = fieldErrorMessage("about", "tooLong", language);
  if (body.languages.length > MAX_LANGUAGES) errors.languages = fieldErrorMessage("languages", "tooMany", language);
  return errors;
};

/** Maps a server 400 (`errors: [{ field, code }]`) onto form fields. */
export const errorsFromResponse = (error, language) => {
  const list = Array.isArray(error?.data?.errors) ? error.data.errors : [];
  const errors = {};
  for (const item of list) {
    if (item?.field && !errors[item.field]) errors[item.field] = fieldErrorMessage(item.field, item.code, language);
  }
  return errors;
};

export const profileErrorText = (error, language) => {
  if (error?.status === 401) return t(language, "Your session has expired. Log in again.", "Platnosť relácie vypršala. Prihláste sa znova.");
  if (error?.status === 403) return t(language, "Only hosts can edit a host profile.", "Hostiteľský profil môžu upravovať len hostitelia.");
  if (error?.status === 400) return t(language, "Some fields need attention.", "Niektoré polia treba opraviť.");
  return t(language, "Check your connection and try again.", "Skontrolujte pripojenie a skúste to znova.");
};

export const profileInitial = (values, fallback = "H") =>
  values?.displayName?.trim()?.charAt(0)?.toUpperCase() || fallback;
