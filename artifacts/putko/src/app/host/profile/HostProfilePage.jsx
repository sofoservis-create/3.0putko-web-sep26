import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Eye, Info, Loader2, RefreshCw, UserRound } from "lucide-react";
import { getHostProfile, saveHostProfile } from "../../utlis/guestAccountApi";
import { Field, SelectField, TextAreaField, TextField } from "../../host-preview/components/editor/EditorFields";
import { useLeaveGuard } from "../HostNavigationGuard";
import {
  ABOUT_MAX,
  HOST_LANGUAGES,
  RESPONSE_TIMES,
  emptyProfile,
  errorsFromResponse,
  isProfileDirty,
  profileErrorText,
  profileInitial,
  responseTimeLabel,
  toFormValues,
  toRequestBody,
  validateProfile,
} from "./hostProfileModel";
import HostProfilePhotoField from "./HostProfilePhotoField";

const t = (language, en, sk) => (language === "en" ? en : sk);

const formatSavedAt = (iso, language) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(language === "en" ? "en-GB" : "sk-SK", { dateStyle: "medium", timeStyle: "short" });
};

/**
 * Public Host Profile (`/host/profile`): what travellers may see about the
 * host. Personal details and password are deliberately not here — they stay
 * in the shared traveler account so one person keeps one identity.
 *
 * Save lifecycle: explicit Save only (no autosave), duplicate submits are
 * ignored while one is in flight, a failed save keeps the edits and offers
 * Retry, and a stale response (older save, unmounted screen) is dropped.
 * Unsaved edits are protected by the workspace leave guard.
 */
