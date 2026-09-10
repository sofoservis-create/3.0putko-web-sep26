import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../utlis/guestAccountApi", () => ({
  getHostAccommodation: vi.fn(),
}));

const storeMocks = {
  createListing: vi.fn(),
  saveListing: vi.fn(),
  publishListing: vi.fn(),
};
vi.mock("../../host/HostListingsContext", () => ({
  useHostListings: () => storeMocks,
}));

import { Router } from "wouter";
import { getHostAccommodation } from "../../utlis/guestAccountApi";
import { FormContext } from "../../FormContext";
import { HostNavigationProvider, useHostNavigation } from "../../host/HostNavigationGuard";
import AccommodationForm from "./AccommodationForm";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const serverListing = (id, name, status = "READY") => ({
  id,
  status,
  data: { name, propertyType: "apartment", description: "A place to stay." },
  createdAt: "2026-09-09T10:00:00Z",
  updatedAt: "2026-09-09T10:00:00Z",
  completionPercent: status === "DRAFT" ? 10 : 100,
  completedSteps: [],
  missingRequirements: [],
  canPublish: status === "READY",
});

const renderEditor = (props) =>
  render(
    <FormContext.Provider value={{ lang: "en" }}>
      <AccommodationForm {...props} />
    </FormContext.Provider>,
  );

const nameInput = () => screen.getByPlaceholderText(/cozy cabin/i);
const nextButton = () => screen.getByRole("button", { name: /^next$/i });
const saveDraftButton = () => screen.getByRole("button", { name: /save draft|saving/i });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("AccommodationForm editing-session isolation", () => {
  it("a publish that finishes after navigating to another listing does not overwrite that listing", async () => {
    getHostAccommodation.mockImplementation(async (id) =>
      id === "A" ? serverListing("A", "Alpha", "READY") : serverListing("B", "Bravo", "DRAFT"),
    );
    const slowPublish = deferred();
    storeMocks.publishListing.mockReturnValueOnce(slowPublish.promise);

    const view = renderEditor({ accommodationId: "A", openReview: true });
    await act(async () => {});
    // READY + ?review=1 opens the review dialog on the last step.
    expect(screen.getByText(/publish review/i)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /publish listing/i }));
    });
    expect(storeMocks.publishListing).toHaveBeenCalledWith("A");

    // Navigate to listing B while A's publish is still pending.
    view.rerender(
      <FormContext.Provider value={{ lang: "en" }}>
        <AccommodationForm accommodationId="B" openReview={false} />
      </FormContext.Provider>,
    );
    await act(async () => {});
    expect(nameInput().value).toBe("Bravo");

    // A's publish resolves late: B's form must be untouched.
    await act(async () => {
      slowPublish.resolve({ ...serverListing("A", "Alpha", "LIVE"), simulated: true });
    });
    expect(nameInput().value).toBe("Bravo");
    expect(screen.queryByText(/this listing is live/i)).toBeNull();
    // Only the two route loads happened; no stale reload of A into B's session.
    expect(getHostAccommodation.mock.calls.map((call) => call[0])).toEqual(["A", "B"]);
  });

  it("navigating away during a save leaves the next editor's save controls enabled", async () => {
    getHostAccommodation.mockImplementation(async (id) =>
      id === "A" ? serverListing("A", "Alpha", "DRAFT") : serverListing("B", "Bravo", "DRAFT"),
    );
    const slowSave = deferred();
    storeMocks.saveListing.mockReturnValueOnce(slowSave.promise);

    const view = renderEditor({ accommodationId: "A" });
    await act(async () => {});
    expect(nameInput().value).toBe("Alpha");

    await act(async () => {
      fireEvent.click(saveDraftButton());
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(saveDraftButton().disabled).toBe(true);

    view.rerender(
      <FormContext.Provider value={{ lang: "en" }}>
        <AccommodationForm accommodationId="B" />
      </FormContext.Provider>,
    );
    await act(async () => {});
    expect(nameInput().value).toBe("Bravo");
    expect(saveDraftButton().disabled).toBe(false);

    // The old save resolving later must not touch B either.
    await act(async () => {
      slowSave.resolve(serverListing("A", "Alpha renamed", "DRAFT"));
    });
    expect(nameInput().value).toBe("Bravo");
    expect(saveDraftButton().disabled).toBe(false);
  });

  it("a create that finishes after the editor was closed does not navigate back into it", async () => {
    const slowCreate = deferred();
    storeMocks.createListing.mockReturnValueOnce(slowCreate.promise);
    const onCreated = vi.fn();

    const view = renderEditor({ accommodationId: null, onCreated });
    await act(async () => {});
    expect(getHostAccommodation).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(saveDraftButton());
    });
    expect(storeMocks.createListing).toHaveBeenCalledTimes(1);

    // Host leaves for Listings before the create request returns.
    view.unmount();
    await act(async () => {
      slowCreate.resolve(serverListing("N", "", "DRAFT"));
    });
    expect(onCreated).not.toHaveBeenCalled();
    expect(storeMocks.saveListing).not.toHaveBeenCalled();
  });

  it("a publish that finishes after the editor was closed does not fire the review-dismiss navigation", async () => {
    getHostAccommodation.mockResolvedValueOnce(serverListing("A", "Alpha", "READY"));
    const slowPublish = deferred();
    storeMocks.publishListing.mockReturnValueOnce(slowPublish.promise);
    const onReviewDismiss = vi.fn();

    const view = renderEditor({ accommodationId: "A", openReview: true, onReviewDismiss });
    await act(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /publish listing/i }));
    });
    expect(storeMocks.publishListing).toHaveBeenCalledWith("A");

    view.unmount();
    // A different listing is opened in a fresh editor meanwhile.
    getHostAccommodation.mockResolvedValueOnce(serverListing("B", "Bravo", "DRAFT"));
    renderEditor({ accommodationId: "B", onReviewDismiss });
    await act(async () => {});
    expect(nameInput().value).toBe("Bravo");

    await act(async () => {
      slowPublish.resolve({ ...serverListing("A", "Alpha", "LIVE"), simulated: true });
    });
    expect(onReviewDismiss).not.toHaveBeenCalled();
    expect(nameInput().value).toBe("Bravo");
    expect(screen.queryByText(/this listing is live/i)).toBeNull();
  });

  it("opens a draft at its last visited step", async () => {
    getHostAccommodation.mockResolvedValueOnce({
      ...serverListing("A", "Alpha", "DRAFT"),
      data: { name: "Alpha", lastVisitedStep: "photos" },
    });
    renderEditor({ accommodationId: "A" });
    await act(async () => {});
    expect(screen.getAllByText(/step\s*5\s*(\/|of)\s*9/i).length).toBeGreaterThan(0);
  });
});

