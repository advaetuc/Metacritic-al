import { normalizeForLookup } from "./normalize";
import type { MovieIndexEntry } from "./types";

const MAX_EDIT_DISTANCE = 2;
const MIN_FUZZY_LENGTH = 5;
const MIN_TRIGRAM_DICE = 0.2;

export type MovieMatch =
  | { kind: "exact"; entry: MovieIndexEntry }
  | { kind: "suggestion"; entry: MovieIndexEntry; score: number; distance: number }
  | { kind: "none" };

function trigrams(value: string): Set<string> {
  const padded = `  ${value} `;
  const result = new Set<string>();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    result.add(padded.slice(index, index + 3));
  }
  return result;
}

/** Sørensen–Dice overlap of normalized character trigrams, in [0, 1]. */
export function trigramOverlap(left: string, right: string): number {
  const leftTrigrams = trigrams(normalizeForLookup(left));
  const rightTrigrams = trigrams(normalizeForLookup(right));
  if (leftTrigrams.size === 0 || rightTrigrams.size === 0) return 0;

  let intersection = 0;
  for (const trigram of leftTrigrams) {
    if (rightTrigrams.has(trigram)) intersection += 1;
  }
  return (2 * intersection) / (leftTrigrams.size + rightTrigrams.size);
}

/** Levenshtein distance with an early exit once the limit is exceeded. */
export function boundedLevenshtein(left: string, right: string, limit = MAX_EDIT_DISTANCE): number {
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError("Distance limit must be a non-negative integer.");
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  if (left === right) return 0;
  if (left.length > right.length) return boundedLevenshtein(right, left, limit);

  let previous = Array.from({ length: left.length + 1 }, (_, index) => index);
  let current = new Array<number>(left.length + 1);

  for (let row = 1; row <= right.length; row += 1) {
    current[0] = row;
    let rowMinimum = current[0]!;
    for (let column = 1; column <= left.length; column += 1) {
      const substitutionCost = left[column - 1] === right[row - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column]! + 1,
        current[column - 1]! + 1,
        previous[column - 1]! + substitutionCost,
      );
      rowMinimum = Math.min(rowMinimum, current[column]!);
    }
    if (rowMinimum > limit) return limit + 1;
    [previous, current] = [current, previous];
  }

  return previous[left.length]! <= limit ? previous[left.length]! : limit + 1;
}

function entryNames(entry: MovieIndexEntry): string[] {
  return [entry.t, ...(entry.a ?? [])];
}

/**
 * Exact title/alias match, or a suggestion only. Fuzzy results are never
 * treated as an automatic substitution for the user's input.
 */
export function matchMovieTitle(query: string, index: readonly MovieIndexEntry[]): MovieMatch {
  const normalizedQuery = normalizeForLookup(query);
  if (!normalizedQuery) return { kind: "none" };

  for (const entry of index) {
    if (entryNames(entry).some((name) => normalizeForLookup(name) === normalizedQuery)) {
      return { kind: "exact", entry };
    }
  }

  if (normalizedQuery.length < MIN_FUZZY_LENGTH) return { kind: "none" };

  let best: Extract<MovieMatch, { kind: "suggestion" }> | undefined;
  for (const entry of index) {
    for (const name of entryNames(entry)) {
      const candidate = normalizeForLookup(name);
      if (candidate.length < MIN_FUZZY_LENGTH) continue;

      const distance = boundedLevenshtein(normalizedQuery, candidate);
      if (distance > MAX_EDIT_DISTANCE) continue;
      const score = trigramOverlap(normalizedQuery, candidate);
      if (score < MIN_TRIGRAM_DICE) continue;

      const next = { kind: "suggestion" as const, entry, score, distance };
      if (
        !best ||
        next.distance < best.distance ||
        (next.distance === best.distance && next.score > best.score) ||
        (next.distance === best.distance && next.score === best.score && entry.p > best.entry.p)
      ) {
        best = next;
      }
    }
  }

  return best ?? { kind: "none" };
}
