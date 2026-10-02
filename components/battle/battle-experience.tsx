"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildReviewPermalink, generateReview } from "@/lib/engine";
import type { GenreId, Heat, ReviewModelCompatible, Sentiment, VibeId } from "@/lib/engine/types";
import { loadCuratedMoviePack, loadMoviePackById, loadVibePack } from "@/lib/data/load-review-packs";
import { BattleCard } from "./battle-card";

const VIBES: readonly VibeId[] = ["film-student", "shitposter", "mid", "dad", "stan", "festival-snob", "linkedin", "conspiracy", "sports", "victorian", "nature"];
const GENRES: readonly GenreId[] = ["action", "animation", "comedy", "drama", "fantasy", "horror", "romance", "scifi", "superhero", "thriller", "arthouse", "documentary"];

interface BattleParams {
  title?: string;
  movieId?: string;
  a: VibeId;
  b: VibeId;
  heat: Heat;
  sentiment: Sentiment;
  k: number;
  genre?: GenreId;
}

function parseBattleParams(params: URLSearchParams): { ok: true; state: BattleParams } | { ok: false; reason: string } {
  const title = params.get("t")?.trim() || undefined;
  const movieId = params.get("m")?.trim() || undefined;
  const a = params.get("a");
  const b = params.get("b");
  const heatText = params.get("h") ?? "0";
  const sentiment = params.get("s") ?? "love";
  const kText = params.get("k") ?? "0";
  const genre = params.get("g") ?? undefined;
  if (!title && !movieId) return { ok: false, reason: "The battle link needs a movie title or curated movie ID." };
  if (movieId && !/^[a-z0-9][a-z0-9-]{0,79}$/u.test(movieId)) return { ok: false, reason: "The movie ID in this battle link is invalid." };
  if (!a || !b || !VIBES.includes(a as VibeId) || !VIBES.includes(b as VibeId)) return { ok: false, reason: "Choose two valid critic vibes for the battle." };
  if (a === b) return { ok: false, reason: "A roast battle needs two different vibes." };
  if (!/^[0-3]$/u.test(heatText)) return { ok: false, reason: "The heat setting is invalid." };
  if (sentiment !== "love" && sentiment !== "hate") return { ok: false, reason: "The verdict is invalid." };
  if (!/^[0-9a-z]{1,11}$/iu.test(kText)) return { ok: false, reason: "The reroll counter is invalid." };
  const k = Number.parseInt(kText, 36);
  if (!Number.isSafeInteger(k) || k < 0) return { ok: false, reason: "The reroll counter is invalid." };
  if (genre && !GENRES.includes(genre as GenreId)) return { ok: false, reason: "The genre is invalid." };
  return { ok: true, state: { ...(title ? { title } : {}), ...(movieId ? { movieId } : {}), a: a as VibeId, b: b as VibeId, heat: Number(heatText) as Heat, sentiment, k, ...(genre ? { genre: genre as GenreId } : {}) } };
}

export function BattleExperience() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const parsed = useMemo(() => parseBattleParams(new URLSearchParams(query)), [query]);
  const [result, setResult] = useState<{ query: string; left: ReviewModelCompatible; right: ReviewModelCompatible; leftHref: string; rightHref: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!parsed.ok) return () => { cancelled = true; };
    void (async () => {
      try {
        const state = parsed.state;
        const moviePack = state.movieId
          ? await loadMoviePackById(state.movieId)
          : state.title ? await loadCuratedMoviePack(state.title).catch(() => undefined) : undefined;
        const title = state.title ?? moviePack?.title ?? "";
        const [vibeA, vibeB] = await Promise.all([loadVibePack(state.a), loadVibePack(state.b)]);
        if (cancelled) return;
        const common = {
          title,
          heat: state.heat,
          sentiment: state.sentiment,
          k: state.k,
          ...(state.genre ? { genre: state.genre } : {}),
          ...(moviePack ? { moviePack } : {}),
        };
        const leftInput = { ...common, vibe: state.a };
        const rightInput = { ...common, vibe: state.b };
        setResult({
          query,
          left: generateReview(leftInput, vibeA),
          right: generateReview(rightInput, vibeB),
          leftHref: buildReviewPermalink(leftInput, moviePack?.id),
          rightHref: buildReviewPermalink(rightInput, moviePack?.id),
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [parsed, query]);

  if (!parsed.ok) return <main className="battle-shell"><section className="glass-panel battle-message"><h1>Battle unavailable</h1><p>{parsed.reason}</p><Link href="/">Make a review</Link></section></main>;
  if (failed) return <main className="battle-shell"><section className="glass-panel battle-message"><h1>Battle unavailable</h1><p>Could not load the review packs for this battle.</p><Link href="/">Make a review</Link></section></main>;
  if (!result || result.query !== query) return <main className="battle-shell" aria-live="polite"><p>Setting up the critics…</p></main>;
  return <main className="battle-shell">
    <header className="battle-heading glass-panel">
      <p className="landing-kicker">Same film. Opposing takes.</p>
      <h1>Roast Battle</h1>
      <p>{result.left.movie.title}</p>
    </header>
    <BattleCard left={result.left} right={result.right} leftHref={result.leftHref} rightHref={result.rightHref} />
    <Link className="daily-home" href="/">Make your own roast</Link>
  </main>;
}
