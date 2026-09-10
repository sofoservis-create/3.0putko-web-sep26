import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, CalendarDays, CalendarX2, CheckCircle2, Lock, Mail, MessageSquareText,
  Phone, RefreshCw, Users, XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import Link from "@/app/components/NextLink";
import { useHostNavigation } from "../HostNavigationGuard";
import { hostPaths } from "../hostRoutes";
import { useHostReservations } from "./HostReservationsContext";
import TransitionDialog from "./TransitionDialog";
import {
  actionCopy,
  formatCheckDay,
  formatMoney,
  formatRequestedAt,
  guestsLabel,
  nightsLabel,
  reservationErrorText,
  stagePresentation,
} from "./reservationModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

function StatePanel({ icon: Icon, tone = "neutral", title, body, action }) {
  const tones = {
    neutral: "border-neutral-200 bg-white text-[#1E3E2B]",
    error: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`flex flex-col items-center rounded-3xl border p-8 text-center shadow-sm ${tones[tone]}`}>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#DFBA73]/10 text-[#DFBA73]">
        <Icon size={30} />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-neutral-600">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const STAGE_HINT = {
  request: {
    en: "The guest is waiting for your reply. Accepting blocks these nights in the calendar.",
    sk: "Hosť čaká na vašu odpoveď. Prijatím sa tieto noci zablokujú v kalendári.",
  },
  upcoming: {
    en: "Confirmed. These nights are blocked in the calendar.",
    sk: "Potvrdené. Tieto noci sú v kalendári zablokované.",
  },
  active: {
    en: "The guest is staying now. Cancelling ends the stay early and opens the remaining nights.",
    sk: "Hosť je práve ubytovaný. Zrušením sa pobyt ukončí skôr a zvyšné noci sa uvoľnia.",
  },
  completed: { en: "This stay has finished.", sk: "Tento pobyt sa skončil." },
  declined: { en: "You declined this request. The nights stayed open.", sk: "Túto žiadosť ste zamietli. Noci zostali voľné." },
  cancelled: { en: "This stay was cancelled. The nights are open again.", sk: "Tento pobyt bol zrušený. Noci sú opäť voľné." },
};

const ACTION_STYLE = {
  accept: { icon: CheckCircle2, className: "bg-[#1E3E2B] text-white hover:bg-[#163021]" },
  decline: { icon: XCircle, className: "border-2 border-neutral-300 bg-white text-[#1E3E2B] hover:bg-neutral-50" },
  cancel: { icon: XCircle, className: "border-2 border-red-200 bg-white text-red-700 hover:bg-red-50" },
};

/**
 * One reservation: guest and stay context plus the transitions the server
 * listed in `actions`. Each transition confirms in a sheet; the store guards
 * duplicate submits and replaces the reservation with the server's response.
 */
