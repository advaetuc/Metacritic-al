import type {
  TmdbApiError,
  TmdbMovieDetails,
  TmdbMovieSummary,
  TmdbSearchResponse,
} from "./types";

const API_ORIGIN = "https://api.themoviedb.org";
const IMAGE_ORIGIN = "https://image.tmdb.org";
const IMAGE_PREFIX = "/t/p/w500/";
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 100;
const SEARCH_TTL_MS = 5 * 60 * 1_000;
const DETAILS_TTL_MS = 60 * 60 * 1_000;
const IMAGE_TTL_MS = 24 * 60 * 60 * 1_000;
const FAILURE_TTL_MS = 30 * 1_000;
const MAX_RETRY_AFTER_MS = 24 * 60 * 60 * 1_000;

type CachedBody = string | Uint8Array;
interface CacheEntry {
  status: number;
  body: CachedBody;
  headers: Record<string, string>;
  expiresAt: number;
}

type FetchLike = typeof fetch;

class TmdbFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly safeMessage: string,
    readonly cacheMs = FAILURE_TTL_MS,
    readonly responseHeaders: Record<string, string> = {},
  ) {
    super(code);
    this.name = "TmdbFailure";
  }
}

const responseCache = new Map<string, CacheEntry>();

function copyBody(body: CachedBody): BodyInit {
  if (typeof body === "string") return body;
  const buffer = new ArrayBuffer(body.byteLength);
  new Uint8Array(buffer).set(body);
  return buffer;
}

function makeResponse(entry: CacheEntry): Response {
  return new Response(copyBody(entry.body), {
    status: entry.status,
    headers: { ...entry.headers, "Cache-Control": "no-store" },
  });
}

function readCache(key: string): Response | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  // Refresh insertion order to make the bounded map an LRU cache.
  responseCache.delete(key);
  responseCache.set(key, entry);
  return makeResponse(entry);
}

function writeCache(key: string, entry: CacheEntry): void {
  responseCache.delete(key);
  responseCache.set(key, {
    ...entry,
    body: typeof entry.body === "string" ? entry.body : new Uint8Array(entry.body),
  });
  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    responseCache.delete(oldestKey);
  }
}

function responseWithCache(
  key: string,
  status: number,
  body: CachedBody,
  headers: Record<string, string>,
  cacheMs: number,
): Response {
  const entry: CacheEntry = {
    status,
    body,
    headers: { ...headers },
    expiresAt: Date.now() + Math.max(0, cacheMs),
  };
  if (cacheMs > 0) writeCache(key, entry);
  return makeResponse(entry);
}

function jsonResponse(
  status: number,
  value: object,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function failResponse(
  key: string,
  failure: TmdbFailure,
): Response {
  const value: TmdbApiError = {
    error: { code: failure.code, message: failure.safeMessage },
  };
  return responseWithCache(
    key,
    failure.status,
    JSON.stringify(value),
    {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...failure.responseHeaders,
    },
    failure.cacheMs,
  );
}

export function methodNotAllowedResponse(): Response {
  return jsonResponse(405, { error: { code: "method_not_allowed", message: "Use GET for this endpoint." } }, { Allow: "GET" });
}

function disabledResponse(): TmdbFailure {
  return new TmdbFailure(
    503,
    "tmdb_disabled",
    "TMDB metadata is unavailable. You can still use a typed movie title.",
  );
}

function getAccessToken(): string | null {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();
  return token || null;
}

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeId(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647
    ? value
    : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function normalizePosterPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 128) return null;
  return /^\/[A-Za-z0-9_-]{1,120}\.(?:jpe?g|png|webp)$/iu.test(value) ? value : null;
}

function normalizeVote(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
    ? value
    : null;
}

function normalizeVoteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647
    ? value
    : null;
}

function normalizeGenreIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    const id = normalizeId(item);
    return id === null ? [] : [id];
  });
}

function normalizeSummary(value: unknown): TmdbMovieSummary | null {
  if (!isRecord(value)) return null;
  const id = normalizeId(value.id);
  const title = sanitizeText(value.title, 120);
  if (id === null || !title) return null;
  return {
    id,
    title,
    releaseDate: normalizeDate(value.release_date),
    posterPath: normalizePosterPath(value.poster_path),
    overview: sanitizeText(value.overview, 500) ?? "",
    genreIds: normalizeGenreIds(value.genre_ids),
    voteAverage: normalizeVote(value.vote_average, 10),
    voteCount: normalizeVoteCount(value.vote_count),
  };
}

