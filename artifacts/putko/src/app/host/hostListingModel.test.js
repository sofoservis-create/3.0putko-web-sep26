import { describe, expect, it } from "vitest";
import {
  applyListingMutation,
  firstIncompleteStepId,
  reconcileListingsSnapshot,
  resumeStepIndex,
  selectPriorityListing,
} from "./hostListingModel";

const listing = (id, status, updatedAt, extra = {}) => ({
  id,
  status,
  updatedAt,
  createdAt: updatedAt,
  data: {},
  completedSteps: [],
  ...extra,
});

describe("reconcileListingsSnapshot", () => {
  it("does not resurrect a listing deleted while the fetch was in flight", () => {
    const snapshot = [listing("a", "DRAFT", "2026-09-09T10:00:00Z"), listing("b", "LIVE", "2026-09-09T09:00:00Z")];
    const result = reconcileListingsSnapshot(snapshot, [{ type: "remove", id: "a" }]);
    expect(result.map((item) => item.id)).toEqual(["b"]);
  });

  it("keeps a save that completed after the snapshot request started", () => {
    const snapshot = [listing("a", "DRAFT", "2026-09-09T10:00:00Z", { data: { name: "Old" } })];
    const saved = listing("a", "DRAFT", "2026-09-09T10:05:00Z", { data: { name: "New" } });
    const result = reconcileListingsSnapshot(snapshot, [{ type: "upsert", listing: saved }]);
    expect(result).toHaveLength(1);
    expect(result[0].data.name).toBe("New");
  });

  it("replays mutations in order and sorts newest first", () => {
    const snapshot = [listing("a", "DRAFT", "2026-09-09T10:00:00Z")];
    const created = listing("c", "DRAFT", "2026-09-09T11:00:00Z");
    const result = reconcileListingsSnapshot(snapshot, [
      { type: "upsert", listing: created },
      { type: "remove", id: "a" },
    ]);
    expect(result.map((item) => item.id)).toEqual(["c"]);
  });

  it("returns the sorted snapshot when nothing changed meanwhile", () => {
    const snapshot = [listing("a", "DRAFT", "2026-09-09T09:00:00Z"), listing("b", "LIVE", "2026-09-09T10:00:00Z")];
    expect(reconcileListingsSnapshot(snapshot, []).map((item) => item.id)).toEqual(["b", "a"]);
    expect(applyListingMutation(snapshot, null)).toBe(snapshot);
  });
});

describe("selectPriorityListing", () => {
  it("prefers READY, then the oldest DRAFT, then the most recent LIVE", () => {
    const live = listing("live", "LIVE", "2026-09-09T12:00:00Z");
    const newDraft = listing("d2", "DRAFT", "2026-09-09T11:00:00Z");
    const oldDraft = listing("d1", "DRAFT", "2026-09-08T11:00:00Z");
    const ready = listing("r", "READY", "2026-09-09T10:00:00Z");
    expect(selectPriorityListing([live, newDraft, oldDraft, ready]).id).toBe("r");
    expect(selectPriorityListing([live, newDraft, oldDraft]).id).toBe("d1");
    expect(selectPriorityListing([live]).id).toBe("live");
    expect(selectPriorityListing([])).toBeNull();
  });
});

describe("resumeStepIndex", () => {
  it("uses the last visited step for drafts when it is valid", () => {
    const draft = listing("a", "DRAFT", "2026-09-09T10:00:00Z", {
      data: { lastVisitedStep: "photos" },
      completedSteps: ["basics", "location"],
    });
    expect(resumeStepIndex(draft)).toBe(4);
  });

  it("falls back to the first incomplete step (calendar counts via calendarChoice)", () => {
    const draft = listing("a", "DRAFT", "2026-09-09T10:00:00Z", {
      data: { lastVisitedStep: "not-a-step" },
      completedSteps: ["basics", "location", "spaces", "amenities", "photos", "pricing", "availability"],
    });
    expect(firstIncompleteStepId(draft)).toBe("calendar");
    expect(resumeStepIndex(draft)).toBe(7);
  });

  it("opens READY and LIVE listings at the first step", () => {
    expect(resumeStepIndex(listing("a", "READY", "2026-09-09T10:00:00Z", { data: { lastVisitedStep: "photos" } }))).toBe(0);
    expect(resumeStepIndex(listing("a", "LIVE", "2026-09-09T10:00:00Z"))).toBe(0);
  });
});