export default function ReservationDetailPage({ reservationId, language }) {
  const { linkProps, guardedNavigate } = useHostNavigation();
  const { reservations, loaded, loadOne, transition, pendingActions } = useHostReservations();
  const reservation = useMemo(() => reservations.find((item) => item.id === reservationId) ?? null, [reservations, reservationId]);

  // Loaded straight from the server so a deep link, a 403 and a 404 are
  // decided by the server even when the list has not arrived yet.
  const [phase, setPhase] = useState("loading"); // loading | ready | forbidden | notFound | error
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(null); // { action, failure } | null
  const [outcome, setOutcome] = useState(null); // text shown after a "moved on" failure closed the dialog

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setLoadError(null);
    loadOne(reservationId).then((result) => {
      if (cancelled || result.ignored) return;
      if (result.ok) setPhase("ready");
      else if (result.error?.status === 403) setPhase("forbidden");
      else if (result.error?.status === 404) setPhase("notFound");
      else {
        setLoadError(result.error);
        setPhase("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reservationId, loadOne, reloadKey]);

  const pendingAction = pendingActions.get(reservationId) ?? null;

  const runAction = async (note) => {
    if (!dialog) return;
    const result = await transition(reservationId, dialog.action, { note });
    if (result.ignored) return;
    if (result.ok) {
      setDialog(null);
      setOutcome(null);
      toast.success(actionCopy(dialog.action, language).done);
      return;
    }
    setDialog({ action: dialog.action, failure: { error: result.error, conflicts: result.conflicts } });
  };

  const back = () => guardedNavigate(hostPaths.reservations());

  const backLink = (
    <Link {...linkProps(hostPaths.reservations())} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-[#1E3E2B]">
      <ArrowLeft size={18} /> {t(language, "All reservations", "Všetky rezervácie")}
    </Link>
  );

  const wrap = "mx-auto max-w-3xl px-4 pb-8 animate-fadeIn md:px-0";

  if (phase === "loading" && !reservation) {
    return (
      <div className={wrap}>
        {backLink}
        <div aria-busy="true" className="animate-pulse space-y-4">
          <div className="h-28 rounded-3xl border border-neutral-200 bg-white" />
          <div className="h-48 rounded-3xl border border-neutral-200 bg-white" />
        </div>
        <p className="sr-only" role="status">{t(language, "Loading reservation", "Načítava sa rezervácia")}</p>
      </div>
    );
  }

  if (phase === "forbidden") {
    return (
      <div className={wrap}>
        {backLink}
        <StatePanel
          icon={Lock}
          title={t(language, "This reservation belongs to another host", "Táto rezervácia patrí inému hostiteľovi")}
          body={t(language, "You can only manage reservations for your own listings.", "Rezervácie môžete spravovať iba pri vlastných ponukách.")}
          action={
            <button type="button" onClick={back} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1E3E2B] px-6 font-bold text-white">
              {t(language, "Go to my reservations", "Prejsť na moje rezervácie")}
            </button>
          }
        />
      </div>
    );
  }

  if (phase === "notFound" || (phase !== "loading" && phase !== "error" && !reservation)) {
    return (
      <div className={wrap}>
        {backLink}
        <StatePanel
          icon={CalendarX2}
          title={t(language, "This reservation no longer exists", "Táto rezervácia už neexistuje")}
          body={t(language, "It may have been removed together with its listing.", "Možno bola odstránená spolu so svojou ponukou.")}
          action={
            <button type="button" onClick={back} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1E3E2B] px-6 font-bold text-white">
              {t(language, "Go to my reservations", "Prejsť na moje rezervácie")}
            </button>
          }
        />
      </div>
    );
  }

  if (phase === "error" && !reservation) {
    return (
      <div className={wrap}>
        {backLink}
        <StatePanel
          icon={AlertCircle}
          tone="error"
          title={t(language, "We couldn't load this reservation", "Rezerváciu sa nepodarilo načítať")}
          body={reservationErrorText(loadError, language)}
          action={
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-white px-6 font-bold text-red-700 hover:bg-red-100">
              <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
            </button>
          }
        />
      </div>
    );
  }

  const stage = stagePresentation(reservation.stage, language);
  const actions = Array.isArray(reservation.actions) ? reservation.actions : [];
  const guest = reservation.guest ?? {};
  const hint = STAGE_HINT[reservation.stage]?.[language === "en" ? "en" : "sk"];

  return (
    <>
      <div className={`${wrap} ${actions.length > 0 ? "pb-32 lg:pb-8" : ""}`}>
        {backLink}

        <header className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-wide text-neutral-500">{reservation.listing?.name}</p>
              <h1 className="mt-0.5 break-words text-2xl font-bold leading-tight text-[#1E3E2B]">{guest.name}</h1>
            </div>
            <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-bold ${stage.badge}`}>{stage.label}</span>
          </div>
          {hint && <p className="mt-3 text-[14px] leading-relaxed text-neutral-600">{hint}</p>}
          {loaded && phase === "error" && (
            <p role="status" className="mt-2 text-[12px] font-semibold text-amber-700">
              {t(language, "Showing the last known state; the latest refresh failed.", "Zobrazuje sa posledný známy stav; aktualizácia zlyhala.")}
            </p>
          )}
        </header>

        <section aria-label={t(language, "Stay", "Pobyt")} className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-[#1E3E2B]"><CalendarDays size={18} className="text-[#DFBA73]" /> {t(language, "Stay", "Pobyt")}</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-neutral-50 p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{t(language, "Check-in", "Príchod")}</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-[#1E3E2B]">{formatCheckDay(reservation.checkIn, language)}</dd>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{t(language, "Check-out", "Odchod")}</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-[#1E3E2B]">{formatCheckDay(reservation.checkOut, language)}</dd>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{t(language, "Guests", "Hostia")}</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-[15px] font-bold text-[#1E3E2B]"><Users size={16} /> {guestsLabel(reservation.guests, language)}</dd>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{t(language, "Total", "Spolu")}</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-[#1E3E2B]">{formatMoney(reservation.totalCents, reservation.currency, language)}</dd>
              <dd className="text-[12px] text-neutral-500">
                {nightsLabel(reservation.nights, language)} × {formatMoney(reservation.nightlyPriceCents, reservation.currency, language)}
              </dd>
            </div>
          </dl>
          <Link
            {...linkProps(hostPaths.listingCalendar(reservation.accommodationId))}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-[#1E3E2B] underline decoration-[#DFBA73] decoration-2 underline-offset-4"
          >
            {t(language, "Open the property calendar", "Otvoriť kalendár ubytovania")}
          </Link>
        </section>

        <section aria-label={t(language, "Guest", "Hosť")} className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-[16px] font-bold text-[#1E3E2B]">{t(language, "Guest", "Hosť")}</h2>
          <ul className="mt-3 space-y-2 text-[14px] text-[#1E3E2B]">
            {guest.email && (
              <li className="flex items-center gap-2"><Mail size={16} className="shrink-0 text-neutral-400" /> <a href={`mailto:${guest.email}`} className="min-h-11 inline-flex items-center break-all underline-offset-4 hover:underline">{guest.email}</a></li>
            )}
            {guest.phone && (
              <li className="flex items-center gap-2"><Phone size={16} className="shrink-0 text-neutral-400" /> <a href={`tel:${guest.phone}`} className="min-h-11 inline-flex items-center underline-offset-4 hover:underline">{guest.phone}</a></li>
            )}
            {!guest.email && !guest.phone && (
              <li className="text-neutral-500">{t(language, "No contact details were shared.", "Hosť neuviedol kontaktné údaje.")}</li>
            )}
          </ul>
          {guest.message && (
            <div className="mt-3 rounded-2xl bg-neutral-50 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500"><MessageSquareText size={14} /> {t(language, "Message from the guest", "Správa od hosťa")}</p>
              <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-[#1E3E2B]">{guest.message}</p>
            </div>
          )}
          <p className="mt-3 text-[12px] text-neutral-500">
            {t(language, "Requested", "Požiadané")} {formatRequestedAt(reservation.createdAt, language)}
            {reservation.respondedAt ? ` · ${t(language, "answered", "zodpovedané")} ${formatRequestedAt(reservation.respondedAt, language)}` : ""}
            {reservation.cancelledAt ? ` · ${t(language, "cancelled", "zrušené")} ${formatRequestedAt(reservation.cancelledAt, language)}` : ""}
          </p>
          {reservation.hostNote && (
            <p className="mt-2 text-[13px] text-neutral-600">
              <span className="font-bold text-[#1E3E2B]">{t(language, "Your note:", "Vaša poznámka:")}</span> {reservation.hostNote}
            </p>
          )}
        </section>

        {outcome && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-[13px] font-semibold text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {outcome}
          </p>
        )}
      </div>

      {/* Actions stay reachable without scrolling on phones; fixed outside the
          animated wrapper (see HostCalendarPage) and offset by the sidebar. */}
      {actions.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 px-3 lg:static lg:mx-auto lg:mt-4 lg:max-w-3xl lg:px-0">
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] lg:shadow-sm">
            <div className={`grid gap-2 ${actions.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {actions.map((action) => {
                const copy = actionCopy(action, language);
                const look = ACTION_STYLE[action];
                if (!copy || !look) return null;
                const Icon = look.icon;
                const busy = pendingAction === action;
                return (
                  <button
                    key={action}
                    type="button"
                    disabled={Boolean(pendingAction)}
                    aria-busy={busy || undefined}
                    onClick={() => {
                      setOutcome(null);
                      setDialog({ action, failure: null });
                    }}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold transition-colors disabled:opacity-50 ${look.className}`}
                  >
                    {busy ? <RefreshCw size={16} className="animate-spin" /> : <Icon size={18} />}
                    {busy ? copy.pending : copy.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <TransitionDialog
        reservation={dialog ? reservation : null}
        action={dialog?.action ?? null}
        language={language}
        pending={Boolean(pendingAction)}
        failure={dialog?.failure ?? null}
        onCancel={() => {
          if (pendingAction) return;
          // A "moved on" failure already refreshed the reservation; keep a
          // short reminder on the page after the sheet closes.
          if (dialog?.failure && (dialog.failure.error?.code === "invalidTransition" || dialog.failure.error?.code === "checkInPassed")) {
            setOutcome(reservationErrorText(dialog.failure.error, language));
          }
          setDialog(null);
        }}
        onConfirm={runAction}
      />
    </>
  );
}
