import { describe, expect, it } from "vitest";
import {
  calculateRating,
  createReviewRandom,
  DEFAULT_HEAT_SHIFT,
  DEFAULT_RATING_MODEL,
  generateReview,
  mulberry32,
  reviewSeedText,
  xmur3,
} from "./index";
import type { GenerateReviewInput, VibePack } from "./types";

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
    opener: [{ t: "#titleShort# has a pulse." }],
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
});
