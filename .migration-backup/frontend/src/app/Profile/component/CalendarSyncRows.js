"use client";
import React from "react";
import { CalendarDays, Plus, Trash2, CircleAlert, CircleCheck, Clock } from "lucide-react";

/**
 * The list of iCal feeds a host connects to one listing — a name plus a URL per
 * row, with add and remove.
 *
 * Shared by the sidebar Synchronization page and the add-accommodation form, so
 * the two cannot drift into showing the same thing differently. Fully
 * controlled: the parent owns the rows and decides what a remove means — drop
 * it locally, or call the API and sweep the dates it imported.
 *
 * The screens differ in two ways, both props:
 *   showStatus   the Synchronization page shows each feed's sync history; a
 *                listing being created has none, so the add form hides it
 *   urlRequired  Synchronization exists to connect a calendar, so a URL is
 *                required there; in the add form the whole section is optional
 */
function CalendarSyncRows({
  t,
  rows,
  errors = {},
  results = {},
  onChange,
  onAdd,
  onRemove,
  disabled = false,
  showStatus = false,
  urlRequired = false,
}) {
  // This run's result if the row just synced, otherwise a validation error,
  // otherwise whatever the server last recorded.
  const renderStatus = (row) => {
    const result = results[row.localId];

    if (result?.status === "ok") {
      return (
        <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#319A81]">
          <CircleCheck className="w-3.5 h-3.5 shrink-0" />
          {t.SyncedImportedCount.replace("{count}", result.count)}
        </p>
      );
    }
    if (result?.status === "error") {
      return (
        <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600">
          <CircleAlert className="w-3.5 h-3.5 shrink-0" />
          {t.SyncFailed}
          {result.message ? ` — ${result.message}` : ""}
        </p>
      );
    }
    if (errors[row.localId]) {
      return (
        <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600">
          <CircleAlert className="w-3.5 h-3.5 shrink-0" />
          {errors[row.localId]}
        </p>
      );
    }

    if (!showStatus) return null;

    if (row.lastSyncStatus === "error") {
      return (
        <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600">
          <CircleAlert className="w-3.5 h-3.5 shrink-0" />
          {t.SyncFailed}
          {row.lastSyncError ? ` — ${row.lastSyncError}` : ""}
        </p>
      );
    }
    if (row.lastSyncAt) {
      return (
        <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {t.LastSynced}: {new Date(row.lastSyncAt).toLocaleString()}
        </p>
      );
    }
    // An unsaved row has never synced because it does not exist yet — saying so
    // would be noise. A saved one genuinely has not.
    if (!row._id) return null;
    return (
      <p className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-400">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {t.NeverSynced}
      </p>
    );
  };

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const hasError = Boolean(errors[row.localId]);
        return (
          <div
            key={row.localId}
            className={`relative p-4 bg-white border rounded-xl shadow-sm transition-all duration-200 ${
              hasError ? "border-red-300" : "border-[#1E3E2B]/10 hover:border-[#319A81]/40"
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              {/* Name — so a host with three feeds can tell which row is
                  Airbnb and which is Booking.com. */}
              <div className="md:w-56 shrink-0">
                <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t.CalendarName}
                </label>
                <div className="relative">
                  <CalendarDays className="absolute w-4 h-4 text-[#319A81] -translate-y-1/2 left-3 top-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => onChange(row.localId, { label: e.target.value })}
                    maxLength={60}
                    disabled={disabled}
                    placeholder={t.CalendarNamePlaceholder}
                    className="w-full h-11 pl-9 pr-3 text-sm font-medium border border-[#1E3E2B]/10 rounded-lg focus:border-[#319A81] focus:ring-1 focus:ring-[#319A81] focus:outline-none text-[#1E3E2B] disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* URL */}
              <div className="flex-1 min-w-0">
                <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t.CalendarURL}
                  {urlRequired && <span className="ml-1 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={row.url}
                  onChange={(e) => onChange(row.localId, { url: e.target.value })}
                  disabled={disabled}
                  placeholder={t.ExampleAirbnbURL}
                  className={`w-full h-11 px-3 text-sm font-medium border rounded-lg focus:ring-1 focus:outline-none text-[#1E3E2B] disabled:bg-slate-50 ${
                    hasError
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                      : "border-[#1E3E2B]/10 focus:border-[#319A81] focus:ring-[#319A81]"
                  }`}
                />
              </div>

              {/* Remove row. `type="button"` matters — this sits inside the
                  add-accommodation <form>, where a bare button submits the
                  whole listing instead of deleting a calendar row. */}
              <div className="md:pt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => onRemove(row)}
                  disabled={disabled || (rows.length === 1 && !row._id && !row.url)}
                  aria-label={t.RemoveCalendarRow}
                  title={t.RemoveCalendarRow}
                  className="inline-flex items-center justify-center w-11 h-11 text-red-600 transition-all duration-150 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {renderStatus(row)}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#319A81] transition-all duration-200 bg-[#319A81]/10 border border-[#319A81]/20 rounded-xl hover:bg-[#319A81]/15 active:scale-95 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {t.AddAnotherCalendar}
      </button>
    </div>
  );
}

export default CalendarSyncRows;
