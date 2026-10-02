import { normalizeMovieMetadata } from "@/lib/engine/metadata";
import type { GenreId, MovieMetadataContext } from "@/lib/engine/types";

export interface SelectedTmdbMovie extends MovieMetadataContext {
  tmdbId: number;
  title: string;
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

function mapTmdbGenres(ids: readonly number[]): GenreId[] {
  return [...new Set(ids.flatMap((id) => TMDB_GENRE_TO_V1[id] ? [TMDB_GENRE_TO_V1[id]!] : []))];
}

function validVoteAverage(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10 ? value : undefined;
}

function validVoteCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647 ? value : undefined;
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
    const genre = mapTmdbGenresToV1Genre(ids);
    const metadata = normalizeMovieMetadata({
      tmdbId,
      title,
      year,
      genres: mapTmdbGenres(ids),
      overview: candidate.overview,
      voteAverage: validVoteAverage(candidate.voteAverage),
      voteCount: validVoteCount(candidate.voteCount),
      posterPath: poster,
    });
    return [{
      tmdbId,
      title,
      genreIds: ids,
      ...(metadata ? metadata : {}),
      ...(year !== undefined ? { year } : {}),
      ...(poster ? { posterPath: poster } : {}),
      ...(genre ? { genre } : {}),
    }];
  });
}

/** Normalize the bounded same-origin movie-details response without retaining raw prose. */
export function normalizeTmdbMovieDetails(value: unknown, expectedId: number): SelectedTmdbMovie | null {
  if (!isRecord(value) || value.id !== expectedId || !Number.isSafeInteger(expectedId) || expectedId <= 0) return null;
  const title = cleanTitle(value.title);
  if (!title) return null;
  const genres = Array.isArray(value.genres)
    ? value.genres.slice(0, 20).flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "number" || !Number.isSafeInteger(item.id)) return [];
        const mapped = TMDB_GENRE_TO_V1[item.id];
        return mapped ? [mapped] : [];
      })
    : [];
  const ids = genreIds(value.genreIds);
  const mappedGenres = [...new Set([...genres, ...mapTmdbGenres(ids)])];
  const metadata = normalizeMovieMetadata({
    tmdbId: expectedId,
    title,
    year: dateYear(value.releaseDate),
    genres: mappedGenres,
    overview: value.overview,
    tagline: value.tagline,
    runtime: value.runtime,
    voteAverage: validVoteAverage(value.voteAverage),
    voteCount: validVoteCount(value.voteCount),
    posterPath: posterPath(value.posterPath),
  });
  if (!metadata) return null;
  return {
    tmdbId: expectedId,
    title,
    ...metadata,
    ...(mappedGenres[0] ? { genre: mappedGenres[0] } : {}),
  };
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
