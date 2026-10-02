"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewModelCompatible } from "@/lib/engine/types";
import { ExportHost, captureWithProceduralRetry } from "@/components/export/export-host";
import { buildBattlePermalink, buildReviewPermalink, generateReview, oppositeVibe } from "@/lib/engine";
import { loadMoviePackById, loadVibePack } from "@/lib/data/load-review-packs";

type ExportIntent = "download" | "share";

function safeFileName(title: string): string {
  return title.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 64) || "review";
}

export function ReviewActions({ model, permalink }: { model: ReviewModelCompatible; permalink: string }) {
  const router = useRouter();
  const [intent, setIntent] = useState<ExportIntent | null>(null);
  const [countering, setCountering] = useState(false);
  const [message, setMessage] = useState("");
  const cardRef = useRef<HTMLElement | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!intent || !cardRef.current || busy.current) return;
    busy.current = true;
    let cancelled = false;
    void (async () => {
      try {
        await document.fonts?.ready;
        const { default: html2canvas } = await import("html2canvas");
        if (cancelled || !cardRef.current) return;
        const blob = await captureWithProceduralRetry(cardRef.current, async (card) => {
          const canvas = await html2canvas(card, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
          if (canvas.width <= 0 || canvas.height <= 0) throw new Error("Canvas capture was empty.");
          const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG encoding failed.")), "image/png"));
          if (png.size === 0) throw new Error("PNG output was empty.");
          return png;
        });
        const filename = safeFileName(model.movie.title) + "-metacritic-al.png";
        if (intent === "share") {
          const file = new File([blob], filename, { type: "image/png" });
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: model.movie.title, text: model.tweet, url: permalink });
            if (!cancelled) setMessage("Shared.");
            return;
          }
        }
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        if (!cancelled) {
          if (intent === "share") {
            try { await navigator.clipboard.writeText(permalink); setMessage("Image saved and link copied."); }
            catch { setMessage("Image saved. Copy the shareable link below."); }
          } else setMessage("PNG saved.");
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) setMessage("Could not export this review. Please try again.");
      } finally {
        busy.current = false;
        if (!cancelled) setIntent(null);
      }
    })();
    return () => { cancelled = true; busy.current = false; };
  }, [intent, model, permalink]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(permalink, window.location.origin).toString()); setMessage("Shareable link copied."); }
    catch { setMessage("Copy this link: " + new URL(permalink, window.location.origin).toString()); }
  }

  async function counterRoast() {
    if (countering) return;
    setCountering(true);
    setMessage("Finding the counter-critic…");
    try {
      const vibe = oppositeVibe(model.vibe);
      const [vibePack, moviePack] = await Promise.all([
        loadVibePack(vibe),
        model.source === "curated" && model.movie.id
          ? loadMoviePackById(model.movie.id)
          : Promise.resolve(undefined),
      ]);
      const previousK = Number.parseInt(model.k, 36);
      const k = Number.isSafeInteger(previousK) && previousK < Number.MAX_SAFE_INTEGER ? previousK + 1 : 0;
      const movieMetadata = model.v === 2 ? model.movie : undefined;
      const input = {
        title: model.movie.title,
        vibe,
        heat: model.heat,
        sentiment: model.sentiment === "love" ? "hate" as const : "love" as const,
        k,
        ...(model.movie.genre ? { genre: model.movie.genre } : {}),
        ...(movieMetadata?.tmdbId !== undefined ? { metadata: {
          tmdbId: movieMetadata.tmdbId,
          title: model.movie.title,
          ...(movieMetadata.year !== undefined ? { year: movieMetadata.year } : {}),
          ...(movieMetadata.genres ? { genres: movieMetadata.genres } : {}),
          ...(movieMetadata.overviewTokens ? { overviewTokens: movieMetadata.overviewTokens } : {}),
          ...(movieMetadata.taglineTokens ? { taglineTokens: movieMetadata.taglineTokens } : {}),
          ...(movieMetadata.runtime !== undefined ? { runtime: movieMetadata.runtime } : {}),
          ...(movieMetadata.voteAverage !== undefined ? { voteAverage: movieMetadata.voteAverage } : {}),
          ...(movieMetadata.voteCount !== undefined ? { voteCount: movieMetadata.voteCount } : {}),
          ...(movieMetadata.posterPath ? { posterPath: movieMetadata.posterPath } : {}),
        } } : {}),
        ...(moviePack ? { moviePack } : {}),
      };
      // Build the deterministic review here so invalid content fails before navigation.
      generateReview(input, vibePack);
      router.push(buildReviewPermalink(input, moviePack?.id));
    } catch {
      setMessage("Could not make the counter-roast. Please try again.");
      setCountering(false);
    }
  }

  return (
    <section className="review-actions" aria-label="Review actions">
      <button type="button" onClick={() => setIntent("download")} disabled={Boolean(intent)}>Save Image</button>
      <button type="button" onClick={() => setIntent("share")} disabled={Boolean(intent)}>Share</button>
      <button type="button" onClick={counterRoast} disabled={countering || Boolean(intent)}>{countering ? "Countering…" : "Counter-Roast"}</button>
      <a className="review-actions__open" href={buildBattlePermalink(model)}>Start a roast battle</a>
      <button type="button" className="review-actions__link" onClick={copyLink}>Copy permalink</button>
      <a className="review-actions__open" href={permalink}>Open shareable review</a>
      <p aria-live="polite">{message}</p>
      {intent && typeof document !== "undefined" ? <ExportHost model={model} posterPath={model.v === 2 ? model.movie.posterPath : undefined} ref={cardRef} /> : null}
    </section>
  );
}
