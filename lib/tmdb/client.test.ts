import { describe, expect, it } from "vitest";
import { normalizeTmdbMovieDetails, normalizeTmdbSearchResponse } from "./client";

describe("client metadata allowlist", () => {
  it("keeps selected-search metadata normalized without retaining prose or review fields", () => {
    const [movie] = normalizeTmdbSearchResponse({ results: [{
      id: 603,
      title: "The Matrix",
      releaseDate: "1999-03-31",
      posterPath: "/matrix.jpg",
      genreIds: [878, 28, 999_999],
      overview: "A hacker discovers a simulated reality.",
      voteAverage: 8.7,
      voteCount: 25_000,
      author: "Not a critic",
      rating: 1,
      body: "Do not include a review body",
    }] });
    expect(movie).toMatchObject({
      tmdbId: 603,
      title: "The Matrix",
      year: 1999,
      genres: ["action", "scifi"],
      genre: "scifi",
      overviewTokens: ["hacker", "discovers"],
      voteAverage: 8.7,
      voteCount: 25_000,
      posterPath: "/matrix.jpg",
    });
    expect(movie).not.toHaveProperty("overview");
    expect(movie).not.toHaveProperty("author");
    expect(movie).not.toHaveProperty("rating");
    expect(movie).not.toHaveProperty("body");
  });

  it("normalizes approved details fields, ignores unknown genres, and rejects mismatched IDs", () => {
    const details = normalizeTmdbMovieDetails({
      id: 603,
      title: "The Matrix",
      releaseDate: "1999-03-31",
      posterPath: "/matrix.jpg",
      genreIds: [878],
      genres: [{ id: 878, name: "Science Fiction" }, { id: 999, name: "Unknown" }],
      overview: "A hacker discovers a simulated reality.",
      tagline: "Welcome to the real world.",
      runtime: 136,
      voteAverage: 8.7,
      voteCount: 25_000,
      originalTitle: "ignored",
    }, 603);
    expect(details).toMatchObject({
      tmdbId: 603,
      title: "The Matrix",
      year: 1999,
      genres: ["scifi"],
      overviewTokens: ["hacker", "discovers"],
      runtime: 136,
      voteAverage: 8.7,
      voteCount: 25_000,
      posterPath: "/matrix.jpg",
    });
    expect(details).not.toHaveProperty("tagline");
    expect(details).not.toHaveProperty("originalTitle");
    expect(normalizeTmdbMovieDetails({ id: 604, title: "Different" }, 603)).toBeNull();
  });
});
