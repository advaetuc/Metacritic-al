// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { domMax, LazyMotion } from "framer-motion";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReviewModel } from "@/lib/engine/types";
import { GlassReviewCard, StarRating } from "./glass-review-card";
import { ScreeningSequence } from "./screening-sequence";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const sampleReview: ReviewModel = {
  v: 1,
  movie: { id: "inception-2010", title: "Inception", year: 2010, genre: "scifi" },
  source: "curated",
  vibe: "film-student",
  heat: 1,
  sentiment: "love",
  rating: 4.5,
  username: "cine_frame_notes",
  avatarSeed: 8181,
  watchedLabel: "Watched yesterday",
  rewatch: true,
  body: "The dream logic earns its keep.",
  tweet: "4.5★ Inception",
  tags: ["cinema", "dream-logic"],
  likes: 4218,
  comments: 87,
  k: "0",
};

function withMotion(children: React.ReactNode) {
  return <LazyMotion features={domMax}>{children}</LazyMotion>;
}

describe("review presentation", () => {
  it("offers an immediate skip control for the screening sequence", () => {
    const onComplete = vi.fn();
    render(withMotion(<ScreeningSequence onComplete={onComplete} />));
    screen.getByRole("button", { name: "Skip" }).click();
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("completes the normal screening sequence at 1.6 seconds", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(withMotion(<ScreeningSequence onComplete={onComplete} />));

    await act(async () => { vi.advanceTimersByTime(1599); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("announces the generated review text and exposes an accessible half-star rating", () => {
    render(withMotion(<GlassReviewCard model={sampleReview} />));
    expect(screen.getByRole("status", { name: "Review text" })).toHaveTextContent(sampleReview.body);
    expect(screen.getByRole("img", { name: "Rated four and a half out of five stars" })).toBeInTheDocument();
  });

  it("keeps the rating alternative accurate at the minimum half-star value", () => {
    render(<StarRating value={0.5} />);
    expect(screen.getByRole("img", { name: "Rated half out of five stars" })).toBeInTheDocument();
  });
});
