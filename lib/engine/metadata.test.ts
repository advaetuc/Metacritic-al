import { describe, expect, it } from "vitest";
import { normalizeMovieMetadata } from "./metadata";

describe("optional movie metadata normalization", () => {
  it("keeps only bounded allowlisted fields and extracts short topic tokens", () => {
    const normalized = normalizeMovieMetadata({
      tmdbId: 603,
      title: "The Matrix",
      year: 1999,
      genres: ["scifi", "made-up", "action", "scifi"],
      overview: "<b>Hacker</b> discovers a simulated reality &amp; <script>steal</script>.",
      tagline: "Welcome to the real world.",
      runtime: 136,
      voteAverage: 8.7,
      voteCount: 25_000,
      posterPath: "/matrix_poster.jpg",
      review: { author: "Someone", rating: 1, body: "Do not keep me" },
    });
    expect(normalized).toEqual({
      tmdbId: 603,
      title: "The Matrix",
      year: 1999,
      genres: ["action", "scifi"],
      overviewTokens: ["Hacker", "discovers"],
      runtime: 136,
      voteAverage: 8.7,
      voteCount: 25_000,
      posterPath: "/matrix_poster.jpg",
    });
    expect(JSON.stringify(normalized)).not.toContain("steal");
    expect(JSON.stringify(normalized)).not.toContain("Do not keep me");
    expect(JSON.stringify(normalized)).not.toContain("Someone");
  });

  it("drops unsupported, malformed, and overlong values", () => {
    const normalized = normalizeMovieMetadata({
      tmdbId: -1,
      title: `  ${"T".repeat(200)}  `,
      year: 20_000,
      genres: ["Action", "scifi", 4],
      overview: `${"x".repeat(60)} short-topic <img src=x onerror=alert(1)>`,
      tagline: "&lt;script&gt;danger&lt;/script&gt; plain words",
      runtime: 0,
      voteAverage: 10.1,
      voteCount: -1,
      posterPath: "https://image.tmdb.org/unsafe.jpg",
      author: "Never retained",
      rating: 1,
      body: "Never retained",
    });
    expect(normalized?.tmdbId).toBeUndefined();
    expect(normalized?.title).toHaveLength(80);
    expect(normalized?.year).toBeUndefined();
    expect(normalized?.genres).toEqual(["scifi"]);
    expect(normalized?.overviewTokens?.length).toBeLessThanOrEqual(2);
    expect(normalized?.overviewTokens?.[0]).toHaveLength(40);
    expect(normalized?.taglineTokens).toBeUndefined();
    expect(normalized?.runtime).toBeUndefined();
    expect(normalized?.voteAverage).toBeUndefined();
    expect(normalized?.voteCount).toBeUndefined();
    expect(normalized?.posterPath).toBeUndefined();
    expect(normalized).not.toHaveProperty("author");
    expect(normalized).not.toHaveProperty("rating");
    expect(normalized).not.toHaveProperty("body");
  });

  it("handles empty, hostile, and non-object input without throwing", () => {
    expect(normalizeMovieMetadata(undefined)).toBeUndefined();
    expect(normalizeMovieMetadata(null)).toBeUndefined();
    expect(normalizeMovieMetadata("<script>alert(1)</script>")).toBeUndefined();
    expect(() => normalizeMovieMetadata({
      title: "<svg onload=alert(1)>Movie</svg>",
      overview: "<iframe srcdoc='bad'>unsafe</iframe> ordinary-topic",
    })).not.toThrow();
    const normalized = normalizeMovieMetadata({ overview: "<svg onload=alert(1)>Movie</svg> ordinary-topic" });
    expect(normalized?.overviewTokens).not.toContain("alert");
    expect(normalized?.overviewTokens).not.toContain("iframe");
  });
});
