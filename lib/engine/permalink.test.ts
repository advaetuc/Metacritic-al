import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReviewPermalink, generateReview, parseReviewPermalink } from "./index";
import { DEFAULT_HEAT_SHIFT, DEFAULT_RATING_MODEL } from "./rating";
import type { GenerateReviewInput, VibePack } from "./types";

const vibe: VibePack = {
  id: "film-student",
  name: "Film Student",
  accent: "#2BFF88",
  username: { prefixes: ["cine"], cores: ["frame"], suffixes: ["notes"], casing: "snake" },
  tags: ["cinema", "film", "review"],
  ratingModel: { ...DEFAULT_RATING_MODEL, heatShift: DEFAULT_HEAT_SHIFT },
  rules: {
    origin: [{ t: "#opener# #body# #kicker#" }],
    opener: [{ t: "#titleShort# has a pulse." }],
    body: [{ t: "The final image earns its place." }],
    kicker: [{ t: "I will be thinking about it for days." }],
  },
};

const input: GenerateReviewInput = {
  title: "  Arrival  ",
  vibe: "film-student",
  heat: 2,
  sentiment: "hate",
  k: 123,
  genre: "scifi",
  metadata: {
    tmdbId: 329865,
    title: "Arrival",
    year: 2016,
    genres: ["scifi", "drama"],
    overviewTokens: ["linguist", "contact"],
    taglineTokens: ["communication"],
    runtime: 116,
    voteAverage: 7.6,
    voteCount: 15_000,
    posterPath: "/arrival_poster.jpg",
  },
};

afterEach(() => vi.restoreAllMocks());

