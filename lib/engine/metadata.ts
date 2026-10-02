import { displayTitle } from "./normalize";
import { containsBlockedSafetyContent } from "./safety";
import type { GenreId, MovieMetadataContext } from "./types";

const GENRES: readonly GenreId[] = [
  "action", "animation", "comedy", "drama", "fantasy", "horror", "romance",
  "scifi", "superhero", "thriller", "arthouse", "documentary",
];
const POSTER_PATH = /^\/[A-Za-z0-9_-]{1,120}\.(?:jpe?g|png|webp)$/iu;
const CONTROL_OR_BIDI = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function boundedInt(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : undefined;
}

function topicTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const clean = value
    .slice(0, 2_000)
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/giu, " ")
    .replace(CONTROL_OR_BIDI, " ")
    .replace(/[^\p{L}\p{N}'’ -]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return clean
    .split(" ")
    .map((token) => token.slice(0, 40))
    .filter((token) => token.length > 1 && !containsBlockedSafetyContent(token))
    .slice(0, 2);
}

function tokenSource(raw: Record<string, unknown>, field: "overview" | "tagline"): unknown {
  const text = raw[field];
  if (typeof text === "string") return text;
  const tokens = raw[`${field}Tokens`];
  return Array.isArray(tokens) ? tokens.filter((part): part is string => typeof part === "string").join(" ") : undefined;
}

function safeTitle(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const title = displayTitle(value.replace(CONTROL_OR_BIDI, " "));
  return title && !containsBlockedSafetyContent(title) ? title : undefined;
}

/** Accept an untrusted TMDB-like object and keep only bounded, approved metadata. */
export function normalizeMovieMetadata(value: unknown): MovieMetadataContext | undefined {
  const raw = record(value);
  if (!raw) return undefined;
  const genres = Array.isArray(raw.genres)
    ? [...new Set(raw.genres.filter((genre): genre is GenreId =>
        typeof genre === "string" && GENRES.includes(genre as GenreId),
      ))].sort((a, b) => GENRES.indexOf(a) - GENRES.indexOf(b))
    : [];
  const overviewTokens = topicTokens(tokenSource(raw, "overview"));
  const taglineTokens = topicTokens(tokenSource(raw, "tagline")).slice(0, Math.max(0, 2 - overviewTokens.length));
  const tmdbId = boundedInt(raw.tmdbId, 1, 2_147_483_647);
  const year = boundedInt(raw.year, 1, 9999);
  const runtime = boundedInt(raw.runtime, 1, 1000);
  const voteAverage = typeof raw.voteAverage === "number" && Number.isFinite(raw.voteAverage)
    && raw.voteAverage >= 0 && raw.voteAverage <= 10 ? raw.voteAverage : undefined;
  const voteCount = boundedInt(raw.voteCount, 0, 2_147_483_647);
  const posterPath = typeof raw.posterPath === "string" && raw.posterPath.length <= 128 && POSTER_PATH.test(raw.posterPath)
    ? raw.posterPath
    : undefined;
  const title = safeTitle(raw.title);
  const result: MovieMetadataContext = {
    ...(tmdbId !== undefined ? { tmdbId } : {}),
    ...(title ? { title } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(genres.length ? { genres } : {}),
    ...(overviewTokens.length ? { overviewTokens } : {}),
    ...(taglineTokens.length ? { taglineTokens } : {}),
    ...(runtime !== undefined ? { runtime } : {}),
    ...(voteAverage !== undefined ? { voteAverage } : {}),
    ...(voteCount !== undefined ? { voteCount } : {}),
    ...(posterPath ? { posterPath } : {}),
  };
  return Object.keys(result).length ? result : undefined;
}
