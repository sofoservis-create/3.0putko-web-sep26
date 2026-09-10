import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useSearch } from "wouter";
import { resolveHostLocation } from "./hostRoutes";

/**
 * Unsaved-change protection for the Host workspace.
 *
 * A screen (the listing editor) registers a guard:
 *   { hasUnsavedChanges(): boolean, ownsLocation(location): boolean, save(): Promise<boolean>, saving?: boolean, subject?: "listing" | "profile" }
 * `subject` only picks the wording of the confirmation dialog.
 *
 * The provider sits above the app's route <Switch> so it survives leaving
 * `/host`. Three layers:
 * 1. In-app navigation started by the shell goes through `guardedNavigate` /
 *    `linkProps`, and side-effecting exits (mode switch, full-page links) go
 *    through `guardedAction`; both ask before anything changes.
 * 2. Any URL change that still reaches the router (browser Back/Forward, a
 *    stray navigate) is intercepted while rendering: `shownPath` keeps the
 *    guarded screen's path, so the route tree never unmounts the editor and
 *    its edits survive; the URL is then restored in history and the same
 *    confirmation opens. Confirming performs `history.back()` to reach the
 *    entry the host asked for.
 * 3. Full page unloads (tab close, reload, external links) get the native
 *    `beforeunload` prompt, suppressed once a leave has been confirmed.
 *
 * The render-time hold matters because Chromium fires `change`/`blur` on the
 * focused input before `popstate` when traversing history; React renders for
 * those events already see the new URL, so a popstate listener is too late.
 */
const HostNavigationContext = createContext(null);

const splitPath = (path) => {
  const [pathname, search = ""] = String(path).split("?");
  return { pathname, search };
};