describe("V1-compatible shared review permalinks", () => {
  it("reads existing V1 curated and typed-title links without migration", () => {
    const curated = parseReviewPermalink(new URLSearchParams("m=the-dark-knight-2008&t=The+Dark+Knight&v=dad&h=1&s=love&k=0"));
    expect(curated).toMatchObject({ ok: true, state: {
      movieId: "the-dark-knight-2008", title: "The Dark Knight", vibe: "dad", heat: 1,
      sentiment: "love", k: 0, hasMetadataSnapshot: false,
    } });
    const typed = parseReviewPermalink(new URLSearchParams("t=My+Unlisted+Film&v=stan&h=3&s=hate&k=1z&g=thriller"));
    expect(typed).toMatchObject({ ok: true, state: { title: "My Unlisted Film", vibe: "stan", k: 71, genre: "thriller" } });
  });

  it("serializes V2 parameters in stable order and round-trips V1 inputs plus bounded snapshot", () => {
    const href = buildReviewPermalink(input, "arrival-2016", "https://demo.example/ignored");
    expect(buildReviewPermalink(input, "arrival-2016", "https://demo.example/ignored")).toBe(href);
    const url = new URL(href, "http://localhost");
    expect(url.origin).toBe("https://demo.example");
    expect(url.pathname).toBe("/r/");
    expect([...url.searchParams.keys()]).toEqual(["d", "v", "h", "s", "k", "tm", "y", "t", "g", "m", "md", "mh"]);
    expect(url.searchParams.has("rid")).toBe(false);
    expect(url.searchParams.has("body")).toBe(false);
    expect(url.searchParams.has("author")).toBe(false);
    const parsed = parseReviewPermalink(url.searchParams);
    expect(parsed).toMatchObject({ ok: true, state: {
      movieId: "arrival-2016", tmdbId: 329865, title: "Arrival", year: 2016,
      vibe: "film-student", heat: 2, sentiment: "hate", k: 123, genre: "scifi",
      hasMetadataSnapshot: true,
      metadata: {
        tmdbId: 329865, title: "Arrival", year: 2016, genres: ["drama", "scifi"],
        overviewTokens: ["linguist", "contact"],
        runtime: 116, voteAverage: 7.6, voteCount: 15_000, posterPath: "/arrival_poster.jpg",
      },
    } });
  });

  it("round-trips Unicode, RTL, and HTML-like titles as encoded plain text", () => {
    const hostileTitle = "Arrival مرحبًا <b>Film</b> 🎞️";
    const href = buildReviewPermalink({ ...input, title: hostileTitle, metadata: undefined });
    const params = new URL(href, "http://localhost").searchParams;
    expect(params.get("t")).toBe(hostileTitle);
    expect(parseReviewPermalink(params)).toMatchObject({ ok: true, state: { title: hostileTitle } });
  });

  it("rejects malformed core enums, IDs, rerolls, and overlong titles with safe prefill", () => {
    const core = "t=Safe+Title&v=film-student&h=2&s=love&k=0";
    for (const [key, value] of [["v", "unknown"], ["h", "9"], ["s", "neutral"], ["k", "zzzzzzzzzzz"], ["d", "2"], ["m", "../bad"]]) {
      const params = new URLSearchParams(core);
      params.set(key, value);
      expect(parseReviewPermalink(params).ok).toBe(false);
    }
    const tooLong = parseReviewPermalink(new URLSearchParams(`t=${"A".repeat(81)}&v=film-student&h=2&s=love&k=0`));
    expect(tooLong).toMatchObject({ ok: false, prefillTitle: "A".repeat(80) });
    expect(parseReviewPermalink(new URLSearchParams("t=Safe&v=film-student&h=2&s=love&k=0&tm=0&y=99999&g=invalid")))
      .toMatchObject({ ok: false });
    const malformedOptional = parseReviewPermalink(new URLSearchParams("d=1&t=Safe&v=film-student&h=2&s=love&k=0&tm=0&y=99999&g=invalid"));
    expect(malformedOptional).toMatchObject({ ok: true, state: { title: "Safe" } });
    if (malformedOptional.ok) {
      expect(malformedOptional.state.genre).toBeUndefined();
      expect(malformedOptional.state.tmdbId).toBeUndefined();
      expect(malformedOptional.state.year).toBeUndefined();
    }
  });

  it("drops malformed optional V2 snapshot data while preserving valid core state", () => {
    const href = buildReviewPermalink(input);
    const url = new URL(href, "http://localhost");
    url.searchParams.set("md", "eyJwb3N0ZXJQYXRoIjoiLy4uL2V2aWwuanBnIn0");
    const parsed = parseReviewPermalink(url.searchParams);
    expect(parsed).toMatchObject({ ok: true, state: {
      title: "Arrival", vibe: "film-student", heat: 2, sentiment: "hate", k: 123,
      tmdbId: 329865, genre: "scifi", hasMetadataSnapshot: false,
    } });
    if (parsed.ok) expect(parsed.state.metadata).toBeUndefined();

    const invalidId = new URL(buildReviewPermalink(input), "http://localhost");
    invalidId.searchParams.set("tm", "0");
    expect(parseReviewPermalink(invalidId.searchParams)).toMatchObject({
      ok: true, state: { title: "Arrival", hasMetadataSnapshot: false },
    });

    const oversized = new URL(buildReviewPermalink(input), "http://localhost");
    oversized.searchParams.set("md", "A".repeat(1201));
    expect(parseReviewPermalink(oversized.searchParams)).toMatchObject({
      ok: true, state: { title: "Arrival", hasMetadataSnapshot: false },
    });
  });

  it("caps the encoded permalink while preserving bounded metadata", () => {
    const longInput: GenerateReviewInput = {
      ...input,
      title: "🎞️".repeat(80),
      metadata: {
        tmdbId: 2_147_483_647,
        year: 9999,
        genres: ["action", "animation", "comedy", "drama", "fantasy", "horror", "romance", "scifi", "superhero", "thriller", "arthouse", "documentary"],
        overviewTokens: ["x".repeat(40), "y".repeat(40)],
        runtime: 1000,
        voteAverage: 10,
        voteCount: 2_147_483_647,
        posterPath: `/${"p".repeat(110)}.jpg`,
      },
    };
    const href = buildReviewPermalink(longInput, undefined, "https://localhost.test");
    expect(href.length).toBeLessThanOrEqual(1800);
    const parsed = parseReviewPermalink(new URL(href).searchParams);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.state.metadata?.overviewTokens).toEqual(["x".repeat(40), "y".repeat(40)]);
      expect(parsed.state.metadata?.posterPath).toBe(longInput.metadata?.posterPath);
      expect(parsed.state.metadata?.runtime).toBe(1000);
    }
  });

  it("rebuilds the same V1 card offline and never requests TMDB to generate it", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const href = buildReviewPermalink(input);
    const parsed = parseReviewPermalink(new URL(href, "http://localhost").searchParams);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const state = parsed.state;
    const reloadInput: GenerateReviewInput = {
      title: state.title!,
      vibe: state.vibe,
      heat: state.heat,
      sentiment: state.sentiment,
      k: state.k,
      ...(state.genre ? { genre: state.genre } : {}),
      ...(state.metadata ? { metadata: state.metadata } : {}),
    };
    const original = generateReview(input, vibe);
    const reloaded = generateReview(reloadInput, vibe);
    expect(reloaded.body).toBe(original.body);
    expect(reloaded.rating).toBe(original.rating);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
