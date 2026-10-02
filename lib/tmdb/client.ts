import type { GenreId } from "@/lib/engine/types";

export interface SelectedTmdbMovie {
  tmdbId: number;
  title: string;
  year?: number;
  posterPath?: string;
  genre?: GenreId;
}

export interface TmdbSuggestion extends SelectedTmdbMovie {
  genreIds: number[];
}

const TMDB_GENRE_TO_V1: Readonly<Record<number, GenreId>> = {
  28: "action",
  16: "animation",
  35: "comedy",
  18: "drama",
  14: "fantasy",
  27: "horror",
  10749: "romance",
  878: "scifi",
  53: "thriller",
  99: "documentary",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 120);
  return title || null;
}

function dateYear(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
  return date.getUTCFullYear();
}

function posterPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/[A-Za-z0-9_-]{1,120}\.(?:jpe?g|png|webp)$/iu.test(value)
    ? value
    : undefined;
}

function genreIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((candidate) =>
    typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate > 0
      ? [candidate]
      : [],
  );
}

export function mapTmdbGenresToV1Genre(ids: readonly number[]): GenreId | undefined {
  for (const id of ids) {
    const genre = TMDB_GENRE_TO_V1[id];
    if (genre) return genre;
  }
  return undefined;
}

/** Validate the same-origin proxy payload again before it enters client state. */
export function normalizeTmdbSearchResponse(value: unknown): TmdbSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new Error("The movie search response was invalid.");
  }

  return value.results.slice(0, 8).flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    const tmdbId = candidate.id;
    const title = cleanTitle(candidate.title);
    if (typeof tmdbId !== "number" || !Number.isSafeInteger(tmdbId) || tmdbId <= 0 || tmdbId > 2_147_483_647 || !title) {
      return [];
    }

    const ids = genreIds(candidate.genreIds);
    const year = dateYear(candidate.releaseDate);
    const poster = posterPath(candidate.posterPath);
    return [{
      tmdbId,
      title,
      genreIds: ids,
      ...(year !== undefined ? { year } : {}),
      ...(poster ? { posterPath: poster } : {}),
      ...(mapTmdbGenresToV1Genre(ids) ? { genre: mapTmdbGenresToV1Genre(ids) } : {}),
    }];
  });
}

export function tmdbPosterUrl(path: string | undefined): string | undefined {
  const validPath = posterPath(path);
  if (!validPath) return undefined;
  return `/api/tmdb/image/${encodeURIComponent(validPath.slice(1))}`;
}

export function tmdbErrorCode(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.code !== "string") return null;
  return value.error.code.slice(0, 64);
}
