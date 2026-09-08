"use client";
import React, { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { FormContext } from "../../FormContext";
import useFetchData from "../../hooks/useFetchData";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import Header from "@/app/components/Header/Header";
import CalendarSyncRows from "./CalendarSyncRows";
import {
  makeRow,
  rowsForAccommodation,
  savedFeedsOf,
  filledRows,
  validateRows,
  saveFeeds,
  syncAllFeeds,
} from "../../utlis/calendarSync";
import { Download, RefreshCcw, Home, Link2, Copy, CalendarDays, ArrowDownToLine, ArrowUpFromLine, ChevronDown, Check, Building2, Unlink, AlertTriangle, X } from "lucide-react";

function Synchronization({ onMenuClick }) {
  const { user } = useContext(AuthContext);
  const [accommodations, setAccommodations] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  // The whole calendar list for the selected property: { label, url, … }
  const [feedRows, setFeedRows] = useState([makeRow()]);
  const [rowErrors, setRowErrors] = useState({});
  const [rowResults, setRowResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [myurl, setmyurl] = useState('');
  // { type: 'all' } or { type: 'feed', row } — one modal serves both.
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeImported, setRemoveImported] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [activePage, setActivePage] = useState("import");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const translations = { en, sk };

  // Close the property dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const userId = user?._id;

  // Feeds already saved on the server, which is what the export/import panels
  // and the "disconnect everything" button key off. An unsaved row the host is
  // still typing must not make those appear.
  const savedFeeds = savedFeedsOf(selectedAccommodation);
  const hasSavedFeeds = savedFeeds.length > 0;

  useEffect(() => {
    const userr = localStorage.getItem('user');
    if (userr) {
      const users = JSON.parse(userr);
      const userId = users._id;

      const fetchAccommodations = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch accommodations');
          }

          const result = await response.json();
          setAccommodations(result);
        } catch (error) {
          console.error('Error fetching accommodations:', error);
        }
      };

      fetchAccommodations();
    } else {
      console.error('No user found in localStorage');
    }
  }, []);

  // Select handler for the custom dropdown
  const selectAccommodation = (accommodation) => {
    setSelectedAccommodation(accommodation);
    setFeedRows(rowsForAccommodation(accommodation));
    setRowErrors({});
    setRowResults({});
    setDropdownOpen(false);
  };

  useEffect(() => {
    if (activePage === "export") {
      handleGenerateICS();
    }
  }, [activePage, selectedAccommodation?._id]);

  const handleDownload = (feedUrl) => {
    // The saved URL, so an unsaved edit in the row cannot send the host to a
    // different calendar than the one the panel is showing.
    if (!feedUrl) {
      alert(t.NoURLavailablefordownload);
      return;
    }

    const link = document.createElement("a");
    link.href = feedUrl;
    link.download = feedUrl.split("/").pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { data, error: fetchError } = useFetchData(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`);

  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching accommodation data:", fetchError);
      setError("Failed to fetch accommodation data.");
    }
  }, [data, fetchError]);

  // ── Row editing ─────────────────────────────────────────────────────────
  const updateRow = (localId, patch) => {
    setFeedRows((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row))
    );
    // Clear the row's error as soon as the host starts fixing it.
    setRowErrors((prev) => {
      if (!prev[localId]) return prev;
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const addRow = () => setFeedRows((prev) => [...prev, makeRow()]);

  const removeRow = (row) => {
    // A row that was never saved has nothing on the server and no imported
    // dates behind it, so it just disappears — no confirmation needed.
    if (!row._id) {
      setFeedRows((prev) => {
        const next = prev.filter((r) => r.localId !== row.localId);
        return next.length ? next : [makeRow()];
      });
      return;
    }
    setRemoveImported(true);
    setRemoveTarget({ type: 'feed', row });
  };

  // ── Save & sync ─────────────────────────────────────────────────────────
  //
  // The fetching, importing and per-feed isolation all live in
  // utlis/calendarSync.js, shared with the add-accommodation form so the two
  // screens cannot drift into syncing the same feed differently.
  const handleSave = async () => {
    if (!selectedAccommodation) {
      alert(t.NoAccommodationSelected);
      return;
    }

    const filled = filledRows(feedRows);
    if (!filled.length) {
      alert(t.EnterAtLeastOneCalendarURL);
      return;
    }

    // Validated in one pass so the host fixes every bad row together instead of
    // discovering them one save at a time.
    const errors = validateRows(feedRows, t.InvalidCalendarURL);
    if (Object.keys(errors).length) {
      setRowErrors(errors);
      return;
    }

    setSaving(true);
    setRowErrors({});
    setRowResults({});

    try {
      const calendarSync = await saveFeeds(selectedAccommodation._id, feedRows);
      const savedRows = calendarSync.map(makeRow);
      setFeedRows(savedRows.length ? savedRows : [makeRow()]);

      // Keep the local copies in step with what was just saved, so the export
      // panel and the disconnect button appear without waiting for a refetch.
      const patch = { calendarSync, url: calendarSync[0]?.url || null };
      setSelectedAccommodation((prev) => (prev ? { ...prev, ...patch } : prev));
      setAccommodations((prev) =>
        prev.map((item) =>
          item._id === selectedAccommodation._id ? { ...item, ...patch } : item
        )
      );

      // Each calendar is pulled on its own — one dead link must not stop the
      // others from importing.
      const { outcomes, okCount } = await syncAllFeeds(selectedAccommodation._id, savedRows);
      setRowResults(outcomes);

      alert(
        savedRows.length === 1 && okCount === 1
          ? t.Accommodationupdatedsuccessfully
          : t.SyncFinishedSummary
              .replace("{ok}", okCount)
              .replace("{total}", savedRows.length)
      );
    } catch (error) {
      console.error("Error saving calendars:", error);
      alert(t.Accommodationnotupdated);
    } finally {
      setSaving(false);
    }
  };

  // ── Removal ─────────────────────────────────────────────────────────────
  const applyRemovalResult = (calendarSync) => {
    const rows = (calendarSync || []).map(makeRow);
    setFeedRows(rows.length ? rows : [makeRow()]);
    const patch = {
      calendarSync: calendarSync || [],
      url: calendarSync?.[0]?.url || null,
    };
    setSelectedAccommodation((prev) => (prev ? { ...prev, ...patch } : prev));
    setAccommodations((prev) =>
      prev.map((item) =>
        item._id === selectedAccommodation._id ? { ...item, ...patch } : item
      )
    );
    setRowResults({});
  };

  const handleConfirmRemove = async () => {
    if (!selectedAccommodation || !removeTarget) return;

    const endpoint =
      removeTarget.type === 'feed'
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${selectedAccommodation._id}/calendar-sync/${removeTarget.row._id}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${selectedAccommodation._id}/calendar-sync`;

    setRemoving(true);
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeImported }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to remove calendar sync");
      }

      if (removeTarget.type === 'feed') {
        applyRemovalResult(result.calendarSync);
      } else {
        applyRemovalResult([]);
        setmyurl("");
      }
      setRemoveTarget(null);

      alert(
        result.removedCount > 0
          ? t.CalendarSyncRemovedWithCount.replace("{count}", result.removedCount)
          : t.CalendarSyncRemoved
      );
    } catch (error) {
      console.error("Error removing calendar sync:", error);
      alert(t.FailedToRemoveCalendarSync);
    } finally {
      setRemoving(false);
    }
  };

  const handleGenerateICS = async () => {
    if (!selectedAccommodation) return;

    try {
      // Construct the dynamic URL for fetching the .ics file
      const generatedUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${selectedAccommodation._id}/calendar.ics`;

      const response = await fetch(generatedUrl, { method: "HEAD" });
      if (!response.ok) {
        alert(t.Failedtogeneratecalendarlink);
        return;
      }

      setmyurl(generatedUrl);
    } catch (error) {
      console.error("Error generating calendar link:", error);
      alert(t.Errorgeneratingcalendarlink);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Header
        title={t.CalenderSynchronization}
        subtitle={t.ManageYourPropertyCalendarsEasily}
        showAddButton={true}
      />

      <div className="space-y-6 max-w-[1100px] mx-auto pb-20">
        {/* Main Sync Card */}
        <div className="group relative overflow-hidden bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs">
          {/* Accent Strip */}
          <div className="absolute top-0 left-0 h-full w-1.5 bg-[#319A81]" />

          <form
            className="p-6 pl-7 md:p-10 md:pl-11"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            {/* Step 1: Select Property */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#319A81]/10 text-[#319A81] border border-[#319A81]/20">
                  <Home className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#319A81]">
                    {t.Step} 1
                  </span>
                  <h2 className="text-lg font-extrabold text-[#1E3E2B] tracking-tight leading-tight">
                    {t.SelectYourProperty}
                  </h2>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-4 sm:ml-12">
                {t.ChoosePropertyToConnectCalendar}
              </p>
              <div className="sm:ml-12 relative" ref={dropdownRef}>
                {/* Dropdown Trigger */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={`flex items-center justify-between w-full h-12 px-4 bg-white border rounded-xl shadow-xs transition-all duration-200 ${dropdownOpen
                    ? "border-[#319A81] ring-1 ring-[#319A81]"
                    : "border-[#1E3E2B]/10 hover:border-[#319A81]/50"
                    }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="w-4 h-4 text-[#319A81] shrink-0" />
                    <span className={`text-sm font-medium truncate ${selectedAccommodation ? "text-[#1E3E2B]" : "text-slate-400"}`}>
                      {selectedAccommodation ? selectedAccommodation.name : t.Selectanaccommodation}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown List */}
                {dropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-2 bg-white border border-[#1E3E2B]/10 rounded-2xl shadow-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto p-1.5">
                      {accommodations.length > 0 ? (
                        accommodations.map((accommodation) => {
                          const isActive = selectedAccommodation?._id === accommodation._id;
                          return (
                            <button
                              type="button"
                              key={accommodation._id}
                              onClick={() => selectAccommodation(accommodation)}
                              className={`flex items-center justify-between w-full gap-3 px-3 py-3 rounded-xl text-left transition-all duration-150 ${isActive
                                ? "bg-[#319A81]/10"
                                : "hover:bg-slate-50"
                                }`}
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 border ${isActive
                                  ? "bg-[#319A81] text-white border-[#319A81]"
                                  : "bg-[#1E3E2B]/[0.04] text-[#319A81] border-[#1E3E2B]/10"
                                  }`}>
                                  <Home className="w-4 h-4" />
                                </span>
                                <span className={`text-sm font-semibold truncate ${isActive ? "text-[#1E3E2B]" : "text-slate-700"}`}>
                                  {accommodation.name}
                                </span>
                              </span>
                              {isActive && <Check className="w-4 h-4 text-[#319A81] shrink-0" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-4 text-sm font-medium text-slate-400">
                          <Building2 className="w-4 h-4 shrink-0" />
                          {t.Noaccommodationsavailable}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Calendars — a host normally has Airbnb and Booking.com
                at the same time, so this is a list, not a single field. */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#319A81]/10 text-[#319A81] border border-[#319A81]/20">
                  <Link2 className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#319A81]">
                    {t.Step} 2
                  </span>
                  <h2 className="text-lg font-extrabold text-[#1E3E2B] tracking-tight leading-tight">
                    {t.YourCalendars}
                  </h2>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-4 sm:ml-12">
                {t.ConnectOneOrMoreCalendars}
              </p>

              <div className="sm:ml-12">
                <CalendarSyncRows
                  t={t}
                  rows={feedRows}
                  errors={rowErrors}
                  results={rowResults}
                  onChange={updateRow}
                  onAdd={addRow}
                  onRemove={removeRow}
                  disabled={saving}
                  // This page exists to connect a calendar, and it shows each
                  // feed's sync history — neither is true of the add form.
                  showStatus
                  urlRequired
                />
              </div>
            </div>

            {/* Step 3: Synchronize */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-12">
              <button
                type="submit"
                disabled={saving || !selectedAccommodation}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-3.5 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCcw className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
                {saving ? t.Syncing : t.SyncCalendarNow}
              </button>

              {/* Only offered once the property actually has a feed connected. */}
              {hasSavedFeeds && (
                <button
                  type="button"
                  onClick={() => {
                    setRemoveImported(true);
                    setRemoveTarget({ type: 'all' });
                  }}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl shadow-xs transition-all duration-200 active:scale-95"
                >
                  <Unlink className="w-4 h-4" />
                  {t.RemoveSync}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Import/Export Section.
            Keyed off the SAVED feeds, not the rows being edited. Using the
            edited rows made the panel pop open on the first keystroke, offering
            export and download links for a calendar that was not connected yet. */}
        {hasSavedFeeds && (
          <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="inline-flex items-center gap-1 p-1.5 bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs">
              <button
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${activePage === "export"
                  ? "bg-[#319A81] text-white shadow-md"
                  : "text-slate-500 hover:text-[#1E3E2B] hover:bg-slate-100"
                  }`}
                onClick={() => setActivePage("export")}
              >
                <ArrowUpFromLine className="w-4 h-4" />
                {t.Export}
              </button>
              <button
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 ${activePage === "import"
                  ? "bg-[#319A81] text-white shadow-md"
                  : "text-slate-500 hover:text-[#1E3E2B] hover:bg-slate-100"
                  }`}
                onClick={() => setActivePage("import")}
              >
                <ArrowDownToLine className="w-4 h-4" />
                {t.Import}
              </button>
            </div>

            {activePage === "export" && (
              <div className="group relative overflow-hidden bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 left-0 h-full w-1.5 bg-[#DFBA73]" />
                <div className="p-6 pl-7 md:p-8 md:pl-9">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#DFBA73]/15 text-[#9a7a3a] border border-[#DFBA73]/30">
                      <CalendarDays className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-[#1E3E2B] tracking-tight">{t.ExportURL}</h3>
                      <p className="text-xs font-medium text-slate-500">{t.CopyThisLinkIntoYourListingPlatform}</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={myurl}
                      readOnly
                      className="w-full p-3.5 border border-[#1E3E2B]/10 rounded-xl bg-slate-50 text-[#1E3E2B] font-medium shadow-xs focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(myurl);
                        alert(t.URLCopiedToClipboard);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                      {t.Copy}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* One card per connected calendar, named as the host named it —
                this used to be a single card hardcoded to "Airbnb". */}
            {activePage === "import" && (
              <div className="space-y-3">
                {savedFeeds.map((feed, index) => (
                  <div
                    key={feed._id || `legacy-${index}`}
                    className="group relative overflow-hidden bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300"
                  >
                    <div className="absolute top-0 left-0 h-full w-1.5 bg-[#319A81]" />
                    <div className="flex flex-col gap-5 p-6 pl-7 md:p-8 md:pl-9 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#319A81]/10 text-[#319A81] border border-[#319A81]/20 shrink-0">
                          <CalendarDays className="w-6 h-6" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-base font-extrabold text-[#1E3E2B] tracking-tight truncate">
                            {feed.label || t.UnnamedCalendar}
                          </h3>
                          <p className="text-sm font-medium text-slate-500 truncate">
                            {feed.lastSyncStatus === 'error'
                              ? `${t.SyncFailed}${feed.lastSyncError ? ` — ${feed.lastSyncError}` : ''}`
                              : feed.lastSyncAt
                                ? `${t.LastSynced}: ${new Date(feed.lastSyncAt).toLocaleString()}`
                                : t.NeverSynced}
                          </p>
                        </div>
                      </div>
                      <button
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 shrink-0"
                        onClick={() => handleDownload(feed.url)}
                      >
                        <Download className="w-4 h-4" /> {t.DownloadFile}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove confirmation — one calendar, or all of them */}
      {removeTarget && selectedAccommodation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E3E2B]/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 h-full w-1.5 bg-red-500" />
            <button
              type="button"
              onClick={() => setRemoveTarget(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-[#1E3E2B] hover:bg-slate-100 rounded-lg transition-all duration-150"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 pl-7 md:p-8 md:pl-9">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h3 className="text-base font-extrabold text-[#1E3E2B] tracking-tight pr-6">
                  {removeTarget.type === 'feed'
                    ? t.RemoveThisCalendarTitle
                    : t.RemoveCalendarSyncTitle}
                </h3>
              </div>

              <div className="inline-flex items-center gap-2 mb-4 px-3 py-2 bg-[#319A81]/10 border border-[#319A81]/20 rounded-xl max-w-full">
                <Home className="w-4 h-4 text-[#319A81] shrink-0" />
                <span className="text-sm font-semibold text-[#1E3E2B] truncate">
                  {selectedAccommodation.name}
                  {removeTarget.type === 'feed' &&
                    ` — ${removeTarget.row.label || t.UnnamedCalendar}`}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-500 mb-5">
                {t.RemoveCalendarSyncDescription}
              </p>

              <label className="flex items-start gap-3 p-3.5 mb-3 bg-slate-50 border border-[#1E3E2B]/10 rounded-xl cursor-pointer hover:border-[#319A81]/40 transition-all duration-150">
                <input
                  type="checkbox"
                  checked={removeImported}
                  onChange={(e) => setRemoveImported(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#319A81]"
                />
                <span className="text-sm font-semibold text-[#1E3E2B]">
                  {t.AlsoRemoveImportedBookings}
                </span>
              </label>

              <p className="text-xs font-medium text-slate-400 mb-6">
                {t.ImportedBookingsSafetyNote}
              </p>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRemoveTarget(null)}
                  disabled={removing}
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-slate-600 bg-white border border-[#1E3E2B]/10 hover:bg-slate-50 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  {t.Cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={removing}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Unlink className="w-4 h-4" />
                  {removing ? t.Removing : t.RemoveSync}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Synchronization;
