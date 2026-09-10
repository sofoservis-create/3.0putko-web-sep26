import { describe, expect, it, vi } from "vitest";
import { createKeyedInFlight, isFresh, sameSnapshot } from "./hostStoreUtils";

describe("isFresh", () => {
  it("is false without a load time or a positive maxAge", () => {
    expect(isFresh(0, 1000, 5000)).toBe(false);
    expect(isFresh(4000, 0, 5000)).toBe(false);
    expect(isFresh(4000, Number.NaN, 5000)).toBe(false);
  });
  it("is true only inside the window", () => {
    expect(isFresh(4000, 1000, 4999)).toBe(true);
    expect(isFresh(4000, 1000, 5000)).toBe(false);
  });
});

describe("sameSnapshot", () => {
  it("keeps the previous identity for equal data and swaps for different data", () => {
    const previous = [{ id: "a", n: 1 }];
    expect(sameSnapshot(previous, [{ id: "a", n: 1 }])).toBe(previous);
    const changed = [{ id: "a", n: 2 }];
    expect(sameSnapshot(previous, changed)).toBe(changed);
    const longer = [{ id: "a", n: 1 }, { id: "b", n: 1 }];
    expect(sameSnapshot(previous, longer)).toBe(longer);
  });
  it("passes non-arrays through", () => {
    const next = [];
    expect(sameSnapshot(null, next)).toBe(next);
  });
});

describe("createKeyedInFlight", () => {
  it("shares one request per key while it is running and starts a new one afterwards", async () => {
    const dedupe = createKeyedInFlight();
    const start = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve("x"), 5)));
    const a = dedupe("k", start);
    const b = dedupe("k", start);
    const other = dedupe("j", start);
    expect(a).toBe(b);
    expect(other).not.toBe(a);
    expect(start).toHaveBeenCalledTimes(2);
    await Promise.all([a, other]);
    dedupe("k", start);
    expect(start).toHaveBeenCalledTimes(3);
  });
  it("propagates a rejection to every waiter and clears the slot", async () => {
    const dedupe = createKeyedInFlight();
    const failing = () => Promise.reject(new Error("boom"));
    const a = dedupe("k", failing);
    const b = dedupe("k", failing);
    await expect(a).rejects.toThrow("boom");
    await expect(b).rejects.toThrow("boom");
    const ok = dedupe("k", () => Promise.resolve("fine"));
    await expect(ok).resolves.toBe("fine");
  });
});
