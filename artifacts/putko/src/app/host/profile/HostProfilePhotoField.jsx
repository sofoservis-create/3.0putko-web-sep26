import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { discardHostProfilePhoto, prepareHostProfilePhoto } from "../../utlis/guestAccountApi";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const t = (language, en, sk) => language === "en" ? en : sk;

const errorText = (error, language) => {
  if (error?.code === "unsupportedType") return t(language, "Choose a JPEG, PNG, WebP or HEIC photo.", "Vyberte fotku JPEG, PNG, WebP alebo HEIC.");
  if (error?.code === "fileTooLarge") return t(language, "Choose a photo smaller than 12 MB.", "Vyberte fotku menšiu ako 12 MB.");
  if (error?.code === "corruptImage") return t(language, "This photo is damaged or cannot be read.", "Táto fotka je poškodená alebo sa nedá prečítať.");
  return t(language, "The photo was not uploaded. Check your connection and try again.", "Fotka sa nenahrala. Skontrolujte pripojenie a skúste to znova.");
};

export default function HostProfilePhotoField({ language, value, persistedValue, fallback, disabled = false, onChange, onBusyChange }) {
  const [candidate, setCandidate] = useState(null);
  const [crop, setCrop] = useState({ x: 0.5, y: 0.5, size: 1 });
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState(null);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const draftRef = useRef(null);
  const persistedRef = useRef(persistedValue);
  const disabledRef = useRef(disabled);
  persistedRef.current = persistedValue;
  disabledRef.current = disabled;

  useEffect(() => () => {
    if (candidate?.url) URL.revokeObjectURL(candidate.url);
  }, [candidate]);
  useEffect(() => {
    if (draftRef.current && draftRef.current === persistedValue) draftRef.current = null;
  }, [persistedValue]);
  useEffect(() => () => {
    if (!disabledRef.current && draftRef.current && draftRef.current !== persistedRef.current) {
      void discardHostProfilePhoto(draftRef.current).catch(() => null);
    }
  }, []);
  useEffect(() => onBusyChange?.(phase === "uploading"), [phase, onBusyChange]);
  useEffect(() => {
    if (!candidate) return;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [candidate]);

  const choose = (file) => {
    if (!file || disabled) return;
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError({ code: "unsupportedType" });
      return;
    }
    if (file.size > MAX_BYTES) {
      setError({ code: "fileTooLarge" });
      return;
    }
    if (candidate?.url) URL.revokeObjectURL(candidate.url);
    setCandidate({ file, url: URL.createObjectURL(file) });
    setCrop({ x: 0.5, y: 0.5, size: 1 });
    setPhase("cropping");
  };

  const upload = async () => {
    if (!candidate || phase === "uploading") return;
    setPhase("uploading");
    setError(null);
    try {
      const result = await prepareHostProfilePhoto(candidate.file, crop);
      if (draftRef.current && draftRef.current !== persistedRef.current) {
        void discardHostProfilePhoto(draftRef.current).catch(() => null);
      }
      draftRef.current = result.avatarUrl;
      onChange(result.avatarUrl);
      URL.revokeObjectURL(candidate.url);
      setCandidate(null);
      setPhase("idle");
    } catch (uploadError) {
      setError(uploadError);
      setPhase("failed");
    }
  };

  const closeCrop = () => {
    if (phase === "uploading") return;
    if (candidate?.url) URL.revokeObjectURL(candidate.url);
    setCandidate(null);
    setPhase("idle");
    setError(null);
  };

  const remove = () => {
    if (disabled) return;
    if (draftRef.current && draftRef.current !== persistedRef.current) {
      void discardHostProfilePhoto(draftRef.current).catch(() => null);
      draftRef.current = null;
    }
    onChange("");
    setError(null);
  };

  const onDialogKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCrop();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [...panelRef.current.querySelectorAll("button:not(:disabled), input:not(:disabled)")];
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <fieldset disabled={disabled} aria-busy={disabled || undefined} className={`space-y-3 ${disabled ? "opacity-60" : ""}`}>
      <legend className="text-sm font-bold text-[#1E3E2B]">{t(language, "Profile photo", "Profilová fotka")}</legend>
      <p className="text-[13px] text-neutral-500">{t(language, "Optional. Take a photo or choose one from your device.", "Nepovinné. Odfotografujte sa alebo vyberte fotku zo zariadenia.")}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1E3E2B] text-3xl font-bold text-[#DFBA73]">
          {value ? <img src={value} alt={t(language, "Current profile", "Aktuálny profil")} className="h-full w-full object-cover" /> : fallback}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1E3E2B] px-4 text-sm font-bold text-white disabled:cursor-not-allowed">
            <Camera size={17} /> {t(language, "Take photo", "Odfotiť sa")}
          </button>
          <button type="button" disabled={disabled} onClick={() => galleryRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 px-4 text-sm font-bold text-[#1E3E2B]">
            <ImagePlus size={17} /> {value ? t(language, "Replace", "Nahradiť") : t(language, "Choose photo", "Vybrať fotku")}
          </button>
          {value && (
            <button type="button" disabled={disabled} onClick={remove} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-red-700">
              <Trash2 size={17} /> {t(language, "Remove", "Odstrániť")}
            </button>
          )}
        </div>
      </div>
      <input ref={cameraRef} disabled={disabled} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="user" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={galleryRef} disabled={disabled} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
      {error && !candidate && <p role="alert" className="text-sm font-semibold text-red-600">{errorText(error, language)}</p>}

      {candidate && (
        <div role="dialog" aria-modal="true" aria-label={t(language, "Crop profile photo", "Orezať profilovú fotku")} className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 sm:items-center" onKeyDown={onDialogKeyDown}>
          <div ref={panelRef} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1E3E2B]">{t(language, "Position your photo", "Upravte polohu fotky")}</h2>
              <button ref={closeRef} type="button" onClick={closeCrop} disabled={phase === "uploading"} aria-label={t(language, "Close", "Zavrieť")} className="rounded-full p-2 hover:bg-neutral-100"><X /></button>
            </div>
            <div className="mx-auto mt-4 aspect-square max-w-sm overflow-hidden rounded-full bg-neutral-100">
              <CropPreview src={candidate.url} crop={crop} onError={() => { setError({ code: "corruptImage" }); setPhase("failed"); }} />
            </div>
            <label className="mt-5 block text-sm font-bold text-[#1E3E2B]">
              {t(language, "Zoom", "Priblíženie")}
              <input className="mt-2 w-full accent-[#1E3E2B]" type="range" min="0.4" max="1" step="0.01" value={crop.size} onChange={(e) => setCrop((current) => ({ ...current, size: Number(e.target.value) }))} />
            </label>
            <label className="mt-3 block text-sm font-bold text-[#1E3E2B]">
              {t(language, "Move left or right", "Posun doľava alebo doprava")}
              <input className="mt-2 w-full accent-[#1E3E2B]" type="range" min="0" max="1" step="0.01" value={crop.x} onChange={(e) => setCrop((current) => ({ ...current, x: Number(e.target.value) }))} />
            </label>
            <label className="mt-3 block text-sm font-bold text-[#1E3E2B]">
              {t(language, "Move up or down", "Posun hore alebo dole")}
              <input className="mt-2 w-full accent-[#1E3E2B]" type="range" min="0" max="1" step="0.01" value={crop.y} onChange={(e) => setCrop((current) => ({ ...current, y: Number(e.target.value) }))} />
            </label>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{errorText(error, language)}</p>}
            <button type="button" onClick={() => void upload()} disabled={phase === "uploading"} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-5 font-bold text-white disabled:opacity-60">
              {phase === "uploading" ? <><Loader2 className="animate-spin" size={18} /> {t(language, "Preparing photo…", "Fotka sa pripravuje…")}</> : phase === "failed" ? <><RefreshCw size={18} /> {t(language, "Try again", "Skúsiť znova")}</> : t(language, "Use this photo", "Použiť túto fotku")}
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}

function CropPreview({ src, crop, onError }) {
  const canvasRef = useRef(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      const shortest = Math.min(image.naturalWidth, image.naturalHeight);
      const size = Math.max(1, shortest * crop.size);
      const sourceX = crop.x * (image.naturalWidth - size);
      const sourceY = crop.y * (image.naturalHeight - size);
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, sourceX, sourceY, size, size, 0, 0, canvas.width, canvas.height);
      }
    };
    image.onerror = () => errorRef.current();
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src, crop]);
  return <canvas ref={canvasRef} width="640" height="640" className="h-full w-full" aria-hidden="true" />;
}