export default function HostProfilePage({ language, onOpenAccount, openingAccount = false }) {
  const wrap = "mx-auto max-w-3xl px-4 pb-8 animate-fadeIn md:px-0";

  const [load, setLoad] = useState({ status: "loading", error: null });
  const [baseline, setBaseline] = useState(emptyProfile());
  const [savedAt, setSavedAt] = useState(null);
  const [values, setValues] = useState(emptyProfile());
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [save, setSave] = useState({ phase: "idle", error: null });
  const [photoBusy, setPhotoBusy] = useState(false);

  const mountedRef = useRef(true);
  const saveSeqRef = useRef(0);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;
  const saveRef = useRef(save);
  saveRef.current = save;
  const savedAtRef = useRef(savedAt);
  savedAtRef.current = savedAt;

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const loadProfile = useCallback(async () => {
    setLoad({ status: "loading", error: null });
    try {
      const { profile } = await getHostProfile();
      if (!mountedRef.current) return;
      const form = toFormValues(profile);
      setBaseline(form);
      setValues(form);
      setSavedAt(profile.savedAt ?? null);
      setLoad({ status: "ready", error: null });
    } catch (error) {
      if (!mountedRef.current) return;
      setLoad({ status: "error", error });
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const clientErrors = useMemo(() => (attempted ? validateProfile(values, language) : {}), [attempted, values, language]);
  const errors = { ...clientErrors, ...serverErrors };
  const dirty = isProfileDirty(values, baseline);

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    if (saveRef.current.phase === "failed" || saveRef.current.phase === "saved") setSave({ phase: "idle", error: null });
  };
  const onInput = (field) => (event) => setField(field, event.target.value);
  const toggleLanguage = (code) =>
    setField(
      "languages",
      values.languages.includes(code) ? values.languages.filter((item) => item !== code) : [...values.languages, code],
    );

  /** Returns true when the profile is persisted (also when nothing changed). */
  const runSave = useCallback(async () => {
    if (saveRef.current.phase === "saving" || photoBusy) return false;
    const current = valuesRef.current;
    setAttempted(true);
    if (Object.keys(validateProfile(current, language)).length > 0) {
      setSave({ phase: "failed", error: null });
      return false;
    }
    // Nothing changed against a profile that already exists on the server:
    // no request needed. An unsaved default (savedAt null) must still be
    // written, otherwise accepting the suggested name would never persist.
    if (savedAtRef.current && !isProfileDirty(current, baselineRef.current)) {
      setSave({ phase: "saved", error: null });
      return true;
    }
    const seq = ++saveSeqRef.current;
    setServerErrors({});
    setSave({ phase: "saving", error: null });
    try {
      const { profile } = await saveHostProfile(toRequestBody(current));
      if (!mountedRef.current || seq !== saveSeqRef.current) return true;
      const form = toFormValues(profile);
      setBaseline(form);
      // Keep whatever the host typed since the request left; only the
      // baseline moves, so later edits still count as unsaved.
      setValues((latest) => (latest === current ? form : latest));
      setSavedAt(profile.savedAt ?? null);
      setSave({ phase: "saved", error: null });
      return true;
    } catch (error) {
      if (!mountedRef.current || seq !== saveSeqRef.current) return false;
      setServerErrors(errorsFromResponse(error, language));
      setSave({ phase: "failed", error });
      return false;
    }
  }, [language, photoBusy]);

  useLeaveGuard({
    subject: "profile",
    hasUnsavedChanges: () => isProfileDirty(valuesRef.current, baselineRef.current) || saveRef.current.phase === "saving",
    ownsLocation: (location) => location?.section === "profile",
    save: runSave,
    saving: save.phase === "saving",
  });

  const onSubmit = (event) => {
    event.preventDefault();
    void runSave();
  };

  if (load.status === "loading") {
    return (
      <div aria-busy="true" className={`${wrap} animate-pulse space-y-4`}>
        <div className="h-8 w-48 rounded-lg bg-neutral-200" />
        <div className="h-28 rounded-3xl border border-neutral-200 bg-white" />
        <div className="h-64 rounded-3xl border border-neutral-200 bg-white" />
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <div className={wrap}>
        <div role="alert" className="flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-red-700">{t(language, "We couldn't load your host profile", "Nepodarilo sa načítať hostiteľský profil")}</h2>
              <p className="mt-1 text-sm text-red-600">{profileErrorText(load.error, language)}</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadProfile()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-bold text-red-700 hover:bg-red-100">
            <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
          </button>
        </div>
      </div>
    );
  }

  const previewAvatar = values.avatarUrl.trim();
  const showAvatar = previewAvatar && !errors.avatarUrl;
  const aboutLength = values.about.length;
  const savedAtText = formatSavedAt(savedAt, language);

  return (
    <div className={wrap}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3E2B] md:text-3xl">{t(language, "Host profile", "Hostiteľský profil")}</h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          {t(language, "What travellers may see about you as a host.", "Čo o vás ako hostiteľovi môžu vidieť cestovatelia.")}
        </p>
      </header>

      {/* Preview card: what a traveller would see */}
      <section aria-label={t(language, "Profile preview", "Náhľad profilu")} className="mb-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1E3E2B] text-2xl font-bold text-[#DFBA73]">
            {showAvatar ? (
              <AvatarImage src={previewAvatar} fallback={profileInitial(values)} />
            ) : (
              profileInitial(values)
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-[#1E3E2B]">
              {values.displayName.trim() || t(language, "Your public name", "Vaše verejné meno")}
            </p>
            <p className="text-sm text-neutral-500">
              {values.languages.length > 0
                ? HOST_LANGUAGES.filter((item) => values.languages.includes(item.code)).map((item) => item.label).join(" · ")
                : t(language, "Languages not stated", "Jazyky neuvedené")}
            </p>
            <p className="text-sm text-neutral-500">
              {t(language, "Replies", "Odpovedá")}: {responseTimeLabel(values.responseTime || null, language).toLowerCase()}
            </p>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-[13px] text-neutral-500">
          <Eye size={15} className="mt-0.5 shrink-0" />
          {savedAtText
            ? t(language, `Saved ${savedAtText}. Listing pages will show this profile in a later update.`, `Uložené ${savedAtText}. Stránky ponúk zobrazia tento profil v ďalšej aktualizácii.`)
            : t(language, "Not saved yet. Listing pages will show this profile in a later update.", "Zatiaľ neuložené. Stránky ponúk zobrazia tento profil v ďalšej aktualizácii.")}
        </p>
      </section>

      <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
        <TextField
          name="displayName"
          label={t(language, "Public name", "Verejné meno")}
          hint={t(language, "First name or the name of your place, e.g. “Jana” or “Chata Lúčky”.", "Krstné meno alebo názov vášho miesta, napr. „Jana“ alebo „Chata Lúčky“.")}
          error={errors.displayName}
          value={values.displayName}
          onChange={onInput("displayName")}
          autoComplete="nickname"
        />

        <HostProfilePhotoField
          language={language}
          value={values.avatarUrl}
          persistedValue={baseline.avatarUrl}
          disabled={save.phase === "saving"}
          fallback={profileInitial(values)}
          onChange={(value) => setField("avatarUrl", value)}
          onBusyChange={setPhotoBusy}
        />

        <div>
          <TextAreaField
            name="about"
            label={t(language, "About you", "O vás")}
            hint={t(language, "Optional. Who you are, what guests can expect, and how you like to host.", "Nepovinné. Kto ste, čo môžu hostia očakávať a ako radi hostíte.")}
            error={errors.about}
            value={values.about}
            onChange={onInput("about")}
            rows={5}
          />
          <p aria-live="polite" className={`mt-1 text-right text-[12px] font-semibold ${aboutLength > ABOUT_MAX ? "text-red-600" : "text-neutral-400"}`}>
            {aboutLength}/{ABOUT_MAX}
          </p>
        </div>

        <Field name="languages" label={t(language, "Languages you speak", "Jazyky, ktorými hovoríte")} hint={t(language, "Optional. Tap every language you can host in.", "Nepovinné. Ťuknite na každý jazyk, v ktorom viete hostiť.")} error={errors.languages}>
          {({ id, errorId, hintId }) => (
            <div id={id} role="group" aria-describedby={[errors.languages ? errorId : null, hintId].filter(Boolean).join(" ") || undefined} className="flex flex-wrap gap-2">
              {HOST_LANGUAGES.map((item) => {
                const selected = values.languages.includes(item.code);
                return (
                  <button
                    key={item.code}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleLanguage(item.code)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] font-bold transition-colors ${
                      selected
                        ? "border-[#1E3E2B] bg-[#1E3E2B] text-white"
                        : "border-neutral-300 bg-white text-[#1E3E2B] hover:border-[#1E3E2B]"
                    }`}
                  >
                    {selected && <Check size={15} />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <SelectField
          name="responseTime"
          label={t(language, "How quickly you reply", "Ako rýchlo odpovedáte")}
          hint={t(language, "Optional. Sets guests' expectations; it is not measured yet.", "Nepovinné. Nastaví očakávania hostí; zatiaľ sa nemeria.")}
          error={errors.responseTime}
          value={values.responseTime}
          onChange={onInput("responseTime")}
        >
          <option value="">{responseTimeLabel(null, language)}</option>
          {RESPONSE_TIMES.map((value) => (
            <option key={value} value={value}>{responseTimeLabel(value, language)}</option>
          ))}
        </SelectField>

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <SaveFeedback phase={save.phase} error={save.error} dirty={dirty} savedAtText={savedAtText} hasFieldErrors={Object.values(errors).some(Boolean)} language={language} />
          <button
            type="submit"
            disabled={save.phase === "saving" || photoBusy}
            aria-busy={save.phase === "saving" || undefined}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-6 text-[15px] font-bold text-white transition-colors hover:bg-[#163021] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {save.phase === "saving" ? (
              <>
                <Loader2 size={18} className="animate-spin" /> {t(language, "Saving…", "Ukladá sa…")}
              </>
            ) : save.phase === "failed" && save.error ? (
              <>
                <RefreshCw size={18} /> {t(language, "Retry save", "Skúsiť uložiť znova")}
              </>
            ) : (
              t(language, "Save profile", "Uložiť profil")
            )}
          </button>
        </div>
      </form>

      <aside className="mt-6 flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-[14px] text-neutral-600">
        <Info size={18} className="mt-0.5 shrink-0 text-[#1E3E2B]" />
        <div>
          <p>
            {t(
              language,
              "Your legal name, phone number, email and password are shared between travelling and hosting. Edit them in your account.",
              "Vaše meno, telefón, e-mail a heslo sú spoločné pre cestovanie aj hosťovanie. Upravíte ich vo svojom účte.",
            )}
          </p>
          <button
            type="button"
            onClick={onOpenAccount}
            disabled={openingAccount}
            className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold text-[#1E3E2B] underline-offset-4 hover:underline disabled:opacity-60"
          >
            {openingAccount ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />}
            {t(language, "Open personal details", "Otvoriť osobné údaje")}
          </button>
          <p className="mt-1 text-[12px] text-neutral-500">
            {t(language, "Opens your account in Travel mode; switch back to Host any time.", "Otvorí váš účet v režime cestovateľa; späť na hostiteľa sa prepnete kedykoľvek.")}
          </p>
        </div>
      </aside>
    </div>
  );
}

function AvatarImage({ src, fallback }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return fallback;
  return <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}

function SaveFeedback({ phase, error, dirty, savedAtText, hasFieldErrors, language }) {
  if (phase === "saving") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
        <Loader2 size={16} className="animate-spin" /> {t(language, "Saving your profile…", "Profil sa ukladá…")}
      </p>
    );
  }
  if (phase === "failed") {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-red-600">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>
          {hasFieldErrors
            ? t(language, "Fix the highlighted fields, then save again.", "Opravte označené polia a uložte znova.")
            : t(language, "Not saved. ", "Neuložené. ") + profileErrorText(error, language)}
        </span>
      </p>
    );
  }
  if (phase === "saved" && !dirty) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <Check size={16} /> {t(language, "Saved", "Uložené")}{savedAtText ? ` · ${savedAtText}` : ""}
      </p>
    );
  }
  if (dirty) {
    return <p role="status" className="text-sm font-semibold text-amber-700">{t(language, "Unsaved changes", "Neuložené zmeny")}</p>;
  }
  return (
    <p className="text-sm text-neutral-500">
      {savedAtText ? t(language, `Last saved ${savedAtText}`, `Naposledy uložené ${savedAtText}`) : t(language, "Not saved yet", "Zatiaľ neuložené")}
    </p>
  );
}
