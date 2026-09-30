"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { generateReview, parseReviewPermalink } from "@/lib/engine";
import type { ReviewModel } from "@/lib/engine/types";
import { loadMoviePackById, loadVibePack } from "@/lib/data/load-review-packs";
import { GlassReviewCard } from "@/components/studio/glass-review-card";
import { ReviewActions } from "@/components/share/review-actions";

export function PermalinkExperience() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const parsed = useMemo(() => parseReviewPermalink(new URLSearchParams(query)), [query]);
  const [loaded, setLoaded] = useState<{ query: string; model?: ReviewModel; href?: string; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!parsed.ok) return () => { cancelled = true; };
    void (async () => {
      try {
        const { state } = parsed;
        const [vibePack, moviePack] = await Promise.all([
          loadVibePack(state.vibe),
          state.movieId ? loadMoviePackById(state.movieId) : Promise.resolve(undefined),
        ]);
        if (cancelled) return;
        const input = {
          title: state.title ?? moviePack?.title ?? "",
          vibe: state.vibe,
          heat: state.heat,
          sentiment: state.sentiment,
          k: state.k,
          ...(state.genre ? { genre: state.genre } : {}),
          ...(moviePack ? { moviePack } : {}),
        };
        const model = generateReview(input, vibePack);
        const href = window.location.pathname + window.location.search;
        setLoaded({ query, model, href });
      } catch {
        if (!cancelled) setLoaded({ query, error: "This review link could not be loaded. Check the link and try again." });
      }
    })();
    return () => { cancelled = true; };
  }, [parsed, query]);

  if (!parsed.ok) return <main className="permalink-shell"><section className="glass-panel permalink-error"><h1>Review unavailable</h1><p>{parsed.reason}</p><Link href="/">Make a new review</Link></section></main>;
  if (!loaded || loaded.query !== query) return <main className="permalink-shell" aria-live="polite"><p>Rebuilding your review…</p></main>;
  if (loaded.error) return <main className="permalink-shell"><section className="glass-panel permalink-error"><h1>Review unavailable</h1><p>{loaded.error}</p><Link href="/">Make a new review</Link></section></main>;
  if (!loaded.model || !loaded.href) return <main className="permalink-shell" aria-live="polite"><p>Rebuilding your review…</p></main>;
  return <main className="permalink-shell"><div className="permalink-result"><p className="landing-kicker">A review, exactly as generated</p><GlassReviewCard model={loaded.model} /><ReviewActions model={loaded.model} permalink={loaded.href} /><Link className="permalink-home" href="/">Make another review</Link></div></main>;
}