function normalizeDetails(value: unknown, expectedId: number): TmdbMovieDetails | null {
  if (!isRecord(value)) return null;
  const summary = normalizeSummary({ ...value, genre_ids: value.genre_ids });
  if (!summary || summary.id !== expectedId) return null;

  const genres = Array.isArray(value.genres)
    ? value.genres.slice(0, 20).flatMap((genre) => {
        if (!isRecord(genre)) return [];
        const id = normalizeId(genre.id);
        const name = sanitizeText(genre.name, 50);
        return id !== null && name ? [{ id, name }] : [];
      })
    : [];
  const runtime = typeof value.runtime === "number" && Number.isSafeInteger(value.runtime) && value.runtime > 0 && value.runtime <= 1_000
    ? value.runtime
    : null;

  return {
    ...summary,
    genreIds: genres.map((genre) => genre.id),
    tagline: sanitizeText(value.tagline, 200) ?? "",
    runtime,
    genres,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeRetryAfterMs(value: string | null): number {
  if (!value) return FAILURE_TTL_MS;
  const seconds = /^\d{1,6}$/u.test(value.trim())
    ? Number(value.trim())
    : Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 1_000));
  if (!Number.isFinite(seconds)) return FAILURE_TTL_MS;
  return Math.min(MAX_RETRY_AFTER_MS, Math.max(1_000, seconds * 1_000));
}

function retryAfterHeader(cacheMs: number): Record<string, string> {
  return { "Retry-After": String(Math.ceil(cacheMs / 1_000)) };
}

function mapUpstreamStatus(response: Response): void {
  if (response.status >= 300 && response.status < 400) {
    throw new TmdbFailure(502, "tmdb_redirect_rejected", "TMDB returned an unsupported redirect.");
  }
  if (response.ok) return;
  if (response.status === 401 || response.status === 403) {
    throw new TmdbFailure(503, "tmdb_auth_failed", "TMDB metadata is unavailable. Check the local server configuration.");
  }
  if (response.status === 429) {
    const retryMs = safeRetryAfterMs(response.headers.get("retry-after"));
    throw new TmdbFailure(429, "tmdb_rate_limited", "TMDB is temporarily rate-limiting requests. Try again shortly.", retryMs, retryAfterHeader(retryMs));
  }
  if (response.status === 404) {
    throw new TmdbFailure(404, "tmdb_not_found", "TMDB could not find that movie.");
  }
  throw new TmdbFailure(502, "tmdb_unavailable", "TMDB metadata is temporarily unavailable.");
}

async function requestUpstream<T>(
  url: URL,
  token: string,
  parseResponse: (response: Response) => Promise<T>,
  fetcher: FetchLike,
  includeAuthorization = true,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: {
        Accept: "application/json, image/*",
        ...(includeAuthorization ? { Authorization: `Bearer ${token}` } : {}),
      },
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    mapUpstreamStatus(response);
    return await parseResponse(response);
  } catch (error) {
    if (error instanceof TmdbFailure) throw error;
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new TmdbFailure(504, "tmdb_timeout", "TMDB took too long to respond. Please try again.");
    }
    throw new TmdbFailure(503, "tmdb_unavailable", "TMDB metadata is temporarily unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

function failureFor(error: unknown): TmdbFailure {
  return error instanceof TmdbFailure
    ? error
    : new TmdbFailure(502, "tmdb_invalid_response", "TMDB returned an invalid response.");
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader !== null) {
    if (!/^\d+$/u.test(lengthHeader)) throw new TmdbFailure(502, "tmdb_invalid_response", "TMDB returned an invalid response.");
    if (Number(lengthHeader) > MAX_JSON_BYTES) throw new TmdbFailure(502, "tmdb_response_too_large", "TMDB returned a response that was too large.");
  }
  if (!response.body) throw new TmdbFailure(502, "tmdb_invalid_response", "TMDB returned an invalid response.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new TmdbFailure(502, "tmdb_response_too_large", "TMDB returned a response that was too large.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof TmdbFailure) throw error;
    throw new TmdbFailure(502, "tmdb_invalid_response", "TMDB returned an invalid response.");
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new TmdbFailure(502, "tmdb_invalid_response", "TMDB returned an invalid response.");
  }
}

export function validMovieId(value: string): number | null {
  if (!/^\d{1,10}$/u.test(value)) return null;
  const id = Number(value);
  return normalizeId(id);
}

export function validPosterBasename(value: string): string | null {
  return /^[A-Za-z0-9_-]{1,120}\.(?:jpe?g|png|webp)$/iu.test(value) ? value : null;
}

