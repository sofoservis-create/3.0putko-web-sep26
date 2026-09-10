import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FormContext } from "../../FormContext";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Calendar as CalendarIcon,
  CheckCircle2,
  CreditCard,
  Home,
  Image as ImageIcon,
  Landmark,
  Loader2,
  MapPin,
  Wifi,
} from "lucide-react";
import { getHostAccommodation } from "../../utlis/guestAccountApi";
import { toast } from "react-toastify";
import { useHostListings } from "../../host/HostListingsContext";
import {
  EDITOR_STEP_IDS,
  EDITOR_STEP_TITLES,
  LAST_VISITED_STEP_KEY,
  resumeStepIndex,
} from "../../host/hostListingModel";
import {
  fieldElementId,
  hasErrors,
  requirementStepIndex,
  validateStep,
} from "../../host/hostEditorValidation";
import { useHostNavigation, useLeaveGuard } from "../../host/HostNavigationGuard";
import { hostPaths } from "../../host/hostRoutes";
import EditorStep from "./editor/EditorSteps";
import { DesktopStepSidebar, MobileEditorHeader, SaveStatus, StepSheet } from "./editor/EditorStepper";
import PublishReviewDialog from "./editor/PublishReviewDialog";
import useKeyboardInset from "./editor/useKeyboardInset";

const STEP_ICONS = {
  basics: Home,
  location: MapPin,
  spaces: BedDouble,
  amenities: Wifi,
  photos: ImageIcon,
  pricing: CreditCard,
  availability: CalendarIcon,
  calendar: CalendarIcon,
  readiness: Landmark,
};

// Step order and titles are shared with the listings hub so "resume at the
// right step" and "Next: <step>" labels always agree with the editor.
const STEPS = EDITOR_STEP_IDS.map((id) => ({
  id,
  icon: STEP_ICONS[id],
  title: EDITOR_STEP_TITLES[id],
}));

const AUTOSAVE_DELAY_MS = 1500;

// What "unsaved" compares: the payload minus the resume pointer, which the
// editor may update on its own when the host moves between steps.
const serializeData = (data) => {
  const { [LAST_VISITED_STEP_KEY]: _ignored, ...rest } = data || {};
  return JSON.stringify(rest);
};

/** JSON with sorted object keys, so equal values compare equal regardless of key order. */
const stableJson = (value) =>
  JSON.stringify(value, (_key, child) =>
    child && typeof child === "object" && !Array.isArray(child)
      ? Object.fromEntries(Object.keys(child).sort().map((key) => [key, child[key]]))
      : child,
  );

/**
 * Only the top-level fields that changed since the last successful save.
 * The server deep-merges patches, so leaving a field out keeps whatever is
 * stored — including changes another screen (the property calendar's feed
 * list) made while this editor was open. Nothing this editor did not touch
 * can be overwritten by a later autosave.
 */
export const changedFields = (snapshot, lastSaved) => {
  const patch = {};
  for (const [key, value] of Object.entries(snapshot || {})) {
    if (key === LAST_VISITED_STEP_KEY) continue;
    if (!(key in (lastSaved || {})) || stableJson(value) !== stableJson(lastSaved[key])) {
      patch[key] = value;
    }
  }
  return patch;
};

const focusField = (field) => {
  if (!field || typeof document === "undefined") return;
  const element = document.getElementById(fieldElementId(field));
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ block: "center", behavior: "smooth" });
};

