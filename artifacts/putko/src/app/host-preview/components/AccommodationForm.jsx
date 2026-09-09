import React, { useContext, useState, useEffect, useRef } from "react";
import { FormContext } from "../../FormContext";
import { 
  Plus, 
  MapPin, 
  Home, 
  BedDouble, 
  Wifi, 
  Image as ImageIcon, 
  CreditCard, 
  Landmark,
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Trash2,
  Loader2
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

const AMENITIES_LIST = [
  { id: "wifi", en: "WiFi", sk: "WiFi" },
  { id: "kitchen", en: "Kitchen", sk: "Kuchyňa" },
  { id: "parking", en: "Parking", sk: "Parkovanie" },
  { id: "pool", en: "Pool", sk: "Bazén" },
  { id: "tv", en: "TV", sk: "TV" },
  { id: "ac", en: "Air Conditioning", sk: "Klimatizácia" },
  { id: "heating", en: "Heating", sk: "Kúrenie" },
  { id: "washer", en: "Washer", sk: "Práčka" },
];

export default function AccommodationForm({
  accommodationId,
  onBack,
  onCreated,
  openReview = false,
  onReviewDismiss,
}) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
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
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [data, setData] = useState({});
  const [status, setStatus] = useState(null);
  const [completion, setCompletion] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const previewDialogRef = useRef(null);

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
    setData({});
    setStatus(null);
    setCompletion({});
    setCurrentStep(0);
    setShowPreview(false);
    // In-flight save/publish/load calls from the previous session must not
    // leave the new editor's controls disabled; their results are dropped by
    // the session guard below.
    setLoading(false);
    setSaving(false);
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
  }, [openReview, loading, localId, status]);

  const closePreview = () => {
    setShowPreview(false);
    if (openReview) onReviewDismiss?.();
  };
  const closePreviewRef = useRef(closePreview);
  closePreviewRef.current = closePreview;

  useEffect(() => {
    if (!showPreview) return undefined;

    const previouslyFocused = document.activeElement;
    const handleDialogKeyDown = (event) => {
      if (event.key === "Escape") {
        closePreviewRef.current();
        return;
      }
      if (event.key !== "Tab" || !previewDialogRef.current) return;

      const focusable = previewDialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [showPreview]);

  // `resume` is only set when the editor opens a listing (route change), so
  // a DRAFT lands on its last visited / first incomplete step. Reloads after
  // publish keep the current step.
  const applyServerListing = (res) => {
    setData(res.data || {});
    setStatus(res.status);
    setCompletion({
      percent: res.completionPercent,
      completedSteps: res.completedSteps || [],
      missing: res.missingRequirements || [],
      canPublish: res.canPublish
    });
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
        if (resume) setCurrentStep(resumeStepIndex(res));
      }
    } catch (err) {
      if (session !== sessionRef.current) return;
      toast.error(language === "en" ? "Failed to load" : "Nepodarilo sa načítať");
    } finally {
      if (session === sessionRef.current) setLoading(false);
    }
  };

  const handleSave = async (moveToNext = false) => {
    const session = sessionRef.current;
    setSaving(true);
    try {
      let idToSave = localId;
      if (!idToSave) {
        const created = await createListing();
        if (session !== sessionRef.current) return null;
        idToSave = created.id;
        localIdRef.current = idToSave;
        skipNextLoadRef.current = true;
        setLocalId(idToSave);
        onCreated?.(idToSave);
      }

      // Remember where the host will be after this save so "Continue setup"
      // reopens the draft on the same step. Stored inside the JSON payload;
      // the server ignores it for completion and publishing.
      const nextIndex =
        moveToNext && currentStep < STEPS.length - 1 ? currentStep + 1 : currentStep;
      const res = await saveListing(idToSave, {
        ...data,
        [LAST_VISITED_STEP_KEY]: STEPS[nextIndex].id,
      });
      if (session !== sessionRef.current) return null;
      applyServerListing(res);

      toast.success(language === "en" ? "Saved successfully" : "Úspešne uložené");

      if (moveToNext && currentStep < STEPS.length - 1) {
        setCurrentStep(c => c + 1);
        window.scrollTo(0, 0);
      }
      return res;
    } catch (err) {
      if (session !== sessionRef.current) return null;
      toast.error(language === "en" ? "Failed to save" : "Nepodarilo sa uložiť");
      return null;
    } finally {
      if (session === sessionRef.current) setSaving(false);
    }
  };

  const handleReview = async () => {
    const saved = await handleSave(false);
    if (saved) {
      setShowPreview(true);
    }
  };

  const handlePublish = async () => {
    if (!localId || !completion.canPublish) return;
    const session = sessionRef.current;
    const id = localId;
    setPublishing(true);
    try {
      const published = await publishListing(id);
      // The shared store already holds the published listing; only this
      // editor session may apply it to the form.
      if (session !== sessionRef.current) return;
      toast.success(language === "en" ? "Published successfully!" : "Úspešne zverejnené!");
      if (published?.id === id) applyServerListing(published);
      else loadData({ session, id });
      closePreview();
    } catch (err) {
      if (session !== sessionRef.current) return;
      toast.error(language === "en" ? "Failed to publish" : "Nepodarilo sa zverejniť");
    } finally {
      if (session === sessionRef.current) setPublishing(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = value;
    if (type === "number") val = value === "" ? "" : Number(value);
    if (type === "checkbox") val = checked;
    setData(prev => ({ ...prev, [name]: val }));
  };

  const handleAmenityToggle = (id) => {
    setData(prev => {
      const current = prev.amenities || [];
      if (current.includes(id)) return { ...prev, amenities: current.filter(a => a !== id) };
      return { ...prev, amenities: [...current, id] };
    });
  };

  const handlePhotoAdd = () => {
    const url = window.prompt(language === "en" ? "Enter photo URL (safe URLs only)" : "Zadajte URL fotografie");
    if (url) {
      setData(prev => ({ ...prev, photoUrls: [...(prev.photoUrls || []), url] }));
    }
  };

  const handlePhotoRemove = (index) => {
    setData(prev => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#DFBA73]" size={32} /></div>;
  }

  const step = STEPS[currentStep];

  return (
    <div className="max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start gap-6 px-4 lg:px-0 pt-2 lg:pt-4 animate-fadeIn pb-32 lg:pb-8">

      {/* Sidebar / Top Step Indicator */}
      <div className="w-full lg:w-72 shrink-0 bg-white lg:rounded-3xl lg:p-6 lg:border lg:border-neutral-200 lg:shadow-sm h-fit lg:sticky top-6 -mx-4 lg:mx-0 px-4 py-4 lg:py-6 border-b border-neutral-200 lg:border-b-0 mb-4 lg:mb-0 z-10 sticky lg:bg-white bg-white/90 backdrop-blur-md">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-[#1E3E2B] mb-4 lg:mb-8 transition-colors">
          <ArrowLeft size={18} />
          {language === "en" ? "Back to list" : "Späť na zoznam"}
        </button>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <h3 className="font-bold text-[#1E3E2B] mb-3">{language === "en" ? "Completion" : "Dokončenie"}</h3>
          <div className="w-full bg-neutral-100 rounded-full h-2 mb-8 overflow-hidden">
            <div className="bg-[#DFBA73] h-full transition-all duration-500" style={{ width: `${completion.percent || 0}%` }} />
          </div>

          <div className="flex flex-col gap-1.5">
            {STEPS.map((s, idx) => {
              const isActive = currentStep === idx;
              const isComplete =
                s.id === "calendar"
                  ? Boolean(data.calendarChoice)
                  : completion.completedSteps?.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all font-bold ${
                    isActive
                      ? "bg-[#1E3E2B] text-white shadow-md"
                      : isComplete
                        ? "text-[#1E3E2B] hover:bg-neutral-50"
                        : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <s.icon size={18} className={isActive || isComplete ? "text-[#DFBA73]" : "text-neutral-300"} />
                  <span className="text-[14px]">{s.title[language]}</span>
                  {isComplete && !isActive && <CheckCircle2 size={16} className="ml-auto text-green-500" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobile Step Indicator */}
        <div className="lg:hidden flex items-center justify-between mt-2">
          <div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">
              {language === "en" ? "Step" : "Krok"} {currentStep + 1} / {STEPS.length}
            </div>
            <div className="font-bold text-lg text-[#1E3E2B]">{step.title[language]}</div>
          </div>
          <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-[#1E3E2B]">
            <step.icon size={24} />
          </div>
        </div>
        <div className="lg:hidden w-full bg-neutral-200 rounded-full h-1.5 mt-4 overflow-hidden">
          <div className="bg-[#DFBA73] h-full transition-all duration-500" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-3xl lg:border border-neutral-200 lg:shadow-sm overflow-hidden flex flex-col h-full">

          {/* Header (Desktop only since mobile has it in the top bar) */}
          <div className="hidden lg:flex p-8 border-b border-neutral-100 items-center gap-5 bg-neutral-50/50">
            <div className="w-14 h-14 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center text-[#1E3E2B] shadow-sm">
              <step.icon size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1E3E2B]">{step.title[language]}</h2>
              <p className="text-[15px] text-neutral-500 mt-1 font-medium">
                {language === "en" ? "Step " : "Krok "}{currentStep + 1} {language === "en" ? "of" : "z"} {STEPS.length}
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-2 md:p-8 flex-1">
            {status === "LIVE" && (
              <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
                <div className="text-sm text-green-900">
                  <p className="font-bold">{language === "en" ? "This listing is live" : "Táto ponuka je zverejnená"}</p>
                  <p className="mt-0.5 text-[13px] text-green-800">
                    {language === "en"
                      ? "Saved changes update the published listing. It returns to draft if a required detail is removed."
                      : "Uložené zmeny sa prejavia v zverejnenej ponuke. Ak odstránite povinný údaj, vráti sa do konceptu."}
                  </p>
                </div>
              </div>
            )}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">
                    {language === "en" ? "Property Name" : "Názov ubytovania"}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={data.name || ""}
                    onChange={handleChange}
                    placeholder={language === "en" ? "e.g. Cozy Cabin in the Woods" : "napr. Útulná chata v lese"}
                    className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] focus:ring-1 focus:ring-[#1E3E2B] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">
                    {language === "en" ? "Property Type" : "Typ ubytovania"}
                  </label>
                  <select
                    name="propertyType"
                    value={data.propertyType || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] focus:ring-1 focus:ring-[#1E3E2B] outline-none transition-all bg-white"
                  >
                    <option value="">{language === "en" ? "Select type" : "Vyberte typ"}</option>
                    <option value="apartment">{language === "en" ? "Apartment" : "Apartmán"}</option>
                    <option value="house">{language === "en" ? "House" : "Dom"}</option>
                    <option value="cabin">{language === "en" ? "Cabin" : "Chata"}</option>
                    <option value="glamping">{language === "en" ? "Glamping" : "Glamping"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">
                    {language === "en" ? "Description" : "Popis"}
                  </label>
                  <textarea
                    name="description"
                    value={data.description || ""}
                    onChange={handleChange}
                    rows={6}
                    placeholder={language === "en" ? "Describe your place..." : "Popíšte svoje miesto..."}
                    className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] focus:ring-1 focus:ring-[#1E3E2B] outline-none transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "Street Address" : "Ulica a číslo"}</label>
                  <input type="text" name="street" value={data.street || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "City" : "Mesto"}</label>
                    <input type="text" name="city" value={data.city || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "Country" : "Krajina"}</label>
                    <input type="text" name="country" value={data.country || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {['guests', 'bedrooms', 'beds', 'bathrooms'].map(field => (
                  <div key={field}>
                    <label className="block text-sm font-bold text-[#1E3E2B] mb-2 capitalize">{language === "en" ? field : field === 'guests' ? 'Hostia' : field === 'bedrooms' ? 'Spálne' : field === 'beds' ? 'Postele' : 'Kúpeľne'}</label>
                    <input type="number" min="0" name={field} value={data[field] || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                  </div>
                ))}
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {AMENITIES_LIST.map(amenity => (
                  <label key={amenity.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${(data.amenities || []).includes(amenity.id) ? "border-[#DFBA73] bg-[#DFBA73]/5" : "border-neutral-200 hover:border-neutral-300"}`}>
                    <input type="checkbox" checked={(data.amenities || []).includes(amenity.id)} onChange={() => handleAmenityToggle(amenity.id)} className="w-5 h-5 text-[#DFBA73] border-neutral-300 rounded focus:ring-[#DFBA73]" />
                    <span className="text-sm font-bold text-[#1E3E2B]">{amenity[language]}</span>
                  </label>
                ))}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <button type="button" onClick={handlePhotoAdd} className="w-full py-12 border-2 border-dashed border-neutral-300 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-[#DFBA73] hover:bg-[#DFBA73]/5 transition-all text-neutral-500 hover:text-[#DFBA73]">
                  <Plus size={32} />
                  <span className="font-bold">{language === "en" ? "Add Photo URL" : "Pridať URL fotografie"}</span>
                </button>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(data.photoUrls || []).map((url, i) => (
                    <div key={i} className="relative aspect-video rounded-2xl overflow-hidden group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handlePhotoRemove(i)} aria-label={language === "en" ? "Remove photo" : "Odstrániť fotku"} className="absolute top-3 right-3 p-2 bg-white/90 text-red-600 rounded-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "Nightly Price (€)" : "Cena za noc (€)"}</label>
                  <input type="number" min="0" name="nightlyPrice" value={data.nightlyPrice || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "Minimum Nights" : "Minimálny počet nocí"}</label>
                  <input type="number" min="1" name="minNights" value={data.minNights || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "Cancellation Policy" : "Storno podmienky"}</label>
                  <select name="cancellationPolicy" value={data.cancellationPolicy || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all bg-white">
                    <option value="">{language === "en" ? "Select policy" : "Vyberte podmienky"}</option>
                    <option value="flexible">{language === "en" ? "Flexible" : "Flexibilné"}</option>
                    <option value="moderate">{language === "en" ? "Moderate" : "Mierne"}</option>
                    <option value="strict">{language === "en" ? "Strict" : "Prísne"}</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "Check-In Time" : "Čas príchodu"}</label>
                  <input type="time" name="checkIn" value={data.checkIn || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-2">{language === "en" ? "Check-Out Time" : "Čas odchodu"}</label>
                  <input type="time" name="checkOut" value={data.checkOut || ""} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all" />
                </div>
                <div className="col-span-1 sm:col-span-2 mt-4">
                  <label className="flex items-center gap-4 p-5 rounded-2xl border-2 border-neutral-200 cursor-pointer">
                    <input type="checkbox" name="availabilityConfirmed" checked={data.availabilityConfirmed || false} onChange={handleChange} className="w-5 h-5 text-[#DFBA73] border-neutral-300 rounded focus:ring-[#DFBA73]" />
                    <span className="text-sm font-bold text-[#1E3E2B]">{language === "en" ? "I confirm my availability is up to date" : "Potvrdzujem, že moja dostupnosť je aktuálna"}</span>
                  </label>
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-bold text-[#1E3E2B] mb-3">{language === "en" ? "Calendar Source" : "Zdroj kalendára"}</label>
                  <select name="calendarChoice" value={data.calendarChoice || "none"} onChange={handleChange} className="w-full px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none transition-all bg-white">
                    <option value="none">{language === "en" ? "Manual Only" : "Len manuálne"}</option>
                    <option value="connect">{language === "en" ? "Connect iCal/Feeds" : "Pripojiť iCal/Feedy"}</option>
                  </select>
                </div>
                
                {data.calendarChoice === "connect" && (
                  <div className="space-y-4 pt-6 border-t border-neutral-100">
                    <label className="block text-sm font-bold text-[#1E3E2B]">{language === "en" ? "Calendar Feeds (iCal URLs)" : "Kanály kalendára (iCal URL)"}</label>
                    {(data.calendarFeeds || []).map((feed, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-3">
                        <input type="text" placeholder={language === "en" ? "Label (e.g. Airbnb)" : "Štítok (napr. Airbnb)"} value={feed.label || ""} onChange={(e) => {
                          const newFeeds = [...(data.calendarFeeds || [])];
                          newFeeds[i].label = e.target.value;
                          setData(prev => ({ ...prev, calendarFeeds: newFeeds }));
                        }} className="w-full sm:w-1/3 px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none text-sm" />
                        <div className="flex gap-2 flex-1">
                          <input type="url" placeholder="https://..." value={feed.url || ""} onChange={(e) => {
                            const newFeeds = [...(data.calendarFeeds || [])];
                            newFeeds[i].url = e.target.value;
                            setData(prev => ({ ...prev, calendarFeeds: newFeeds }));
                          }} className="flex-1 px-4 py-3.5 rounded-xl border border-neutral-300 focus:border-[#1E3E2B] outline-none text-sm" />
                          <button type="button" onClick={() => {
                            const newFeeds = [...(data.calendarFeeds || [])];
                            newFeeds.splice(i, 1);
                            setData(prev => ({ ...prev, calendarFeeds: newFeeds }));
                          }} className="p-3.5 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-colors" aria-label={language === "en" ? "Remove feed" : "Odstrániť kanál"}>
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setData(prev => ({ ...prev, calendarFeeds: [...(prev.calendarFeeds || []), { label: "", url: "" }] }))} className="inline-flex items-center gap-2 text-[15px] font-bold text-[#1E3E2B] hover:text-[#DFBA73] mt-2 px-4 py-2 bg-neutral-50 rounded-lg">
                      <Plus size={18} /> {language === "en" ? "Add Feed" : "Pridať kanál"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 8 && (
              <div className="space-y-6">
                <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-6 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1E3E2B] text-white">
                      <Landmark size={26} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-[#1E3E2B]">
                          {language === "en" ? "Stripe payout account" : "Výplatný účet Stripe"}
                        </h3>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          {language === "en" ? "Not connected" : "Nepripojený"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-500">
                        {language === "en"
                          ? "Connect the host's verified Stripe account to this property. Booking payouts for this listing will be sent to that account."
                          : "Pripojte overený Stripe účet hostiteľa k tomuto ubytovaniu. Výplaty z rezervácií tejto ponuky budú smerovať na tento účet."}
                      </p>
                      <button
                        type="button"
                        disabled
                        className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-neutral-200 px-5 py-3 text-sm font-bold text-neutral-500"
                      >
                        <CreditCard size={18} />
                        {language === "en" ? "Connect Stripe account" : "Pripojiť Stripe účet"}
                      </button>
                      <p className="mt-2 text-xs font-medium text-neutral-400">
                        {language === "en"
                          ? "The connection button will become available when Stripe Connect is enabled."
                          : "Tlačidlo bude dostupné po aktivovaní Stripe Connect."}
                      </p>
                    </div>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-4 rounded-2xl border-2 border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300">
                  <input
                    type="checkbox"
                    name="payoutAcknowledged"
                    checked={data.payoutAcknowledged || false}
                    onChange={handleChange}
                    className="mt-0.5 h-5 w-5 rounded border-neutral-300 text-[#DFBA73] focus:ring-[#DFBA73]"
                  />
                  <div className="flex-1">
                    <span className="block text-sm font-bold text-[#1E3E2B]">
                      {language === "en"
                        ? "I acknowledge the payout terms for this property"
                        : "Beriem na vedomie podmienky výplat pre toto ubytovanie"}
                    </span>
                    <span className="mt-1 block text-[13px] font-medium text-neutral-500">
                      {language === "en"
                        ? "You can save the listing now. A connected and verified Stripe account will be required before accepting paid bookings."
                        : "Ponuku môžete teraz uložiť. Pred prijímaním platených rezervácií bude potrebný pripojený a overený Stripe účet."}
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 p-4 lg:col-start-2 lg:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-6 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:shadow-none lg:static lg:mt-0 lg:bg-transparent lg:border-0 lg:flex-row">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(c => c - 1)}
            className="px-5 py-3.5 rounded-xl font-bold text-neutral-600 hover:bg-neutral-100 transition-colors border border-transparent"
          >
            {language === "en" ? "Back" : "Späť"}
          </button>
        ) : <div />}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="hidden sm:flex px-6 py-3.5 rounded-xl font-bold text-[#1E3E2B] bg-white border-2 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : language === "en" ? "Save Draft" : "Uložiť koncept"}
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-6 md:px-8 py-3.5 rounded-xl font-bold text-white bg-[#1E3E2B] hover:bg-[#163021] transition-colors flex items-center gap-2 shadow-md"
            >
              {language === "en" ? "Next" : "Ďalej"}
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReview}
              disabled={saving}
              className="px-6 md:px-8 py-3.5 rounded-xl font-bold text-[#1E3E2B] bg-[#DFBA73] hover:bg-[#c9a561] transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={18} />}
              {language === "en" ? "Review" : "Náhľad"}
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            ref={previewDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-review-title"
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <h2 id="publish-review-title" className="text-xl font-bold text-[#1E3E2B]">{language === "en" ? "Publish Review" : "Kontrola pred zverejnením"}</h2>
              <button autoFocus type="button" onClick={closePreview} aria-label={language === "en" ? "Close publish review" : "Zavrieť kontrolu pred zverejnením"} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-neutral-400 hover:text-neutral-900 shadow-sm border border-neutral-200">
                <span className="text-xl leading-none font-bold">&times;</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {!completion.canPublish ? (
                <div className="bg-red-50 text-red-900 p-6 rounded-3xl mb-6 flex gap-4 border border-red-100">
                  <AlertCircle size={28} className="shrink-0" />
                  <div>
                    <h3 className="font-bold mb-2 text-lg">{language === "en" ? "Missing Requirements" : "Chýbajúce požiadavky"}</h3>
                    <ul className="list-disc pl-5 space-y-1.5 text-[15px] font-medium opacity-90">
                      {completion.missing?.map(req => (
                        <li key={req}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 text-green-900 p-6 rounded-3xl mb-6 flex items-center gap-4 border border-green-100">
                  <CheckCircle2 size={32} className="shrink-0" />
                  <div>
                    <h3 className="font-bold mb-1 text-lg">{language === "en" ? "Ready to Publish!" : "Pripravené na zverejnenie!"}</h3>
                    <p className="text-[15px] font-medium opacity-90">{language === "en" ? "All requirements are met." : "Všetky požiadavky sú splnené."}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-bold text-[#1E3E2B] border-b border-neutral-200 pb-3">{language === "en" ? "Guest Preview" : "Náhľad pre hostí"}</h4>
                
                <div className="max-w-sm mx-auto bg-white rounded-3xl overflow-hidden shadow-lg border border-neutral-100 mt-6">
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {data.photoUrls?.[0] ? (
                      <img src={data.photoUrls[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <ImageIcon size={48} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm uppercase tracking-wider text-[#1E3E2B]">
                      {language === "en" ? "Preview" : "Náhľad"}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="font-bold text-lg text-[#1E3E2B] line-clamp-1">{data.name || (language === "en" ? "Property Name" : "Názov ubytovania")}</h3>
                      <div className="flex items-center gap-1 text-[15px] font-bold">
                        <span className="text-[#1E3E2B]">€{data.nightlyPrice || "0"}</span>
                        <span className="text-neutral-500 font-medium">/{language === "en" ? "night" : "noc"}</span>
                      </div>
                    </div>
                    
                    <p className="text-neutral-500 text-[14px] font-medium mb-5">
                      {[data.city, data.country].filter(Boolean).join(", ") || (language === "en" ? "Location not set" : "Lokalita nenastavená")}
                    </p>
                    
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium text-neutral-600 mb-5 pb-5 border-b border-neutral-100">
                      <span className="flex items-center gap-2"><BedDouble size={16} className="text-neutral-400" /> {data.bedrooms || 0} {language === "en" ? "beds" : "lôžok"}</span>
                      <span className="flex items-center gap-2"><Home size={16} className="text-neutral-400" /> {data.guests || 0} {language === "en" ? "guests" : "hostí"}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {(data.amenities || []).slice(0, 3).map(amId => {
                        const am = AMENITIES_LIST.find(a => a.id === amId);
                        return am ? (
                          <span key={am.id} className="px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-100">
                            {am[language]}
                          </span>
                        ) : null;
                      })}
                      {(data.amenities?.length > 3) && (
                        <span className="px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-bold text-neutral-600 border border-neutral-100">
                          +{data.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
              <button type="button" onClick={closePreview} className="px-6 py-3.5 rounded-xl font-bold text-neutral-600 hover:bg-neutral-200 transition-colors">
                {language === "en" ? "Keep Editing" : "Pokračovať v úprave"}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!completion.canPublish || publishing || status === "LIVE"}
                className="px-8 py-3.5 rounded-xl font-bold text-white bg-[#1E3E2B] hover:bg-[#163021] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
              >
                {publishing && <Loader2 className="animate-spin" size={18} />}
                {status === "LIVE"
                  ? (language === "en" ? "Already live" : "Už zverejnené")
                  : (language === "en" ? "Publish Listing" : "Zverejniť ponuku")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
