import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleTmdbImage,
  handleTmdbMovie,
  handleTmdbSearch,
  resetTmdbCacheForTests,
  TMDB_LIMITS,
  validMovieId,
  validPosterBasename,
} from "./server";

const API_TOKEN_FIXTURE = "fixture-token-do-not-expose";

function jsonResponse(value: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", ...headers } });
}

function makeFetch(response: Response | (() => Response | Promise<Response>)) {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
    calls.push({ url, init: init ?? {} });
    return typeof response === "function" ? response() : response.clone();
  }) as typeof fetch;
  return { fetcher, calls };
}

function searchRequest(query = "matrix"): Request {
  return new Request(`http://localhost/api/tmdb/search?q=${encodeURIComponent(query)}`);
}

function validSearchPayload() {
  return {
    page: 1,
    total_results: 1,
    results: [{
      id: 603,
      title: "The Matrix\u0000",
      original_title: "The Matrix",
      release_date: "1999-03-31",
      poster_path: "/matrix_poster.jpg",
      overview: "A hacker discovers a simulated reality.",
      genre_ids: [28, 878, -1, "bad"],
      vote_average: 8.7,
      vote_count: 25000,
      adult: false,
    }],
  };
}

function minimalPng(): Uint8Array {
  return new Uint8Array(Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082",
    "hex",
  ));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

beforeEach(() => {
  resetTmdbCacheForTests();
  vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", API_TOKEN_FIXTURE);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetTmdbCacheForTests();
});

