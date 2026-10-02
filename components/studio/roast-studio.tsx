"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { generateReview } from "@/lib/engine";
import type { ReviewModelCompatible } from "@/lib/engine/types";
import { loadCuratedMoviePack, loadVibePack } from "@/lib/data/load-review-packs";
import { useStudioStore } from "@/lib/state/studio-store";
import type { GenreId, Sentiment } from "@/lib/engine/types";
import { ALL_VIBES, VibeSlider } from "./vibe-slider";
import { HeroSearch } from "./hero-search";
import { HeatDial } from "./heat-dial";
import { ScreeningSequence } from "./screening-sequence";
import { GlassReviewCard } from "./glass-review-card";
import { ReviewActions } from "@/components/share/review-actions";
import { buildReviewPermalink } from "@/lib/engine/permalink";
import { useRetentionStore } from "@/lib/state/retention-store";

const GENRES: ReadonlyArray<{ value: GenreId; label: string }> = [
  { value: "action", label: "Action" },
  { value: "animation", label: "Animation" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "fantasy", label: "Fantasy" },
  { value: "horror", label: "Horror" },
  { value: "romance", label: "Romance" },
  { value: "scifi", label: "Sci-fi" },
  { value: "superhero", label: "Superhero" },
  { value: "thriller", label: "Thriller" },
  { value: "arthouse", label: "Arthouse" },
  { value: "documentary", label: "Documentary" },
];

const SENTIMENTS: ReadonlyArray<{ value: Sentiment; label: string; icon: string }> = [
  { value: "love", label: "Love it", icon: "♥" },
  { value: "hate", label: "Hate it", icon: "✕" },
];

export function RoastStudio({ initialTitle }: { initialTitle?: string } = {}) {
  const title = useStudioStore((state) => state.draft.title);
  const vibe = useStudioStore((state) => state.draft.vibe);
  const heat = useStudioStore((state) => state.draft.heat);
  const genre = useStudioStore((state) => state.draft.genre);
  const sentiment = useStudioStore((state) => state.draft.sentiment);
  const setVibe = useStudioStore((state) => state.setVibe);
  const setHeat = useStudioStore((state) => state.setHeat);
  const setGenre = useStudioStore((state) => state.setGenre);
  const setSentiment = useStudioStore((state) => state.setSentiment);
  const phase = useStudioStore((state) => state.phase);
  const totalRoasts = useRetentionStore((state) => state.totalRoasts);
  const setPhase = useStudioStore((state) => state.setPhase);
 const [review, setReview] = useState<ReviewModelCompatible | null>(null);
  const [reviewHref, setReviewHref] = useState("");
  const [screeningComplete, setScreeningComplete] = useState(false);
  const [reroll, setReroll] = useState(0);
  const [error, setError] = useState("");
  const selectedVibe = ALL_VIBES.find((item) => item.id === vibe)?.label ?? "Film student";

  const finishScreening = useCallback(() => setScreeningComplete(true), []);

  useEffect(() => {
    if (initialTitle !== undefined) useStudioStore.getState().setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (phase === "screening" && screeningComplete && review) setPhase("revealed");
  }, [phase, screeningComplete, review, setPhase]);

  async function roast() {
    if (!title.trim() || phase === "screening") return;
    const draft = useStudioStore.getState().draft;
    const currentReroll = reroll;
    setReroll((value) => value + 1);
    setReview(null);
    setScreeningComplete(false);
    setError("");
    setPhase("screening");

    try {
      const [vibePack, moviePack] = await Promise.all([
        loadVibePack(draft.vibe),
        loadCuratedMoviePack(draft.title).catch(() => undefined),
      ]);
      const input = {
        title: draft.title,
        vibe: draft.vibe,
        heat: draft.heat,
        sentiment: draft.sentiment,
        k: currentReroll,
        ...(draft.genre ? { genre: draft.genre } : {}),
        ...(draft.selectedMovie ? { metadata: draft.selectedMovie } : {}),
        ...(moviePack ? { moviePack } : {}),
      };
      const generated = generateReview(input, vibePack);
      const permalink = buildReviewPermalink(input, moviePack?.id);
      setReview(generated);
      setReviewHref(permalink);
      useRetentionStore.getState().recordRoast({
        url: permalink,
        title: generated.movie.title,
        vibe: generated.vibe,
        rating: generated.rating,
        ts: Date.now(),
      });
    } catch {
      setError("Review content could not load. Try again.");
      setPhase("idle");
    }
  }

  return (
    <main className="landing-shell">
      <div className={"studio-layout" + (phase === "revealed" ? " studio-layout--revealed" : "")}>
      <section className={"glass-panel landing-panel studio-panel" + (phase === "screening" ? " is-screening" : "")} aria-labelledby="welcome-title" aria-busy={phase === "screening"}>
        <header className="studio-header">
          <p className="landing-kicker">The cinema after dark</p>
          <span className="glass-chip status-chip"><span className="status-dot" /> Zero backend. Infinite opinions.</span>
        </header>
        <h1 id="welcome-title">Metacritic-al</h1>
        <p className="landing-copy">Your taste, on trial.</p>
        <p className="landing-note">Name a film. Pick a critic. Get a lovingly unhelpful review.</p>

        <div className="studio-form">
          <HeroSearch />

          <div className="studio-choice-row">
            <fieldset className="sentiment-field">
              <legend className="studio-label">Your verdict</legend>
              <div className="sentiment-toggle" role="radiogroup" aria-label="Your verdict">
                {SENTIMENTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={sentiment === option.value}
                    className={`sentiment-option${sentiment === option.value ? " is-selected" : ""}`}
                    onClick={() => setSentiment(option.value)}
                  >
                    <span aria-hidden="true">{option.icon}</span>{option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="genre-field">
              <label className="studio-label" htmlFor="genre-select">Genre <span>(optional)</span></label>
              <select id="genre-select" value={genre} onChange={(event) => setGenre(event.currentTarget.value as GenreId | "")}>
                <option value="">Any genre</option>
                {GENRES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <VibeSlider value={vibe} onChange={setVibe} totalRoasts={totalRoasts} />
          <HeatDial value={heat} onChange={setHeat} />

          <button className="studio-submit" type="button" disabled={!title.trim() || phase === "screening"} onClick={roast}>
            <span>{review ? "Roast again" : "Roast it"}</span><span aria-hidden="true">↗</span>
          </button>
          <p className="studio-submit-note" aria-live="polite">
            {error || (phase === "screening" ? "The projector is rolling." : "A deterministic roast, made just for this title.")}
          </p>
        </div>
        <p className="studio-caption">Currently speaking as <strong>{selectedVibe}</strong> at <strong>{heat}/3 heat</strong>.</p>
      </section>
      {phase === "revealed" && review ? <div className="review-result"><GlassReviewCard model={review} /><ReviewActions model={review} permalink={reviewHref} /></div> : null}
      </div>
      {phase === "screening" ? <ScreeningSequence onComplete={finishScreening} /> : null}
      <Link className="studio-about-link" href="/about/">About &amp; content policy</Link>
    </main>
  );
}
