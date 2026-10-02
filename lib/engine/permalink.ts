import { normalizeMovieMetadata } from "./metadata";
import { displayTitle, normalizeRerollCounter } from "./normalize";
import type { GenerateReviewInput, GenreId, Heat, MovieMetadataContext, Sentiment, VibeId } from "./types";

const VIBES: readonly VibeId[] = ["film-student", "shitposter", "mid", "dad", "stan", "festival-snob", "linkedin", "conspiracy", "sports", "victorian", "nature"];
const GENRES: readonly GenreId[] = ["action", "animation", "comedy", "drama", "fantasy", "horror", "romance", "scifi", "superhero", "thriller", "arthouse", "documentary"];
const CURATED_ID = /^[a-z0-9][a-z0-9-]{0,79}$/u;
const MAX_PERMALINK_LENGTH = 1800;
const MAX_SNAPSHOT_LENGTH = 1200;

export interface PermalinkState {
  /** Existing V1 curated content ID (`m`). */
  movieId?: string;
  /** V2 TMDB movie ID (`tm`); lookup/poster only. */
  tmdbId?: number;
  title?: string;
  year?: number;
  vibe: VibeId;
  heat: Heat;
  sentiment: Sentiment;
  k: number;
  genre?: GenreId;
  metadata?: MovieMetadataContext;
  hasMetadataSnapshot: boolean;
}

export type PermalinkParseResult =
  | { ok: true; state: PermalinkState }
  | { ok: false; reason: string; prefillTitle?: string };

type Snapshot = Pick<MovieMetadataContext, "genres" | "overviewTokens" | "taglineTokens" | "runtime" | "voteAverage" | "voteCount" | "posterPath">;

function safeTitleForPrefill(value: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = displayTitle(value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, " "));
  return cleaned || undefined;
}

function validTitle(value: string | null): string | undefined {
  const title = value?.trim();
  if (!title) return undefined;
  const normalizedLength = Array.from(title.normalize("NFKC").replace(/\s+/gu, " ").trim()).length;
  return normalizedLength > 0 && normalizedLength <= 80 ? title : undefined;
}

function validYear(value: string | null): number | undefined {
  if (!value || !/^\d{1,4}$/u.test(value)) return undefined;
  const year = Number(value);
  return Number.isSafeInteger(year) && year >= 1 && year <= 9999 ? year : undefined;
}