export async function handleTmdbSearch(request: Request, fetcher: FetchLike = fetch): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowedResponse();
  let query: string;
  try {
    query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  } catch {
    return jsonResponse(400, { error: { code: "invalid_query", message: "Enter a movie title between 2 and 80 characters." } });
  }
  const queryLength = Array.from(query).length;
  if (queryLength < 2 || queryLength > 80 || /[\u0000-\u001f\u007f-\u009f]/u.test(query)) {
    return jsonResponse(400, { error: { code: "invalid_query", message: "Enter a movie title between 2 and 80 characters." } });
  }
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;
  const token = getAccessToken();
  if (!token) return failResponse(cacheKey, disabledResponse());

  const url = new URL("/3/search/movie", API_ORIGIN);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");
  try {
    const data = await requestUpstream<TmdbSearchResponse>(url, token, async (response) => {
      const raw = await readBoundedJson(response);
      if (!isRecord(raw) || !Array.isArray(raw.results)) {
        throw new TmdbFailure(502, "tmdb_invalid_response", "TMDB returned an invalid response.");
      }
      const results = raw.results.slice(0, 8).flatMap((item) => {
        const normalized = normalizeSummary(item);
        return normalized ? [normalized] : [];
      });
      const totalResults = typeof raw.total_results === "number" && Number.isSafeInteger(raw.total_results) && raw.total_results >= 0
        ? raw.total_results
        : results.length;
      return { results, totalResults };
    }, fetcher);
    return responseWithCache(cacheKey, 200, JSON.stringify(data), { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" }, SEARCH_TTL_MS);
  } catch (error) {
    return failResponse(cacheKey, failureFor(error));
  }
}

export async function handleTmdbMovie(request: Request, rawId: string, fetcher: FetchLike = fetch): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowedResponse();
  const id = validMovieId(rawId);
  if (id === null) return jsonResponse(400, { error: { code: "invalid_movie_id", message: "The movie ID must be a positive integer." } });
  const cacheKey = `movie:${id}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;
  const token = getAccessToken();
  if (!token) return failResponse(cacheKey, disabledResponse());

  const url = new URL(`/3/movie/${id}`, API_ORIGIN);
  url.searchParams.set("language", "en-US");
  try {
    const data = await requestUpstream<TmdbMovieDetails>(url, token, async (response) => {
      const raw = await readBoundedJson(response);
      const normalized = normalizeDetails(raw, id);
      if (!normalized) throw new TmdbFailure(502, "tmdb_invalid_response", "TMDB returned an invalid response.");
      return normalized;
    }, fetcher);
    return responseWithCache(cacheKey, 200, JSON.stringify(data), { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" }, DETAILS_TTL_MS);
  } catch (error) {
    return failResponse(cacheKey, failureFor(error));
  }
}

function imageType(response: Response): "image/jpeg" | "image/png" | "image/webp" | null {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  return contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/webp"
    ? contentType
    : null;
}

function matchesImageSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  return contentType === "image/webp" && bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

async function readBoundedImage(response: Response): Promise<{ bytes: Uint8Array; type: string }> {
  const type = imageType(response);
  if (!type) throw new TmdbFailure(502, "tmdb_invalid_image", "TMDB did not return a supported image.");
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader !== null) {
    if (!/^\d+$/u.test(lengthHeader)) throw new TmdbFailure(502, "tmdb_invalid_image", "TMDB did not return a supported image.");
    if (Number(lengthHeader) > MAX_IMAGE_BYTES) throw new TmdbFailure(502, "tmdb_image_too_large", "The movie poster is larger than the local limit.");
  }
  if (!response.body) throw new TmdbFailure(502, "tmdb_invalid_image", "TMDB did not return a supported image.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new TmdbFailure(502, "tmdb_image_too_large", "The movie poster is larger than the local limit.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof TmdbFailure) throw error;
    throw new TmdbFailure(502, "tmdb_invalid_image", "TMDB did not return a supported image.");
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (!matchesImageSignature(bytes, type)) {
    throw new TmdbFailure(502, "tmdb_invalid_image", "TMDB did not return a supported image.");
  }
  return { bytes, type };
}

export async function handleTmdbImage(request: Request, rawPath: string | readonly string[], fetcher: FetchLike = fetch): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowedResponse();
  const pathSegments = typeof rawPath === "string" ? [rawPath] : [...rawPath];
  if (pathSegments.length !== 1) return jsonResponse(400, { error: { code: "invalid_image_path", message: "The poster path is invalid." } });
  const basename = validPosterBasename(pathSegments[0] ?? "");
  if (!basename) return jsonResponse(400, { error: { code: "invalid_image_path", message: "The poster path is invalid." } });

  const cacheKey = `image:${basename}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;
  const token = getAccessToken();
  if (!token) return failResponse(cacheKey, disabledResponse());

  const url = new URL(`${IMAGE_PREFIX}${basename}`, IMAGE_ORIGIN);
  try {
    const image = await requestUpstream(url, token, readBoundedImage, fetcher, false);
    return responseWithCache(cacheKey, 200, image.bytes, {
      "Content-Type": image.type,
      "Content-Length": String(image.bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
    }, IMAGE_TTL_MS);
  } catch (error) {
    return failResponse(cacheKey, failureFor(error));
  }
}

/** Reset only the process-local cache for isolated route tests. */
export function resetTmdbCacheForTests(): void {
  responseCache.clear();
}

export const TMDB_LIMITS = {
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
  maxImageBytes: MAX_IMAGE_BYTES,
  maxCacheEntries: MAX_CACHE_ENTRIES,
} as const;
