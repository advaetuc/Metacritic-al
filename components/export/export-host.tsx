"use client";

import { forwardRef } from "react";
import { createPortal } from "react-dom";
import type { ReviewModelCompatible } from "@/lib/engine/types";
import { ExportCard } from "@/components/export/export-card";

export const EXPORT_IMAGE_TIMEOUT_MS = 5000;

/** Wait until the export twin's same-origin poster has loaded and decoded. */
export async function waitForExportPoster(root: HTMLElement, timeoutMs = EXPORT_IMAGE_TIMEOUT_MS): Promise<void> {
  const image = root.querySelector<HTMLImageElement>("[data-export-poster]");
  if (!image || image.hidden) return;

  if (image.complete) {
    if (image.naturalWidth <= 0) throw new Error("Poster image failed to load.");
  } else {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timeout);
        image.removeEventListener("load", onLoad);
        image.removeEventListener("error", onError);
      };
      const finish = (error?: Error) => {
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      const onLoad = () => image.naturalWidth > 0 ? finish() : finish(new Error("Poster image is invalid."));
      const onError = () => finish(new Error("Poster image failed to load."));
      const timeout = window.setTimeout(() => finish(new Error("Poster image timed out.")), timeoutMs);
      image.addEventListener("load", onLoad, { once: true });
      image.addEventListener("error", onError, { once: true });
    });
  }

  if (typeof image.decode === "function") await image.decode();
}

/** Retry a failed poster load or canvas capture once with the procedural art underneath. */
export async function captureWithProceduralRetry<T>(
  root: HTMLElement,
  capture: (element: HTMLElement) => Promise<T>,
  timeoutMs = EXPORT_IMAGE_TIMEOUT_MS,
): Promise<T> {
  try {
    await waitForExportPoster(root, timeoutMs);
    return await capture(root);
  } catch (firstError) {
    const image = root.querySelector<HTMLImageElement>("[data-export-poster]");
    if (!image) throw firstError;

    image.hidden = true;
    await waitForExportPoster(root, timeoutMs);
    return capture(root);
  }
}

type ExportHostProps = {
  model: ReviewModelCompatible;
  posterPath?: string;
  forceProceduralPoster?: boolean;
};

export const ExportHost = forwardRef<HTMLElement, ExportHostProps>(function ExportHost(
  { model, posterPath, forceProceduralPoster = false },
  ref,
) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="export-portal" aria-hidden="true">
      <ExportCard model={model} posterPath={posterPath} forceProceduralPoster={forceProceduralPoster} ref={ref} />
    </div>,
    document.body,
  );
});
