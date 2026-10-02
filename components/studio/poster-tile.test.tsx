// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PosterTile } from "./glass-review-card";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode;
});

function mockDecode(result: Promise<void>) {
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn(() => result) });
}

describe("PosterTile", () => {
  it("renders a same-origin movie poster with dimensions and accessible alt text", async () => {
    mockDecode(Promise.resolve());
    render(<PosterTile title="Arrival" posterPath="/abc123.jpg" />);
    const image = screen.getByRole("img", { name: "Poster for Arrival" });
    expect(image).toHaveAttribute("src", "/api/tmdb/image/abc123.jpg");
    expect(image).toHaveAttribute("width", "120");
    expect(image).toHaveAttribute("height", "180");
    fireEvent.load(image);
    await waitFor(() => expect(image).toBeInTheDocument());
  });

  it("keeps procedural art when no poster path is available", () => {
    render(<PosterTile title="Arrival" />);
    expect(screen.getByRole("img", { name: "Procedural poster for Arrival" })).toBeInTheDocument();
  });

  it("falls back to procedural art on a broken proxy response", () => {
    render(<PosterTile title="Arrival" posterPath="/abc123.jpg" />);
    fireEvent.error(screen.getByRole("img", { name: "Poster for Arrival" }));
    expect(screen.getByRole("img", { name: "Procedural poster for Arrival" })).toBeInTheDocument();
  });

  it("falls back when the poster request times out", async () => {
    vi.useFakeTimers();
    render(<PosterTile title="Arrival" posterPath="/abc123.jpg" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.getByRole("img", { name: "Procedural poster for Arrival" })).toBeInTheDocument();
  });

  it("falls back when a loaded image cannot be decoded", async () => {
    mockDecode(Promise.reject(new Error("decode failed")));
    render(<PosterTile title="Arrival" posterPath="/abc123.jpg" />);
    fireEvent.load(screen.getByRole("img", { name: "Poster for Arrival" }));
    await waitFor(() => expect(screen.getByRole("img", { name: "Procedural poster for Arrival" })).toBeInTheDocument());
  });
});