describe("AccommodationForm save lifecycle and validation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks Next with an inline message until the step is valid, then saves and advances", async () => {
    getHostAccommodation.mockResolvedValueOnce({
      ...serverListing("A", "Alpha", "DRAFT"),
      data: { name: "Alpha", propertyType: "apartment" },
    });
    storeMocks.saveListing.mockImplementation(async (id, data) => ({ ...serverListing(id, data.name, "DRAFT"), data }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});

    await act(async () => {
      fireEvent.click(nextButton());
    });
    expect(screen.getByText(/add a short description/i)).toBeTruthy();
    expect(storeMocks.saveListing).not.toHaveBeenCalled();
    expect(screen.getAllByText(/step\s*1\s*(\/|of)\s*9/i).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/describe your place/i), { target: { value: "Quiet flat" } });
    });
    expect(screen.queryByText(/add a short description/i)).toBeNull();

    await act(async () => {
      fireEvent.click(nextButton());
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(storeMocks.saveListing.mock.calls[0][1]).toMatchObject({ description: "Quiet flat", lastVisitedStep: "location" });
    expect(screen.getAllByText(/step\s*2\s*(\/|of)\s*9/i).length).toBeGreaterThan(0);
  });

  it("autosaves edits after a pause and shows the saved state", async () => {
    getHostAccommodation.mockResolvedValueOnce(serverListing("A", "Alpha", "DRAFT"));
    storeMocks.saveListing.mockImplementation(async (id, data) => ({ ...serverListing(id, data.name, "DRAFT"), data }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: "Alpha Lodge" } });
    });
    expect(screen.getAllByText(/unsaved changes/i).length).toBeGreaterThan(0);
    expect(storeMocks.saveListing).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(storeMocks.saveListing.mock.calls[0][1]).toMatchObject({ name: "Alpha Lodge" });
    expect(screen.queryByText(/unsaved changes/i)).toBeNull();
    expect(screen.getAllByText(/^saved/i).length).toBeGreaterThan(0);
  });

  it("saves only the fields it changed, so a feed list edited on the calendar page survives an editor autosave", async () => {
    const stored = {
      ...serverListing("A", "Alpha", "DRAFT"),
      data: {
        name: "Alpha",
        propertyType: "apartment",
        calendarChoice: "connect",
        calendarFeeds: [{ label: "Airbnb", url: "https://example.com/a.ics", id: "f1" }],
      },
    };
    getHostAccommodation.mockResolvedValueOnce(stored);
    // Server copy: key order differs from the client's and the calendar page
    // added a second feed meanwhile.
    const serverFeeds = [
      { id: "f1", label: "Airbnb", url: "https://example.com/a.ics" },
      { id: "f2", label: "Booking", url: "https://example.com/b.ics" },
    ];
    storeMocks.saveListing.mockImplementation(async (id, patch) => ({
      ...stored,
      data: { ...stored.data, ...patch, calendarFeeds: serverFeeds },
    }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: "Alpha Lodge" } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    const firstPatch = storeMocks.saveListing.mock.calls[0][1];
    expect(firstPatch.name).toBe("Alpha Lodge");
    expect(firstPatch).not.toHaveProperty("calendarFeeds");
    expect(firstPatch).not.toHaveProperty("calendarChoice");
    expect(firstPatch).not.toHaveProperty("propertyType");

    // A second edit after adopting the server copy still leaves the (now
    // two-entry) feed list alone.
    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: "Alpha Lodge II" } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(2);
    const secondPatch = storeMocks.saveListing.mock.calls[1][1];
    expect(secondPatch.name).toBe("Alpha Lodge II");
    expect(secondPatch).not.toHaveProperty("calendarFeeds");
  });

  it("keeps entered data after a failed save and retries on demand", async () => {
    getHostAccommodation.mockResolvedValueOnce(serverListing("A", "Alpha", "DRAFT"));
    storeMocks.saveListing.mockRejectedValueOnce(new Error("offline"));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});

    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: "Alpha Lodge" } });
    });
    await act(async () => {
      fireEvent.click(saveDraftButton());
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/not saved/i).length).toBeGreaterThan(0);
    expect(nameInput().value).toBe("Alpha Lodge");

    // No automatic retry loop while failed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);

    storeMocks.saveListing.mockImplementationOnce(async (id, data) => ({ ...serverListing(id, data.name, "DRAFT"), data }));
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /^retry$/i })[0]);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(2);
    expect(storeMocks.saveListing.mock.calls[1][1]).toMatchObject({ name: "Alpha Lodge" });
    expect(screen.queryByText(/not saved/i)).toBeNull();
    expect(nameInput().value).toBe("Alpha Lodge");
  });

  it("does not create two listings when save is triggered twice on a new draft", async () => {
    const slowCreate = deferred();
    storeMocks.createListing.mockReturnValueOnce(slowCreate.promise);
    storeMocks.saveListing.mockImplementation(async (id, data) => ({ ...serverListing(id, data.name, "DRAFT"), data }));
    const onCreated = vi.fn();

    renderEditor({ accommodationId: null, onCreated });
    await act(async () => {});
    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: "New place" } });
    });
    await act(async () => {
      fireEvent.click(saveDraftButton());
    });
    // Autosave fires while the create is still pending.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    await act(async () => {
      slowCreate.resolve(serverListing("N", "", "DRAFT"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(storeMocks.createListing).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith("N");
    expect(storeMocks.saveListing.mock.calls.every((call) => call[0] === "N")).toBe(true);
  });

  it("review links open the owning step, focus the field, and offer a way back to review", async () => {
    getHostAccommodation.mockResolvedValueOnce({
      ...serverListing("A", "Alpha", "DRAFT"),
      data: { name: "Alpha", propertyType: "apartment", description: "x", lastVisitedStep: "readiness", payoutAcknowledged: true },
      missingRequirements: ["city"],
      canPublish: false,
    });
    storeMocks.saveListing.mockImplementation(async (id, data) => ({
      ...serverListing(id, data.name, "DRAFT"),
      data,
      missingRequirements: data.city ? [] : ["city"],
      canPublish: Boolean(data.city),
    }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});
    expect(screen.getAllByText(/step\s*9\s*(\/|of)\s*9/i).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^review$/i }));
    });
    expect(screen.getByText(/publish review/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /publish listing/i }).disabled).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^city/i }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByText(/step\s*2\s*(\/|of)\s*9/i).length).toBeGreaterThan(0);
    const city = document.getElementById("listing-field-city");
    expect(city).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(document.activeElement).toBe(city);
    expect(screen.getByText(/enter the city/i)).toBeTruthy();

    await act(async () => {
      fireEvent.change(city, { target: { value: "Poprad" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /return to review/i }));
    });
    expect(screen.getByRole("dialog", { name: /publish review/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /publish listing/i }).disabled).toBe(false);
  });
  it("keeps decimal and large prices exactly as entered or stored; blur never rewrites them", async () => {
    const storedData = { name: "Alpha", propertyType: "apartment", description: "x", lastVisitedStep: "pricing", nightlyPrice: 15000, minNights: 400 };
    getHostAccommodation.mockResolvedValueOnce({ ...serverListing("A", "Alpha", "DRAFT"), data: storedData });
    // Like the real server: the patch is merged into the stored payload.
    storeMocks.saveListing.mockImplementation(async (id, patch) => ({ ...serverListing(id, "Alpha", "DRAFT"), data: { ...storedData, ...patch } }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});
    const price = document.getElementById("listing-field-nightlyPrice");
    const nights = document.getElementById("listing-field-minNights");
    expect(price.value).toBe("15000");

    // Focusing and leaving an existing value above any UI range changes nothing.
    await act(async () => {
      fireEvent.focus(price);
      fireEvent.blur(price);
      fireEvent.focus(nights);
      fireEvent.blur(nights);
    });
    expect(price.value).toBe("15000");
    expect(nights.value).toBe("400");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).not.toHaveBeenCalled();

    // Decimal prices survive blur and reach the payload untouched.
    await act(async () => {
      fireEvent.focus(price);
      fireEvent.change(price, { target: { value: "89.99" } });
      fireEvent.blur(price);
    });
    expect(price.value).toBe("89.99");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(storeMocks.saveListing.mock.calls[0][1]).toMatchObject({ nightlyPrice: 89.99 });
    // The untouched minNights is not re-sent (sparse patches), and was never rewritten.
    expect(storeMocks.saveListing.mock.calls[0][1]).not.toHaveProperty("minNights");
    expect(nights.value).toBe("400");
  });

  it("shows an inline error for a zero price instead of substituting a value", async () => {
    getHostAccommodation.mockResolvedValueOnce({
      ...serverListing("A", "Alpha", "DRAFT"),
      data: { name: "Alpha", propertyType: "apartment", description: "x", lastVisitedStep: "pricing", nightlyPrice: 80, minNights: 2 },
    });
    storeMocks.saveListing.mockImplementation(async (id, data) => ({ ...serverListing(id, data.name, "DRAFT"), data }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});
    const price = document.getElementById("listing-field-nightlyPrice");
    await act(async () => {
      fireEvent.focus(price);
      fireEvent.change(price, { target: { value: "0" } });
      fireEvent.blur(price);
    });
    expect(price.value).toBe("0");
    await act(async () => {
      fireEvent.click(nextButton());
    });
    expect(screen.getAllByText(/step\s*6\s*(\/|of)\s*9/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/nightly price above/i)).toBeTruthy();
    expect(price.getAttribute("aria-invalid")).toBe("true");
    expect(price.value).toBe("0");
  });

  it("review links focus the field even when its step is already on screen", async () => {
    getHostAccommodation.mockResolvedValueOnce({
      ...serverListing("A", "Alpha", "DRAFT"),
      data: { name: "Alpha", propertyType: "apartment", description: "x", lastVisitedStep: "readiness" },
      missingRequirements: ["payoutAcknowledged"],
      canPublish: false,
    });
    storeMocks.saveListing.mockImplementation(async (id, data) => ({
      ...serverListing(id, data.name, "DRAFT"),
      data,
      missingRequirements: data.payoutAcknowledged ? [] : ["payoutAcknowledged"],
      canPublish: Boolean(data.payoutAcknowledged),
    }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});
    expect(screen.getAllByText(/step\s*9\s*(\/|of)\s*9/i).length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^review$/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /payout acknowledgement/i }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    const box = document.getElementById("listing-field-payoutAcknowledged");
    expect(box).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    expect(document.activeElement).toBe(box);
    expect(screen.getByRole("button", { name: /return to review/i })).toBeTruthy();
  });
});