export default function AccommodationForm({
  accommodationId,
  onBack,
  onCreated,
  openReview = false,
  onReviewDismiss,
  // Step id from `?step=` — opens the editor on that step (e.g. the calendar
  // page linking back to step 8) instead of the remembered resume step.
  openStep = null,
}) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const en = language === "en";
  const { createListing, saveListing, publishListing } = useHostListings();
  const [localId, setLocalId] = useState(accommodationId);
  // Mirrors localId synchronously so the route-sync effect below can tell a
  // URL change we caused (first save replaced /new with the new id) from a
  // real navigation to another listing.
  const localIdRef = useRef(accommodationId ?? null);
  // Editing session counter. Bumped whenever the route points the editor at a
  // different listing so late responses from a previous session are ignored.
  const sessionRef = useRef(0);
  // Set right before the first save assigns the created id, so the id-change
  // effect does not issue a GET that could race the PATCH in flight.
  const skipNextLoadRef = useRef(false);
  const prevOpenReviewRef = useRef(openReview);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [data, setDataState] = useState({});
  // Synchronous mirror of `data` for save/guard code that runs outside render.
  const dataRef = useRef({});
  const [status, setStatus] = useState(null);
  const [completion, setCompletion] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [currentStep, setCurrentStepState] = useState(0);
  const stepIdRef = useRef(STEPS[0].id);
  // Step id the server last stored as the resume pointer.
  const savedStepRef = useRef(null);
  const [lastSavedJson, setLastSavedJsonState] = useState(serializeData({}));
  const lastSavedJsonRef = useRef(lastSavedJson);
  const [saveState, setSaveState] = useState({ phase: "idle" }); // idle | saving | saved | failed
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;
  const completionRef = useRef(completion);
  completionRef.current = completion;
  // Saves are chained so two clicks (or autosave + Next) can never create two
  // listings or send overlapping PATCHes.
  const saveChainRef = useRef(Promise.resolve(false));
  const [attemptedSteps, setAttemptedSteps] = useState(() => new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [reviewReturn, setReviewReturn] = useState(false);
  const pendingFocusRef = useRef(null);
  // Bumped with every review link so the focus effect also runs when the
  // requested field is on the step already shown.
  const [focusRequest, setFocusRequest] = useState(0);
  const keyboardInset = useKeyboardInset();

  const setData = useCallback((next) => {
    const value = typeof next === "function" ? next(dataRef.current) : next;
    dataRef.current = value;
    setDataState(value);
  }, []);

  const setLastSavedJson = useCallback((json) => {
    lastSavedJsonRef.current = json;
    setLastSavedJsonState(json);
  }, []);

  const setCurrentStep = useCallback((index) => {
    const bounded = Math.min(STEPS.length - 1, Math.max(0, index));
    stepIdRef.current = STEPS[bounded].id;
    setCurrentStepState(bounded);
  }, []);

  const resetSession = useCallback(() => {
    dataRef.current = {};
    setDataState({});
    setStatus(null);
    setCompletion({});
    setSavedAt(null);
    setCurrentStep(0);
    savedStepRef.current = null;
    setLastSavedJson(serializeData({}));
    setSaveState({ phase: "idle" });
    setAttemptedSteps(new Set());
    setShowPreview(false);
    setShowSteps(false);
    setReviewReturn(false);
  }, [setCurrentStep, setLastSavedJson]);

  // The editor is URL-driven: when the route changes to another listing (or to
  // "new"), reset the local editing session. After the first save creates a
  // listing, the URL is replaced with its id and localId already matches, so
  // the in-progress step is preserved.
  useEffect(() => {
    if ((accommodationId ?? null) === localIdRef.current) return;
    localIdRef.current = accommodationId ?? null;
    sessionRef.current += 1;
    skipNextLoadRef.current = false;
    setLocalId(accommodationId ?? null);
    resetSession();
    // In-flight save/publish/load calls from the previous session must not
    // leave the new editor's controls disabled; their results are dropped by
    // the session guard below.
    setLoading(false);
    setPublishing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accommodationId]);

  // Leaving the editor (Listings, Today, menu) unmounts it. Invalidate the
  // session so a create/save/publish that finishes afterwards cannot call the
  // navigation callbacks (`onCreated`, `onReviewDismiss`) or touch state. The
  // shared store still records the server response, so the list stays right.
  useEffect(() => {
    return () => {
      sessionRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    loadData({ resume: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localId]);

  // Keep the publish-review dialog in sync with the `?review=1` URL state so
  // Back/Forward between the plain editor and the review URL behaves.
  useEffect(() => {
    const wasOpen = prevOpenReviewRef.current;
    prevOpenReviewRef.current = openReview;
    if (openReview) {
      if (!loading && localId && status === "READY") {
        setCurrentStep(STEPS.length - 1);
        setShowPreview(true);
      }
    } else if (wasOpen) {
      setShowPreview(false);
    }
  }, [openReview, loading, localId, status, setCurrentStep]);

  const closePreview = () => {
    setShowPreview(false);
    if (openReview) onReviewDismiss?.();
  };

  const applyServerMeta = (res) => {
    setStatus(res.status);
    setSavedAt(res.updatedAt || new Date().toISOString());
    setCompletion({
      percent: res.completionPercent,
      completedSteps: res.completedSteps || [],
      missing: res.missingRequirements || [],
      canPublish: res.canPublish,
    });
  };

  // `resume` is only set when the editor opens a listing (route change), so
  // a DRAFT lands on its last visited / first incomplete step. Reloads after
  // publish keep the current step.
  const applyServerListing = (res) => {
    const serverData = res.data || {};
    setData(serverData);
    savedStepRef.current = serverData[LAST_VISITED_STEP_KEY] ?? null;
    setLastSavedJson(serializeData(serverData));
    applyServerMeta(res);
  };

  // `session` and `id` are bound to the editing session that asked for the
  // load. A caller that awaited something before calling loadData passes the
  // session it started with, so a stale continuation can never fetch its own
  // listing into a newer session's form.
  const loadData = async ({ resume = false, session = sessionRef.current, id = localIdRef.current } = {}) => {
    if (session !== sessionRef.current) return;
    setLoading(true);
    try {
      if (id) {
        const res = await getHostAccommodation(id);
        if (session !== sessionRef.current) return;
        applyServerListing(res);
        if (resume) {
          const requested = openStep ? STEPS.findIndex((step) => step.id === openStep) : -1;
          setCurrentStep(requested >= 0 ? requested : resumeStepIndex(res));
        }
      }
    } catch (err) {
      if (session !== sessionRef.current) return;
      toast.error(en ? "Failed to load" : "Nepodarilo sa načítať");
    } finally {
      if (session === sessionRef.current) setLoading(false);
    }
  };

  /**
   * One save round-trip. Creates the listing first when the editor is on
   * /new. Local edits made while the request is in flight are never
   * overwritten: the server copy is only adopted when the form did not change
   * meanwhile, otherwise the still-dirty form triggers another autosave.
   * Returns true on success; failures keep the entered data and surface as
   * the "Not saved" state with a retry.
   */
  const performSave = async ({ session, explicit, stepId }) => {
    if (session !== sessionRef.current) return false;
    const snapshot = dataRef.current;
    const snapshotJson = serializeData(snapshot);
    const stepForPayload = stepId ?? stepIdRef.current;
    setSaveState({ phase: "saving" });
    try {
      let idToSave = localIdRef.current;
      if (!idToSave) {
        const created = await createListing();
        if (session !== sessionRef.current) return false;
        idToSave = created.id;
        localIdRef.current = idToSave;
        skipNextLoadRef.current = true;
        setLocalId(idToSave);
        onCreated?.(idToSave);
      }

      // Remember where the host will be after this save so "Continue setup"
      // reopens the draft on the same step. Stored inside the JSON payload;
      // the server ignores it for completion and publishing.
      const res = await saveListing(idToSave, {
        ...changedFields(snapshot, JSON.parse(lastSavedJsonRef.current)),
        [LAST_VISITED_STEP_KEY]: stepForPayload,
      });
      if (session !== sessionRef.current) return false;

      savedStepRef.current = stepForPayload;
      applyServerMeta(res);
      if (serializeData(dataRef.current) === snapshotJson) {
        const serverData = res.data || snapshot;
        setData(serverData);
        setLastSavedJson(serializeData(serverData));
      } else {
        setLastSavedJson(snapshotJson);
      }
      setSaveState({ phase: "saved" });
      return true;
    } catch (err) {
      if (session !== sessionRef.current) return false;
      setSaveState({ phase: "failed", message: err?.message || null });
      if (explicit) toast.error(en ? "Couldn't save. Your changes are still here — try again." : "Nepodarilo sa uložiť. Vaše zmeny zostávajú — skúste to znova.");
      return false;
    }
  };

  // Always call the latest performSave (fresh props/language) from the stable
  // runSave used by effects and the leave guard.
  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  const runSave = useCallback((options = {}) => {
    const session = sessionRef.current;
    const task = saveChainRef.current
      .catch(() => false)
      .then(() => performSaveRef.current({ session, ...options }));
    saveChainRef.current = task;
    return task;
  }, []);

  const dirty = useMemo(() => serializeData(data) !== lastSavedJson, [data, lastSavedJson]);
  const saving = saveState.phase === "saving";
  const step = STEPS[currentStep];
  // Only drafts resume at a remembered step, so only they keep the pointer
  // fresh; opening a READY/LIVE listing must not write to it.
  const stepPointerStale = Boolean(localId) && status === "DRAFT" && savedStepRef.current !== step.id;

  // Debounced autosave: anything unsaved (field edits, or just moving to
  // another step so the resume pointer follows) is written after a pause.
  // A failed save waits for an edit or an explicit retry instead of looping.
  // While the leave confirmation is open nothing is written: "Discard" must
  // mean the edits were never saved, and "Save and leave" saves explicitly.
  const hostNavigation = useHostNavigation();
  const leaveDialogOpen = Boolean(hostNavigation?.pending);
  // Links out of the editor (e.g. to the listing calendar) must run through
  // the same guard so unsaved edits are never lost silently.
  const linkProps = hostNavigation?.linkProps ?? ((href) => ({ href }));
  useEffect(() => {
    if (loading || saving || saveState.phase === "failed" || leaveDialogOpen) return undefined;
    if (!dirty && !stepPointerStale) return undefined;
    const timer = setTimeout(() => {
      runSave({ explicit: false });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, currentStep, dirty, stepPointerStale, loading, saving, saveState.phase, leaveDialogOpen, runSave]);

  // Leaving this listing with unsaved edits asks first (Back, sidebar links,
  // browser Back, mode switch, tab close). The same listing's URLs (e.g.
  // ?review=1) are never blocked.
  useLeaveGuard({
    hasUnsavedChanges: () => serializeData(dataRef.current) !== lastSavedJsonRef.current || saveStateRef.current.phase === "saving",
    ownsLocation: (location) =>
      Boolean(location) &&
      location.section === "listing" &&
      (location.listingId ?? null) === (localIdRef.current ?? null),
    save: () => runSave({ explicit: true }),
    saving,
  });

  const errors = useMemo(
    () => (attemptedSteps.has(step.id) ? validateStep(step.id, data, language) : {}),
    [attemptedSteps, step.id, data, language],
  );

  const markAttempted = (stepId) => {
    setAttemptedSteps((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  };

  const validateCurrentStep = () => {
    const stepErrors = validateStep(step.id, dataRef.current, language);
    markAttempted(step.id);
    if (hasErrors(stepErrors)) {
      const [firstField] = Object.keys(stepErrors);
      // The error element renders on the next paint.
      requestAnimationFrame(() => focusField(firstField));
      return false;
    }
    return true;
  };

  const goToStep = (index) => {
    setCurrentStep(index);
    setShowSteps(false);
    window.scrollTo(0, 0);
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep >= STEPS.length - 1) return;
    const nextIndex = currentStep + 1;
    goToStep(nextIndex);
    runSave({ explicit: true, stepId: STEPS[nextIndex].id });
  };

  const handleSaveDraft = () => runSave({ explicit: true });

  /**
   * Save until the server has seen exactly what is on screen. Fields stay
   * editable while a save is in flight, so an edit made meanwhile leaves the
   * form dirty again; those edits are saved too before this resolves true.
   * Bounded so a host typing continuously cannot keep it looping forever.
   */
  const saveUntilCurrent = async () => {
    const session = sessionRef.current;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const saved = await runSave({ explicit: true });
      if (!saved || session !== sessionRef.current) return false;
      if (serializeData(dataRef.current) === lastSavedJsonRef.current) return true;
    }
    return false;
  };

  // Review needs a successful, current save first so the server's completion
  // result (the only thing that can unlock Publish) reflects the form as it
  // is now. The current step's inline messages are shown too, but the review
  // still opens so every remaining item is listed together.
  const handleReview = async () => {
    markAttempted(step.id);
    const current = await saveUntilCurrent();
    if (current) {
      setReviewReturn(false);
      setShowPreview(true);
    }
  };

  const handleFixRequirement = (requirement) => {
    const index = requirementStepIndex(requirement);
    closePreview();
    if (index < 0) return;
    markAttempted(STEPS[index].id);
    setReviewReturn(true);
    pendingFocusRef.current = requirement;
    setFocusRequest((n) => n + 1);
    goToStep(index);
  };

  // Focus the field a review link pointed at once its step has rendered
  // (or immediately when that step is already on screen).
  useEffect(() => {
    const field = pendingFocusRef.current;
    if (!field) return;
    pendingFocusRef.current = null;
    requestAnimationFrame(() => focusField(field));
  }, [currentStep, focusRequest]);

  const handlePublish = async () => {
    if (!localId || !completion.canPublish || publishing) return;
    const session = sessionRef.current;
    const id = localId;
    setPublishing(true);
    try {
      // Publish only what the server has already checked: anything typed
      // since the review opened is saved (and re-evaluated) first, and the
      // publish is abandoned if that save fails or no longer allows it.
      if (serializeData(dataRef.current) !== lastSavedJsonRef.current || saveStateRef.current.phase === "saving") {
        const current = await saveUntilCurrent();
        if (session !== sessionRef.current) return;
        if (!current || !completionRef.current.canPublish) return;
      }
      const snapshotJson = serializeData(dataRef.current);
      const published = await publishListing(id);
      // The shared store already holds the published listing; only this
      // editor session may apply it to the form.
      if (session !== sessionRef.current) return;
      toast.success(en ? "Published successfully!" : "Úspešne zverejnené!");
      if (published?.id === id) {
        if (serializeData(dataRef.current) === snapshotJson) applyServerListing(published);
        // Edits made while publishing stay on screen (still unsaved, so
        // autosave writes them next); only the status/meta is adopted.
        else applyServerMeta(published);
      } else {
        loadData({ session, id });
      }
      closePreview();
    } catch (err) {
      if (session !== sessionRef.current) return;
      toast.error(en ? "Failed to publish" : "Nepodarilo sa zverejniť");
    } finally {
      if (session === sessionRef.current) setPublishing(false);
    }
  };

  const clearFailure = () => {
    if (saveStateRef.current.phase === "failed") setSaveState({ phase: "idle" });
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let nextValue = value;
    if (type === "number") nextValue = value === "" ? "" : Number(value);
    if (type === "checkbox") nextValue = checked;
    clearFailure();
    setData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const setField = (name, value) => {
    clearFailure();
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (id) => {
    clearFailure();
    setData((prev) => {
      const current = Array.isArray(prev.amenities) ? prev.amenities : [];
      return current.includes(id)
        ? { ...prev, amenities: current.filter((item) => item !== id) }
        : { ...prev, amenities: [...current, id] };
    });
  };

  const handlePhotoAdd = (url) => {
    clearFailure();
    setData((prev) => ({ ...prev, photoUrls: [...(Array.isArray(prev.photoUrls) ? prev.photoUrls : []), url] }));
  };

  const handlePhotoRemove = (index) => {
    clearFailure();
    setData((prev) => ({
      ...prev,
      photoUrls: (Array.isArray(prev.photoUrls) ? prev.photoUrls : []).filter((_, i) => i !== index),
    }));
  };

  const isStepComplete = (stepId) =>
    stepId === "calendar" ? Boolean(data.calendarChoice) : Boolean(completion.completedSteps?.includes(stepId));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#DFBA73]" size={32} />
      </div>
    );
  }

  const percent = completion.percent || 0;
  const saveStatus = (
    <SaveStatus
      state={saveState.phase}
      dirty={dirty}
      savedAt={savedAt}
      hasListing={Boolean(localId)}
      language={language}
      onRetry={handleSaveDraft}
    />
  );
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="mx-auto -mt-4 flex max-w-5xl flex-col gap-6 px-4 pb-36 animate-fadeIn lg:mt-0 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:px-0 lg:pb-8 lg:pt-4">
      <MobileEditorHeader
        step={step}
        stepIndex={currentStep}
        total={STEPS.length}
        percent={percent}
        language={language}
        onBack={onBack}
        onOpenSteps={() => setShowSteps(true)}
        saveStatus={saveStatus}
      />

      <DesktopStepSidebar
        steps={STEPS}
        currentStep={currentStep}
        isComplete={isStepComplete}
        percent={percent}
        language={language}
        onSelect={goToStep}
        onBack={onBack}
        saveStatus={saveStatus}
      />

      <StepSheet
        open={showSteps}
        steps={STEPS}
        currentStep={currentStep}
        isComplete={isStepComplete}
        percent={percent}
        language={language}
        onSelect={goToStep}
        onClose={() => setShowSteps(false)}
      />

      {/* Main form area */}
      <div className="min-w-0 flex-1">
        <div className="flex h-full flex-col overflow-hidden bg-white lg:rounded-3xl lg:border lg:border-neutral-200 lg:shadow-sm">
          <div className="hidden items-center gap-5 border-b border-neutral-100 bg-neutral-50/50 p-8 lg:flex">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-[#1E3E2B] shadow-sm">
              <step.icon size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1E3E2B]">{step.title[language]}</h2>
              <p className="mt-1 text-[15px] font-medium text-neutral-500">
                {en ? "Step " : "Krok "}
                {currentStep + 1} {en ? "of" : "z"} {STEPS.length}
              </p>
            </div>
          </div>

          <div className="flex-1 pt-5 lg:p-8">
            {status === "LIVE" && (
              <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
                <div className="text-sm text-green-900">
                  <p className="font-bold">{en ? "This listing is live" : "Táto ponuka je zverejnená"}</p>
                  <p className="mt-0.5 text-[13px] text-green-800">
                    {en
                      ? "Saved changes update the published listing. It returns to draft if a required detail is removed."
                      : "Uložené zmeny sa prejavia v zverejnenej ponuke. Ak odstránite povinný údaj, vráti sa do konceptu."}
                  </p>
                </div>
              </div>
            )}

            {reviewReturn && (
              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#DFBA73]/60 bg-[#DFBA73]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-[#1E3E2B]">
                  {en ? "Fix the highlighted item, then return to the publish review." : "Opravte zvýraznenú položku a potom sa vráťte ku kontrole pred zverejnením."}
                </p>
                <button
                  type="button"
                  onClick={handleReview}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-4 text-sm font-bold text-white transition-colors hover:bg-[#163021] disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {en ? "Return to review" : "Späť na kontrolu"}
                </button>
              </div>
            )}

            <EditorStep
              stepId={step.id}
              data={data}
              errors={errors}
              language={language}
              onChange={handleChange}
              setField={setField}
              toggleAmenity={handleAmenityToggle}
              addPhoto={handlePhotoAdd}
              removePhoto={handlePhotoRemove}
              calendarLinkProps={localId ? linkProps(hostPaths.listingCalendar(localId)) : null}
              payoutsLinkProps={linkProps(hostPaths.payouts)}
            />
          </div>

          {/* Action bar: fixed above the keyboard/safe area on phones, static on desktop */}
          <div
            className="fixed inset-x-0 z-40 border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:static lg:border-0 lg:border-t lg:border-neutral-100 lg:bg-neutral-50/50 lg:px-8 lg:py-5 lg:shadow-none"
            style={{ bottom: keyboardInset }}
          >
            <div className="mx-auto flex max-w-5xl items-center gap-2 sm:gap-3">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={() => goToStep(currentStep - 1)}
                  aria-label={en ? "Previous step" : "Predchádzajúci krok"}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-200 text-[#1E3E2B] transition-colors hover:bg-neutral-50 sm:w-auto sm:gap-2 sm:px-4"
                >
                  <ArrowLeft size={20} />
                  <span className="hidden text-sm font-bold sm:inline">{en ? "Back" : "Späť"}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 bg-white px-3 text-sm font-bold text-[#1E3E2B] transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-60 sm:flex-none sm:px-6"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                <span className="truncate">{saving ? (en ? "Saving…" : "Ukladá sa…") : en ? "Save draft" : "Uložiť koncept"}</span>
              </button>

              <div className="hidden flex-1 sm:block" />

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-4 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#163021] sm:flex-none sm:px-8"
                >
                  {en ? "Next" : "Ďalej"}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReview}
                  disabled={saving}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#DFBA73] px-4 text-sm font-bold text-[#1E3E2B] shadow-md transition-colors hover:bg-[#c9a561] disabled:opacity-60 sm:flex-none sm:px-8"
                >
                  {saving && <Loader2 className="animate-spin" size={18} />}
                  {en ? "Review" : "Náhľad"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PublishReviewDialog
        open={showPreview}
        language={language}
        data={data}
        status={status}
        completion={completion}
        publishing={publishing}
        unsaved={dirty || saving}
        onClose={closePreview}
        onPublish={handlePublish}
        onFixRequirement={handleFixRequirement}
      />
    </div>
  );
}
