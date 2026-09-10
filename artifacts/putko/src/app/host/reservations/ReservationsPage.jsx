import React, { useMemo, useState } from "react";
import { AlertCircle, BellRing, ChevronDown, ClipboardList, FlaskConical, Loader2, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import { useHostListings } from "../HostListingsContext";
import { useHostNavigation } from "../HostNavigationGuard";
import { listingName } from "../hostListingModel";
import { hostPaths, RESERVATION_STAGES } from "../hostRoutes";
import { useHostReservations } from "./HostReservationsContext";
import ReservationCard from "./ReservationCard";
import {
  countByStage,
  filterReservations,
  pendingRequests,
  reservationErrorText,
  sortReservations,
  stageLabel,
} from "./reservationModel";

const t = (language, en, sk) => (language === "en" ? en : sk);

const skRequests = (n) => `${n} ${n === 1 ? "žiadosť čaká" : n >= 2 && n <= 4 ? "žiadosti čakajú" : "žiadostí čaká"} na vašu odpoveď`;
const requestsWaiting = (n, language) =>
  language === "en" ? `${n} ${n === 1 ? "request is" : "requests are"} waiting for your reply` : skRequests(n);

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

/**
 * Development-only helper: creates a representative set of sample requests
 * for one of the host's listings so the flows can be exercised without the
 * traveler booking flow. Hidden from production builds.
 */
function SampleDataCard({ listings, language }) {
  const { createFixtures, fixturesPending, refresh } = useHostReservations();
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [error, setError] = useState(null);
  const selected = listings.some((item) => item.id === listingId) ? listingId : listings[0]?.id ?? "";

  const run = async () => {
    if (!selected) return;
    setError(null);
    const result = await createFixtures(selected);
    if (result.ignored) return;
    if (!result.ok) {
      setError(reservationErrorText(result.error, language));
      return;
    }
    const created = result.created.length;
    toast.success(
      language === "en"
        ? `${created} sample ${created === 1 ? "reservation" : "reservations"} added${result.skipped.length ? ` (${result.skipped.length} skipped: dates already taken)` : ""}.`
        : `Pridané ukážkové rezervácie: ${created}${result.skipped.length ? ` (${result.skipped.length} vynechané: termín je už obsadený)` : ""}.`,
    );
    refresh({ background: true });
  };

  return (
    <section aria-label={t(language, "Sample data", "Ukážkové dáta")} className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <div className="flex items-start gap-3">
        <FlaskConical size={18} className="mt-0.5 shrink-0 text-neutral-500" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#1E3E2B]">{t(language, "Development: sample requests", "Vývoj: ukážkové žiadosti")}</p>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            {t(language, "Adds a few pretend guests (requests, an upcoming and a current stay) to one listing. Not visible to real guests.", "Pridá k jednej ponuke niekoľko fiktívnych hostí (žiadosti, nadchádzajúci a prebiehajúci pobyt). Skutoční hostia ich nevidia.")}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="relative block flex-1">
              <span className="sr-only">{t(language, "Listing", "Ponuka")}</span>
              <select
                value={selected}
                onChange={(event) => setListingId(event.target.value)}
                disabled={fixturesPending}
                className="min-h-11 w-full appearance-none rounded-xl border border-neutral-300 bg-white py-2 pl-3 pr-10 text-[14px] font-semibold text-[#1E3E2B] outline-none focus:border-[#1E3E2B]"
              >
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>{listingName(listing, language)}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            </label>
            <button
              type="button"
              onClick={run}
              disabled={fixturesPending || !selected}
              aria-busy={fixturesPending || undefined}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1E3E2B] px-4 text-[14px] font-bold text-[#1E3E2B] transition-colors hover:bg-[#1E3E2B]/5 disabled:opacity-50"
            >
              {fixturesPending && <Loader2 size={16} className="animate-spin" />}
              {t(language, "Add sample requests", "Pridať ukážkové žiadosti")}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 flex items-start gap-2 text-[13px] font-semibold text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Reservations list. Filters (property, stage) live in the URL so refresh,
 * Back and deep links keep them; the data comes from the shared store so a
 * transition on the detail screen is reflected here immediately.
 */
export default function ReservationsPage({ filters, language }) {
  const { listings, loaded: listingsLoaded } = useHostListings();
  const { guardedNavigate } = useHostNavigation();
  const { reservations, loaded, loading, refreshing, error, refresh } = useHostReservations();

  const property = filters?.property ?? null;
  const stage = filters?.stage ?? null;
  const propertyKnown = !property || !listingsLoaded || listings.some((item) => item.id === property);

  const byProperty = useMemo(() => filterReservations(reservations, { property }), [reservations, property]);
  const counts = useMemo(() => countByStage(byProperty), [byProperty]);
  const visible = useMemo(() => sortReservations(filterReservations(byProperty, { stage })), [byProperty, stage]);
  const requests = useMemo(() => pendingRequests(byProperty), [byProperty]);

  const setFilters = (next) => guardedNavigate(hostPaths.reservations({ property, stage, ...next }), { replace: true });

  const header = (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-wide text-neutral-500">{t(language, "Host", "Hostiteľ")}</p>
        <h1 className="truncate text-2xl font-bold text-[#1E3E2B]">{t(language, "Reservations", "Rezervácie")}</h1>
      </div>
      {listingsLoaded && listings.length > 1 && (
        <label className="relative block">
          <span className="sr-only">{t(language, "Property", "Ubytovanie")}</span>
          <select
            value={propertyKnown && property ? property : ""}
            onChange={(event) => setFilters({ property: event.target.value || null })}
            className="min-h-12 w-full appearance-none rounded-xl border border-neutral-300 bg-white py-3 pl-4 pr-11 text-[15px] font-bold text-[#1E3E2B] outline-none focus:border-[#1E3E2B] focus:ring-2 focus:ring-[#1E3E2B]/15 sm:w-auto sm:min-w-[260px]"
          >
            <option value="">{t(language, "All properties", "Všetky ubytovania")}</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>{listingName(listing, language)}</option>
            ))}
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        </label>
      )}
    </header>
  );

  const wrap = "mx-auto max-w-4xl px-4 pb-8 animate-fadeIn md:px-0";

  if (loading && !loaded) {
    return (
      <div className={wrap}>
        {header}
        <div aria-busy="true" className="animate-pulse space-y-3">
          <div className="h-10 w-3/4 rounded-xl bg-neutral-200" />
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 rounded-2xl border border-neutral-200 bg-white" />
          ))}
        </div>
        <p className="sr-only" role="status">{t(language, "Loading reservations", "Načítavajú sa rezervácie")}</p>
      </div>
    );
  }

  if (error && !loaded) {
    return (
      <div className={wrap}>
        {header}
        <StatePanel
          icon={AlertCircle}
          tone="error"
          title={t(language, "We couldn't load your reservations", "Rezervácie sa nepodarilo načítať")}
          body={reservationErrorText(error, language)}
          action={
            <button type="button" onClick={() => refresh()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-200 bg-white px-6 font-bold text-red-700 hover:bg-red-100">
              <RefreshCw size={16} /> {t(language, "Retry", "Skúsiť znova")}
            </button>
          }
        />
      </div>
    );
  }

  const showSampleData = import.meta.env.DEV && listingsLoaded && listings.length > 0;
  const nothingAtAll = reservations.length === 0;

  return (
    <div className={wrap}>
      {header}

      {nothingAtAll ? (
        <div className="space-y-4">
          <StatePanel
            icon={ClipboardList}
            title={t(language, "No reservations yet", "Zatiaľ žiadne rezervácie")}
            body={
              listingsLoaded && listings.length === 0
                ? t(language, "Once you publish a listing, guest requests will show up here.", "Keď zverejníte ponuku, žiadosti hostí sa zobrazia tu.")
                : t(language, "Guest requests for your listings will show up here. You'll accept or decline them from this screen.", "Žiadosti hostí o vaše ponuky sa zobrazia tu. Prijímať a zamietať ich budete z tejto obrazovky.")
            }
          />
          {showSampleData && <SampleDataCard listings={listings} language={language} />}
        </div>
      ) : (
        <>
          {!propertyKnown && (
            <p role="status" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
              {t(language, "That property is no longer in your listings, so all properties are shown.", "Toto ubytovanie už nie je medzi vašimi ponukami, zobrazujú sa všetky.")}
            </p>
          )}

          {requests.length > 0 && !stage && (
            <section aria-label={t(language, "Needs your reply", "Čaká na vašu odpoveď")} className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <BellRing size={18} />
                <p className="text-[14px] font-bold">{requestsWaiting(requests.length, language)}</p>
              </div>
              <p className="mt-1 text-[13px] text-amber-800/80">
                {t(language, "Open a request to accept or decline it. Accepted stays block their nights in the calendar.", "Otvorte žiadosť a prijmite ju alebo zamietnite. Prijaté pobyty zablokujú svoje noci v kalendári.")}
              </p>
              <button
                type="button"
                onClick={() => setFilters({ stage: "request" })}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1E3E2B] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#163021]"
              >
                {t(language, "Show requests", "Zobraziť žiadosti")}
              </button>
            </section>
          )}

          <div role="tablist" aria-label={t(language, "State", "Stav")} style={{ scrollbarWidth: "none" }} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {[null, ...RESERVATION_STAGES].map((option) => {
              const active = stage === option;
              const count = option ? counts[option] : byProperty.length;
              return (
                <button
                  key={option ?? "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilters({ stage: option })}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors ${
                    active ? "border-[#1E3E2B] bg-[#1E3E2B] text-white" : "border-neutral-300 bg-white text-[#1E3E2B] hover:border-[#1E3E2B]"
                  }`}
                >
                  {option ? stageLabel(option, language, { plural: true }) : t(language, "All", "Všetky")}
                  <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-neutral-100 text-neutral-600"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {refreshing && <p className="sr-only" role="status">{t(language, "Refreshing reservations", "Obnovujú sa rezervácie")}</p>}

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center">
              <p className="text-[15px] font-bold text-[#1E3E2B]">{t(language, "Nothing here", "Nič tu nie je")}</p>
              <p className="mt-1 text-[13px] text-neutral-500">
                {t(language, "No reservations match this filter.", "Tomuto filtru nezodpovedajú žiadne rezervácie.")}
              </p>
              <button
                type="button"
                onClick={() => setFilters({ stage: null, property: null })}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-300 px-4 text-[14px] font-bold text-[#1E3E2B] hover:bg-neutral-50"
              >
                {t(language, "Show all reservations", "Zobraziť všetky rezervácie")}
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  language={language}
                  showProperty={!property || !propertyKnown}
                  urgent={reservation.stage === "request"}
                />
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 text-[13px] font-semibold text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {t(language, "The list may be out of date: ", "Zoznam nemusí byť aktuálny: ")}
              {reservationErrorText(error, language)}
            </p>
          )}

          {showSampleData && (
            <div className="mt-6">
              <SampleDataCard listings={listings} language={language} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
