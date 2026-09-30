"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReviewModel } from "@/lib/engine/types";
import { ExportCard } from "@/components/export/export-card";

type ExportIntent = "download" | "share";

function safeFileName(title: string): string {
  return title.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 64) || "review";
}

export function ReviewActions({ model, permalink }: { model: ReviewModel; permalink: string }) {
  const [intent, setIntent] = useState<ExportIntent | null>(null);
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
        const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#080c0a", useCORS: true, logging: false });
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG encoding failed.")), "image/png"));
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

  return (
    <section className="review-actions" aria-label="Review actions">
      <button type="button" onClick={() => setIntent("download")} disabled={Boolean(intent)}>Save Image</button>
      <button type="button" onClick={() => setIntent("share")} disabled={Boolean(intent)}>Share</button>
      <button type="button" className="review-actions__link" onClick={copyLink}>Copy permalink</button>
      <a className="review-actions__open" href={permalink}>Open shareable review</a>
      <p aria-live="polite">{message}</p>
      {intent && typeof document !== "undefined" ? createPortal(<div className="export-portal" aria-hidden="true"><ExportCard model={model} ref={cardRef} /></div>, document.body) : null}
    </section>
  );
}
