"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateReview, parseReviewPermalink } from "@/lib/engine";
import type { ReviewModelCompatible } from "@/lib/engine/types";
import { loadMoviePackById, loadVibePack } from "@/lib/data/load-review-packs";
import { GlassReviewCard } from "@/components/studio/glass-review-card";
import { ReviewActions } from "@/components/share/review-actions";
import { normalizeTmdbMovieDetails } from "@/lib/tmdb/client";

export function PermalinkExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const parsed = useMemo(() => parseReviewPermalink(new URLSearchParams(query)), [query]);
  const [loaded, setLoaded] = useState<{ query: string; model?: ReviewModelCompatible; href?: string; error?: string } | null>(null);
  const detailsRequests = useRef(new Set<string>());

  useEffect(() => {
    if (parsed.ok) return;
    const target = parsed.prefillTitle
      ? `/?${new URLSearchParams({ title: parsed.prefillTitle }).toString()}`
      : "/";
    router.replace(target);
  }, [parsed, router]);

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
          ...(state.tmdbId !== undefined || state.metadata || state.year !== undefined ? { metadata: {
            ...(state.tmdbId !== undefined ? { tmdbId: state.tmdbId } : {}),
            ...(state.title ? { title: state.title } : {}),
            ...(state.year !== undefined ? { year: state.year } : {}),
            ...(state.metadata?.genres ? { genres: state.metadata.genres } : {}),
            ...(state.metadata?.overviewTokens ? { overviewTokens: state.metadata.overviewTokens } : {}),
            ...(state.metadata?.taglineTokens ? { taglineTokens: state.metadata.taglineTokens } : {}),
            ...(state.metadata?.runtime !== undefined ? { runtime: state.metadata.runtime } : {}),
            ...(state.metadata?.voteAverage !== undefined ? { voteAverage: state.metadata.voteAverage } : {}),
            ...(state.metadata?.voteCount !== undefined ? { voteCount: state.metadata.voteCount } : {}),
            ...(state.metadata?.posterPath ? { posterPath: state.metadata.posterPath } : {}),
          } } : {}),
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

  useEffect(() => {
    if (!parsed.ok || !loaded || loaded.query !== query || !loaded.model || parsed.state.tmdbId === undefined
      || parsed.state.hasMetadataSnapshot || loaded.model.v !== 2) return;
    const requestKey = `${query}|${parsed.state.tmdbId}`;
    if (detailsRequests.current.has(requestKey)) return;
    detailsRequests.current.add(requestKey);
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/tmdb/movie/${parsed.state.tmdbId}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok || controller.signal.aborted) return;
        const details = normalizeTmdbMovieDetails(await response.json() as unknown, parsed.state.tmdbId!);
        if (!details || controller.signal.aborted) return;
        setLoaded((current) => {
          if (!current || current.query !== query || current.model?.v !== 2) return current;
          const movie = current.model.movie;
          return {
            ...current,
            model: {
              ...current.model,
              movie: {
                ...movie,
                ...(movie.tmdbId === undefined ? { tmdbId: details.tmdbId } : {}),
                ...(movie.year === undefined && details.year !== undefined ? { year: details.year } : {}),
                ...(movie.genres === undefined && details.genres ? { genres: details.genres } : {}),
                ...(movie.overviewTokens === undefined && details.overviewTokens ? { overviewTokens: details.overviewTokens } : {}),
                ...(movie.taglineTokens === undefined && details.taglineTokens ? { taglineTokens: details.taglineTokens } : {}),
                ...(movie.runtime === undefined && details.runtime !== undefined ? { runtime: details.runtime } : {}),
                ...(movie.voteAverage === undefined && details.voteAverage !== undefined ? { voteAverage: details.voteAverage } : {}),
                ...(movie.voteCount === undefined && details.voteCount !== undefined ? { voteCount: details.voteCount } : {}),
                ...(movie.posterPath === undefined && details.posterPath ? { posterPath: details.posterPath } : {}),
              },
            },
          };
        });
      } catch {
        // The URL title and V1 review are already rendered; remote metadata is optional.
      }
    })();
    return () => controller.abort();
  }, [loaded, parsed, query]);

  if (!parsed.ok) return <main className="permalink-shell"><section className="glass-panel permalink-error"><h1>Review unavailable</h1><p>{parsed.reason}</p><Link href={parsed.prefillTitle ? `/?${new URLSearchParams({ title: parsed.prefillTitle }).toString()}` : "/"}>Make a new review</Link></section></main>;
  if (!loaded || loaded.query !== query) return <main className="permalink-shell" aria-live="polite"><p>Rebuilding your review…</p></main>;
  if (loaded.error) return <main className="permalink-shell"><section className="glass-panel permalink-error"><h1>Review unavailable</h1><p>{loaded.error}</p><Link href="/">Make a new review</Link></section></main>;
  if (!loaded.model || !loaded.href) return <main className="permalink-shell" aria-live="polite"><p>Rebuilding your review…</p></main>;
  return <main className="permalink-shell"><div className="permalink-result"><p className="landing-kicker">A review, exactly as generated</p><GlassReviewCard model={loaded.model} /><ReviewActions model={loaded.model} permalink={loaded.href} /><Link className="permalink-home" href="/">Make another review</Link></div></main>;
}
