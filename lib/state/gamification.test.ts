import { describe, expect, it } from "vitest";
import { isVibeUnlocked, unlockedVibes } from "./gamification";

describe("vibe unlock thresholds", () => {
  it("unlocks sports, victorian, and nature at 5, 12, and 25 roasts", () => {
    expect(isVibeUnlocked("sports", 4)).toBe(false);
    expect(isVibeUnlocked("sports", 5)).toBe(true);
    expect(isVibeUnlocked("victorian", 11)).toBe(false);
    expect(isVibeUnlocked("victorian", 12)).toBe(true);
    expect(isVibeUnlocked("nature", 24)).toBe(false);
    expect(isVibeUnlocked("nature", 25)).toBe(true);
  });

  it("keeps all base vibes available before bonus unlocks", () => {
    expect(unlockedVibes(0)).toHaveLength(8);
    expect(unlockedVibes(5)).toContain("sports");
  });
});
