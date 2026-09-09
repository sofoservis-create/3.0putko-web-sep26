import React, { useContext, useMemo, useState } from "react";
import { FormContext } from "../../FormContext";
import { Plus, Home, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { useHostListings } from "../../host/HostListingsContext";
import { countByStatus, listingName } from "../../host/hostListingModel";
import ListingCard from "./ListingCard";
import DeleteListingDialog from "./DeleteListingDialog";

// Slovak plural forms: 1 → one, 2–4 → few, 0 and 5+ → many.
const skCount = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;

const FILTERS = [
  { key: "ALL", label: { en: "All", sk: "Všetky" } },
  { key: "DRAFT", label: { en: "Drafts", sk: "Koncepty" } },
  { key: "READY", label: { en: "Ready", sk: "Pripravené" } },
  { key: "LIVE", label: { en: "Live", sk: "Zverejnené" } },
];

export default function AccommodationsList({ onOpen, onCreate }) {
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const en = language === "en";

  const { listings, loaded, loading, refreshing, error, refresh, deleteListing, deletingIds } =
    useHostListings();

  const [showRequirements, setShowRequirements] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const counts = useMemo(() => countByStatus(listings), [listings]);
  const activeFilter = counts[filter] === 0 && filter !== "ALL" ? "ALL" : filter;
  const visible = useMemo(
    () => (activeFilter === "ALL" ? listings : listings.filter((item) => item.status === activeFilter)),
    [listings, activeFilter],
  );

  const requestDelete = (listing) => {
    setDeleteError(null);
    setPendingDelete(listing);
  };

  const cancelDelete = () => {
    if (pendingDelete && deletingIds.has(pendingDelete.id)) return;
    setPendingDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deletingIds.has(pendingDelete.id)) return;
    const target = pendingDelete;
    setDeleteError(null);
    try {
      await deleteListing(target.id);
      setPendingDelete(null);
      toast.success(
        en
          ? `"${listingName(target, language)}" was deleted.`
          : `Ponuka „${listingName(target, language)}“ bola vymazaná.`,
      );
    } catch (err) {
      setDeleteError(err instanceof Error ? err : new Error("Delete failed"));
    }
  };

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 animate-pulse" aria-busy="true">
      {[1, 2].map((i) => (
        <div key={i} className="h-56 rounded-3xl border border-neutral-200 bg-white" />
      ))}
    </div>
  );

  const renderError = () => (
    <div role="alert" className="flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-600" />
        <div>
          <h2 className="text-lg font-bold text-red-700">
            {en ? "We couldn't load your listings" : "Nepodarilo sa načítať vaše ponuky"}
          </h2>
          <p className="mt-1 text-sm text-red-600">
            {en ? "Check your connection and try again." : "Skontrolujte pripojenie a skúste to znova."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => refresh()}
        disabled={loading}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        {en ? "Retry" : "Skúsiť znova"}
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm md:p-16">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#DFBA73]/10 text-[#DFBA73]">
        <Home size={40} />
      </div>
      <h2 className="mb-3 text-2xl font-bold text-[#1E3E2B]">
        {en ? "Add your first accommodation" : "Pridajte svoje prvé ubytovanie"}
      </h2>
      <p className="mb-10 max-w-sm text-[16px] leading-relaxed text-neutral-500">
        {en
          ? "Set aside about 10 minutes. You will need property details, photos, pricing, availability, and payout readiness."
          : "Vyhraďte si približne 10 minút. Budete potrebovať údaje o ubytovaní, fotografie, ceny, dostupnosť a nastavenie výplat."}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-8 py-4 font-bold text-white shadow-md transition-colors hover:bg-[#163021] sm:w-auto"
      >
        <Plus size={20} />
        {en ? "Start" : "Začať"}
      </button>
      <button
        type="button"
        onClick={() => setShowRequirements((current) => !current)}
        aria-expanded={showRequirements}
        className="mt-4 min-h-11 px-4 text-sm font-bold text-[#1E3E2B] underline decoration-[#DFBA73] decoration-2 underline-offset-4"
      >
        {en ? "What will I need?" : "Čo budem potrebovať?"}
      </button>
      {showRequirements && (
        <div className="mt-3 max-w-md rounded-2xl bg-[#F8F4EA] p-4 text-left text-sm leading-6 text-neutral-700">
          {en
            ? "Address and capacity, amenities, at least one photo, nightly price, house rules, availability, calendar choice, and payout acknowledgement."
            : "Adresu a kapacitu, vybavenie, aspoň jednu fotografiu, cenu za noc, pravidlá, dostupnosť, voľbu kalendára a potvrdenie výplat."}
        </div>
      )}
    </div>
  );

  const renderList = () => (
    <>
      {error && loaded && (
        <div role="status" className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {en
              ? "Showing the last loaded listings. The latest refresh failed."
              : "Zobrazujú sa naposledy načítané ponuky. Posledné obnovenie zlyhalo."}
          </span>
          <button
            type="button"
            onClick={() => refresh({ background: true })}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {en ? "Retry" : "Skúsiť znova"}
          </button>
        </div>
      )}

      {listings.length > 1 && (
        <div
          role="tablist"
          aria-label={en ? "Filter listings by status" : "Filtrovať ponuky podľa stavu"}
          className="mb-5 flex flex-wrap gap-2"
        >
          {FILTERS.map((item) => {
            const count = item.key === "ALL" ? listings.length : counts[item.key];
            if (item.key !== "ALL" && count === 0) return null;
            const active = activeFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.key)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
                  active
                    ? "border-[#1E3E2B] bg-[#1E3E2B] text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {item.label[language]}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 pb-8 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {visible.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            language={language}
            onOpen={onOpen}
            onDelete={requestDelete}
            deleting={deletingIds.has(listing.id)}
          />
        ))}
      </div>
    </>
  );

  const showInitialLoading = !loaded && loading;
  const showInitialError = !loaded && !loading && error;

  return (
    <div className="mx-auto max-w-5xl px-4 animate-fadeIn md:px-0">
      <div className="mb-6 flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between md:mb-8 md:pt-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E3E2B] md:text-3xl">
            {en ? "Listings" : "Ponuky"}
          </h1>
          <p className="mt-2 text-[15px] text-neutral-500">
            {loaded && listings.length > 0
              ? en
                ? `${listings.length} ${listings.length === 1 ? "property" : "properties"} · ${counts.DRAFT} ${counts.DRAFT === 1 ? "draft" : "drafts"}, ${counts.READY} ready, ${counts.LIVE} live`
                : `${skCount(listings.length, "ubytovanie", "ubytovania", "ubytovaní")} · ${skCount(counts.DRAFT, "koncept", "koncepty", "konceptov")}, ${skCount(counts.READY, "pripravená", "pripravené", "pripravených")}, ${skCount(counts.LIVE, "zverejnená", "zverejnené", "zverejnených")}`
              : en
                ? "Manage your properties and drafts."
                : "Spravujte svoje ubytovania a koncepty."}
          </p>
        </div>
        {loaded && listings.length > 0 && (
          <button
            type="button"
            onClick={onCreate}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#DFBA73] px-6 py-3.5 font-bold text-[#1E3E2B] shadow-sm transition-colors hover:bg-[#c9a561] sm:w-auto"
          >
            <Plus size={20} />
            {en ? "Add listing" : "Pridať ponuku"}
          </button>
        )}
      </div>

      {showInitialLoading
        ? renderSkeleton()
        : showInitialError
          ? renderError()
          : listings.length === 0
            ? renderEmpty()
            : renderList()}

      <DeleteListingDialog
        listing={pendingDelete}
        language={language}
        pending={Boolean(pendingDelete && deletingIds.has(pendingDelete.id))}
        error={deleteError}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
