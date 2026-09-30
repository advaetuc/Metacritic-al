import { describe, expect, it } from "vitest";
import { selectDailyRoast } from "./daily";
import type { MovieIndexEntry } from "./types";

const movies: MovieIndexEntry[] = [
  { id: "dark-knight", t: "The Dark Knight", y: 2008, g: ["action"], p: 1 },
  { id: "arrival", t: "Arrival", y: 2016, g: ["scifi"], p: 1 },
  { id: "moonlight", t: "Moonlight", y: 2016, g: ["drama"], p: 1 },
];

describe("selectDailyRoast", () => {
  it("returns stable, distinct selections for five UTC dates", () => {
    const dates = ["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"];
    const firstRun = dates.map((date) => selectDailyRoast(date, movies));
    const secondRun = dates.map((date) => selectDailyRoast(date, movies));

    expect(firstRun).toEqual(secondRun);
    expect(new Set(firstRun.map(({ movie, vibe, heat }) => `${movie.id}|${vibe}|${heat}`)).size).toBe(5);
  });

  it("ignores movie-index ordering", () => {
    expect(selectDailyRoast("2026-09-30", movies)).toEqual(selectDailyRoast("2026-09-30", [...movies].reverse()));
  });
});
