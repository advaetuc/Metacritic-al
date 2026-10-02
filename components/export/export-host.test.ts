// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { captureWithProceduralRetry, waitForExportPoster } from "./export-host";

function makeRoot({ complete = true, naturalWidth = 200, decode = vi.fn().mockResolvedValue(undefined) } = {}) {
  const root = document.createElement("div");
  const image = document.createElement("img");
  image.dataset.exportPoster = "true";
  image.src = "/api/tmdb/image/fixture.jpg";
  Object.defineProperty(image, "complete", { configurable: true, value: complete });
  Object.defineProperty(image, "naturalWidth", { configurable: true, value: naturalWidth });
  Object.defineProperty(image, "decode", { configurable: true, value: decode });
  root.append(image);
  return { root, image, decode };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("export poster readiness and retry", () => {
  it("waits for a successful poster decode", async () => {
    const { root, decode } = makeRoot();
    await expect(waitForExportPoster(root)).resolves.toBeUndefined();
    expect(decode).toHaveBeenCalledOnce();
  });

  it("uses the procedural capture when there is no poster", async () => {
    const root = document.createElement("div");
    const capture = vi.fn().mockResolvedValue("png");
    await expect(captureWithProceduralRetry(root, capture)).resolves.toBe("png");
    expect(capture).toHaveBeenCalledOnce();
  });

  it("retries a broken image with procedural art", async () => {
    const { root, image } = makeRoot({ naturalWidth: 0 });
    const capture = vi.fn().mockImplementation(async () => image.hidden ? "procedural-png" : "real-png");
    await expect(captureWithProceduralRetry(root, capture)).resolves.toBe("procedural-png");
    expect(image.hidden).toBe(true);
    expect(capture).toHaveBeenCalledOnce();
  });

  it("retries a poster decode failure with procedural art", async () => {
    const { root, image } = makeRoot({ decode: vi.fn().mockRejectedValue(new Error("decode failed")) });
    const capture = vi.fn().mockResolvedValue("procedural-png");
    await expect(captureWithProceduralRetry(root, capture)).resolves.toBe("procedural-png");
    expect(image.hidden).toBe(true);
    expect(capture).toHaveBeenCalledOnce();
  });

  it("falls back after the poster request times out", async () => {
    vi.useFakeTimers();
    const { root, image } = makeRoot({ complete: false });
    const capture = vi.fn().mockImplementation(async () => image.hidden ? "procedural-png" : "real-png");
    const output = captureWithProceduralRetry(root, capture, 25);
    await vi.advanceTimersByTimeAsync(26);
    await expect(output).resolves.toBe("procedural-png");
    expect(image.hidden).toBe(true);
    expect(capture).toHaveBeenCalledOnce();
  });

  it("retries one failed canvas capture with the procedural poster", async () => {
    const { root, image } = makeRoot();
    const capture = vi.fn()
      .mockRejectedValueOnce(new Error("capture failed"))
      .mockImplementationOnce(async () => image.hidden ? "procedural-png" : "real-png");
    await expect(captureWithProceduralRetry(root, capture)).resolves.toBe("procedural-png");
    expect(image.hidden).toBe(true);
    expect(capture).toHaveBeenCalledTimes(2);
  });
});
