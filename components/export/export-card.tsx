import { forwardRef, useId } from "react";
import { normalizeTitle, xmur3 } from "@/lib/engine";
import type { ReviewModelCompatible } from "@/lib/engine/types";
import { tmdbPosterUrl } from "@/lib/tmdb/client";

/* eslint-disable @next/next/no-img-element -- A native same-origin img is needed so the canvas export can await decode(). */

const PALETTES = [["#0d573f", "#40e88b"], ["#21124c", "#9275ff"], ["#72321d", "#ffb451"], ["#133746", "#52bfcc"], ["#511d44", "#f16ea8"], ["#243b26", "#cadf79"]] as const;

export const ExportCard = forwardRef<HTMLElement, { model: ReviewModelCompatible; posterPath?: string; forceProceduralPoster?: boolean }>(function ExportCard({ model, posterPath, forceProceduralPoster = false }, ref) {
  const id = useId().replace(/:/gu, "");
  const hash = xmur3(normalizeTitle(model.movie.title))();
  const [top, bottom] = PALETTES[hash % PALETTES.length]!;
  const words = model.movie.title.trim().split(/\s+/u).filter(Boolean);
  const initials = (words.length > 1 ? words.slice(0, 3).map((word) => Array.from(word)[0]).join("") : Array.from(model.movie.title).slice(0, 2).join("")).toUpperCase() || "F";
  const hue = model.avatarSeed % 360;
  return (
    <article ref={ref} className="export-card" data-testid="export-card">
      <header className="export-user">
        <span className="export-avatar" style={{ backgroundColor: `hsl(${hue} 55% 35%)`, borderColor: `hsl(${hue} 80% 72%)`, color: `hsl(${hue} 95% 88%)` }}>{Array.from(model.username)[0]?.toUpperCase() ?? "C"}</span>
        <span className="export-user-meta"><strong>{model.username}</strong><small>{model.watchedLabel}</small></span>
        {model.rewatch ? <span className="export-rewatch">↻ Rewatch</span> : null}
      </header>
      <div className="export-movie">
        <div className="export-poster" style={{ background: `linear-gradient(${(hash >>> 8) % 360}deg, ${top}, ${bottom})` }}>
          <svg viewBox="0 0 120 170" aria-hidden="true"><circle cx={25 + (hash % 70)} cy={34 + ((hash >>> 5) % 90)} r={20 + ((hash >>> 12) % 24)} /><path d="M-5 125 Q35 83 66 127 T128 120 V180 H-5Z" /></svg><span>{initials}</span>
          {posterPath && !forceProceduralPoster ? (
            <ExportPosterImage posterPath={posterPath} title={model.movie.title} />
          ) : null}
        </div>
        <div className="export-movie-meta"><small>{model.movie.genre ?? "Movie review"}</small><h2>{model.movie.title}</h2>{model.movie.year ? <small className="export-year">{model.movie.year}</small> : null}<div className="export-stars" aria-label={`Rated ${model.rating} out of five stars`}>{Array.from({ length: 5 }, (_, i) => { const fill = Math.max(0, Math.min(1, model.rating - i)); return <svg key={i} viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id={id + "-export-star-" + i}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath></defs><path className="export-star-outline" d={STAR_PATH} /><path className="export-star-fill" d={STAR_PATH} clipPath={`url(#${id}-export-star-${i})`} /></svg>; })}<b>{model.rating.toFixed(1)}</b></div></div>
      </div>
      <div className="export-rule" />
      <p className="export-body">{model.body}</p>
      {model.tags.length ? <ul className="export-tags">{model.tags.map((tag) => <li key={tag}>#{tag.replace(/^#/u, "")}</li>)}</ul> : null}
      <footer className="export-footer"><span>♥ {model.likes.toLocaleString()}</span><span>▤ {model.comments.toLocaleString()}</span><strong>METACRITIC-AL · 🔥</strong></footer>
    </article>
  );
});

function ExportPosterImage({ posterPath, title }: { posterPath: string; title: string }) {
  // Keep this on the same-origin route so html2canvas never needs a remote TMDB host.
  const src = tmdbPosterUrl(posterPath);
  return src ? <img className="export-poster-image" data-export-poster="true" src={src} width={208} height={312} alt={`Poster for ${title}`} loading="eager" decoding="async" /> : null;
}
const STAR_PATH = "M12 1.7l3.15 6.39 7.05 1.02-5.1 4.97 1.2 7.02L12 17.79l-6.3 3.31 1.2-7.02-5.1-4.97 7.05-1.02L12 1.7z";
