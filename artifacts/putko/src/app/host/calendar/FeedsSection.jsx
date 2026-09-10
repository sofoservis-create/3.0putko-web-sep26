import React, { useState } from "react";
import Link from "@/app/components/NextLink";
import { AlertCircle, CheckCircle2, Clock, Link2, PauseCircle, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { calendarErrorText, feedErrorText, feedStatusText } from "./calendarModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

const MAX_LABEL = 80;

/** Same first-line check the server runs, so obvious typos never leave the phone. */
export const feedFormProblem = ({ label, url }, language) => {
  const trimmedUrl = (url || "").trim();
  if (!trimmedUrl) return t(language, "Paste the calendar link.", "Vložte odkaz na kalendár.");
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return t(language, "The link must start with http:// or https://.", "Odkaz musí začínať http:// alebo https://.");
  }
  try {
    const parsed = new URL(trimmedUrl);
    if (!parsed.hostname) throw new Error("no host");
  } catch {
    return t(language, "The link is not a valid web address.", "Odkaz nie je platná webová adresa.");
  }
  if ((label || "").trim().length > MAX_LABEL) {
    return t(language, `The name can have at most ${MAX_LABEL} characters.`, `Názov môže mať najviac ${MAX_LABEL} znakov.`);
  }
  return null;
};

const inputClass =
  "w-full min-h-12 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[16px] text-neutral-900 outline-none transition-colors focus:border-[#1E3E2B] focus:ring-2 focus:ring-[#1E3E2B]/15";

