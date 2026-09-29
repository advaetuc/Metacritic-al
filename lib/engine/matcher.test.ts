import { describe, expect, it } from "vitest";
import {
  boundedLevenshtein,
  extractTitleFeatures,
  matchMovieTitle,
  normalizeForLookup,
  normalizeTitle,
} from "./index";
import type { MovieIndexEntry } from "./types";

const movieIndex: MovieIndexEntry[] = [
  { id: "inception-2010", t: "Inception", y: 2010, a: ["dream heist"], g: ["scifi"], p: 96 },
  { id: "the-dark-knight-2008", t: "The Dark Knight", y: 2008, a: ["tdk"], g: ["action", "drama"], p: 98 },
];

describe("title fallback and lookup", () => {
  it("extracts the requested feature flags from raw input", () => {
    expect(extractTitleFeatures("The Dark Knight: Part II")).toMatchObject({
      colon: true,
      startsThe: true,
      sequel: true,
    });
  });

  it("returns exact matches and fuzzy suggestions without silently replacing input", () => {
    expect(matchMovieTitle("the dark knight", movieIndex)).toMatchObject({
      kind: "exact",
      entry: { id: "the-dark-knight-2008" },
    });
    expect(matchMovieTitle("Inceptoin", movieIndex)).toMatchObject({
      kind: "suggestion",
      entry: { id: "inception-2010" },
      distance: 2,
    });
    expect(matchMovieTitle("xyz", movieIndex)).toEqual({ kind: "none" });
  });

  it("uses bounded edit distance and article-insensitive trigrams", () => {
    expect(boundedLevenshtein("kitten", "sitting")).toBe(3);
    expect(boundedLevenshtein("inceptoin", "inception")).toBe(2);
    expect(normalizeForLookup(" The   Dark Knight ")).toBe("dark knight");
  });

  it("never throws while normalizing 10,000 hostile strings", () => {
    const hostileParts = ["💥🎞️", "العَرَبِيَّة", "עברית", "\u0000", "\u200f", "\\\\", "\uD800", "\uDC00", "\u0301", " \t\n"];
    let state = 0x12345678;
    for (let index = 0; index < 10_000; index += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const hostile = index % 11 === 0
        ? ""
        : index % 17 === 0
          ? hostileParts[index % hostileParts.length]!.repeat(100)
          : hostileParts[state % hostileParts.length]! + String.fromCodePoint(0x1f300 + (state % 0x300)) + hostileParts[(state >>> 8) % hostileParts.length]!;

      expect(() => normalizeTitle(hostile)).not.toThrow();
      expect(() => normalizeForLookup(hostile)).not.toThrow();
      expect(normalizeTitle(hostile).length).toBeLessThanOrEqual(80);
    }
  });
});
