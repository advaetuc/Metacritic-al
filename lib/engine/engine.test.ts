import { describe, expect, it, vi } from "vitest";
import {
  calculateRating,
  createReviewRandom,
  DEFAULT_HEAT_SHIFT,
  DEFAULT_RATING_MODEL,
  generateReview,
  mulberry32,
  reviewSeedText,
  isSafeGeneratedCopy,
  xmur3,
} from "./index";
import type { GenerateReviewInput, VibePack } from "./types";
import { toReviewModelV1 } from "./types";
import type { VibeId } from "./types";

const vibe: VibePack = {
  id: "film-student",
  name: "Film Student",
  accent: "#2BFF88",
  username: {
    prefixes: ["cine"],
    cores: ["frame"],
    suffixes: ["notes"],
    casing: "snake",
  },
  tags: ["cinema", "review", "film"],
  ratingModel: {
    ...DEFAULT_RATING_MODEL,
    heatShift: DEFAULT_HEAT_SHIFT,
  },
  rules: {
    origin: [{ t: "#opener# #body# #kicker#" }],
    opener: [
      { t: "#titleShort# has a pulse." },
      { t: "#titleShort# is a comedy beat.", g: ["comedy"] },
    ],
    body: [{ t: "The final image earns its place." }],
    kicker: [{ t: "I will be thinking about it for days." }],
  },
};

function makeInput(k: number): GenerateReviewInput {
  return {
    title: "  The  Green   Knight  ",
    vibe: "film-student",
    heat: 2,
    sentiment: "love",
    k,
    genre: "fantasy",
  };
}

