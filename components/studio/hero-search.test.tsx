// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStudioStore } from "@/lib/state/studio-store";
import { HeroSearch } from "./hero-search";

const { loadMovieIndexMock } = vi.hoisted(() => ({ loadMovieIndexMock: vi.fn() }));
vi.mock("@/lib/data/load-movie-index", () => ({ loadMovieIndex: loadMovieIndexMock }));

const EMPTY_DRAFT = {
  title: "",
  sentiment: "love" as const,
  genre: "" as const,
  vibe: "film-student" as const,
  heat: 0 as const,
  selectedMovie: null,
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function movie(id: number, title: string, releaseDate: string | null, posterPath: string | null, genreIds: number[] = []) {
  return { id, title, releaseDate, posterPath, genreIds };
}

async function typeSearch(value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Movie title" }), { target: { value } });
  await act(async () => { await vi.advanceTimersByTimeAsync(250); });
}

async function flushResponse() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  loadMovieIndexMock.mockResolvedValue([]);
  vi.stubGlobal("fetch", vi.fn());
  useStudioStore.setState((state) => ({ ...state, draft: { ...EMPTY_DRAFT } }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("HeroSearch live suggestions", () => {
  it("debounces after two characters and offers same-title films as distinct numeric selections", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(response({ results: [
      movie(1, "Dune", "1984-06-01", "/dune_1984.jpg", [878]),
      movie(2, "Dune", "2021-10-22", "/dune_2021.jpg", [878]),
    ] }));
    render(<HeroSearch />);

    fireEvent.change(screen.getByRole("combobox", { name: "Movie title" }), { target: { value: "D" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(fetchMock).not.toHaveBeenCalled();

    await typeSearch("Du");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/tmdb/search?q=Du");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
    await flushResponse();

    expect(screen.getByText("1984")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getAllByText("Dune")).toHaveLength(2);
    expect(screen.getByRole("option", { name: /DuneMovie1984/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /DuneMovie2021/ })).toBeInTheDocument();
    const posterOption = screen.getByRole("option", { name: /DuneMovie2021/ });
    expect(posterOption.querySelector("img, .hero-search__poster-placeholder")).toBeInTheDocument();
    const thumbnail = posterOption.querySelector("img");
    if (thumbnail) {
      fireEvent.error(thumbnail);
      expect(posterOption.querySelector(".hero-search__poster-placeholder")).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("option", { name: /DuneMovie2021/ }));
    expect(useStudioStore.getState().draft).toMatchObject({
      title: "Dune",
      genre: "scifi",
      selectedMovie: { tmdbId: 2, title: "Dune", year: 2021, posterPath: "/dune_2021.jpg" },
    });
    expect(screen.getByRole("combobox", { name: "Movie title" })).toHaveValue("Dune");
  });

  it("keeps results without date or poster selectable and ignores unknown genres", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ results: [movie(17, "Untitled", null, null, [10770])] }));
    render(<HeroSearch />);
    await typeSearch("Un");
    await flushResponse();

    const option = screen.getByRole("option", { name: /UntitledMovieYear unknown/ });
    expect(option.querySelector("img")).toBeNull();
    fireEvent.click(option);
    expect(useStudioStore.getState().draft).toMatchObject({
      title: "Untitled",
      genre: "",
      selectedMovie: { tmdbId: 17, title: "Untitled" },
    });
    expect(useStudioStore.getState().draft.selectedMovie).not.toHaveProperty("year");
    expect(useStudioStore.getState().draft.selectedMovie).not.toHaveProperty("posterPath");
  });

  it("renders no more than eight options and treats hostile user text as plain text", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ results: Array.from({ length: 12 }, (_, index) => movie(index + 1, `Film ${index + 1}`, null, null)) }));
    render(<HeroSearch />);
    await typeSearch("Film");
    await flushResponse();
    expect(screen.getAllByRole("option")).toHaveLength(8);

    const hostileTitle = '<img src=x onerror="alert(1)">';
    fireEvent.change(screen.getByRole("combobox", { name: "Movie title" }), { target: { value: hostileTitle } });
    expect(screen.getByRole("combobox", { name: "Movie title" })).toHaveValue(hostileTitle);
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Use typed title" })).toBeInTheDocument();
  });

  it("supports arrow navigation and Enter selection with the combobox", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ results: [
      movie(3, "Arrival", "2016-09-01", null),
      movie(4, "Arrival 2", "2027-01-01", null),
    ] }));
    render(<HeroSearch />);
    await typeSearch("Ar");
    await flushResponse();

    const input = screen.getByRole("combobox", { name: "Movie title" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("tmdb-3"));
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("tmdb-4"));
    fireEvent.keyDown(input, { key: "Enter" });
    expect(useStudioStore.getState().draft.selectedMovie?.tmdbId).toBe(4);
  });

  it("aborts a stale search and ignores its late response", async () => {
    const pending: Array<{ signal: AbortSignal | null; resolve: (value: Response) => void }> = [];
    vi.mocked(fetch).mockImplementation((_input, init) => new Promise((resolve) => {
      pending.push({ signal: init?.signal as AbortSignal | null, resolve });
    }));
    render(<HeroSearch />);

    fireEvent.change(screen.getByRole("combobox", { name: "Movie title" }), { target: { value: "Alien" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(pending).toHaveLength(1);
    const first = pending[0]!;

    fireEvent.change(screen.getByRole("combobox", { name: "Movie title" }), { target: { value: "Aliens" } });
    expect(first.signal?.aborted).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(pending).toHaveLength(2);

    await act(async () => { first.resolve(response({ results: [movie(5, "Stale Alien", "1979-01-01", null)] })); });
    await flushResponse();
    expect(screen.queryByText("Stale Alien")).not.toBeInTheDocument();
    await act(async () => { pending[1]!.resolve(response({ results: [movie(6, "Aliens", "1986-01-01", null)] })); });
    await flushResponse();
    expect(screen.getByRole("option", { name: /AliensMovie1986/ })).toBeInTheDocument();
  });

  it("shows no-match, missing-key, offline, timeout, and error states while keeping typed-title use available", async () => {
    render(<HeroSearch />);
    const input = screen.getByRole("combobox", { name: "Movie title" });
    fireEvent.change(input, { target: { value: "Typed title" } });
    vi.mocked(fetch).mockResolvedValueOnce(response({ results: [] }));
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    await flushResponse();
    expect(screen.getByText(/No TMDB match/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use typed title" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Use typed title" }));
    expect(useStudioStore.getState().draft.title).toBe("Typed title");
    expect(useStudioStore.getState().draft.selectedMovie).toBeNull();

    const failureCases: Array<{ status: number; code: string; message: RegExp }> = [
      { status: 503, code: "tmdb_disabled", message: /not configured/ },
      { status: 503, code: "tmdb_unavailable", message: /offline/ },
      { status: 504, code: "tmdb_timeout", message: /too long/ },
      { status: 429, code: "tmdb_rate_limited", message: /rate-limiting/ },
      { status: 502, code: "tmdb_invalid_response", message: /unavailable right now/ },
    ];
    for (const failure of failureCases) {
      fireEvent.change(input, { target: { value: `Title ${failure.code}` } });
      vi.mocked(fetch).mockResolvedValueOnce(response({ error: { code: failure.code, message: "safe" } }, failure.status));
      await act(async () => { await vi.advanceTimersByTimeAsync(250); });
      await flushResponse();
      expect(screen.getByText(failure.message)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Use typed title" })).toBeEnabled();
    }

    fireEvent.change(input, { target: { value: "Title offline" } });
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    await flushResponse();
    expect(screen.getByText(/TMDB search is offline/)).toBeInTheDocument();
  });
});
