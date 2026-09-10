import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utlis/guestAccountApi", () => ({
  createHostAccommodation: vi.fn(),
  deleteHostAccommodation: vi.fn(),
  listHostAccommodations: vi.fn(),
  publishHostAccommodation: vi.fn(),
  updateHostAccommodation: vi.fn(),
}));

import {
  deleteHostAccommodation,
  listHostAccommodations,
  updateHostAccommodation,
} from "../utlis/guestAccountApi";
import { HostListingsProvider, useHostListings } from "./HostListingsContext";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const listing = (id, updatedAt, name = id) => ({
  id,
  status: "DRAFT",
  createdAt: updatedAt,
  updatedAt,
  data: { name },
  completedSteps: [],
});

let store;
function Probe() {
  store = useHostListings();
  return <div data-testid="ids">{store.listings.map((item) => item.id).join(",")}</div>;
}

const renderStore = async (initial) => {
  listHostAccommodations.mockResolvedValueOnce({ accommodations: initial });
  render(
    <HostListingsProvider>
      <Probe />
    </HostListingsProvider>,
  );
  await act(async () => {});
  return store;
};

beforeEach(() => {
  vi.clearAllMocks();
  store = null;
});

afterEach(() => {
  cleanup();
});

describe("HostListingsProvider refresh/mutation ordering", () => {
  it("a refresh that started before a delete cannot bring the deleted card back", async () => {
    await renderStore([listing("a", "2026-09-09T10:00:00Z"), listing("b", "2026-09-09T09:00:00Z")]);
    expect(screen.getByTestId("ids").textContent).toBe("a,b");

    const slowRefresh = deferred();
    listHostAccommodations.mockReturnValueOnce(slowRefresh.promise);
    deleteHostAccommodation.mockResolvedValueOnce({ deleted: true });

    let refreshPromise;
    await act(async () => {
      refreshPromise = store.refresh({ background: true });
    });
    await act(async () => {
      await store.deleteListing("a");
    });
    expect(screen.getByTestId("ids").textContent).toBe("b");

    // Old snapshot still contains "a"; it must not overwrite the delete.
    await act(async () => {
      slowRefresh.resolve({
        accommodations: [listing("a", "2026-09-09T10:00:00Z"), listing("b", "2026-09-09T09:00:00Z")],
      });
      await refreshPromise;
    });
    expect(screen.getByTestId("ids").textContent).toBe("b");
  });

  it("a refresh that started before a save keeps the saved data", async () => {
    await renderStore([listing("a", "2026-09-09T10:00:00Z", "Old")]);

    const slowRefresh = deferred();
    listHostAccommodations.mockReturnValueOnce(slowRefresh.promise);
    updateHostAccommodation.mockResolvedValueOnce(listing("a", "2026-09-09T10:05:00Z", "New"));

    let refreshPromise;
    await act(async () => {
      refreshPromise = store.refresh({ background: true });
    });
    await act(async () => {
      await store.saveListing("a", { name: "New" });
    });
    await act(async () => {
      slowRefresh.resolve({ accommodations: [listing("a", "2026-09-09T10:00:00Z", "Old")] });
      await refreshPromise;
    });
    expect(store.listings[0].data.name).toBe("New");
  });

  it("a later refresh still replaces state normally", async () => {
    await renderStore([listing("a", "2026-09-09T10:00:00Z")]);
    listHostAccommodations.mockResolvedValueOnce({ accommodations: [listing("z", "2026-09-09T12:00:00Z")] });
    await act(async () => {
      await store.refresh({ background: true });
    });
    expect(screen.getByTestId("ids").textContent).toBe("z");
  });

  it("a background refresh within maxAge is skipped, a forced one still hits the server", async () => {
    await renderStore([listing("a", "2026-09-09T10:00:00Z")]);
    expect(listHostAccommodations).toHaveBeenCalledTimes(1);

    await act(async () => {
      await store.refresh({ background: true, maxAge: 15_000 });
    });
    expect(listHostAccommodations).toHaveBeenCalledTimes(1);

    listHostAccommodations.mockResolvedValueOnce({ accommodations: [listing("a", "2026-09-09T10:00:00Z")] });
    await act(async () => {
      await store.refresh({ background: true });
    });
    expect(listHostAccommodations).toHaveBeenCalledTimes(2);
  });

  it("an unchanged snapshot keeps the previous array identity so dependents do not re-run", async () => {
    await renderStore([listing("a", "2026-09-09T10:00:00Z")]);
    const before = store.listings;
    listHostAccommodations.mockResolvedValueOnce({ accommodations: [listing("a", "2026-09-09T10:00:00Z")] });
    await act(async () => {
      await store.refresh({ background: true });
    });
    expect(store.listings).toBe(before);

    listHostAccommodations.mockResolvedValueOnce({ accommodations: [listing("a", "2026-09-09T11:00:00Z")] });
    await act(async () => {
      await store.refresh({ background: true });
    });
    expect(store.listings).not.toBe(before);
  });

  it("two concurrent refreshes share one request", async () => {
    await renderStore([listing("a", "2026-09-09T10:00:00Z")]);
    const pending = deferred();
    listHostAccommodations.mockReturnValueOnce(pending.promise);
    let first;
    let second;
    act(() => {
      first = store.refresh({ background: true });
      second = store.refresh({ background: true });
    });
    expect(first).toBe(second);
    expect(listHostAccommodations).toHaveBeenCalledTimes(2);
    await act(async () => {
      pending.resolve({ accommodations: [] });
      await first;
    });
  });
});