export function HostNavigationProvider({ children }) {
  const [routerPathname, navigate] = useLocation();
  const routerSearch = useSearch();
  const routerPath = routerSearch ? `${routerPathname}?${routerSearch}` : routerPathname;

  const guardRef = useRef(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // Set right before a confirmed leave so the resulting URL change is not
  // intercepted again.
  const allowNextRef = useRef(false);
  // A confirmed side-effecting exit (mode switch, full-page link) is running;
  // the native unload prompt must stay quiet until the guard goes away.
  const leavingRef = useRef(false);
  // Last path the app actually rendered; restored when a change is blocked.
  const shownPathRef = useRef(null);
  // Path we already pushed back for, so the layout effect runs once per block.
  const restoredForRef = useRef(null);
  const lastRouterPathRef = useRef(null);
  const [pending, setPending] = useState(null); // { target?, action?, viaHistory, options? }
  const [saving, setSaving] = useState(false);
  // The guarded screen reports its own in-flight save (autosave that started
  // before the dialog opened) so "Discard" can be disabled until it settles.
  const [guardSaving, setGuardSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // What the registered screen edits; the dialog words its copy from this.
  const [guardSubject, setGuardSubject] = useState("listing");

  const register = useCallback((guard) => {
    guardRef.current = guard;
    leavingRef.current = false;
    setGuardSubject(guard.subject || "listing");
    return () => {
      if (guardRef.current === guard) {
        guardRef.current = null;
        setGuardSaving(false);
      }
    };
  }, []);
  const reportSaving = useCallback((value) => setGuardSaving(Boolean(value)), []);

  const isDirty = useCallback(() => {
    const guard = guardRef.current;
    if (!guard || allowNextRef.current || leavingRef.current) return false;
    return guard.hasUnsavedChanges();
  }, []);

  const shouldBlock = useCallback(
    (path) => {
      const guard = guardRef.current;
      if (!guard) return false;
      const { pathname, search } = splitPath(path);
      if (guard.ownsLocation(resolveHostLocation(pathname, search))) return false;
      return isDirty();
    },
    [isDirty],
  );

  const guardedNavigate = useCallback(
    (path, options) => {
      if (shouldBlock(path)) {
        setSaveError(false);
        setPending({ target: path, options, viaHistory: false });
        return false;
      }
      navigateRef.current(path, options);
      return true;
    },
    [shouldBlock],
  );

  // wouter's <Link> skips its own navigation when the click handler calls
  // preventDefault, so links can stay real anchors.
  const linkProps = useCallback(
    (href) => ({
      href,
      onClick: (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (shouldBlock(href)) {
          event.preventDefault();
          setSaveError(false);
          setPending({ target: href, viaHistory: false });
        }
      },
    }),
    [shouldBlock],
  );

  /**
   * Run `action` (which leaves the editor by other means than a route change,
   * e.g. switching account mode or a full-page link) only after the host has
   * saved or discarded unsaved edits.
   */
  const guardedAction = useCallback(
    (action) => {
      if (isDirty()) {
        setSaveError(false);
        setPending({ action, viaHistory: false });
        return false;
      }
      action();
      return true;
    },
    [isDirty],
  );

  // Render-time hold: keep showing the guarded screen while a URL change it
  // does not own awaits confirmation.
  const previousShown = shownPathRef.current;
  const shownPath =
    previousShown !== null && routerPath !== previousShown && shouldBlock(routerPath) ? previousShown : routerPath;

  useLayoutEffect(() => {
    const routerPathChanged = routerPath !== lastRouterPathRef.current;
    lastRouterPathRef.current = routerPath;
    shownPathRef.current = shownPath;
    if (shownPath === routerPath) {
      restoredForRef.current = null;
      // A confirmed leave has now rendered its destination. Only a real URL
      // change clears the flag; re-renders while history.back() is still in
      // flight must not.
      if (routerPathChanged) allowNextRef.current = false;
      return;
    }
    if (restoredForRef.current === routerPath) return;
    restoredForRef.current = routerPath;
    // Put the guarded URL back on top of history so refresh/Back stay
    // consistent with what is on screen; wouter picks this up as a no-op
    // because the tree is already rendering `shownPath`.
    window.history.pushState(null, "", shownPath);
    setSaveError(false);
    setPending({ target: routerPath, viaHistory: true });
  }, [routerPath, shownPath]);

  // Native prompt for tab close / reload / external links while dirty.
  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const proceed = useCallback((request) => {
    setPending(null);
    if (request.action) {
      leavingRef.current = true;
      try {
        const result = request.action();
        if (result && typeof result.then === "function") {
          result.catch(() => {
            leavingRef.current = false;
          });
        }
      } catch (error) {
        leavingRef.current = false;
        throw error;
      }
      return;
    }
    allowNextRef.current = true;
    if (request.viaHistory) {
      // The restored entry sits on top of the one the host asked for.
      window.history.back();
    } else {
      navigateRef.current(request.target, request.options);
    }
    // The layout effect clears the flag when the destination renders; the
    // timeout only covers a traversal the browser never delivers.
    setTimeout(() => {
      allowNextRef.current = false;
    }, 1000);
  }, []);

  const cancelLeave = useCallback(() => {
    if (saving) return;
    setPending(null);
    setSaveError(false);
  }, [saving]);

  const discardAndLeave = useCallback(() => {
    if (!pending || saving || guardSaving) return;
    proceed(pending);
  }, [pending, saving, guardSaving, proceed]);

  const saveAndLeave = useCallback(async () => {
    if (!pending || saving) return;
    const guard = guardRef.current;
    if (!guard?.save) {
      proceed(pending);
      return;
    }
    setSaving(true);
    setSaveError(false);
    let ok = false;
    try {
      ok = Boolean(await guard.save());
    } finally {
      setSaving(false);
    }
    if (ok) proceed(pending);
    else setSaveError(true);
  }, [pending, saving, proceed]);

  const value = useMemo(
    () => ({
      register,
      reportSaving,
      shownPath,
      guardedNavigate,
      guardedAction,
      linkProps,
      pending,
      saving,
      saveInFlight: guardSaving,
      saveError,
      subject: guardSubject,
      cancelLeave,
      discardAndLeave,
      saveAndLeave,
    }),
    [register, reportSaving, shownPath, guardedNavigate, guardedAction, linkProps, pending, saving, guardSaving, saveError, guardSubject, cancelLeave, discardAndLeave, saveAndLeave],
  );

  return <HostNavigationContext.Provider value={value}>{children}</HostNavigationContext.Provider>;
}

export const useHostNavigation = () => useContext(HostNavigationContext);

/**
 * The path (pathname + search) the app should render: the router's path, or
 * the guarded screen's path while a blocked change awaits confirmation. Falls
 * back to the router when no provider is mounted.
 */
export function useShownPath() {
  const context = useContext(HostNavigationContext);
  const [routerPathname] = useLocation();
  const routerSearch = useSearch();
  if (context) return context.shownPath;
  return routerSearch ? `${routerPathname}?${routerSearch}` : routerPathname;
}

/**
 * Register a leave guard for the lifetime of the calling screen. The guard
 * object is read through a ref so callers can pass fresh closures each render.
 */
export function useLeaveGuard(guard) {
  const context = useContext(HostNavigationContext);
  const register = context?.register;
  const reportSaving = context?.reportSaving;
  const guardRef = useRef(guard);
  guardRef.current = guard;
  const saving = Boolean(guard?.saving);
  const subject = guard?.subject || "listing";
  useEffect(() => {
    if (reportSaving) reportSaving(saving);
  }, [reportSaving, saving]);
  useEffect(() => {
    if (!register) return undefined;
    return register({
      hasUnsavedChanges: () => Boolean(guardRef.current?.hasUnsavedChanges?.()),
      ownsLocation: (location) => Boolean(guardRef.current?.ownsLocation?.(location)),
      save: () => guardRef.current?.save?.(),
      subject,
    });
  }, [register, subject]);
}
