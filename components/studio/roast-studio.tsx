"use client";

import { useStudioStore } from "@/lib/state/studio-store";
import type { GenreId, Sentiment } from "@/lib/engine/types";
import { BASE_VIBES, VibeSlider } from "./vibe-slider";
import { HeroSearch } from "./hero-search";
import { HeatDial } from "./heat-dial";

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

export function RoastStudio() {
  const vibe = useStudioStore((state) => state.draft.vibe);
  const heat = useStudioStore((state) => state.draft.heat);
  const genre = useStudioStore((state) => state.draft.genre);
  const sentiment = useStudioStore((state) => state.draft.sentiment);
  const setVibe = useStudioStore((state) => state.setVibe);
  const setHeat = useStudioStore((state) => state.setHeat);
  const setGenre = useStudioStore((state) => state.setGenre);
  const setSentiment = useStudioStore((state) => state.setSentiment);
  const selectedVibe = BASE_VIBES.find((item) => item.id === vibe)?.label ?? "Film student";

  return (
    <main className="landing-shell">
      <section className="glass-panel landing-panel studio-panel" aria-labelledby="welcome-title">
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

          <VibeSlider value={vibe} onChange={setVibe} />
          <HeatDial value={heat} onChange={setHeat} />

          <button className="studio-submit" type="button" disabled>
            <span>Roast it</span><span aria-hidden="true">↗</span>
          </button>
          <p className="studio-submit-note">The projector is warming up. More soon.</p>
        </div>
        <p className="studio-caption">Currently speaking as <strong>{selectedVibe}</strong> at <strong>{heat}/3 heat</strong>.</p>
      </section>
    </main>
  );
}
