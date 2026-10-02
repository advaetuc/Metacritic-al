// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReviewModelV2 } from "@/lib/engine/types";
import { ExportCard } from "./export-card";

const model: ReviewModelV2 = {
  v: 2,
  engineVersion: 1,
  movie: { title: "Arrival", year: 2016, genre: "scifi", tmdbId: 329865, posterPath: "/arrival-poster.jpg" },
  source: "procedural",
  vibe: "film-student",
  heat: 1,
  sentiment: "love",
  rating: 4,
  username: "frame_reader",
  avatarSeed: 42,
  watchedLabel: "Watched recently",
  rewatch: false,
  body: "A quiet thought experiment.",
  tweet: "4.0★ Arrival",
  tags: ["science-fiction"],
  likes: 4,
  comments: 1,
  k: "0",
};

afterEach(cleanup);

describe("ExportCard poster data", () => {
  it("uses the supplied movie poster path through the same-origin proxy", () => {
    render(<ExportCard model={model} posterPath={model.movie.posterPath} />);
    expect(screen.getByRole("img", { name: "Poster for Arrival" })).toHaveAttribute("src", "/api/tmdb/image/arrival-poster.jpg");
    expect(screen.getByRole("heading", { name: "Arrival" })).toBeInTheDocument();
    expect(screen.getByText("A quiet thought experiment.")).toBeInTheDocument();
  });

  it("keeps the deterministic procedural poster when no path is available", () => {
    render(<ExportCard model={{ ...model, movie: { title: "Arrival" } }} />);
    expect(screen.queryByRole("img", { name: "Poster for Arrival" })).not.toBeInTheDocument();
    expect(document.querySelector(".export-poster svg")).toBeInTheDocument();
  });

  it("can explicitly force procedural art for export fallback", () => {
    render(<ExportCard model={model} posterPath={model.movie.posterPath} forceProceduralPoster />);
    expect(screen.queryByRole("img", { name: "Poster for Arrival" })).not.toBeInTheDocument();
    expect(document.querySelector(".export-poster svg")).toBeInTheDocument();
  });
});
