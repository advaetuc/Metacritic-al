import { afterEach, describe, expect, it, vi } from "vitest";
import { readAppStorage, removeAppStorage, STORAGE_PREFIX, writeAppStorage } from "./storage";

afterEach(() => vi.unstubAllGlobals());

describe("safe local storage", () => {
  it("uses the rr:v1 prefix for reads, writes, and removal", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
    };
    vi.stubGlobal("localStorage", storage);
    expect(writeAppStorage("history", [1, 2])).toBe(true);
    expect(data.has(STORAGE_PREFIX + "history")).toBe(true);
    expect(readAppStorage("history", [])).toEqual([1, 2]);
    expect(removeAppStorage("history")).toBe(true);
    expect(readAppStorage("history", [])).toEqual([]);
  });

  it("falls back without throwing when storage access is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      setItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      removeItem: () => { throw new DOMException("Blocked", "SecurityError"); },
    });
    expect(readAppStorage("retention", { count: 0 })).toEqual({ count: 0 });
    expect(writeAppStorage("retention", { count: 1 })).toBe(false);
    expect(removeAppStorage("retention")).toBe(false);
  });
});