describe("TMDB local proxy", () => {
  it("returns a safe disabled response without a token and performs no fetch", async () => {
    vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", "");
    const { fetcher, calls } = makeFetch(jsonResponse({ results: [] }));
    const response = await handleTmdbSearch(searchRequest("alien"), fetcher);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("tmdb_disabled");
    expect(JSON.stringify(payload)).not.toContain(API_TOKEN_FIXTURE);
    expect(calls).toHaveLength(0);
  });

  it("normalizes search output, limits it to eight, and sends credentials only in Authorization", async () => {
    const results = Array.from({ length: 10 }, (_, index) => ({ ...validSearchPayload().results[0], id: index + 1 }));
    const { fetcher, calls } = makeFetch(jsonResponse({ results, total_results: 10 }));
    const response = await handleTmdbSearch(searchRequest("The Matrix"), fetcher);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.results).toHaveLength(8);
    expect(payload.results[0]).toEqual({
      id: 1,
      title: "The Matrix",
      releaseDate: "1999-03-31",
      posterPath: "/matrix_poster.jpg",
      overview: "A hacker discovers a simulated reality.",
      genreIds: [28, 878],
      voteAverage: 8.7,
      voteCount: 25000,
    });
    expect(calls[0]?.url.origin).toBe("https://api.themoviedb.org");
    expect(calls[0]?.url.pathname).toBe("/3/search/movie");
    expect(calls[0]?.url.searchParams.get("query")).toBe("The Matrix");
    expect(calls[0]?.url.searchParams.get("include_adult")).toBe("false");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: `Bearer ${API_TOKEN_FIXTURE}` });
    expect(calls[0]?.url.href).not.toContain(API_TOKEN_FIXTURE);
  });

  it("bounds and validates search queries before fetching", async () => {
    const { fetcher, calls } = makeFetch(jsonResponse({ results: [] }));
    expect((await handleTmdbSearch(searchRequest("x"), fetcher)).status).toBe(400);
    expect((await handleTmdbSearch(searchRequest("x".repeat(81)), fetcher)).status).toBe(400);
    expect((await handleTmdbSearch(searchRequest("\u0001hidden"), fetcher)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("allows GET only", async () => {
    const post = await handleTmdbSearch(new Request("http://localhost/api/tmdb/search?q=matrix", { method: "POST" }));
    expect(post.status).toBe(405);
    expect(post.headers.get("Allow")).toBe("GET");
  });

  it("normalizes valid movie details using a fixed movie endpoint", async () => {
    const payload = {
      id: 603,
      title: "The Matrix",
      original_title: "The Matrix",
      release_date: "1999-03-31",
      poster_path: "/matrix_poster.jpg",
      overview: "A hacker discovers a simulated reality.",
      tagline: "Welcome to the real world.",
      runtime: 136,
      genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
      vote_average: 8.7,
      vote_count: 25000,
    };
    const { fetcher, calls } = makeFetch(jsonResponse(payload));
    const response = await handleTmdbMovie(new Request("http://localhost/api/tmdb/movie/603"), "603", fetcher);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: 603,
      title: "The Matrix",
      genreIds: [28, 878],
      genres: [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
      runtime: 136,
    });
    expect(calls[0]?.url.origin).toBe("https://api.themoviedb.org");
    expect(calls[0]?.url.pathname).toBe("/3/movie/603");
  });

  it("rejects invalid movie IDs and poster paths without upstream calls", async () => {
    const { fetcher, calls } = makeFetch(jsonResponse({}));
    for (const id of ["0", "-1", "1.5", "99999999999", "https://attacker.test"]) {
      expect((await handleTmdbMovie(new Request(`http://localhost/api/tmdb/movie/${encodeURIComponent(id)}`), id, fetcher)).status).toBe(400);
    }
    for (const path of ["../secret.jpg", "/secret.jpg", "https://attacker.test/evil.jpg", "image.svg", "a/b.jpg"]) {
      expect(validPosterBasename(path)).toBeNull();
    }
    expect(validPosterBasename("normal_poster-1.jpg")).toBe("normal_poster-1.jpg");
    expect(validMovieId("603")).toBe(603);
    expect(calls).toHaveLength(0);
  });

  it.each([401, 403])("maps upstream %i auth errors to safe setup guidance", async (status) => {
    const { fetcher } = makeFetch(new Response("credential leaked upstream", { status }));
    const response = await handleTmdbSearch(searchRequest(`auth${status}`), fetcher);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("tmdb_auth_failed");
    expect(body).not.toContain("credential leaked");
    expect(body).not.toContain(API_TOKEN_FIXTURE);
  });

  it("honors Retry-After and caches a 429 response", async () => {
    const { fetcher, calls } = makeFetch(new Response("rate limited", { status: 429, headers: { "Retry-After": "17" } }));
    const first = await handleTmdbSearch(searchRequest("ratelimit"), fetcher);
    const second = await handleTmdbSearch(searchRequest("ratelimit"), fetcher);

    expect(first.status).toBe(429);
    expect(first.headers.get("Retry-After")).toBe("17");
    expect(second.status).toBe(429);
    expect(calls).toHaveLength(1);
  });

  it("maps upstream 5xx and malformed JSON to safe gateway errors", async () => {
    const failed = await handleTmdbSearch(searchRequest("server-error"), makeFetch(new Response("internal upstream details", { status: 500 })).fetcher);
    const malformed = await handleTmdbSearch(searchRequest("malformed-json"), makeFetch(new Response("{nope", { status: 200 })).fetcher);

    expect(failed.status).toBe(502);
    expect((await failed.text())).not.toContain("internal upstream details");
    expect(malformed.status).toBe(502);
    expect((await malformed.text())).toContain("tmdb_invalid_response");
  });

  it("rejects oversized JSON responses before parsing them", async () => {
    const tooLarge = await handleTmdbSearch(
      searchRequest("oversized-json"),
      makeFetch(new Response(null, { status: 200, headers: { "Content-Type": "application/json", "Content-Length": String(1024 * 1024 + 1) } })).fetcher,
    );

    expect(tooLarge.status).toBe(502);
    expect((await tooLarge.text())).toContain("tmdb_response_too_large");
  });

  it("returns a safe offline error without upstream details", async () => {
    const offlineFetch = (async () => { throw new Error("network socket details"); }) as typeof fetch;
    const response = await handleTmdbSearch(searchRequest("offline"), offlineFetch);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("tmdb_unavailable");
    expect(body).not.toContain("network socket details");
    expect(body).not.toContain(API_TOKEN_FIXTURE);
  });

  it("aborts upstream work after five seconds", async () => {
    vi.useFakeTimers();
    const calls: Array<{ url: URL; init: RequestInit }> = [];
    const hangingFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: new URL("https://api.themoviedb.org/3/search/movie"), init: init ?? {} });
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    }) as typeof fetch;
    const pending = handleTmdbSearch(searchRequest("timeout"), hangingFetch);
    await vi.advanceTimersByTimeAsync(TMDB_LIMITS.requestTimeoutMs);
    const response = await pending;

    expect(response.status).toBe(504);
    expect((await response.text())).toContain("tmdb_timeout");
    expect(calls).toHaveLength(1);
  });

  it("serves a bounded image from the fixed image host without forwarding the API token", async () => {
    const bytes = minimalPng();
    const { fetcher, calls } = makeFetch(new Response(asArrayBuffer(bytes), { status: 200, headers: { "Content-Type": "image/png", "Content-Length": String(bytes.byteLength) } }));
    const response = await handleTmdbImage(new Request("http://localhost/api/tmdb/image/poster.png"), ["poster.png"], fetcher);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(calls[0]?.url.origin).toBe("https://image.tmdb.org");
    expect(calls[0]?.url.pathname).toBe("/t/p/w500/poster.png");
    expect(calls[0]?.init.headers).not.toHaveProperty("Authorization");
  });

  it("evicts poster bodies to keep the per-instance cache within its byte budget", async () => {
    const poster = new Uint8Array(TMDB_LIMITS.maxImageBytes);
    poster.set([0xff, 0xd8, 0xff]);
    const { fetcher, calls } = makeFetch(() => new Response(asArrayBuffer(poster), {
      status: 200,
      headers: { "Content-Type": "image/jpeg", "Content-Length": String(poster.byteLength) },
    }));

    for (const name of ["first.jpg", "second.jpg", "third.jpg", "fourth.jpg"]) {
      const response = await handleTmdbImage(new Request(`http://localhost/api/tmdb/image/${name}`), [name], fetcher);
      expect(response.status).toBe(200);
      await response.arrayBuffer();
    }
    const firstAgain = await handleTmdbImage(
      new Request("http://localhost/api/tmdb/image/first.jpg"),
      ["first.jpg"],
      fetcher,
    );

    expect(firstAgain.status).toBe(200);
    expect(calls).toHaveLength(5);
    expect(TMDB_LIMITS.maxCacheBytes).toBe(16 * 1024 * 1024);
  });

  it("rejects HTML, corrupt images, and images over five MiB", async () => {
    const html = await handleTmdbImage(
      new Request("http://localhost/api/tmdb/image/html.jpg"),
      ["html.jpg"],
      makeFetch(new Response("<html>no image</html>", { status: 200, headers: { "Content-Type": "text/html" } })).fetcher,
    );
    const corrupt = await handleTmdbImage(
      new Request("http://localhost/api/tmdb/image/corrupt.png"),
      ["corrupt.png"],
      makeFetch(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "Content-Type": "image/png" } })).fetcher,
    );
    const oversized = await handleTmdbImage(
      new Request("http://localhost/api/tmdb/image/large.jpg"),
      ["large.jpg"],
      makeFetch(new Response(null, { status: 200, headers: { "Content-Type": "image/jpeg", "Content-Length": String(TMDB_LIMITS.maxImageBytes + 1) } })).fetcher,
    );

    expect(html.status).toBe(502);
    expect(corrupt.status).toBe(502);
    expect(oversized.status).toBe(502);
    expect((await oversized.text())).toContain("tmdb_image_too_large");
  });

  it("rejects a streamed image as soon as the five MiB cap is exceeded", async () => {
    const oversizedStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(TMDB_LIMITS.maxImageBytes));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const response = await handleTmdbImage(
      new Request("http://localhost/api/tmdb/image/stream.jpg"),
      ["stream.jpg"],
      makeFetch(new Response(oversizedStream, { status: 200, headers: { "Content-Type": "image/jpeg" } })).fetcher,
    );

    expect(response.status).toBe(502);
    expect((await response.text())).toContain("tmdb_image_too_large");
  });
});
