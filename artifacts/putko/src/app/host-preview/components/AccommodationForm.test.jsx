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

import { getHostAccommodation } from "../../utlis/guestAccountApi";
import { FormContext } from "../../FormContext";
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
  data: { name, propertyType: "apartment" },
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
      fireEvent.click(nextButton());
    });
    expect(storeMocks.saveListing).toHaveBeenCalledTimes(1);
    expect(nextButton().disabled).toBe(true);

    view.rerender(
      <FormContext.Provider value={{ lang: "en" }}>
        <AccommodationForm accommodationId="B" />
      </FormContext.Provider>,
    );
    await act(async () => {});
    expect(nameInput().value).toBe("Bravo");
    expect(nextButton().disabled).toBe(false);

    // The old save resolving later must not touch B either.
    await act(async () => {
      slowSave.resolve(serverListing("A", "Alpha renamed", "DRAFT"));
    });
    expect(nameInput().value).toBe("Bravo");
    expect(nextButton().disabled).toBe(false);
  });

  it("a create that finishes after the editor was closed does not navigate back into it", async () => {
    const slowCreate = deferred();
    storeMocks.createListing.mockReturnValueOnce(slowCreate.promise);
    const onCreated = vi.fn();

    const view = renderEditor({ accommodationId: null, onCreated });
    await act(async () => {});
    expect(getHostAccommodation).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(nextButton());
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