function snapshotFromMetadata(metadata: MovieMetadataContext | undefined): Snapshot | undefined {
  const normalized = normalizeMovieMetadata(metadata);
  if (!normalized) return undefined;
  const snapshot: Snapshot = {
    ...(normalized.genres ? { genres: normalized.genres } : {}),
    ...(normalized.overviewTokens ? { overviewTokens: normalized.overviewTokens } : {}),
    ...(normalized.taglineTokens ? { taglineTokens: normalized.taglineTokens } : {}),
    ...(normalized.runtime !== undefined ? { runtime: normalized.runtime } : {}),
    ...(normalized.voteAverage !== undefined ? { voteAverage: normalized.voteAverage } : {}),
    ...(normalized.voteCount !== undefined ? { voteCount: normalized.voteCount } : {}),
    ...(normalized.posterPath ? { posterPath: normalized.posterPath } : {}),
  };
  return Object.keys(snapshot).length ? snapshot : undefined;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): string | undefined {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length > MAX_SNAPSHOT_LENGTH) return undefined;
  try {
    const base64 = value.replace(/-/gu, "+").replace(/_/gu, "/");
    const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

/** Short non-cryptographic hash detects incomplete or hand-edited optional snapshots. */
function snapshotHash(snapshotJson: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < snapshotJson.length; index += 1) {
    hash ^= snapshotJson.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  const allowed = new Set(["genres", "overviewTokens", "taglineTokens", "runtime", "voteAverage", "voteCount", "posterPath"]);
  if (Object.keys(snapshot).some((key) => !allowed.has(key)) || Object.keys(snapshot).length === 0) return false;
  if (snapshot.genres !== undefined && (!Array.isArray(snapshot.genres) || snapshot.genres.length === 0 || snapshot.genres.length > GENRES.length
    || snapshot.genres.some((genre) => typeof genre !== "string" || !GENRES.includes(genre as GenreId)))) return false;
  if (Array.isArray(snapshot.genres) && new Set(snapshot.genres).size !== snapshot.genres.length) return false;
  const overviewTokens = snapshot.overviewTokens;
  const taglineTokens = snapshot.taglineTokens;
  for (const tokens of [overviewTokens, taglineTokens]) {
    if (tokens !== undefined && (!Array.isArray(tokens) || tokens.length === 0 || tokens.some((token) =>
      typeof token !== "string" || Array.from(token).length > 40 || !/^[\p{L}\p{N}'’\-]{2,40}$/u.test(token),
    ))) return false;
  }
  if ((Array.isArray(overviewTokens) ? overviewTokens.length : 0) + (Array.isArray(taglineTokens) ? taglineTokens.length : 0) > 2) return false;
  if (snapshot.runtime !== undefined && (typeof snapshot.runtime !== "number" || !Number.isSafeInteger(snapshot.runtime) || snapshot.runtime < 1 || snapshot.runtime > 1000)) return false;
  if (snapshot.voteAverage !== undefined && (typeof snapshot.voteAverage !== "number" || !Number.isFinite(snapshot.voteAverage) || snapshot.voteAverage < 0 || snapshot.voteAverage > 10)) return false;
  if (snapshot.voteCount !== undefined && (typeof snapshot.voteCount !== "number" || !Number.isSafeInteger(snapshot.voteCount) || snapshot.voteCount < 0 || snapshot.voteCount > 2_147_483_647)) return false;
  if (snapshot.posterPath !== undefined && (typeof snapshot.posterPath !== "string" || !/^\/[A-Za-z0-9_-]{1,120}\.(?:jpe?g|png|webp)$/iu.test(snapshot.posterPath))) return false;
  return true;
}

function decodeSnapshot(encoded: string | null, hash: string | null, tmdbId: number | undefined, title: string | undefined, year: number | undefined): MovieMetadataContext | undefined {
  if (!encoded || !hash || !/^[a-f0-9]{8}$/iu.test(hash)) return undefined;
  const decoded = decodeBase64Url(encoded);
  if (!decoded || decoded.length > 900) return undefined;
  let value: unknown;
  try { value = JSON.parse(decoded) as unknown; } catch { return undefined; }
  if (!isSnapshot(value) || snapshotHash(JSON.stringify(value)) !== hash.toLowerCase()) return undefined;
  return normalizeMovieMetadata({ ...value, ...(tmdbId !== undefined ? { tmdbId } : {}), ...(title ? { title } : {}), ...(year !== undefined ? { year } : {}) });
}

function validOrigin(origin?: string): string {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "";
  } catch {
    return "";
  }
}

export function buildReviewPermalink(input: GenerateReviewInput, movieId?: string, origin?: string): string {
  const metadata = normalizeMovieMetadata(input.metadata);
  const tmdbId = metadata?.tmdbId;
  const year = input.moviePack?.year ?? metadata?.year;
  const title = displayTitle(input.title);
  const base = `${validOrigin(origin)}/r/?`;

  const serialize = (snapshot?: Snapshot): string => {
    const params = new URLSearchParams();
    params.set("d", "1");
    params.set("v", input.vibe);
    params.set("h", String(input.heat));
    params.set("s", input.sentiment);
    params.set("k", normalizeRerollCounter(input.k));
    if (tmdbId !== undefined) params.set("tm", String(tmdbId));
    if (year !== undefined) params.set("y", String(year));
    params.set("t", title);
    if (input.genre) params.set("g", input.genre);
    if (movieId && CURATED_ID.test(movieId)) params.set("m", movieId);
    if (snapshot) {
      const json = JSON.stringify(snapshot);
      params.set("md", encodeBase64Url(json));
      params.set("mh", snapshotHash(json));
    }
    return base + params.toString();
  };

  let snapshot = snapshotFromMetadata(metadata);
  let href = serialize(snapshot);
  if (href.length > MAX_PERMALINK_LENGTH && snapshot?.overviewTokens) {
    snapshot = { ...snapshot };
    delete snapshot.overviewTokens;
    href = serialize(Object.keys(snapshot).length ? snapshot : undefined);
  }
  if (href.length > MAX_PERMALINK_LENGTH && snapshot?.taglineTokens) {
    snapshot = { ...snapshot };
    delete snapshot.taglineTokens;
    href = serialize(Object.keys(snapshot).length ? snapshot : undefined);
  }
  if (href.length > MAX_PERMALINK_LENGTH && snapshot) {
    snapshot = {
      ...(snapshot.runtime !== undefined ? { runtime: snapshot.runtime } : {}),
      ...(snapshot.posterPath ? { posterPath: snapshot.posterPath } : {}),
    };
    href = serialize(Object.keys(snapshot).length ? snapshot : undefined);
  }
  if (href.length > MAX_PERMALINK_LENGTH) {
    // The optional metadata has already been exhausted; preserve only the V1 inputs and top-level fields.
    href = serialize(undefined);
  }
  return href;
}

export function parseReviewPermalink(params: URLSearchParams): PermalinkParseResult {
  for (const key of ["d", "m", "t", "v", "h", "s", "k"]) {
    if (params.getAll(key).length > 1) {
      const duplicateTitle = safeTitleForPrefill(params.get("t"));
      return { ok: false, reason: "This review link contains duplicate state fields.", ...(duplicateTitle ? { prefillTitle: duplicateTitle } : {}) };
    }
  }
  const rawTitle = params.get("t");
  const prefillTitle = safeTitleForPrefill(rawTitle);
  const title = validTitle(rawTitle);
  const version = params.get("d");
  const movieId = params.get("m")?.trim();
  const tmValues = params.getAll("tm");
  const tmValue = tmValues.length === 1 ? tmValues[0]! : null;
  const vibe = params.get("v");
  const heatValue = params.get("h");
  const sentiment = params.get("s");
  const kValue = params.get("k") ?? "0";
  const genreValues = params.getAll("g");
  const genreValue = genreValues.length === 1 ? genreValues[0]! : null;

  const fail = (reason: string): PermalinkParseResult => ({ ok: false, reason, ...(prefillTitle ? { prefillTitle } : {}) });
  if (version !== null && version !== "1") return fail("This review link uses an unsupported engine version.");
  if (movieId && !CURATED_ID.test(movieId)) return fail("The movie ID is invalid.");
  if (rawTitle?.trim() && !title) return fail(prefillTitle ? "The title in this link is too long." : "The title in this link is invalid.");
  if (!title && !movieId) {
    return fail("The link needs a movie ID or title.");
  }
  if (!vibe || !VIBES.includes(vibe as VibeId)) return fail("The vibe in this link is invalid.");
  if (!heatValue || !/^[0-3]$/u.test(heatValue)) return fail("The heat setting in this link is invalid.");
  if (sentiment !== "love" && sentiment !== "hate") return fail("The sentiment in this link is invalid.");
  if (!/^[0-9a-z]{1,11}$/iu.test(kValue)) return fail("The reroll counter is invalid.");
  const k = Number.parseInt(kValue, 36);
  if (!Number.isSafeInteger(k) || k < 0 || k.toString(36) !== kValue.toLowerCase()) return fail("The reroll counter is invalid.");

  const tmdbId = version === "1" && tmValue && /^\d{1,10}$/u.test(tmValue) && Number.isSafeInteger(Number(tmValue))
    && Number(tmValue) > 0 && Number(tmValue) <= 2_147_483_647 ? Number(tmValue) : undefined;
  const yearValues = params.getAll("y");
  const year = version === "1" ? validYear(yearValues.length === 1 ? yearValues[0]! : null) : undefined;
  const genre = genreValue && GENRES.includes(genreValue as GenreId) ? genreValue as GenreId : undefined;
  const hasOptionalV2 = version === "1";
  const validTmParameter = tmValues.length <= 1 && (tmValue === null || tmdbId !== undefined);
  const metadata = hasOptionalV2 && validTmParameter
    ? decodeSnapshot(params.getAll("md").length === 1 ? params.get("md") : null, params.getAll("mh").length === 1 ? params.get("mh") : null, tmdbId, title, year)
    : undefined;
  if ((genreValues.length > 1 || (genreValue && !GENRES.includes(genreValue as GenreId))) && version !== "1") return fail("The genre in this link is invalid.");

  return {
    ok: true,
    state: {
      ...(movieId ? { movieId } : {}),
      ...(tmdbId !== undefined ? { tmdbId } : {}),
      ...(title ? { title } : {}),
      ...(year !== undefined ? { year } : {}),
      vibe: vibe as VibeId,
      heat: Number(heatValue) as Heat,
      sentiment,
      k,
      ...(genre ? { genre } : {}),
      ...(metadata ? { metadata } : {}),
      hasMetadataSnapshot: Boolean(metadata),
    },
  };
}
