import { describe, expect, it } from "vitest";
import { EMPTY_STREAK, localCalendarDay, recordStreakDay } from "./streak";

describe("local daily streaks", () => {
  it("starts at one on the first roast", () => {
    const firstRoast = new Date(2026, 4, 10, 12, 0);
    expect(recordStreakDay(EMPTY_STREAK, firstRoast)).toEqual({ current: 1, lastRoastDay: localCalendarDay(firstRoast) });
  });

  it("does not add another day for multiple roasts on the same local date", () => {
    const firstRoast = new Date(2026, 4, 10, 9, 0);
    const laterRoast = new Date(2026, 4, 10, 23, 59);
    const once = recordStreakDay(EMPTY_STREAK, firstRoast);
    expect(recordStreakDay(once, laterRoast)).toEqual(once);
  });

  it("increments across local midnight, including a roast just after midnight", () => {
    const beforeMidnight = new Date(2026, 4, 10, 23, 59);
    const afterMidnight = new Date(2026, 4, 11, 0, 1);
    const once = recordStreakDay(EMPTY_STREAK, beforeMidnight);
    expect(recordStreakDay(once, afterMidnight)).toEqual({ current: 2, lastRoastDay: localCalendarDay(afterMidnight) });
  });

  it("restarts at one after a skipped local calendar day", () => {
    const dayOne = recordStreakDay(EMPTY_STREAK, new Date(2026, 4, 10, 12));
    const dayTwo = recordStreakDay(dayOne, new Date(2026, 4, 11, 12));
    expect(recordStreakDay(dayTwo, new Date(2026, 4, 13, 8))).toEqual({
      current: 1,
      lastRoastDay: localCalendarDay(new Date(2026, 4, 13, 8)),
    });
  });

  it("keeps the latest streak if the device clock moves backwards", () => {
    const yesterday = recordStreakDay(EMPTY_STREAK, new Date(2026, 4, 11, 12));
    expect(recordStreakDay(yesterday, new Date(2026, 4, 10, 12))).toBe(yesterday);
  });
});
