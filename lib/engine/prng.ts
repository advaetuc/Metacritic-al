import { normalizeRerollCounter, normalizeTitle } from "./normalize";
import type { GenerateReviewInput, RandomSource } from "./types";

/** xmur3 string hash. Calling the returned function yields a uint32 seed. */
export function xmur3(value: string): () => number {
  let hash = 1779033703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

/** Mulberry32 PRNG. Every call returns a value in [0, 1). */
export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function reviewSeedText(input: GenerateReviewInput): string {
  const normalizedTitle = normalizeTitle(input.title);
  const k = normalizeRerollCounter(input.k);
  return `${normalizedTitle}|${input.vibe}|${input.heat}|${input.sentiment}|${k}`;
}

export function createReviewRandom(input: GenerateReviewInput): RandomSource {
  const seed = xmur3(reviewSeedText(input))();
  return mulberry32(seed);
}

/** Box–Muller transform using the supplied deterministic random source. */
export function normalSample(random: RandomSource): number {
  const first = Math.max(random(), Number.EPSILON);
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}