describe("AccommodationForm save races", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const readyListing = (overrides = {}) => ({
    ...serverListing("A", "Alpha", "READY"),
    data: { name: "Alpha", propertyType: "apartment", description: "x", lastVisitedStep: "readiness", payoutAcknowledged: true, ...overrides },
  });
  const checkbox = () => document.getElementById("listing-field-payoutAcknowledged");
  const publishButton = () => screen.getByRole("button", { name: /publish listing|publishing/i });

  it("review re-saves edits made while its save was in flight before opening", async () => {
    // Drafts are the only listings that reopen on the remembered step.
    getHostAccommodation.mockResolvedValueOnce({ ...readyListing(), status: "DRAFT", canPublish: false, missingRequirements: [] });
    const slowSave = deferred();
    storeMocks.saveListing
      .mockReturnValueOnce(slowSave.promise)
      .mockImplementation(async (id, data) => ({
        ...serverListing(id, data.name, data.payoutAcknowledged ? "READY" : "DRAFT"),
        data,
        missingRequirements: data.payoutAcknowledged ? [] : ["payoutAcknowledged"],
        canPublish: Boolean(data.payoutAcknowledged),
      }));

    renderEditor({ accommodationId: "A" });
    await act(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^review$/i }));
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    // Host unticks the payout acknowledgement while the review's save is running.
    await act(async () => {
      fireEvent.click(checkbox());
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => {
      slowSave.resolve({ ...readyListing(), canPublish: true });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
    // The newer state was saved too, and the review reflects it: not publishable.
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(2);
    expect(storeMocks.saveListing.mock.calls[1][1]).toMatchObject({ payoutAcknowledged: false });
    expect(screen.getByRole("dialog", { name: /publish review/i })).toBeTruthy();
    expect(publishButton().disabled).toBe(true);
    expect(screen.getByRole("button", { name: /payout acknowledgement/i })).toBeTruthy();
  });

  it("disables Publish while newer edits are unsaved and re-enables it once they are saved", async () => {
    getHostAccommodation.mockResolvedValueOnce(readyListing());
    storeMocks.saveListing.mockImplementation(async (id, data) => ({ ...readyListing(data), data, canPublish: true }));

    renderEditor({ accommodationId: "A", openReview: true });
    await act(async () => {});
    expect(screen.getByRole("dialog", { name: /publish review/i })).toBeTruthy();
    expect(publishButton().disabled).toBe(false);

    // The editor behind the sheet is still editable (e.g. via a hardware keyboard).
    await act(async () => {
      fireEvent.click(checkbox());
    });
    expect(publishButton().disabled).toBe(true);
    expect(screen.getByText(/newer edits are being saved/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(publishButton());
    });
    expect(storeMocks.publishListing).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(storeMocks.saveListing.mock.calls[0][1]).toMatchObject({ payoutAcknowledged: false });
    expect(publishButton().disabled).toBe(false);
  });

  it("keeps edits typed while publishing instead of adopting the older published payload", async () => {
    getHostAccommodation.mockResolvedValueOnce(readyListing());
    const slowPublish = deferred();
    storeMocks.publishListing.mockReturnValueOnce(slowPublish.promise);
    storeMocks.saveListing.mockImplementation(async (id, data) => ({ ...readyListing(data), data, status: "LIVE", canPublish: false }));

    renderEditor({ accommodationId: "A", openReview: true });
    await act(async () => {});
    await act(async () => {
      fireEvent.click(publishButton());
    });
    expect(storeMocks.publishListing).toHaveBeenCalledWith("A");
    await act(async () => {
      fireEvent.click(checkbox());
    });
    expect(checkbox().checked).toBe(false);
    await act(async () => {
      slowPublish.resolve({ ...readyListing(), status: "LIVE", canPublish: false });
    });
    // Server payload still says acknowledged; the newer local edit wins.
    expect(checkbox().checked).toBe(false);
    expect(screen.getAllByText(/unsaved changes/i).length).toBeGreaterThan(0);
    // The newer value is written by the next autosave.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(storeMocks.saveListing.mock.calls[0][1]).toMatchObject({ payoutAcknowledged: false });
  });
});

