// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { domMax, LazyMotion } from "framer-motion";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PermalinkExperience } from "./permalink-experience";
import { generateReview } from "@/lib/engine";
import { DEFAULT_HEAT_SHIFT, DEFAULT_RATING_MODEL } from "@/lib/engine/rating";
import type { VibePack } from "@/lib/engine/types";

const { navState } = vi.hoisted(() => ({ navState: { query: "" } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navState.query),
}));
vi.mock("@/lib/data/load-review-packs", () => ({
  loadVibePack: vi.fn(),
  loadMoviePackById: vi.fn(),
}));

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  navState.query = "";
});

describe("shared permalink offline fallback", () => {
  it("renders the V1 card before optional details fail offline", async () => {
    const query = "d=1&v=film-student&h=2&s=hate&k=3f&tm=27205&y=2010&t=Inception&g=scifi";
    navState.query = query;
    const { loadVibePack, loadMoviePackById } = await import("@/lib/data/load-review-packs");
    vi.mocked(loadVibePack).mockResolvedValue(vibe);
    vi.mocked(loadMoviePackById).mockRejectedValue(new Error("offline content fixture"));
    const offlineFetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", offlineFetch);

    const input = { title: "Inception", vibe: "film-student" as const, heat: 2 as const, sentiment: "hate" as const, k: 123, genre: "scifi" as const };
    const expected = generateReview(input, vibe);
    const { container } = render(<LazyMotion features={domMax}><PermalinkExperience /></LazyMotion>);

    expect(await screen.findByRole("heading", { name: "Inception" })).toBeInTheDocument();
    expect(container.querySelector(".review-body")?.textContent).toContain(expected.body);
    expect(screen.getByLabelText(/Rated .* out of five stars/u)).toBeInTheDocument();
    await waitFor(() => expect(offlineFetch).toHaveBeenCalledWith("/api/tmdb/movie/27205", expect.objectContaining({ method: "GET" })));
  });
});
