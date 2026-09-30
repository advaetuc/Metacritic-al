"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { generateReview, selectDailyRoast, buildReviewPermalink } from "@/lib/engine";
import type { ReviewModel } from "@/lib/engine/types";
import { loadMovieIndex } from "@/lib/data/load-movie-index";
import { loadMoviePackById, loadVibePack } from "@/lib/data/load-review-packs";
import { GlassReviewCard } from "@/components/studio/glass-review-card";
import { ReviewActions } from "@/components/share/review-actions";
import { useRetentionStore } from "@/lib/state/retention-store";

interface DailyResult {
  dayKey: string;
  model: ReviewModel;
  permalink: string;
}

export function DailyExperience() {
  const [result, setResult] = useState<DailyResult | null>(null);
  const [error, setError] = useState("");
  const recordedDay = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const dayKey = new Date().toISOString().slice(0, 10);
    void (async () => {
      try {
        const index = await loadMovieIndex();
        const selection = selectDailyRoast(dayKey, index);
        const [moviePack, vibePack] = await Promise.all([
          loadMoviePackById(selection.movie.id),
          loadVibePack(selection.vibe),
        ]);
        if (cancelled) return;
        const input = {
          title: selection.movie.t,
          vibe: selection.vibe,
          heat: selection.heat,
          sentiment: "love" as const,
          k: 0,
          moviePack,
        };
        const model = generateReview(input, vibePack);
        const permalink = buildReviewPermalink(input, moviePack.id);
        setResult({ dayKey, model, permalink });
        if (recordedDay.current !== dayKey) {
          recordedDay.current = dayKey;
          useRetentionStore.getState().recordRoast({
            url: permalink,
            title: model.movie.title,
            vibe: model.vibe,
            rating: model.rating,
            ts: Date.now(),
          });
        }
      } catch {
        if (!cancelled) setError("The daily screening could not load right now. Please try again.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="daily-shell">
      <section className="daily-heading glass-panel">
        <p className="landing-kicker">One film. One day. One opinion too many.</p>
        <h1>Today’s Daily Roast</h1>
        <p>Refreshes at midnight UTC. Everyone gets the same screening.</p>
      </section>
      {result ? (
        <div className="daily-result">
          <p className="daily-date">UTC screening · {result.dayKey}</p>
          <GlassReviewCard model={result.model} />
          <ReviewActions model={result.model} permalink={result.permalink} />
        </div>
      ) : (
        <p className="daily-status" aria-live="polite">{error || "Loading today’s screening…"}</p>
      )}
      <Link className="daily-home" href="/">Make your own roast</Link>
    </main>
  );
}