describe("AccommodationForm with the leave guard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  function Shell() {
    const nav = useHostNavigation();
    return (
      <div>
        <button type="button" onClick={() => nav.guardedNavigate("/host/listings")}>
          leave editor
        </button>
        {nav.pending && (
          <div role="alertdialog">
            <button type="button" onClick={nav.cancelLeave}>stay</button>
            <button type="button" onClick={nav.discardAndLeave} disabled={nav.saveInFlight}>discard</button>
            {nav.saveInFlight && <span>save in flight</span>}
          </div>
        )}
      </div>
    );
  }
  const renderGuarded = () => {
    window.history.replaceState(null, "", "/host/listings/A");
    return render(
      <Router>
        <HostNavigationProvider>
          <FormContext.Provider value={{ lang: "en" }}>
            <Shell />
            <AccommodationForm accommodationId="A" />
          </FormContext.Provider>
        </HostNavigationProvider>
      </Router>,
    );
  };

  it("pauses autosave while the leave confirmation is open so Discard is truthful", async () => {
    getHostAccommodation.mockResolvedValueOnce(serverListing("A", "Alpha", "DRAFT"));
    storeMocks.saveListing.mockImplementation(async (id, data) => ({ ...serverListing(id, data.name, "DRAFT"), data }));
    renderGuarded();
    await act(async () => {});
    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: "Alpha Edit" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("leave editor"));
    });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(storeMocks.saveListing).not.toHaveBeenCalled();

    // Staying resumes autosave.
    await act(async () => {
      fireEvent.click(screen.getByText("stay"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(storeMocks.saveListing.mock.calls[0][1]).toMatchObject({ name: "Alpha Edit" });
  });

  it("blocks Discard while a save that started earlier is still running", async () => {
    getHostAccommodation.mockResolvedValueOnce(serverListing("A", "Alpha", "DRAFT"));
    const slowSave = deferred();
    storeMocks.saveListing.mockReturnValueOnce(slowSave.promise);
    renderGuarded();
    await act(async () => {});
    await act(async () => {
      fireEvent.change(nameInput(), { target: { value: "Alpha Edit" } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(screen.getByText("leave editor"));
    });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("save in flight")).toBeTruthy();
    expect(screen.getByText("discard").disabled).toBe(true);
    await act(async () => {
      slowSave.resolve({ ...serverListing("A", "Alpha Edit", "DRAFT"), data: { name: "Alpha Edit", propertyType: "apartment", description: "A place to stay." } });
    });
    expect(screen.queryByText("save in flight")).toBeNull();
    expect(screen.getByText("discard").disabled).toBe(false);
  });
});
