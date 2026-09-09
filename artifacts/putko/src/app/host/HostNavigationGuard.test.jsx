import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link, Route, Router, Switch } from "wouter";
import { HostNavigationProvider, useHostNavigation, useLeaveGuard } from "./HostNavigationGuard";

// Mirrors the production hierarchy: the provider sits above the app's route
// Switch (AppRoutes.jsx), the Switch renders the guard-held path, and the
// editor registers its guard from inside the /host/* route.
function Editor({ dirty, save }) {
  useLeaveGuard({
    hasUnsavedChanges: () => dirty(),
    ownsLocation: (location) => location?.section === "listing" && location.listingId === "A",
    save,
  });
  return <div>editor</div>;
}

function HostArea({ dirty, save, onSwitchMode }) {
  const nav = useHostNavigation();
  const [pathname] = nav.shownPath.split("?");
  return (
    <div>
      {pathname.startsWith("/host/listings/A") && <Editor dirty={dirty} save={save} />}
      <button type="button" onClick={() => nav.guardedNavigate("/host/listings")}>
        back
      </button>
      <Link {...nav.linkProps("/host")}>today</Link>
      <button type="button" onClick={() => nav.guardedAction(onSwitchMode)}>
        switch to travel
      </button>
    </div>
  );
}

function Shell(props) {
  const nav = useHostNavigation();
  const [pathname] = nav.shownPath.split("?");
  return (
    <div>
      <div data-testid="path">{pathname}</div>
      <Switch location={pathname}>
        <Route path="/account">
          <div>account page</div>
        </Route>
        <Route path="/host/*?">
          <HostArea {...props} />
        </Route>
        <Route>
          <div>other page</div>
        </Route>
      </Switch>
      {nav.pending && (
        <div role="alertdialog">
          <button type="button" onClick={nav.cancelLeave}>stay</button>
          <button type="button" onClick={nav.discardAndLeave}>discard</button>
          <button type="button" onClick={nav.saveAndLeave}>save and leave</button>
          {nav.saveError && <span>save failed</span>}
          {nav.saving && <span>saving</span>}
        </div>
      )}
    </div>
  );
}

function App(props) {
  return (
    <HostNavigationProvider>
      <Shell {...props} />
    </HostNavigationProvider>
  );
}

const renderApp = (props) =>
  render(
    <Router>
      <App {...props} />
    </Router>,
  );

const renderAt = (path, props) => {
  window.history.replaceState(null, "", path);
  return renderApp(props);
};

const path = () => screen.getByTestId("path").textContent;
const popstate = () => new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
const dirtyFlag = (value) => {
  const ref = { value };
  return { get: () => ref.value, set: (next) => (ref.value = next) };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("HostNavigationGuard", () => {
  it("navigates immediately when nothing is unsaved", async () => {
    renderAt("/host/listings/A", { dirty: () => false });
    await act(async () => {
      fireEvent.click(screen.getByText("back"));
    });
    expect(path()).toBe("/host/listings");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before an in-app navigation away and can stay", async () => {
    renderAt("/host/listings/A", { dirty: () => true });
    await act(async () => {
      fireEvent.click(screen.getByText("back"));
    });
    expect(path()).toBe("/host/listings/A");
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText("stay"));
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(path()).toBe("/host/listings/A");
    expect(screen.getByText("editor")).toBeTruthy();
  });

  it("intercepts guarded links and discards on request", async () => {
    renderAt("/host/listings/A", { dirty: () => true });
    await act(async () => {
      fireEvent.click(screen.getByText("today"));
    });
    expect(path()).toBe("/host/listings/A");
    await act(async () => {
      fireEvent.click(screen.getByText("discard"));
    });
    expect(path()).toBe("/host");
    expect(screen.queryByText("editor")).toBeNull();
  });

  it("saves first when asked and stays when the save fails", async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderAt("/host/listings/A", { dirty: () => true, save });
    await act(async () => {
      fireEvent.click(screen.getByText("back"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("save and leave"));
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByText("save failed")).toBeTruthy();
    expect(path()).toBe("/host/listings/A");
    await act(async () => {
      fireEvent.click(screen.getByText("save and leave"));
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(path()).toBe("/host/listings");
  });

  it("holds the editor on browser Back to a route outside /host until confirmed", async () => {
    // History: /account -> /host/listings/A, like a traveler who opened the
    // editor from their account page.
    window.history.replaceState(null, "", "/account");
    window.history.pushState(null, "", "/host/listings/A");
    renderApp({ dirty: () => true });
    expect(screen.getByText("editor")).toBeTruthy();

    await act(async () => {
      const arrived = popstate();
      window.history.back();
      await arrived;
    });
    // Router URL is restored and the outer Switch still renders the editor.
    expect(window.location.pathname).toBe("/host/listings/A");
    expect(path()).toBe("/host/listings/A");
    expect(screen.getByText("editor")).toBeTruthy();
    expect(screen.queryByText("account page")).toBeNull();
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText("stay"));
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText("editor")).toBeTruthy();

    // Guard re-arms: Back again asks again, discard then lands on /account.
    await act(async () => {
      const arrived = popstate();
      window.history.back();
      await arrived;
    });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(path()).toBe("/host/listings/A");
    await act(async () => {
      fireEvent.click(screen.getByText("discard"));
    });
    await act(async () => {
      await popstate();
    });
    expect(window.location.pathname).toBe("/account");
    expect(path()).toBe("/account");
    expect(screen.getByText("account page")).toBeTruthy();
    expect(screen.queryByText("editor")).toBeNull();
  });

  it("holds the editor when a render happens after the URL changed but before popstate", async () => {
    window.history.replaceState(null, "", "/account");
    window.history.pushState(null, "", "/host/listings/A");
    const view = renderApp({ dirty: () => true });
    await act(async () => {
      const arrived = popstate();
      window.history.back();
      await arrived;
    });
    await act(async () => {
      view.rerender(
        <Router>
          <App dirty={() => true} />
        </Router>,
      );
    });
    expect(path()).toBe("/host/listings/A");
    expect(window.location.pathname).toBe("/host/listings/A");
    expect(screen.getByText("editor")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("runs a mode switch only after the host saves or discards, and stays on cancel", async () => {
    const dirty = dirtyFlag(true);
    const switchMode = vi.fn();
    const save = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(async () => {
      dirty.set(false);
      return true;
    });
    renderAt("/host/listings/A", { dirty: dirty.get, save, onSwitchMode: switchMode });

    await act(async () => {
      fireEvent.click(screen.getByText("switch to travel"));
    });
    expect(switchMode).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText("stay"));
    });
    expect(switchMode).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText("editor")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText("switch to travel"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("save and leave"));
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByText("save failed")).toBeTruthy();
    expect(switchMode).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText("save and leave"));
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(switchMode).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("runs the action immediately when nothing is unsaved and after discard", async () => {
    const switchMode = vi.fn();
    renderAt("/host/listings/A", { dirty: () => true, onSwitchMode: switchMode });
    await act(async () => {
      fireEvent.click(screen.getByText("switch to travel"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("discard"));
    });
    expect(switchMode).toHaveBeenCalledTimes(1);

    // After a confirmed exit the native unload prompt stays quiet even though
    // the editor is still dirty while the mode change is in flight.
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("asks the browser to confirm tab close while dirty, and not when clean", () => {
    const dirty = dirtyFlag(true);
    renderAt("/host/listings/A", { dirty: dirty.get });
    let event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    dirty.set(false);
    event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