describe("deterministic review engine", () => {
  it("derives the seed from the specified normalized input tuple", () => {
    expect(reviewSeedText(makeInput(35))).toBe("the green knight|film-student|2|love|z");
    expect(xmur3("seed")()).toBe(xmur3("seed")());
  });

  it("returns the same review for identical input, across 1,000 reroll counters", () => {
    for (let k = 0; k < 1_000; k += 1) {
      const input = makeInput(k);
      expect(generateReview(input, vibe)).toEqual(generateReview(input, vibe));
    }
  });

  it("keeps PRNG draws in range and approximately uniform over 1,000 seeds", () => {
    const bins = [0, 0, 0, 0];
    for (let seed = 0; seed < 1_000; seed += 1) {
      const value = mulberry32(seed)();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      bins[Math.min(3, Math.floor(value * 4))]! += 1;
    }
    for (const count of bins) expect(count).toBeGreaterThan(180);
    for (const count of bins) expect(count).toBeLessThan(320);
  });

  it("produces ratings inside the half-star range for 1,000 inputs", () => {
    for (let k = 0; k < 1_000; k += 1) {
      const review = generateReview(makeInput(k), vibe);
      expect(review.rating).toBeGreaterThanOrEqual(0.5);
      expect(review.rating).toBeLessThanOrEqual(5);
      expect(review.rating * 2).toBeCloseTo(Math.round(review.rating * 2), 10);
    }
  });

  it("keeps direct rating draws snapped and clamped", () => {
    const random = createReviewRandom(makeInput(0));
    for (let draw = 0; draw < 1_000; draw += 1) {
      const rating = calculateRating({
        sentiment: draw % 2 === 0 ? "love" : "hate",
        heat: (draw % 4) as 0 | 1 | 2 | 3,
        random,
      });
      expect(rating).toBeGreaterThanOrEqual(0.5);
      expect(rating).toBeLessThanOrEqual(5);
      expect(rating * 2).toBeCloseTo(Math.round(rating * 2), 10);
    }
  });

  it("uses reroll count as the only variation key and has no persistent memory", () => {
    const first = generateReview(makeInput(0), vibe);
    const rerolled = generateReview(makeInput(1), vibe);
    expect(first.k).toBe("0");
    expect(rerolled.k).toBe("1");
    expect(generateReview(makeInput(0), vibe)).toEqual(first);
  });

  it("emits the additive V2 envelope and keeps a V1 adapter", () => {
    const review = generateReview(makeInput(0), vibe);
    expect(review).toMatchObject({ v: 2, engineVersion: 1, movie: { title: "The Green Knight" } });
    expect(toReviewModelV1(review)).toMatchObject({ v: 1, movie: { title: "The Green Knight" } });
    expect(toReviewModelV1(review)).not.toHaveProperty("engineVersion");
    expect(toReviewModelV1(review).movie).not.toHaveProperty("tmdbId");
  });

  it("generates valid models across all existing vibe, heat, and sentiment combinations", () => {
    const vibeIds: VibeId[] = [
      "film-student", "shitposter", "mid", "dad", "stan", "festival-snob",
      "linkedin", "conspiracy", "sports", "victorian", "nature",
    ];
    for (const vibeId of vibeIds) {
      const pack = { ...vibe, id: vibeId };
      for (const heat of [0, 1, 2, 3] as const) {
        for (const sentiment of ["love", "hate"] as const) {
          const review = generateReview({ ...makeInput(7), vibe: vibeId, heat, sentiment }, pack);
          expect(review.v).toBe(2);
          expect(review.engineVersion).toBe(1);
          expect(review.body.trim().length).toBeGreaterThan(0);
          expect(isSafeGeneratedCopy(review.body)).toBe(true);
          expect(isSafeGeneratedCopy(review.tweet)).toBe(true);
          expect(isSafeGeneratedCopy(review.username)).toBe(true);
          for (const tag of review.tags) expect(isSafeGeneratedCopy(tag)).toBe(true);
          expect(review.rating * 2).toBeCloseTo(Math.round(review.rating * 2), 10);
        }
      }
    }
  });

  it("keeps V1 outputs identical when non-seed metadata changes", () => {
    const base = { ...makeInput(11), genre: undefined };
    const first = generateReview({ ...base, metadata: {
      tmdbId: 603, title: base.title, year: 1999, genres: ["scifi"],
      overviewTokens: ["hacker", "reality"], taglineTokens: ["simulated"], runtime: 136,
      voteAverage: 8.7, voteCount: 25_000, posterPath: "/matrix.jpg",
    } }, vibe);
    const second = generateReview({ ...base, metadata: {
      tmdbId: 603, title: base.title, year: 1999, genres: ["comedy"],
      overviewTokens: ["code", "simulation"], taglineTokens: ["systems"], runtime: 140,
      voteAverage: 2.1, voteCount: 9, posterPath: "/other.png",
    } }, vibe);
    for (const field of ["body", "rating", "username", "avatarSeed", "watchedLabel", "rewatch", "likes", "comments", "tags", "tweet", "k"] as const) {
      expect(second[field]).toEqual(first[field]);
    }
  });

  it("uses only known mapped genre IDs and falls back to the typed title without metadata", () => {
    const input = { ...makeInput(0), genre: undefined };
    const fallback = generateReview(input, vibe);
    expect(fallback.movie.title).toBe("The Green Knight");
    const unknown = generateReview({ ...input, metadata: { genres: ["not-a-genre"] as never } }, vibe);
    expect(unknown.movie.genre).toBeUndefined();
    const known = generateReview({ ...input, metadata: { genres: ["thriller"] } }, vibe);
    expect(known.movie.genre).toBeUndefined();
    expect(known.movie.genres).toEqual(["thriller"]);
  });

  it("does not perform network requests during engine generation", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      generateReview(makeInput(0), vibe);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("keeps HTML-like entered titles as plain model text and excludes raw metadata prose", () => {
    const title = '<img src=x onerror="alert(1)"> Movie';
    const review = generateReview({
      ...makeInput(3),
      title,
      metadata: {
        title,
        overviewTokens: ["ordinary", "topic"],
      },
    }, vibe);
    expect(review.movie.title).toBe(title);
    expect(review.body).toContain(title);
    expect(review.body).not.toContain("ordinary topic");
  });

  it("blocks unsafe title input and replaces unsafe authored output for every heat", () => {
    expect(() => generateReview({ ...makeInput(0), title: "Porn review" }, vibe)).toThrow(/content safety policy/u);
    const unsafePack: VibePack = {
      ...vibe,
      rules: {
        ...vibe.rules,
        body: [{ t: "I will kill you." }],
        kicker: [],
      },
    };
    for (const heat of [0, 1, 2, 3] as const) {
      const review = generateReview({ ...makeInput(heat), heat }, unsafePack);
      expect(review.body).toBe("The film makes a choice, and the projector has notes.");
      expect(isSafeGeneratedCopy(review.tweet)).toBe(true);
    }
  });
});