function FeedForm({ language, initial, busy, submitLabel, onSubmit, onCancel }) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [problem, setProblem] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const localProblem = feedFormProblem({ label, url }, language);
    if (localProblem) {
      setProblem(localProblem);
      return;
    }
    setProblem(null);
    const result = await onSubmit({ label: label.trim(), url: url.trim() });
    if (result && !result.ok && !result.ignored) setProblem(calendarErrorText(result.error, language));
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-[#1E3E2B]">{t(language, "Name (optional)", "Názov (nepovinné)")}</span>
        <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={MAX_LABEL} placeholder={t(language, "e.g. Airbnb", "napr. Airbnb")} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-[#1E3E2B]">{t(language, "iCal link", "Odkaz iCal")}</span>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://…/calendar.ics"
          aria-invalid={problem ? true : undefined}
          className={`${inputClass} ${problem ? "border-red-400" : ""}`}
        />
      </label>
      {problem && (
        <p role="alert" className="flex items-start gap-2 text-[13px] font-semibold text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {problem}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-12 rounded-xl border border-neutral-300 px-5 text-[15px] font-bold text-[#1E3E2B] transition-colors hover:bg-neutral-50 disabled:opacity-60">
          {t(language, "Cancel", "Zrušiť")}
        </button>
        <button type="submit" disabled={busy} aria-busy={busy || undefined} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-5 text-[15px] font-bold text-white transition-colors hover:bg-[#163021] disabled:opacity-60">
          {busy && <RefreshCw size={16} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function StatusPill({ feed, language, paused }) {
  if (paused) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-bold text-amber-800">
        <PauseCircle size={14} /> {t(language, "Paused", "Pozastavené")}
      </span>
    );
  }
  if (feed.status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-bold text-emerald-700">
        <CheckCircle2 size={14} /> {t(language, "Fetched", "Načítané")}
      </span>
    );
  }
  if (feed.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-bold text-red-700">
        <AlertCircle size={14} /> {t(language, "Failed", "Zlyhalo")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[12px] font-bold text-neutral-600">
      <Clock size={14} /> {t(language, "Never fetched", "Nikdy nenačítané")}
    </span>
  );
}

function FeedCard({ feed, language, action, paused, onFetch, onUpdate, onRemove }) {
  const [mode, setMode] = useState("view"); // view | edit | confirmRemove
  const [actionError, setActionError] = useState(null);
  const busy = Boolean(action);
  const name = feed.label?.trim() || t(language, "Connected calendar", "Pripojený kalendár");

  const run = async (operation) => {
    setActionError(null);
    const result = await operation();
    if (result && !result.ok && !result.ignored) setActionError(calendarErrorText(result.error, language));
    return result;
  };

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-bold text-[#1E3E2B]">{name}</h3>
            <StatusPill feed={feed} language={language} paused={paused} />
          </div>
          <p className="mt-1 break-all text-[12px] text-neutral-500">{feed.url}</p>
          <p className="mt-1.5 text-[13px] text-neutral-700">
            {paused
              ? t(language, "Not imported while availability is manual only.", "Kým je dostupnosť len manuálna, neimportuje sa.")
              : feedStatusText(feed, language)}
          </p>
          {!paused && feed.status === "failed" && feed.lastError && (
            <p className="mt-0.5 text-[13px] font-semibold text-red-600">{feedErrorText(feed.lastError, language)}</p>
          )}
        </div>
      </div>

      {mode === "edit" && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <FeedForm
            language={language}
            initial={feed}
            busy={busy}
            submitLabel={t(language, "Save", "Uložiť")}
            onCancel={() => setMode("view")}
            onSubmit={async (values) => {
              const result = await run(() => onUpdate(feed.id, values));
              if (result?.ok) setMode("view");
              return result;
            }}
          />
        </div>
      )}

      {mode === "confirmRemove" && (
        <div className="mt-4 rounded-xl bg-red-50 p-3">
          <p className="text-[13px] font-semibold text-red-700">
            {t(language, "Remove this calendar link? Dates imported from it will open up again.", "Odstrániť tento odkaz? Termíny z neho importované sa opäť uvoľnia.")}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setMode("view")} disabled={busy} className="min-h-11 flex-1 rounded-xl border border-neutral-300 bg-white px-4 text-[14px] font-bold text-[#1E3E2B] disabled:opacity-60">
              {t(language, "Keep", "Ponechať")}
            </button>
            <button
              type="button"
              disabled={busy}
              aria-busy={busy || undefined}
              onClick={async () => {
                const result = await run(() => onRemove(feed.id));
                if (result?.ok) setMode("view");
              }}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-[14px] font-bold text-white disabled:opacity-60"
            >
              {action === "remove" && <RefreshCw size={16} className="animate-spin" />}
              {t(language, "Remove", "Odstrániť")}
            </button>
          </div>
        </div>
      )}

      {actionError && mode !== "edit" && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] font-semibold text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {actionError}
        </p>
      )}

      {mode === "view" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!paused && <button
            type="button"
            disabled={busy}
            aria-busy={action === "fetch" || undefined}
            onClick={() => run(() => onFetch(feed.id))}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#1E3E2B] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#163021] disabled:opacity-60"
          >
            <RefreshCw size={15} className={action === "fetch" ? "animate-spin" : ""} />
            {feed.status === "never" ? t(language, "Fetch now", "Načítať teraz") : t(language, "Fetch again", "Načítať znova")}
          </button>}
          <button type="button" disabled={busy} onClick={() => setMode("edit")} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-300 px-4 text-[13px] font-bold text-[#1E3E2B] transition-colors hover:bg-neutral-50 disabled:opacity-60">
            <Pencil size={15} /> {t(language, "Edit", "Upraviť")}
          </button>
          <button type="button" disabled={busy} onClick={() => setMode("confirmRemove")} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-200 px-4 text-[13px] font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60">
            <Trash2 size={15} /> {t(language, "Remove", "Odstrániť")}
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Connected calendars for one property. Feeds are fetched only when the host
 * asks (after adding, or via "Fetch again"); the copy says so plainly.
 */
export default function FeedsSection({
  language,
  feeds,
  addingFeed,
  feedActions,
  onAdd,
  onUpdate,
  onRemove,
  onFetch,
  calendarChoice,
  modeAction,
  onSetMode,
  editorLinkProps,
}) {
  const [adding, setAdding] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [modeError, setModeError] = useState(null);
  // Same rule as Step 8: links only count while the listing is on "connect".
  const paused = feeds.length > 0 && calendarChoice !== "connect";
  const modeBusy = Boolean(modeAction);
  const importedCount = feeds.reduce((sum, feed) => sum + (feed.importedCount ?? 0), 0);

  const switchMode = async (choice) => {
    setModeError(null);
    const result = await onSetMode(choice);
    if (result && !result.ok && !result.ignored) setModeError(calendarErrorText(result.error, language));
    else if (result?.ok) setConfirmPause(false);
  };

  return (
    <section aria-labelledby="calendar-feeds-title" className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="calendar-feeds-title" className="flex items-center gap-2 text-[17px] font-bold text-[#1E3E2B]">
            <Link2 size={18} className="text-[#DFBA73]" /> {t(language, "Connected calendars", "Pripojené kalendáre")}
          </h2>
          <p className="mt-1 max-w-prose text-[13px] leading-5 text-neutral-600">
            {t(
              language,
              "Dates from Airbnb, Booking.com or any iCal link are imported when you tap Fetch. There is no automatic background sync yet — fetch again after changes on the other side.",
              "Termíny z Airbnb, Booking.com alebo ľubovoľného iCal odkazu sa importujú, keď ťuknete na Načítať. Automatická synchronizácia na pozadí zatiaľ nie je — po zmenách na druhej strane načítajte znova.",
            )}
          </p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#1E3E2B] px-4 text-[13px] font-bold text-[#1E3E2B] transition-colors hover:bg-[#1E3E2B]/5">
            <Plus size={16} /> {t(language, "Add link", "Pridať odkaz")}
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-4 rounded-2xl bg-[#F8F4EA] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[#1E3E2B]">{t(language, "New calendar link", "Nový odkaz na kalendár")}</h3>
            <button type="button" onClick={() => setAdding(false)} disabled={addingFeed} aria-label={t(language, "Close", "Zavrieť")} className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-white">
              <X size={18} />
            </button>
          </div>
          <FeedForm
            language={language}
            busy={addingFeed}
            submitLabel={t(language, "Add and fetch", "Pridať a načítať")}
            onCancel={() => setAdding(false)}
            onSubmit={async (values) => {
              const result = await onAdd(values);
              if (result?.ok) setAdding(false);
              return result;
            }}
          />
        </div>
      )}

      {paused && (
        <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-[13px] font-semibold text-amber-900">
            <PauseCircle size={16} className="mt-0.5 shrink-0" />
            {t(
              language,
              "Availability is set to manual only, so these links are paused: no dates are imported from them and only the dates you block here count.",
              "Dostupnosť je nastavená len manuálne, preto sú tieto odkazy pozastavené: neimportujú sa z nich žiadne termíny a platia len termíny, ktoré blokujete tu.",
            )}
          </p>
          <button
            type="button"
            disabled={modeBusy}
            aria-busy={modeAction === "connect" || undefined}
            onClick={() => switchMode("connect")}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1E3E2B] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#163021] disabled:opacity-60"
          >
            <RefreshCw size={15} className={modeAction === "connect" ? "animate-spin" : ""} />
            {t(language, "Reconnect and fetch", "Znova pripojiť a načítať")}
          </button>
        </div>
      )}

      {modeError && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] font-semibold text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {modeError}
        </p>
      )}

      {feeds.length === 0 ? (
        !adding && (
          <p className="mt-4 rounded-2xl border border-dashed border-neutral-300 p-4 text-center text-[13px] text-neutral-500">
            {t(language, "No calendar links yet. The only blocked dates in this calendar are the ones you set here.", "Zatiaľ žiadne odkazy na kalendár. Jediné blokované termíny v tomto kalendári sú tie, ktoré ste nastavili tu.")}
          </p>
        )
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {feeds.map((feed) => (
            <FeedCard key={feed.id} feed={feed} language={language} action={feedActions[feed.id]} paused={paused} onFetch={onFetch} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </ul>
      )}

      {feeds.length > 0 && !paused && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          {confirmPause ? (
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-[13px] font-semibold text-amber-900">
                {importedCount > 0
                  ? t(
                      language,
                      `Switch to manual only? Your ${feeds.length} ${feeds.length === 1 ? "link stays" : "links stay"} saved but paused, and ${importedCount} imported blocked ${importedCount === 1 ? "range opens" : "ranges open"} up again.`,
                      `Prepnúť len na manuálne? ${feeds.length === 1 ? "Váš odkaz zostane uložený, ale pozastavený" : `Vaše odkazy (${feeds.length}) zostanú uložené, ale pozastavené`} a ${importedCount} importovaných blokovaných termínov sa opäť uvoľní.`,
                    )
                  : t(
                      language,
                      "Switch to manual only? Your links stay saved but paused; nothing is imported until you reconnect.",
                      "Prepnúť len na manuálne? Vaše odkazy zostanú uložené, ale pozastavené; kým ich znova nepripojíte, nič sa neimportuje.",
                    )}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirmPause(false)} disabled={modeBusy} className="min-h-11 flex-1 rounded-xl border border-neutral-300 bg-white px-4 text-[14px] font-bold text-[#1E3E2B] disabled:opacity-60">
                  {t(language, "Keep connected", "Ponechať pripojené")}
                </button>
                <button
                  type="button"
                  disabled={modeBusy}
                  aria-busy={modeAction === "none" || undefined}
                  onClick={() => switchMode("none")}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {modeAction === "none" && <RefreshCw size={16} className="animate-spin" />}
                  {t(language, "Switch to manual", "Prepnúť na manuálne")}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmPause(true)} disabled={modeBusy} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold text-neutral-700 underline decoration-neutral-300 decoration-2 underline-offset-4 transition-colors hover:text-[#1E3E2B] disabled:opacity-60">
              <PauseCircle size={15} /> {t(language, "Switch to manual only (pause links)", "Prepnúť len na manuálne (pozastaviť odkazy)")}
            </button>
          )}
        </div>
      )}

      {editorLinkProps && (
        <p className="mt-4 text-[13px] text-neutral-600">
          {t(language, "The same links appear in ", "Rovnaké odkazy nájdete aj v ")}
          <Link {...editorLinkProps} className="font-bold text-[#1E3E2B] underline decoration-[#DFBA73] decoration-2 underline-offset-4">
            {t(language, "step 8 of the listing editor", "kroku 8 editora ponuky")}
          </Link>
          .
        </p>
      )}
    </section>
  );
}
